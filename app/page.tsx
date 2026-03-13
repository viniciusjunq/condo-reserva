"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type Notificacao = {
  id: number;
  titulo?: string;
  mensagem: string;
  created_at?: string;
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

function getDataHoraReserva(reserva: Reserva) {
  return new Date(`${reserva.data_reserva}T${formatarHora(reserva.horario_inicio)}:00`);
}

export default function HomePage() {
  const [role, setRole] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedNome = localStorage.getItem("nome");
    setRole(storedRole);
    setNome(storedNome);

    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    async function carregarResumo() {
      try {
        const [reservasRes, notificacoesRes] = await Promise.all([
          fetch("http://localhost:5001/reservas/minhas", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:5001/notificacoes/minhas", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (reservasRes.ok) {
          const data = await reservasRes.json();
          setReservas(Array.isArray(data) ? data : []);
        }

        if (notificacoesRes.ok) {
          const data = await notificacoesRes.json();
          setNotificacoes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(error);
        setErro("Não foi possível carregar o resumo da página inicial.");
      } finally {
        setLoading(false);
      }
    }

    carregarResumo();
  }, []);

  const reservasAtivas = useMemo(() => {
    const agora = new Date();
    return reservas
      .filter((reserva) => reserva.status === "ativa")
      .filter((reserva) => {
        const fim = new Date(`${reserva.data_reserva}T${formatarHora(reserva.horario_fim)}:00`);
        return fim > agora;
      })
      .sort((a, b) => getDataHoraReserva(a).getTime() - getDataHoraReserva(b).getTime());
  }, [reservas]);

  const proximaReserva = reservasAtivas[0] || null;
  const ultimaNotificacao = notificacoes[0] || null;

  return (
    <AuthGuard>
      <div className="space-y-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-950/80 p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.2em] text-blue-300">
                Sistema oficial da quadra
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
                Bem-vindo{nome ? `, ${nome}` : ""}
              </h1>
              <p className="text-slate-300 mt-4 text-lg leading-relaxed">
                Gerencie reservas, acompanhe seus horários e visualize rapidamente o status da quadra e os avisos da administração.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  href="/reservas"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white font-medium hover:opacity-90 transition"
                >
                  Reservar agora
                </Link>
                <Link
                  href="/regras"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-slate-200 font-medium hover:bg-slate-800 transition"
                >
                  Ver regras
                </Link>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 w-full lg:max-w-xl">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="text-sm text-slate-400">Reservas ativas</p>
                <h2 className="text-3xl font-bold mt-2">{loading ? "..." : reservasAtivas.length}</h2>
                <p className="text-xs text-slate-500 mt-2">Horários futuros ainda válidos na sua conta.</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="text-sm text-slate-400">Próxima reserva</p>
                <h2 className="text-lg font-semibold mt-2">
                  {loading
                    ? "Carregando..."
                    : proximaReserva
                      ? `${formatarData(proximaReserva.data_reserva)} • ${formatarHora(proximaReserva.horario_inicio)}`
                      : "Nenhuma futura"}
                </h2>
                <p className="text-xs text-slate-500 mt-2">Acompanhe o próximo horário reservado.</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 sm:col-span-2">
                <p className="text-sm text-slate-400">Aviso mais recente</p>
                <h2 className="text-base font-semibold mt-2">
                  {loading ? "Carregando..." : ultimaNotificacao?.titulo || "Nenhum aviso recente"}
                </h2>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                  {loading
                    ? "Aguarde enquanto carregamos as informações do sistema."
                    : ultimaNotificacao?.mensagem || "Assim que houver novos comunicados, eles aparecerão aqui."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {erro && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {erro}
          </div>
        )}

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          <Link href="/reservas" className="group">
            <div className="h-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">
              <div className="text-3xl">📅</div>
              <h2 className="text-xl font-semibold mt-4 group-hover:text-blue-300 transition">Reservas</h2>
              <p className="text-slate-400 mt-2">Visualize a grade, escolha uma data e reserve horários disponíveis.</p>
            </div>
          </Link>

          <Link href="/minhas-reservas" className="group">
            <div className="h-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">
              <div className="text-3xl">🗂️</div>
              <h2 className="text-xl font-semibold mt-4 group-hover:text-blue-300 transition">Minhas Reservas</h2>
              <p className="text-slate-400 mt-2">Acompanhe reservas ativas, encerradas, canceladas e próximas utilizações.</p>
            </div>
          </Link>

          <Link href="/regras" className="group">
            <div className="h-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">
              <div className="text-3xl">📘</div>
              <h2 className="text-xl font-semibold mt-4 group-hover:text-blue-300 transition">Regras e Informações</h2>
              <p className="text-slate-400 mt-2">Consulte as regras de liberação, cancelamento e uso correto da quadra.</p>
            </div>
          </Link>

          {role === "admin" ? (
            <Link href="/admin" className="group">
              <div className="h-full bg-slate-900/60 border border-blue-600/50 rounded-2xl p-6 hover:border-blue-400 transition">
                <div className="text-3xl">🛠️</div>
                <h2 className="text-xl font-semibold text-blue-300 mt-4">Painel Admin</h2>
                <p className="text-slate-400 mt-2">Acesse moradores, relatórios, reservas, reclamações e notificações.</p>
              </div>
            </Link>
          ) : (
            <Link href="/login" className="group">
              <div className="h-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-blue-500 transition">
                <div className="text-3xl">🔐</div>
                <h2 className="text-xl font-semibold mt-4 group-hover:text-blue-300 transition">Login</h2>
                <p className="text-slate-400 mt-2">Entre com sua conta para acessar reservas, avisos e funcionalidades do sistema.</p>
              </div>
            </Link>
          )}
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">Como funciona a liberação dos horários</h2>
            <div className="space-y-3 mt-4 text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Datas passadas</p>
                <p className="text-sm text-slate-400 mt-1">Ficam indisponíveis automaticamente e não aceitam novas reservas.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Horários do dia atual</p>
                <p className="text-sm text-slate-400 mt-1">Slots já encerrados aparecem como indisponíveis ou encerrados no sistema.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Dias futuros</p>
                <p className="text-sm text-slate-400 mt-1">A abertura segue a regra das 22h do dia anterior à data escolhida.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">Avisos e acesso rápido</h2>
            <div className="space-y-4 mt-4">
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-200">
                <p className="font-medium">Importante</p>
                <p className="text-sm mt-1 text-yellow-100/80">
                  Horários bloqueados pela administração ou já ocupados não ficam disponíveis para nova reserva.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Link
                  href="/reservas"
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:bg-slate-800 transition"
                >
                  <p className="font-medium">Ver grade da quadra</p>
                  <p className="text-sm text-slate-400 mt-1">Confira rapidamente os horários disponíveis.</p>
                </Link>

                <Link
                  href="/minhas-reservas"
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:bg-slate-800 transition"
                >
                  <p className="font-medium">Acompanhar minhas reservas</p>
                  <p className="text-sm text-slate-400 mt-1">Consulte reservas futuras, encerradas ou canceladas.</p>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}