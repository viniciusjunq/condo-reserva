const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

/* =========================
   REGISTER
========================= */

router.post("/register", async (req, res) => {
  const { email, senha, numero_casa } = req.body;

  if (!email || !senha || !numero_casa) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    const existeEmail = await pool.query(
      "SELECT id FROM moradores WHERE email = $1",
      [email]
    );

    if (existeEmail.rows.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const existeCasa = await pool.query(
      "SELECT id FROM moradores WHERE numero_casa = $1",
      [numero_casa]
    );

    if (existeCasa.rows.length > 0) {
      return res.status(400).json({ error: "Número da casa já cadastrado" });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const novo = await pool.query(
      `
      INSERT INTO moradores
      (email, senha_hash, numero_casa)
      VALUES ($1, $2, $3)
      RETURNING id, email, numero_casa, is_admin, ativo, created_at
      `,
      [email, senha_hash, numero_casa]
    );

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      user: novo.rows[0],
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

/* =========================
   LOGIN
========================= */

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM moradores WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = result.rows[0];

    if (user.ativo === false) {
      return res.status(403).json({ error: "Procure a administração" });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        numero_casa: user.numero_casa,
        is_admin: user.is_admin,
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;