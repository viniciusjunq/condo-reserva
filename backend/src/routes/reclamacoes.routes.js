const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

/* =========================
   MORADOR - CRIAR RECLAMAÇÃO
   POST /reclamacoes
   body: { titulo, mensagem, descricao?, foto_url? }
========================= */
router.post("/", auth, async (req, res) => {
  try {
    const { titulo, mensagem, descricao, foto_url } = req.body;

    if (!titulo || !mensagem) {
      return res
        .status(400)
        .json({ error: "titulo e mensagem são obrigatórios" });
    }

    // ✅ garante que descricao nunca vai NULL (e não quebra o NOT NULL)
    const descricaoFinal =
      descricao && String(descricao).trim() ? descricao : mensagem;

    const ins = await pool.query(
      `
      INSERT INTO reclamacoes (morador_id, titulo, descricao, mensagem, foto_url, status)
      VALUES ($1, $2, $3, $4, $5, 'aberta')
      RETURNING id, morador_id, titulo, descricao, mensagem, foto_url, status, created_at
      `,
      [req.user.id, titulo, descricaoFinal, mensagem, foto_url ?? null]
    );

    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   MORADOR - MINHAS RECLAMAÇÕES
   GET /reclamacoes/minhas
========================= */
router.get("/minhas", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, titulo, descricao, mensagem, foto_url, status, created_at, resolvida_em
      FROM reclamacoes
      WHERE morador_id = $1
      ORDER BY created_at DESC
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
   ADMIN - LISTAR TODAS
   GET /reclamacoes/admin
========================= */
router.get("/admin", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res
        .status(403)
        .json({ error: "Acesso restrito ao administrador" });
    }

    const result = await pool.query(
      `
      SELECT
        r.id, r.titulo, r.descricao, r.mensagem, r.foto_url, r.status, r.created_at, r.resolvida_em,
        m.numero_casa, m.email
      FROM reclamacoes r
      JOIN moradores m ON m.id = r.morador_id
      ORDER BY r.created_at DESC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   ADMIN - MARCAR COMO RESOLVIDA
   PATCH /reclamacoes/admin/:id/resolver
========================= */
router.patch("/admin/:id/resolver", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res
        .status(403)
        .json({ error: "Acesso restrito ao administrador" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const upd = await pool.query(
      `
      UPDATE reclamacoes
      SET status = 'resolvida', resolvida_em = now(), resolvida_por = $2
      WHERE id = $1
      RETURNING id, status, resolvida_em, resolvida_por
      `,
      [id, req.user.id]
    );

    if (upd.rows.length === 0) {
      return res.status(404).json({ error: "Reclamação não encontrada" });
    }

    return res.json({
      message: "Reclamação marcada como resolvida",
      data: upd.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;