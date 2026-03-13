"use client";

import { useEffect, useMemo, useState } from "react";
import { gerarHorarios } from "../utils/horarios";
import AuthGuard from "@/componentes/AuthGuard";

type Slot = {
  inicio: string;
  fim: string;
  bloqueado: boolean;
  motivo?: string;
};

type DashboardData = {
  reservas_hoje: number;
  reservas_30_dias: number;
  moradores_ativos: number;
  horario_mais_reservado: {
    horario_inicio: string;
    total: number;
  } | null;
};

type Morador = {
  id: number;
  email: string;
  numero_casa: string;
  ativo: boolean;
  is_admin: boolean;
};

type ReservaAdmin = {
  id: number;
  morador_id?: number;
  nome_utilizado: string;
  data_reserva: string;
  horario_inicio: string;
  horario_fim: string;
  status: string;
  numero_casa?: string;
  email?: string;
};

type Reclamacao = {
  id: number;
  titulo: string;
  status: string;
  numero_casa?: string;
  email?: string;
};

type Notificacao = {
  id: number;
  titulo?: string;
  mensagem: string;
  created_at?: string;
  numero_casa?: string | null;
  email?: string | null;
};

function formatarData(data: string) {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarHora(hora: string) {
  return String(hora).slice(0, 5);
}

function classesStatusReserva(status: string) {
  if (status === "ativa") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  }

  if (status === "cancelada") {
    return "bg-red-500/15 text-red-300 border border-red-500/30";
  }

  return "bg-slate-500/15 text-slate-300 border border-slate-500/30";
}

export default function AdminPage() {
  const horariosBase = gerarHorarios();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [slots, setSlots] = useState<Slot[]>(
    horariosBase.map((h) => ({
      ...h,
      bloqueado: false,
      motivo: "",
    }))
  );
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [acaoMsg, setAcaoMsg] = useState("");
  const [cancelandoReservaId, setCancelandoReservaId] = useState<number | null>(null);
  const [baixandoCsv, setBaixandoCsv] = useState(false);
  const [baixandoJson, setBaixandoJson] = useState(false);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [slotBloqueioIndex, setSlotBloqueioIndex] = useState<number | null>(null);
  const [bloquearTodosSelecionado, setBloquearTodosSelecionado] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [reservaSelecionada, setReservaSelecionada] = useState<ReservaAdmin | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [interditarAposCancelar, setInterditarAposCancelar] = useState(false);
  const abrirModalBloqueio = (index: number | null, bloquearTodos = false) => {
    setSlotBloqueioIndex(index);
    setBloquearTodosSelecionado(bloquearTodos);
    setMotivoBloqueio("");
    setModalBloqueioAberto(true);
    setErro("");
  };

  const fecharModalBloqueio = () => {
    setModalBloqueioAberto(false);
    setSlotBloqueioIndex(null);
    setBloquearTodosSelecionado(false);
    setMotivoBloqueio("");
  };

  const confirmarBloqueio = () => {
    if (!motivoBloqueio.trim()) {
      setErro("Informe o motivo do bloqueio.");
      return;
    }

    if (bloquearTodosSelecionado) {
      setSlots(
        slots.map((s) => ({
          ...s,
          bloqueado: true,
          motivo: motivoBloqueio.trim(),
        }))
      );
      setAcaoMsg("Todos os horários foram marcados como bloqueados visualmente no painel.");
      fecharModalBloqueio();
      return;
    }

    if (slotBloqueioIndex === null) return;

    const novos = [...slots];
    novos[slotBloqueioIndex].bloqueado = true;
    novos[slotBloqueioIndex].motivo = motivoBloqueio.trim();
    setSlots(novos);
    setAcaoMsg("Bloqueio visual aplicado no painel. Para persistir no banco, integre esta ação à rota de bloqueios.");
    fecharModalBloqueio();
  };

  const abrirModalCancelamento = (reserva: ReservaAdmin) => {
    setReservaSelecionada(reserva);
    setMotivoCancelamento("");
    setInterditarAposCancelar(false);
    setModalCancelamentoAberto(true);
    setErro("");
  };

  const fecharModalCancelamento = () => {
    setModalCancelamentoAberto(false);
    setReservaSelecionada(null);
    setMotivoCancelamento("");
    setInterditarAposCancelar(false);
  };

  const moradoresComuns = useMemo(
    () => moradores.filter((m) => !m.is_admin),
    [moradores]
  );

  const reservasRecentes = useMemo(
    () => [...reservas].slice(0, 8),
    [reservas]
  );

  const reclamacoesPendentes = useMemo(
    () => reclamacoes.filter((r) => r.status !== "resolvida"),
    [reclamacoes]
  );

  const horariosBloqueados = slots.filter((s) => s.bloqueado).length;

  async function carregarPainel() {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      window.location.href = "/";
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setErro("");

      const [dashboardResponse, moradoresResponse, reservasResponse, reclamacoesResponse, notificacoesResponse] = await Promise.all([
        fetch("http://localhost:5001/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5001/admin/moradores", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5001/admin/reservas?page=1&limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5001/reclamacoes/admin", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:5001/notificacoes/admin", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!dashboardResponse.ok) throw new Error("Erro ao carregar dashboard");
      if (!moradoresResponse.ok) throw new Error("Erro ao carregar moradores");
      if (!reservasResponse.ok) throw new Error("Erro ao carregar reservas");
      if (!reclamacoesResponse.ok) throw new Error("Erro ao carregar reclamações");
      if (!notificacoesResponse.ok) throw new Error("Erro ao carregar notificações");

      const dashboardData = await dashboardResponse.json();
      const moradoresData = await moradoresResponse.json();
      const reservasData = await reservasResponse.json();
      const reclamacoesData = await reclamacoesResponse.json();
      const notificacoesData = await notificacoesResponse.json();

      setDashboard(dashboardData);
      setMoradores(Array.isArray(moradoresData) ? moradoresData : []);
      setReservas(Array.isArray(reservasData?.reservas) ? reservasData.reservas : []);
      setReclamacoes(Array.isArray(reclamacoesData) ? reclamacoesData : []);
      setNotificacoes(Array.isArray(notificacoesData) ? notificacoesData : []);
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar o painel administrativo.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPainel();
  }, []);

  const bloquearSlot = (index: number) => {
    abrirModalBloqueio(index, false);
  };

  const liberarSlot = (index: number) => {
    const novos = [...slots];
    novos[index].bloqueado = false;
    novos[index].motivo = "";
    setSlots(novos);
    setAcaoMsg("Liberação visual aplicada no painel. Para persistir no banco, integre esta ação à rota de bloqueios.");
  };

  const bloquearTodos = () => {
    abrirModalBloqueio(null, true);
  };

  const liberarTodos = () => {
    setSlots(
      slots.map((s) => ({
        ...s,
        bloqueado: false,
        motivo: "",
      }))
    );
    setAcaoMsg("Todos os horários foram liberados visualmente no painel.");
  };

  const desativarMorador = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch(`http://localhost:5001/admin/moradores/${id}/desativar`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    setMoradores((prev) =>
      prev.map((morador) =>
        morador.id === id ? { ...morador, ativo: false } : morador
      )
    );
    setAcaoMsg("Morador desativado com sucesso.");
  };

  const ativarMorador = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch(`http://localhost:5001/admin/moradores/${id}/ativar`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    setMoradores((prev) =>
      prev.map((morador) =>
        morador.id === id ? { ...morador, ativo: true } : morador
      )
    );
    setAcaoMsg("Morador ativado com sucesso.");
  };

  const cancelarReserva = async (reserva: ReservaAdmin) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!motivoCancelamento.trim()) {
      setErro("Informe o motivo do cancelamento desta reserva.");
      return;
    }

    try {
      setCancelandoReservaId(reserva.id);
      setErro("");

      const response = await fetch(`http://localhost:5001/reservas/${reserva.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motivo_admin: motivoCancelamento.trim(),
          interditar: interditarAposCancelar,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Não foi possível cancelar a reserva.");
        return;
      }

      setReservas((prev) =>
        prev.map((item) =>
          item.id === reserva.id ? { ...item, status: "cancelada" } : item
        )
      );
      setAcaoMsg(data.message || "Reserva cancelada com sucesso.");
      fecharModalCancelamento();
    } catch (error) {
      console.error(error);
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCancelandoReservaId(null);
    }
  };

  const baixarRelatorioCsv = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setBaixandoCsv(true);
      const response = await fetch("http://localhost:5001/admin/relatorio/reservas/export", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao baixar CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio_reservas.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setAcaoMsg("Relatório CSV baixado com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível baixar o relatório CSV.");
    } finally {
      setBaixandoCsv(false);
    }
  };

  const baixarRelatorioJson = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setBaixandoJson(true);
      const response = await fetch("http://localhost:5001/admin/relatorio/reservas?dias=60", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao baixar JSON");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio_reservas.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setAcaoMsg("Relatório JSON baixado com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível baixar o relatório JSON.");
    } finally {
      setBaixandoJson(false);
    }
  };

  const irParaSecao = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-slate-400 mt-2">
            Visão geral, gestão de moradores, reservas, relatórios e controle da quadra.
          </p>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        {acaoMsg && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {acaoMsg}
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Reservas hoje</p>
            <h2 className="text-3xl font-bold mt-2">{dashboard?.reservas_hoje ?? "..."}</h2>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Reservas 30 dias</p>
            <h2 className="text-3xl font-bold mt-2">{dashboard?.reservas_30_dias ?? "..."}</h2>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Moradores ativos</p>
            <h2 className="text-3xl font-bold mt-2">{dashboard?.moradores_ativos ?? "..."}</h2>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400">Horários bloqueados</p>
            <h2 className="text-3xl font-bold mt-2">{horariosBloqueados}</h2>
            <p className="text-xs text-slate-500 mt-2">
              Mais reservado: {dashboard?.horario_mais_reservado?.horario_inicio ?? "-"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <button
            onClick={() => irParaSecao("secao-reservas")}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Ver reservas
          </button>
          <button
            onClick={() => irParaSecao("secao-moradores")}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Gerenciar moradores
          </button>
          <button
            onClick={() => irParaSecao("secao-reclamacoes")}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Ver reclamações
          </button>
          <button
            onClick={() => irParaSecao("secao-notificacoes")}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Ver notificações
          </button>
          <button
            onClick={() => irParaSecao("secao-relatorios")}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Relatórios
          </button>
        </div>

        <div id="secao-relatorios" className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Relatórios de reservas</h2>
              <p className="text-slate-400 mt-1">
                Exporte os dados completos das reservas em CSV ou JSON.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={baixarRelatorioCsv}
                disabled={baixandoCsv}
                className="rounded-lg bg-blue-600/20 px-4 py-2 text-sm text-blue-300 hover:bg-blue-600/30 disabled:opacity-50"
              >
                {baixandoCsv ? "Baixando CSV..." : "Baixar CSV"}
              </button>
              <button
                onClick={baixarRelatorioJson}
                disabled={baixandoJson}
                className="rounded-lg bg-purple-600/20 px-4 py-2 text-sm text-purple-300 hover:bg-purple-600/30 disabled:opacity-50"
              >
                {baixandoJson ? "Baixando JSON..." : "Baixar JSON"}
              </button>
            </div>
          </div>
        </div>

        <div id="secao-moradores" className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Moradores cadastrados</h2>
            <span className="text-sm text-slate-400">
              {moradoresComuns.length} moradores
            </span>
          </div>

          {carregando ? (
            <p className="text-slate-400">Carregando moradores...</p>
          ) : (
            <div className="space-y-3">
              {moradores.length === 0 ? (
                <p className="text-slate-400">Nenhum morador encontrado.</p>
              ) : (
                moradores.map((morador) => (
                  <div
                    key={morador.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        Casa {morador.numero_casa} {morador.is_admin ? "(Admin)" : ""}
                      </p>
                      <p className="text-sm text-slate-400">{morador.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Status: {morador.ativo ? "Ativo" : "Inativo"}
                      </p>
                    </div>

                    {!morador.is_admin && (
                      morador.ativo ? (
                        <button
                          onClick={() => desativarMorador(morador.id)}
                          className="rounded-lg bg-red-600/20 px-4 py-2 text-sm text-red-400"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => ativarMorador(morador.id)}
                          className="rounded-lg bg-emerald-600/20 px-4 py-2 text-sm text-emerald-400"
                        >
                          Ativar
                        </button>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div id="secao-reservas" className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Reservas dos moradores</h2>
            <span className="text-sm text-slate-400">{reservas.length} registros</span>
          </div>

          {carregando ? (
            <p className="text-slate-400">Carregando reservas...</p>
          ) : reservas.length === 0 ? (
            <p className="text-slate-400">Nenhuma reserva encontrada.</p>
          ) : (
            <div className="space-y-3">
              {reservasRecentes.map((reserva) => (
                <div
                  key={reserva.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold">{reserva.nome_utilizado}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${classesStatusReserva(reserva.status)}`}>
                          {reserva.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Casa {reserva.numero_casa ?? "-"} • {reserva.email ?? "-"}
                      </p>
                      <p className="text-sm text-slate-300">
                        {formatarData(reserva.data_reserva)} • {formatarHora(reserva.horario_inicio)} — {formatarHora(reserva.horario_fim)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {reserva.status === "ativa" && (
                        <button
                          onClick={() => abrirModalCancelamento(reserva)}
                          disabled={cancelandoReservaId === reserva.id}
                          className="rounded-lg bg-red-600/20 px-4 py-2 text-sm text-red-300 hover:bg-red-600/30 disabled:opacity-50"
                        >
                          {cancelandoReservaId === reserva.id ? "Cancelando..." : "Cancelar reserva"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div id="secao-reclamacoes" className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Reclamações</h2>
            <span className="text-sm text-slate-400">
              {reclamacoesPendentes.length} pendentes
            </span>
          </div>
          <div className="space-y-2">
            {reclamacoes.length === 0 ? (
              <p className="text-slate-400">Nenhuma reclamação registrada.</p>
            ) : (
              reclamacoes.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                  <span className="font-medium">{r.titulo}</span>
                  <span className="text-slate-500"> — {r.status}</span>
                  {(r.numero_casa || r.email) && (
                    <div className="text-xs text-slate-500 mt-1">
                      Casa {r.numero_casa ?? "-"} • {r.email ?? "-"}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div id="secao-notificacoes" className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Notificações enviadas</h2>
          <div className="space-y-2">
            {notificacoes.length === 0 ? (
              <p className="text-slate-400">Nenhuma notificação registrada.</p>
            ) : (
              notificacoes.map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                  <div className="font-medium">{n.titulo || "Notificação"}</div>
                  <div className="text-slate-400 mt-1">{n.mensagem}</div>
                  {(n.numero_casa || n.email || n.created_at) && (
                    <div className="text-xs text-slate-500 mt-2">
                      {[n.numero_casa ? `Casa ${n.numero_casa}` : null, n.email ?? null, n.created_at ? formatarData(n.created_at) : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Controle visual dos horários da quadra</h2>
            <p className="text-slate-400 mt-1">
              Esta parte do painel já funciona visualmente. Para persistir no banco, a próxima integração deve ligar estes botões às rotas de bloqueios.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={bloquearTodos}
              className="bg-yellow-600/20 text-yellow-400 px-6 py-2 rounded-lg"
            >
              Bloquear todos
            </button>

            <button
              onClick={liberarTodos}
              className="bg-emerald-600/20 text-emerald-400 px-6 py-2 rounded-lg"
            >
              Liberar todos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {slots.map((slot, index) => (
              <div
                key={index}
                className={`rounded-xl p-6 border transition ${
                  slot.bloqueado
                    ? "bg-red-900/40 border-red-700"
                    : "bg-slate-900/60 border-slate-800 hover:border-blue-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-semibold">{slot.inicio}</h2>
                    <p className="text-slate-400 text-sm">até {slot.fim}</p>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      slot.bloqueado
                        ? "bg-red-500/20 text-red-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {slot.bloqueado ? "Bloqueado" : "Livre"}
                  </span>
                </div>

                {slot.bloqueado && (
                  <p className="text-red-300 text-sm mt-4">Motivo: {slot.motivo}</p>
                )}

                <div className="mt-6">
                  {slot.bloqueado ? (
                    <button
                      onClick={() => liberarSlot(index)}
                      className="w-full bg-emerald-600/20 text-emerald-400 py-2 rounded-lg"
                    >
                      Liberar
                    </button>
                  ) : (
                    <button
                      onClick={() => bloquearSlot(index)}
                      className="w-full bg-red-600/20 text-red-400 py-2 rounded-lg"
                    >
                      Bloquear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {modalBloqueioAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {bloquearTodosSelecionado ? "Bloquear todos os horários" : "Bloquear horário"}
                  </h2>
                  <p className="text-slate-400 mt-2 text-sm">
                    {bloquearTodosSelecionado
                      ? "Informe o motivo para bloquear visualmente todos os horários da quadra."
                      : slotBloqueioIndex !== null
                        ? `${slots[slotBloqueioIndex].inicio} até ${slots[slotBloqueioIndex].fim}`
                        : "Selecione um motivo para o bloqueio."}
                  </p>
                </div>
                <button
                  onClick={fecharModalBloqueio}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-sm text-slate-400">Motivo do bloqueio</label>
                <textarea
                  value={motivoBloqueio}
                  onChange={(e) => setMotivoBloqueio(e.target.value)}
                  rows={4}
                  placeholder="Descreva o motivo do bloqueio"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-200 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={confirmarBloqueio}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-white font-medium hover:opacity-90 transition"
                >
                  Confirmar bloqueio
                </button>
                <button
                  onClick={fecharModalBloqueio}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:bg-slate-800 transition"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}

        {modalCancelamentoAberto && reservaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Cancelar reserva</h2>
                  <p className="text-slate-400 mt-2 text-sm">
                    {reservaSelecionada.nome_utilizado} • Casa {reservaSelecionada.numero_casa ?? "-"}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    {formatarData(reservaSelecionada.data_reserva)} • {formatarHora(reservaSelecionada.horario_inicio)} — {formatarHora(reservaSelecionada.horario_fim)}
                  </p>
                </div>
                <button
                  onClick={fecharModalCancelamento}
                  disabled={cancelandoReservaId === reservaSelecionada.id}
                  className="text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-sm text-slate-400">Motivo do cancelamento</label>
                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={4}
                  placeholder="Explique o motivo do cancelamento"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-200 outline-none focus:border-blue-500 resize-none"
                />

                <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={interditarAposCancelar}
                    onChange={(e) => setInterditarAposCancelar(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Interditar este mesmo horário após o cancelamento
                </label>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => cancelarReserva(reservaSelecionada)}
                  disabled={cancelandoReservaId === reservaSelecionada.id}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {cancelandoReservaId === reservaSelecionada.id ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
                <button
                  onClick={fecharModalCancelamento}
                  disabled={cancelandoReservaId === reservaSelecionada.id}
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