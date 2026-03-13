"use client";

import React from "react";
import AuthGuard from "@/componentes/AuthGuard";

type Reserva = {
  id: number;
  data_reserva: string;
  horario_inicio: string;
  horario_fim: string;
  status: string;
  numero_casa: string;
  nome_utilizado: string;
};

function formatarData(data: string) {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarHora(hora: string) {
  return String(hora).slice(0, 5);
}

function getDateTimeFim(reserva: Reserva) {
  const data = new Date(reserva.data_reserva);
  const [hora, minuto] = String(reserva.horario_fim).slice(0, 5).split(":").map(Number);
  data.setHours(hora, minuto, 0, 0);
  return data;
}

function getStatusVisual(reserva: Reserva) {
  if (reserva.status === "cancelada") {
    return {
      label: "cancelada",
      classes: "bg-red-500/15 text-red-300 border border-red-500/30",
    };
  }

  const agora = new Date();
  const fim = getDateTimeFim(reserva);

  if (fim <= agora) {
    return {
      label: "encerrada",
      classes: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
    };
  }

  return {
    label: "ativa",
    classes: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  };
}

function ordenarReservas(reservas: Reserva[]) {
  return [...reservas].sort((a, b) => {
    const dataA = new Date(`${a.data_reserva}T${formatarHora(a.horario_inicio)}:00`).getTime();
    const dataB = new Date(`${b.data_reserva}T${formatarHora(b.horario_inicio)}:00`).getTime();
    return dataA - dataB;
  });
}

export default function MinhasReservasPage() {
  const [reservas, setReservas] = React.useState<Reserva[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState("");
  const [cancelandoId, setCancelandoId] = React.useState<number | null>(null);
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = React.useState(false);
  const [reservaSelecionada, setReservaSelecionada] = React.useState<Reserva | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [motivoAdmin, setMotivoAdmin] = React.useState("");

  function abrirModalCancelamento(reserva: Reserva) {
    setReservaSelecionada(reserva);
    setModalCancelamentoAberto(true);
    setErro("");
    setMotivoAdmin("");
  }

  function fecharModalCancelamento() {
    setModalCancelamentoAberto(false);
    setReservaSelecionada(null);
    setMotivoAdmin("");
  }

  async function cancelarReserva(id: number) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (role === "admin" && !motivoAdmin.trim()) {
      setErro("Informe o motivo do cancelamento da reserva.");
      return;
    }

    try {
      setCancelandoId(id);
      setErro("");

      const res = await fetch(`http://localhost:5001/reservas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          role === "admin"
            ? { motivo_admin: motivoAdmin.trim() }
            : {}
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Não foi possível cancelar a reserva.");
        return;
      }

      setReservas((prev) =>
        prev.map((reserva) =>
          reserva.id === id ? { ...reserva, status: "cancelada" } : reserva
        )
      );

      setErro("");
      fecharModalCancelamento();
    } catch (err) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setCancelandoId(null);
    }
  }

  React.useEffect(() => {
    async function carregar() {
      const token = localStorage.getItem("token");
      const roleStorage = localStorage.getItem("role");
      setRole(roleStorage);

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:5001/reservas/minhas", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setErro(data.error || "Erro ao carregar reservas");
          return;
        }

        setReservas(data);
      } catch (err) {
        setErro("Erro ao conectar com o servidor");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  const reservasOrdenadas = ordenarReservas(reservas);
  const reservasAtivas = reservasOrdenadas.filter(
    (reserva) => getStatusVisual(reserva).label === "ativa"
  );
  const reservasEncerradas = reservasOrdenadas.filter(
    (reserva) => getStatusVisual(reserva).label === "encerrada"
  );
  const reservasCanceladas = reservasOrdenadas.filter(
    (reserva) => getStatusVisual(reserva).label === "cancelada"
  );
  const proximaReserva = reservasAtivas[0];

  return (
    <AuthGuard>
      <div className="space-y-10">
        <div className="space-y-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Minhas Reservas</h1>
            <p className="text-slate-400 mt-2">
              Acompanhe seus horários reservados, próximas utilizações e histórico.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Reservas ativas</p>
              <h2 className="text-3xl font-bold mt-2">{reservasAtivas.length}</h2>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Encerradas</p>
              <h2 className="text-3xl font-bold mt-2">{reservasEncerradas.length}</h2>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Canceladas</p>
              <h2 className="text-3xl font-bold mt-2">{reservasCanceladas.length}</h2>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Próxima reserva</p>
              <h2 className="text-lg font-semibold mt-2">
                {proximaReserva
                  ? `${formatarData(proximaReserva.data_reserva)} • ${formatarHora(
                      proximaReserva.horario_inicio
                    )}`
                  : "Nenhuma reserva futura"}
              </h2>
            </div>
          </div>
        </div>

        {carregando && <div className="text-slate-400">Carregando reservas...</div>}

        {erro && <div className="text-red-400">{erro}</div>}
        {!erro && modalCancelamentoAberto === false && cancelandoId === null && reservaSelecionada === null && (
          <></>
        )}

        {!carregando && !erro && reservas.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="text-5xl">📅</div>
            <h2 className="text-2xl font-semibold">Nenhuma reserva encontrada</h2>
            <p className="text-slate-400">
              Você ainda não tem nenhuma reserva registrada na sua conta.
            </p>
            <a
              href="/reservas"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:opacity-90 transition px-5 py-3 text-white font-medium"
            >
              Fazer nova reserva
            </a>
          </div>
        )}

        {!carregando && !erro && reservas.length > 0 && (
          <>
            {proximaReserva && (
              <div className="bg-gradient-to-r from-blue-600/15 to-slate-900/60 border border-blue-500/30 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-blue-300">Próxima reserva</p>
                    <h2 className="text-2xl font-bold mt-2">{proximaReserva.nome_utilizado}</h2>
                    <p className="text-slate-300 mt-2">
                      {formatarData(proximaReserva.data_reserva)} • {formatarHora(
                        proximaReserva.horario_inicio
                      )} — {formatarHora(proximaReserva.horario_fim)}
                    </p>
                    <p className="text-slate-400 mt-1">Casa {proximaReserva.numero_casa}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-medium ${getStatusVisual(
                        proximaReserva
                      ).classes}`}
                    >
                      {getStatusVisual(proximaReserva).label}
                    </span>
                    <button
                      onClick={() => abrirModalCancelamento(proximaReserva)}
                      disabled={cancelandoId === proximaReserva.id}
                      className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition"
                    >
                      {cancelandoId === proximaReserva.id ? "Cancelando..." : "Cancelar reserva"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold">Todas as reservas</h2>
                <p className="text-slate-400 mt-1">
                  Visualize os detalhes de cada horário registrado na sua conta.
                </p>
              </div>

              <div className="grid gap-5">
                {reservasOrdenadas.map((reserva) => {
                  const statusVisual = getStatusVisual(reserva);
                  const podeCancelar = statusVisual.label === "ativa";

                  return (
                    <div
                      key={reserva.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-2xl font-semibold">{reserva.nome_utilizado}</h3>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusVisual.classes}`}
                            >
                              {statusVisual.label}
                            </span>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-4 text-slate-300">
                            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Data</p>
                              <p className="mt-2 font-medium">{formatarData(reserva.data_reserva)}</p>
                            </div>

                            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Horário</p>
                              <p className="mt-2 font-medium">
                                {formatarHora(reserva.horario_inicio)} — {formatarHora(reserva.horario_fim)}
                              </p>
                            </div>

                            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Casa</p>
                              <p className="mt-2 font-medium">{reserva.numero_casa}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {podeCancelar && (
                            <button
                              onClick={() => abrirModalCancelamento(reserva)}
                              disabled={cancelandoId === reserva.id}
                              className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition"
                            >
                              {cancelandoId === reserva.id ? "Cancelando..." : "Cancelar"}
                            </button>
                          )}

                          <a
                            href="/reservas"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                          >
                            Reservar novamente
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {modalCancelamentoAberto && reservaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Cancelar reserva</h2>
                  <p className="text-slate-400 mt-2 text-sm">
                    {formatarData(reservaSelecionada.data_reserva)} • {formatarHora(
                      reservaSelecionada.horario_inicio
                    )} — {formatarHora(reservaSelecionada.horario_fim)}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Casa {reservaSelecionada.numero_casa}
                  </p>
                </div>
                <button
                  onClick={fecharModalCancelamento}
                  disabled={cancelandoId === reservaSelecionada.id}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                Tem certeza que deseja cancelar esta reserva? Esta ação não poderá ser desfeita.
              </div>
              {role === "admin" && (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-slate-400">Motivo do cancelamento</label>
                  <textarea
                    value={motivoAdmin}
                    onChange={(e) => setMotivoAdmin(e.target.value)}
                    rows={4}
                    placeholder="Explique o motivo do cancelamento"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-200 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => cancelarReserva(reservaSelecionada.id)}
                  disabled={cancelandoId === reservaSelecionada.id}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {cancelandoId === reservaSelecionada.id ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
                <button
                  onClick={fecharModalCancelamento}
                  disabled={cancelandoId === reservaSelecionada.id}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:bg-slate-800 transition"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}