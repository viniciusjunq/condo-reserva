const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");
const {
  validateReservaDate,
  validateTodayGrace,
} = require("../utils/reservaRules");
const { notifyAll } = require("../utils/notificacoes");

const router = express.Router();

const ALLOWED_SLOTS = [
  { start: "07:00", end: "08:30" },
  { start: "08:30", end: "10:00" },
  { start: "10:00", end: "11:30" },
  { start: "11:30", end: "13:00" },
  { start: "13:00", end: "14:30" },
  { start: "14:30", end: "16:00" },
  { start: "16:00", end: "17:30" },
  { start: "17:30", end: "19:00" },
  { start: "19:00", end: "20:30" },
  { start: "20:30", end: "22:00" },
];

function normalizeTime(value) {
  return String(value).slice(0, 5);
}

function isValidSlot(horario_inicio, horario_fim) {
  const hi = normalizeTime(horario_inicio);
  const hf = normalizeTime(horario_fim);
  return ALLOWED_SLOTS.some((slot) => slot.start === hi && slot.end === hf);
}

/* =========================
   MINHAS RESERVAS
========================= */
router.get("/minhas", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.data_reserva,
        r.horario_inicio,
        r.horario_fim,
        r.status,
        r.nome_utilizado,
        m.numero_casa
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
      WHERE r.morador_id = $1
      ORDER BY r.data_reserva DESC, r.horario_inicio DESC
      `,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   GRADE DO DIA
========================= */
router.get("/grade", async (req, res) => {
  const { data } = req.query;

  try {
    if (!data) {
      return res.status(400).json({ error: "Informe a data" });
    }

    const reservas = await pool.query(
      `
      SELECT
        r.horario_inicio,
        r.horario_fim,
        r.nome_utilizado,
        m.numero_casa
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
      WHERE r.data_reserva = $1
        AND r.status = 'ativa'
      `,
      [data]
    );

    const bloqueios = await pool.query(
      `
      SELECT horario_inicio, horario_fim, motivo
      FROM bloqueios
      WHERE data_bloqueio = $1
      `,
      [data]
    );

    const grade = ALLOWED_SLOTS.map((slot) => {
      const bloqueado = bloqueios.rows.find(
        (b) =>
          normalizeTime(b.horario_inicio) === slot.start &&
          normalizeTime(b.horario_fim) === slot.end
      );

      if (bloqueado) {
        return {
          inicio: slot.start,
          fim: slot.end,
          status: "bloqueado",
          motivo: bloqueado.motivo,
        };
      }

      const ocupado = reservas.rows.find(
        (r) =>
          normalizeTime(r.horario_inicio) === slot.start &&
          normalizeTime(r.horario_fim) === slot.end
      );

      if (ocupado) {
        return {
          inicio: slot.start,
          fim: slot.end,
          status: "ocupado",
          nome: ocupado.nome_utilizado,
          casa: ocupado.numero_casa,
        };
      }

      return {
        inicio: slot.start,
        fim: slot.end,
        status: "livre",
      };
    });

    return res.json(grade);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   CRIAR RESERVA
========================= */
router.post("/", auth, async (req, res) => {
  const { data_reserva, horario_inicio, horario_fim } = req.body;

  try {
    if (!data_reserva || !horario_inicio || !horario_fim) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes" });
    }

    const dateCheck = validateReservaDate(data_reserva);
    if (!dateCheck.ok) {
      return res.status(dateCheck.code).json({ error: dateCheck.error });
    }


    if (!isValidSlot(horario_inicio, horario_fim)) {
      return res.status(400).json({ error: "Horário inválido (use apenas slots fixos)" });
    }

    const blocked = await pool.query(
      `
      SELECT 1
      FROM bloqueios
      WHERE data_bloqueio = $1
        AND horario_inicio = $2::time
        AND horario_fim = $3::time
      LIMIT 1
      `,
      [data_reserva, normalizeTime(horario_inicio), normalizeTime(horario_fim)]
    );

    if (blocked.rows.length > 0) {
      return res.status(403).json({ error: "Horário bloqueado pela administração" });
    }

    const alreadyBooked = await pool.query(
      `
      SELECT 1
      FROM reservas
      WHERE morador_id = $1
        AND data_reserva = $2
        AND horario_inicio = $3::time
        AND horario_fim = $4::time
        AND status = 'ativa'
      LIMIT 1
      `,
      [
        req.user.id,
        data_reserva,
        normalizeTime(horario_inicio),
        normalizeTime(horario_fim),
      ]
    );

    if (alreadyBooked.rows.length > 0) {
      return res.status(400).json({ error: "Você já possui uma reserva neste horário." });
    }

    /* =========================
       REGRA: UMA RESERVA POR CASA POR DIA
    ========================= */
    const sameDay = await pool.query(
      `
      SELECT 1
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
      WHERE m.numero_casa = (
        SELECT numero_casa FROM moradores WHERE id = $1
      )
        AND r.data_reserva = $2
        AND r.status = 'ativa'
      LIMIT 1
      `,
      [req.user.id, data_reserva]
    );

    if (sameDay.rows.length > 0 && !req.user.is_admin) {
      return res.status(400).json({
        error: "Cada casa pode ter apenas uma reserva por dia.",
      });
    }

    /* =========================
       REGRA: EVITAR HORÁRIOS CONSECUTIVOS
    ========================= */
    const adjacent = await pool.query(
      `
      SELECT r.horario_inicio, r.horario_fim
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
      WHERE m.numero_casa = (
        SELECT numero_casa FROM moradores WHERE id = $1
      )
        AND r.data_reserva = $2
        AND r.status = 'ativa'
      `,
      [req.user.id, data_reserva]
    );

    const hi = normalizeTime(horario_inicio);
    const hf = normalizeTime(horario_fim);

    const isAdjacent = adjacent.rows.some((r) => {
      const start = normalizeTime(r.horario_inicio);
      const end = normalizeTime(r.horario_fim);
      return end === hi || start === hf;
    });

    const permitirDuplo = req.body?.permitir_duplo === true;

    if (isAdjacent && !(req.user.is_admin && permitirDuplo)) {
      return res.status(400).json({
        error:
          "Não é permitido reservar horários consecutivos. Peça ao administrador se precisar de dois horários seguidos.",
      });
    }

    const conflict = await pool.query(
      `
      SELECT 1
      FROM reservas
      WHERE data_reserva = $1
        AND status = 'ativa'
        AND (horario_inicio, horario_fim) OVERLAPS ($2::time, $3::time)
      LIMIT 1
      `,
      [data_reserva, normalizeTime(horario_inicio), normalizeTime(horario_fim)]
    );

    if (conflict.rows.length > 0) {
      return res.status(400).json({ error: "Horário já reservado" });
    }

    const userInfo = await pool.query(
      `SELECT nome FROM moradores WHERE id = $1`,
      [req.user.id]
    );

    const nome_utilizado = userInfo.rows[0]?.nome || "Morador";

    const inserted = await pool.query(
      `
      INSERT INTO reservas (
        morador_id,
        nome_utilizado,
        data_reserva,
        horario_inicio,
        horario_fim,
        status
      )
      SELECT $1, $2, $3, $4, $5, 'ativa'
      WHERE NOT EXISTS (
        SELECT 1 FROM reservas
        WHERE data_reserva = $3
          AND status = 'ativa'
          AND horario_inicio = $4::time
          AND horario_fim = $5::time
      )
      RETURNING *
      `,
      [
        req.user.id,
        nome_utilizado,
        data_reserva,
        normalizeTime(horario_inicio),
        normalizeTime(horario_fim),
      ]
    );

    if (inserted.rows.length === 0) {
      return res.status(400).json({ error: "Este horário acabou de ser reservado por outro morador." });
    }

    await notifyAll(
      "Horário reservado",
      `O horário ${normalizeTime(horario_inicio)}–${normalizeTime(horario_fim)} do dia ${data_reserva} não está mais disponível.`
    );

    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   CANCELAR RESERVA
========================= */
router.delete("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const reserva = await pool.query(
      `
      SELECT id, morador_id, data_reserva, horario_inicio, horario_fim, status
      FROM reservas
      WHERE id = $1
      `,
      [id]
    );

    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: "Reserva não encontrada" });
    }

    const r = reserva.rows[0];

    if (!req.user.is_admin && r.morador_id !== req.user.id) {
      return res.status(403).json({ error: "Você não pode cancelar esta reserva" });
    }

    if (r.status === "cancelada") {
      return res.status(400).json({ error: "Reserva já está cancelada" });
    }

    const dataISO = new Date(r.data_reserva).toISOString().slice(0, 10);
    const hi = normalizeTime(r.horario_inicio);
    const hf = normalizeTime(r.horario_fim);

    if (!req.user.is_admin) {
      const check = await pool.query(
        `
        SELECT EXTRACT(EPOCH FROM (((data_reserva::date + horario_inicio) - timezone('America/Sao_Paulo', now())))) / 60 AS diff_min
        FROM reservas
        WHERE id = $1
        `,
        [id]
      );

      const diffMin = Number(check.rows?.[0]?.diff_min);

      if (!Number.isFinite(diffMin)) {
        return res.status(500).json({ error: "Erro ao validar horário da reserva." });
      }

      if (diffMin < 120) {
        return res.status(400).json({
          error: "Você só pode cancelar com no mínimo 2 horas de antecedência.",
        });
      }
    }

    const isAdmin = !!req.user.is_admin;
    let motivoAdmin = null;
    let interditar = false;

    if (isAdmin) {
      motivoAdmin = String(req.body?.motivo_admin || "").trim();
      interditar = req.body?.interditar === true;

      if (!motivoAdmin) {
        return res.status(400).json({
          error: "motivo_admin é obrigatório quando o administrador cancela uma reserva.",
        });
      }
    }

    await pool.query("UPDATE reservas SET status = 'cancelada' WHERE id = $1", [id]);

    if (isAdmin && interditar) {
      await pool.query(
        `
        INSERT INTO bloqueios (data_bloqueio, horario_inicio, horario_fim, motivo)
        SELECT $1::date, $2::time, $3::time, $4
        WHERE NOT EXISTS (
          SELECT 1 FROM bloqueios
          WHERE data_bloqueio = $1::date
            AND horario_inicio = $2::time
            AND horario_fim = $3::time
        )
        `,
        [dataISO, hi, hf, motivoAdmin]
      );

      await notifyAll(
        "Horário interditado",
        `O horário ${hi}–${hf} do dia ${dataISO} foi interditado. Motivo: ${motivoAdmin}`
      );

      return res.json({ message: "Reserva cancelada pelo administrador e horário interditado" });
    }

    if (isAdmin) {
      await notifyAll(
        "Horário liberado",
        `O horário ${hi}–${hf} do dia ${dataISO} está aberto novamente. Motivo: ${motivoAdmin}`
      );

      return res.json({ message: "Reserva cancelada pelo administrador (horário liberado)" });
    }

    await notifyAll(
      "Horário liberado",
      `O horário ${hi}–${hf} do dia ${dataISO} está aberto novamente.`
    );

    return res.json({ message: "Reserva cancelada com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});


/* =========================
   BLOQUEAR HORÁRIO (ADMIN)
========================= */
router.post("/bloquear", auth, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Apenas administradores podem bloquear horários." });
  }

  const { data_bloqueio, horario_inicio, horario_fim, motivo } = req.body;

  try {
    if (!data_bloqueio || !horario_inicio || !horario_fim || !motivo) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes." });
    }

    await pool.query(
      `
      INSERT INTO bloqueios (data_bloqueio, horario_inicio, horario_fim, motivo)
      VALUES ($1::date, $2::time, $3::time, $4)
      `,
      [data_bloqueio, horario_inicio, horario_fim, motivo]
    );

    await notifyAll(
      "Horário bloqueado pela administração",
      `O horário ${horario_inicio}–${horario_fim} do dia ${data_bloqueio} foi bloqueado. Motivo: ${motivo}`
    );

    return res.json({ message: "Horário bloqueado com sucesso." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao bloquear horário." });
  }
});

/* =========================
   LISTAR BLOQUEIOS (ADMIN)
========================= */
router.get("/bloqueios", auth, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Apenas administradores." });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, data_bloqueio, horario_inicio, horario_fim, motivo
      FROM bloqueios
      ORDER BY data_bloqueio DESC, horario_inicio
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar bloqueios." });
  }
});

/* =========================
   REMOVER BLOQUEIO (ADMIN)
========================= */
router.delete("/bloqueios/:id", auth, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Apenas administradores." });
  }

  const id = Number(req.params.id);

  try {
    await pool.query(
      `
      DELETE FROM bloqueios
      WHERE id = $1
      `,
      [id]
    );

    return res.json({ message: "Bloqueio removido." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao remover bloqueio." });
  }
});

/* =========================
   BLOQUEAR DIA INTEIRO
========================= */
router.post("/bloquear-dia", auth, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Apenas administradores." });
  }

  const { data_bloqueio, motivo } = req.body;

  try {
    for (const slot of ALLOWED_SLOTS) {
      await pool.query(
        `
        INSERT INTO bloqueios (data_bloqueio, horario_inicio, horario_fim, motivo)
        VALUES ($1::date, $2::time, $3::time, $4)
        ON CONFLICT DO NOTHING
        `,
        [data_bloqueio, slot.start, slot.end, motivo || "Dia bloqueado"]
      );
    }

    return res.json({ message: "Dia inteiro bloqueado." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao bloquear dia." });
  }
});

module.exports = router;