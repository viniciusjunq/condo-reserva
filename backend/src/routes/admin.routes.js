const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/reservas", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { data } = req.query;

    let baseQuery = `
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
    `;

    const values = [];

    if (data) {
      baseQuery += ` WHERE r.data_reserva = $1 `;
      values.push(data);
    }

    const totalQuery = await pool.query(
      `SELECT COUNT(*) ${baseQuery}`,
      values
    );

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.morador_id,
        r.nome_utilizado,
        r.data_reserva,
        r.horario_inicio,
        r.horario_fim,
        r.status,
        r.created_at,
        m.numero_casa,
        m.email
      ${baseQuery}
      ORDER BY r.data_reserva DESC, r.horario_inicio ASC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
      `,
      [...values, limit, offset]
    );

    return res.json({
      page,
      limit,
      total: Number(totalQuery.rows[0].count),
      reservas: result.rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});


/* =========================
   EXPORTAR RELATÓRIO CSV
   GET /admin/relatorio/reservas/export
========================= */

router.get("/relatorio/reservas/export", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const result = await pool.query(`
      SELECT
        r.id,
        r.data_reserva,
        r.horario_inicio,
        r.horario_fim,
        r.status,
        m.numero_casa,
        m.email
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
      ORDER BY r.data_reserva DESC, r.horario_inicio ASC
    `);

    const rows = result.rows;

    let csv = "id;data_reserva;horario_inicio;horario_fim;status;numero_casa;email\n";

    for (const r of rows) {
      const data = new Date(r.data_reserva).toISOString().slice(0,10);
      const hi = String(r.horario_inicio).slice(0,5);
      const hf = String(r.horario_fim).slice(0,5);

      csv += `${r.id};${data};${hi};${hf};${r.status};${r.numero_casa};${r.email}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=relatorio_reservas.csv");

    return res.send(csv);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   DASHBOARD ADMIN
   GET /admin/dashboard
========================= */

router.get("/dashboard", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    // reservas hoje
    const reservasHoje = await pool.query(`
      SELECT COUNT(*)
      FROM reservas
      WHERE data_reserva = CURRENT_DATE
      AND status = 'ativa'
    `);

    // reservas últimos 30 dias
    const reservas30 = await pool.query(`
      SELECT COUNT(*)
      FROM reservas
      WHERE data_reserva >= CURRENT_DATE - INTERVAL '30 days'
    `);

    // moradores ativos
    const moradores = await pool.query(`
      SELECT COUNT(*)
      FROM moradores
      WHERE ativo = true AND is_admin = false
    `);

    // horário mais reservado
    const horarioPopular = await pool.query(`
      SELECT horario_inicio, COUNT(*) as total
      FROM reservas
      WHERE status = 'ativa'
      GROUP BY horario_inicio
      ORDER BY total DESC
      LIMIT 1
    `);

    return res.json({
      reservas_hoje: Number(reservasHoje.rows[0].count),
      reservas_30_dias: Number(reservas30.rows[0].count),
      moradores_ativos: Number(moradores.rows[0].count),
      horario_mais_reservado: horarioPopular.rows[0] || null
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   ADMIN - LISTAR MORADORES
   GET /admin/moradores
========================= */
router.get("/moradores", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const result = await pool.query(`
      SELECT id, email, numero_casa, ativo, is_admin
      FROM moradores
      ORDER BY is_admin DESC, id ASC
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   ADMIN - DESATIVAR MORADOR
   PATCH /admin/moradores/:id/desativar
========================= */
router.patch("/moradores/:id/desativar", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const id = Number(req.params.id);

    const check = await pool.query(
      `SELECT id, email, numero_casa, ativo, is_admin FROM moradores WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Morador não encontrado" });
    }

    if (check.rows[0].is_admin) {
      return res.status(400).json({ error: "Não é permitido desativar um administrador" });
    }

    const upd = await pool.query(
      `UPDATE moradores SET ativo = false WHERE id = $1 RETURNING id, email, numero_casa, ativo`,
      [id]
    );

    return res.json({ message: "Morador desativado", user: upd.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   ADMIN - ATIVAR MORADOR
   PATCH /admin/moradores/:id/ativar
========================= */
router.patch("/moradores/:id/ativar", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const id = Number(req.params.id);

    const check = await pool.query(
      `SELECT id, email, numero_casa, ativo FROM moradores WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Morador não encontrado" });
    }

    const upd = await pool.query(
      `UPDATE moradores SET ativo = true WHERE id = $1 RETURNING id, email, numero_casa, ativo`,
      [id]
    );

    return res.json({ message: "Morador ativado", user: upd.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   RELATÓRIO JSON
   GET /admin/relatorio/reservas?dias=60
========================= */
router.get("/relatorio/reservas", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const dias = Number(req.query.dias) || 60;

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.data_reserva,
        r.horario_inicio,
        r.horario_fim,
        r.status,
        r.created_at,
        m.numero_casa,
        m.email
      FROM reservas r
      JOIN moradores m ON m.id = r.morador_id
      WHERE r.data_reserva >= CURRENT_DATE - INTERVAL '${dias} days'
      ORDER BY r.data_reserva DESC, r.horario_inicio ASC
      `
    );

    return res.json({
      periodo_dias: dias,
      total_registros: result.rows.length,
      reservas: result.rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;
