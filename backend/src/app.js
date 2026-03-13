require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const adminRoutes = require("./routes/admin.routes");
const reclamacoesRoutes = require("./routes/reclamacoes.routes");
const notificacoesRoutes = require("./routes/notificacoes.routes");



const authRoutes = require("./routes/auth.routes");
const reservasRoutes = require("./routes/reservas.routes");
const bloqueiosRoutes = require("./routes/bloqueios.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/reservas", reservasRoutes);
app.use("/bloqueios", bloqueiosRoutes);
app.use("/admin", adminRoutes);
app.use("/reclamacoes", reclamacoesRoutes);
app.use("/notificacoes", notificacoesRoutes);



app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    return res.json({ message: "Banco conectado", time: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao conectar no banco" });
  }
});

module.exports = app;