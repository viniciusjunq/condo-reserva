const app = require("./app");

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
