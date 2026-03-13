// backend/src/routes/bloqueios.routes.js
const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

// slots fixos (90 min)
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

function normalizeTime(v) {
  return String(v).slice(0, 5);
}

function isValidSlot(hora_inicio, hora_fim) {
  const hi = normalizeTime(hora_inicio);
  const hf = normalizeTime(hora_fim);
  return ALLOWED_SLOTS.some((s) => s.start === hi && s.end === hf);
}

/* =========================================================
   ADMIN - BLOQUEAR 1 SLOT OU DIA INTEIRO
   POST /bloqueios/admin/bloquear
   body: { data, hora_inicio?, hora_fim?, motivo }
========================================================= */
router.post("/admin/bloquear", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const { data, hora_inicio, hora_fim, motivo } = req.body;

    if (!data || !motivo) {
      return res.status(400).json({ error: "Data e motivo são obrigatórios" });
    }

    // bloquear o dia inteiro
    if (!hora_inicio && !hora_fim) {
      const criados = [];

      for (const slot of ALLOWED_SLOTS) {
        const exists = await pool.query(
          `
          SELECT 1 FROM bloqueios
          WHERE data_bloqueio = $1
            AND horario_inicio = $2::time
            AND horario_fim = $3::time
          LIMIT 1
          `,
          [data, slot.start, slot.end]
        );

        if (exists.rows.length > 0) continue;

        const ins = await pool.query(
          `
          INSERT INTO bloqueios (data_bloqueio, horario_inicio, horario_fim, motivo)
          VALUES ($1, $2::time, $3::time, $4)
          RETURNING *
          `,
          [data, slot.start, slot.end, motivo]
        );

        criados.push(ins.rows[0]);
      }

      return res.status(201).json({
        message: "Bloqueio do dia aplicado",
        total_criados: criados.length,
        bloqueios: criados,
      });
    }

    // bloquear 1 slot
    if (!hora_inicio || !hora_fim) {
      return res.status(400).json({ error: "Informe hora_inicio e hora_fim" });
    }

    if (!isValidSlot(hora_inicio, hora_fim)) {
      return res.status(400).json({ error: "Horário inválido (slots fixos)" });
    }

    const exists = await pool.query(
      `
      SELECT 1 FROM bloqueios
      WHERE data_bloqueio = $1
        AND horario_inicio = $2::time
        AND horario_fim = $3::time
      LIMIT 1
      `,
      [data, normalizeTime(hora_inicio), normalizeTime(hora_fim)]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Esse horário já está bloqueado" });
    }

    const inserted = await pool.query(
      `
      INSERT INTO bloqueios (data_bloqueio, horario_inicio, horario_fim, motivo)
      VALUES ($1, $2::time, $3::time, $4)
      RETURNING *
      `,
      [data, normalizeTime(hora_inicio), normalizeTime(hora_fim), motivo]
    );

    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================================================
   ADMIN - DESBLOQUEAR 1 SLOT
   DELETE /bloqueios/admin/desbloquear
   body: { data, hora_inicio, hora_fim }
   ✅ Se não existir bloqueio, retorna 200 "já estava livre"
========================================================= */
router.delete("/admin/desbloquear", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const { data, hora_inicio, hora_fim } = req.body;

    if (!data || !hora_inicio || !hora_fim) {
      return res
        .status(400)
        .json({ error: "Data, hora_inicio e hora_fim são obrigatórios" });
    }

    if (!isValidSlot(hora_inicio, hora_fim)) {
      return res.status(400).json({ error: "Horário inválido (slots fixos)" });
    }

    const del = await pool.query(
      `
      DELETE FROM bloqueios
      WHERE data_bloqueio = $1
        AND horario_inicio = $2::time
        AND horario_fim = $3::time
      RETURNING id
      `,
      [data, normalizeTime(hora_inicio), normalizeTime(hora_fim)]
    );

    // ✅ aqui é a mudança
    if (del.rows.length === 0) {
      return res.json({ message: "Slot já estava livre" });
    }

    return res.json({ message: "Slot desbloqueado", id: del.rows[0].id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================================================
   ADMIN - DESBLOQUEAR DIA INTEIRO
   DELETE /bloqueios/admin/desbloquear-dia
   body: { data }
========================================================= */
router.delete("/admin/desbloquear-dia", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: "Data é obrigatória" });
    }

    const del = await pool.query(
      `
      DELETE FROM bloqueios
      WHERE data_bloqueio = $1
      RETURNING id
      `,
      [data]
    );

    return res.json({
      message: "Dia desbloqueado",
      total_removidos: del.rows.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;