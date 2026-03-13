export function gerarHorarios() {
  const horarios = [];
  let hora = 7;
  let minuto = 0;

  while (hora < 22) {
    const inicio = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

    let fimHora = hora;
    let fimMin = minuto + 90;

    while (fimMin >= 60) {
      fimMin -= 60;
      fimHora += 1;
    }

    if (fimHora > 22 || (fimHora === 22 && fimMin > 0)) break;

    const fim = `${String(fimHora).padStart(2, "0")}:${String(fimMin).padStart(2, "0")}`;

    horarios.push({ inicio, fim });

    minuto += 90;
    while (minuto >= 60) {
      minuto -= 60;
      hora += 1;
    }
  }

  return horarios;
}