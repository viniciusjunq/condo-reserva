"use client";

import React from "react";
import AuthGuard from "@/componentes/AuthGuard";

export default function ReservasPage() {
  const [dataSelecionada, setDataSelecionada] = React.useState<string>("");
  const [ocupados, setOcupados] = React.useState<string[]>([]);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [slotSelecionado, setSlotSelecionado] = React.useState<{ inicio: string; fim: string } | null>(null);
  const [nomeReserva, setNomeReserva] = React.useState("");
  const [carregandoReserva, setCarregandoReserva] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  function gerarHorarios() {
    const horarios = [];
    let hora = 7;
    let minuto = 0;

    while (hora < 22 || (hora === 20 && minuto === 30)) {
      const inicioHora = String(hora).padStart(2, "0");
      const inicioMin = String(minuto).padStart(2, "0");

      let fimHora = hora;
      let fimMin = minuto + 90;

      while (fimMin >= 60) {
        fimMin -= 60;
        fimHora += 1;
      }

      const fimHoraStr = String(fimHora).padStart(2, "0");
      const fimMinStr = String(fimMin).padStart(2, "0");

      horarios.push({
        inicio: `${inicioHora}:${inicioMin}`,
        fim: `${fimHoraStr}:${fimMinStr}`,
      });

      minuto += 90;
      while (minuto >= 60) {
        minuto -= 60;
        hora += 1;
      }

      if (hora > 20 || (hora === 20 && minuto > 30)) break;
    }

    return horarios;
  }

  function slotEncerrado(slot: { inicio: string; fim: string }) {
    if (!dataSelecionada) return false;

    const agora = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataEscolhida = new Date(`${dataSelecionada}T12:00:00`);
    dataEscolhida.setHours(0, 0, 0, 0);

    if (dataEscolhida.getTime() !== hoje.getTime()) return false;

    const [horaFim, minFim] = slot.fim.split(":").map(Number);
    const fim = new Date();
    fim.setHours(horaFim, minFim, 0, 0);

    return agora.getTime() >= fim.getTime();
  }

  function bloqueadoAte22h() {
    if (!dataSelecionada) return false;

    const agora = new Date();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataEscolhida = new Date(`${dataSelecionada}T12:00:00`);
    dataEscolhida.setHours(0, 0, 0, 0);

    if (dataEscolhida.getTime() <= hoje.getTime()) return false;

    const dataLiberacao = new Date(dataEscolhida);
    dataLiberacao.setDate(dataLiberacao.getDate() - 1);
    dataLiberacao.setHours(22, 0, 0, 0);

    return agora.getTime() < dataLiberacao.getTime();
  }

  function mensagemLiberacao() {
    if (!dataSelecionada) return "";

    const dataEscolhida = new Date(`${dataSelecionada}T12:00:00`);
    dataEscolhida.setHours(0, 0, 0, 0);

    const dataLiberacao = new Date(dataEscolhida);
    dataLiberacao.setDate(dataLiberacao.getDate() - 1);

    const dia = String(dataLiberacao.getDate()).padStart(2, "0");
    const mes = String(dataLiberacao.getMonth() + 1).padStart(2, "0");
    const ano = dataLiberacao.getFullYear();

    return `Só fica disponível após as 22h do dia ${dia}/${mes}/${ano}.`;
  }

  function dataIndisponivel() {
    if (!dataSelecionada) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataEscolhida = new Date(`${dataSelecionada}T12:00:00`);
    dataEscolhida.setHours(0, 0, 0, 0);

    return dataEscolhida.getTime() < hoje.getTime();
  }

  function abrirModalReserva(slot: { inicio: string; fim: string }) {
    if (!dataSelecionada) {
      setMensagem({ tipo: "erro", texto: "Selecione uma data antes de reservar." });
      return;
    }

    setSlotSelecionado(slot);
    setNomeReserva("");
    setModalAberto(true);
  }

  function fecharModalReserva() {
    setModalAberto(false);
    setSlotSelecionado(null);
    setNomeReserva("");
  }

  async function carregarGrade(data: string) {
    if (!data) return;

    try {
      const res = await fetch(`http://localhost:5001/reservas/grade?data=${data}`);

      if (!res.ok) {
        console.warn("Não foi possível carregar a grade de horários");
        setOcupados([]);
        return;
      }

      const lista = await res.json();

      const ocup = lista
        .filter((s: any) => s.status === "ocupado")
        .map((s: any) => s.inicio);

      setOcupados(ocup);
    } catch (e) {
      console.warn("Erro ao carregar grade");
      setOcupados([]);
    }
  }

  async function confirmarReserva() {
    if (!slotSelecionado) return;

    if (!nomeReserva.trim()) {
      setMensagem({ tipo: "erro", texto: "Digite seu nome para concluir a reserva." });
      return;
    }

    const token = localStorage.getItem("token");

    try {
      setCarregandoReserva(true);

      const res = await fetch("http://localhost:5001/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data_reserva: dataSelecionada,
          horario_inicio: slotSelecionado.inicio,
          horario_fim: slotSelecionado.fim,
          nome_utilizado: nomeReserva.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagem({ tipo: "erro", texto: data.error || "Erro ao criar reserva." });
        return;
      }

      setMensagem({ tipo: "sucesso", texto: "Reserva criada com sucesso!" });
      fecharModalReserva();
      await carregarGrade(dataSelecionada);
      setTimeout(() => {
        window.location.href = "/minhas-reservas";
      }, 700);
    } catch (err) {
      setMensagem({ tipo: "erro", texto: "Erro ao conectar ao servidor." });
    } finally {
      setCarregandoReserva(false);
    }
  }

  const horarios = gerarHorarios();

  return (
    <AuthGuard>
      <div className="space-y-10">
        {mensagem && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              mensagem.tipo === "sucesso"
                ? "border-emerald-800 bg-emerald-950/30 text-emerald-300"
                : "border-red-800 bg-red-950/30 text-red-300"
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 w-fit">
          <label className="block text-sm text-slate-400 mb-1">Selecione a data</label>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => {
              const d = e.target.value;
              setDataSelecionada(d);
              carregarGrade(d);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          />
        </div>

        {bloqueadoAte22h() && (
          <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300">
            {mensagemLiberacao()}
          </div>
        )}

        {dataIndisponivel() && (
          <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4 text-red-300">
            Esta data está indisponível porque já passou.
          </div>
        )}

        <div>
          <h1 className="text-4xl font-bold tracking-tight">Reservas</h1>
          <p className="text-slate-400 mt-2">Cada reserva possui duração de 90 minutos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {horarios.map((slot, index) => (
            <div
              key={index}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 hover:border-blue-500 transition"
            >
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Horário</p>
                  <h2 className="text-2xl font-semibold">{slot.inicio}</h2>
                  <p className="text-slate-500 text-sm">até {slot.fim}</p>
                </div>

                {dataIndisponivel() ? (
                  <span className="bg-red-500/20 text-red-300 text-xs px-3 py-1 rounded-full">
                    Indisponível
                  </span>
                ) : bloqueadoAte22h() ? (
                  <span className="bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full">
                    Bloqueado
                  </span>
                ) : slotEncerrado(slot) ? (
                  <span className="bg-slate-500/20 text-slate-300 text-xs px-3 py-1 rounded-full">
                    Encerrado
                  </span>
                ) : ocupados.includes(slot.inicio) ? (
                  <span className="bg-red-500/20 text-red-400 text-xs px-3 py-1 rounded-full">
                    Ocupado
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full">
                    Livre
                  </span>
                )}
              </div>

              <button
                disabled={dataIndisponivel() || ocupados.includes(slot.inicio) || slotEncerrado(slot) || bloqueadoAte22h()}
                onClick={() => abrirModalReserva(slot)}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 disabled:opacity-40 text-white py-2 rounded-lg font-medium transition"
              >
                Reservar
              </button>
            </div>
          ))}
        </div>

        {modalAberto && slotSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Confirmar reserva</h2>
                  <p className="text-slate-400 mt-2 text-sm">
                    {dataSelecionada} • {slotSelecionado.inicio} até {slotSelecionado.fim}
                  </p>
                </div>
                <button
                  onClick={fecharModalReserva}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-sm text-slate-400">Digite seu nome para a reserva</label>
                <input
                  type="text"
                  value={nomeReserva}
                  onChange={(e) => setNomeReserva(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={confirmarReserva}
                  disabled={carregandoReserva}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {carregandoReserva ? "Reservando..." : "Confirmar reserva"}
                </button>
                <button
                  onClick={fecharModalReserva}
                  disabled={carregandoReserva}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}