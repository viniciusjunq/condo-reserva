// src/utils/notificacoes.js
const pool = require("../config/db");

/**
 * Envia uma notificação para:
 * - todos os moradores ativos (morador_id definido), OU
 * - broadcast (morador_id = null) se broadcast = true
 *
 * Padrão: broadcast = true (mais simples pro teu caso: todo mundo vê)
 */
async function notifyAll(titulo, mensagem, { broadcast = true } = {}) {
  if (!titulo || !mensagem) return;

  if (broadcast) {
    await pool.query(
      `
      INSERT INTO notificacoes (morador_id, titulo, mensagem, lida)
      VALUES (NULL, $1, $2, false)
      `,
      [titulo, mensagem]
    );
    return;
  }

  // Se você preferir 1 notificação por morador (morador_id preenchido)
  const moradores = await pool.query(
    `SELECT id FROM moradores WHERE ativo = true AND is_admin = false`
  );

  if (moradores.rows.length === 0) return;

  const values = [];
  const params = [];
  let i = 1;

  for (const m of moradores.rows) {
    values.push(`($${i++}, $${i++}, $${i++}, false)`);
    params.push(m.id, titulo, mensagem);
  }

  await pool.query(
    `
    INSERT INTO notificacoes (morador_id, titulo, mensagem, lida)
    VALUES ${values.join(",")}
    `,
    params
  );
}

module.exports = { notifyAll };