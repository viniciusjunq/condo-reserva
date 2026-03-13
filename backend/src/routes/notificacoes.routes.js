// src/routes/notificacoes.routes.js
const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

/* =========================
   MORADOR - MINHAS NOTIFICAÇÕES
   GET /notificacoes/minhas
   (broadcast morador_id null + do próprio morador_id)
========================= */
router.get("/minhas", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, morador_id, titulo, mensagem, lida, created_at
      FROM notificacoes
      WHERE morador_id IS NULL OR morador_id = $1
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
   MORADOR - MARCAR COMO LIDA
   PATCH /notificacoes/:id/lida
========================= */
router.patch("/:id/lida", auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // só pode marcar como lida se for broadcast (NULL) OU dele
    const upd = await pool.query(
      `
      UPDATE notificacoes
      SET lida = true
      WHERE id = $1
        AND (morador_id IS NULL OR morador_id = $2)
      RETURNING id, morador_id, titulo, mensagem, lida, created_at
      `,
      [id, req.user.id]
    );

    if (upd.rows.length === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    return res.json(upd.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   ADMIN - ENVIAR NOTIFICAÇÃO (BROADCAST)
   POST /notificacoes
   body: { titulo, mensagem }
========================= */
router.post("/", auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const { titulo, mensagem } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({ error: "titulo e mensagem são obrigatórios" });
    }

    const ins = await pool.query(
      `
      INSERT INTO notificacoes (morador_id, titulo, mensagem, lida)
      VALUES (NULL, $1, $2, false)
      RETURNING id, morador_id, titulo, mensagem, lida, created_at
      `,
      [titulo, mensagem]
    );

    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;

/* =========================
   ADMIN - TODAS NOTIFICAÇÕES
   GET /notificacoes/admin
========================= */


router.get("/admin", auth, async (req, res) => {
  try {

    if (!req.user.is_admin) {
      return res.status(403).json({ error: "Acesso restrito ao administrador" });
    }

    const result = await pool.query(
      `
      SELECT 
        n.id,
        n.titulo,
        n.mensagem,
        n.lida,
        n.created_at,
        m.numero_casa,
        m.email
      FROM notificacoes n
      LEFT JOIN moradores m
        ON n.morador_id = m.id
      ORDER BY n.created_at DESC
      `
    );

    return res.json(result.rows);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});


/* =========================
   MORADOR - CONTADOR NÃO LIDAS
   GET /notificacoes/contador
========================= */

router.get("/contador", auth, async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM notificacoes
      WHERE 
        lida = false
        AND (morador_id IS NULL OR morador_id = $1)
      `,
      [req.user.id]
    );

    return res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});