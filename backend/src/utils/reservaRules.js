// backend/src/utils/reservaRules.js
// Regras de data/horário (timezone BR). Backend é a fonte da verdade.

const TZ = "America/Sao_Paulo";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function nowParts() {
  // pega data/hora no timezone do Brasil (evita bagunça UTC)
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    y: Number(map.year),
    m: Number(map.month),
    d: Number(map.day),
    hh: Number(map.hour),
    mm: Number(map.minute),
  };
}

function todayISO() {
  const { y, m, d } = nowParts();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDaysISO(baseISO, days) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = pad2(dt.getUTCMonth() + 1);
  const dd = pad2(dt.getUTCDate());
  return `${yy}-${mm}-${dd}`;
}

function isISODate(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function normalizeTime(value) {
  return String(value).slice(0, 5);
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Regra:
 * - Só pode reservar "hoje" OU "amanhã"
 * - "Amanhã" só libera depois das 22:00
 * - Não permite datas além de amanhã
 */
function validateReservaDate(targetISO) {
  if (!isISODate(targetISO)) {
    return { ok: false, code: 400, error: "Data inválida (use YYYY-MM-DD)" };
  }

  const base = todayISO();
  const tomorrow = addDaysISO(base, 1);
  const { hh } = nowParts();

  if (targetISO === base) return { ok: true };

  if (targetISO === tomorrow) {
    if (hh < 22) {
      return { ok: false, code: 403, error: "Reservas para amanhã só liberam após 22h." };
    }
    return { ok: true };
  }

  return { ok: false, code: 403, error: "Você só pode reservar para hoje ou para amanhã." };
}

/**
 * Regra (HOJE):
 * - Pode reservar o slot mesmo após começar, MAS só até X minutos após o início.
 * - Ex: slot 07:00 → até 07:15 pode. 07:16+ bloqueia.
 */
function validateTodayGrace(targetISO, hora_inicio, graceMinutes = 15) {
  if (!isISODate(targetISO)) {
    return { ok: false, code: 400, error: "Data inválida (use YYYY-MM-DD)" };
  }

  const base = todayISO();
  if (targetISO !== base) return { ok: true }; // só aplica para HOJE

  const { hh, mm } = nowParts();
  const nowMin = hh * 60 + mm;

  const startMin = toMinutes(normalizeTime(hora_inicio));
  const diff = nowMin - startMin; // >0 significa já passou do início

  // se ainda não começou (diff < 0), ok
  if (diff < 0) return { ok: true };

  // começou, mas está dentro da tolerância
  if (diff <= graceMinutes) return { ok: true };

  return {
    ok: false,
    code: 403,
    error: `Este horário já começou. Você só pode reservar até ${graceMinutes} minutos após o início.`,
  };
}

module.exports = {
  TZ,
  todayISO,
  addDaysISO,
  validateReservaDate,
  validateTodayGrace,
  isISODate,
  normalizeTime,
};