"use client";

import React from "react";
import AuthGuard from "@/componentes/AuthGuard";

type RegraItem = {
  id: string;
  titulo: string;
  conteudo: string;
};

const REGRAS_PADRAO: RegraItem[] = [
  {
    id: "reservas",
    titulo: "Reservas",
    conteudo:
      "As reservas seguem os horários fixos da quadra. Datas passadas ficam indisponíveis, horários já encerrados no dia atual não podem ser reservados e datas futuras só ficam liberadas após as 22h do dia anterior.",
  },
  {
    id: "cancelamentos",
    titulo: "Cancelamentos",
    conteudo:
      "Moradores podem cancelar a própria reserva com antecedência mínima de 30 minutos. O administrador pode cancelar reservas com motivo informado e, se necessário, interditar o mesmo horário logo após o cancelamento.",
  },
  {
    id: "bloqueios",
    titulo: "Bloqueios administrativos",
    conteudo:
      "A administração pode bloquear horários por manutenção, eventos internos ou necessidade operacional. Horários bloqueados não ficam disponíveis para reserva e devem ser respeitados por todos os moradores.",
  },
  {
    id: "uso",
    titulo: "Uso da quadra",
    conteudo:
      "O morador responsável pela reserva deve utilizar a quadra dentro do horário definido, preservar o espaço e respeitar as normas do condomínio. O uso inadequado pode gerar advertência ou suspensão do acesso.",
  },
  {
    id: "observacoes",
    titulo: "Observações gerais",
    conteudo:
      "Sempre consulte a grade antes de reservar. Em caso de avisos da administração, interdições, manutenção ou atualização das regras, as mudanças passam a valer conforme informado no sistema.",
  },
];

const STORAGE_KEY = "regras_condo_reserva";

export default function RegrasPage() {
  const [role, setRole] = React.useState<string | null>(null);
  const [editando, setEditando] = React.useState(false);
  const [salvoMsg, setSalvoMsg] = React.useState("");
  const [regras, setRegras] = React.useState<RegraItem[]>(REGRAS_PADRAO);

  React.useEffect(() => {
    const roleStorage = localStorage.getItem("role");
    setRole(roleStorage);

    const regrasStorage = localStorage.getItem(STORAGE_KEY);
    if (regrasStorage) {
      try {
        const parsed = JSON.parse(regrasStorage);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRegras(parsed);
        }
      } catch (error) {
        console.error("Erro ao carregar regras salvas", error);
      }
    }
  }, []);

  function atualizarCampo(id: string, campo: "titulo" | "conteudo", valor: string) {
    setRegras((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  }

  function salvarAlteracoes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regras));
    setEditando(false);
    setSalvoMsg("Regras atualizadas com sucesso.");
    setTimeout(() => setSalvoMsg(""), 3000);
  }

  function restaurarPadrao() {
    const confirmar = window.confirm("Deseja restaurar os textos padrão das regras?");
    if (!confirmar) return;

    setRegras(REGRAS_PADRAO);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(REGRAS_PADRAO));
    setEditando(false);
    setSalvoMsg("Regras padrão restauradas com sucesso.");
    setTimeout(() => setSalvoMsg(""), 3000);
  }

  const admin = role === "admin";

  return (
    <AuthGuard>
      <div className="space-y-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-950/80 p-8 md:p-10">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-300">
              Regras e informações
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
              Uso da quadra e funcionamento do sistema
            </h1>
            <p className="text-slate-300 mt-4 text-lg leading-relaxed">
              Consulte abaixo as regras de reservas, cancelamentos, bloqueios e uso correto da quadra. Essas orientações ajudam a manter o sistema organizado e justo para todos os moradores.
            </p>
          </div>
        </section>

        {salvoMsg && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {salvoMsg}
          </div>
        )}

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">Resumo rápido</h2>
            <div className="space-y-3 mt-4 text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Datas passadas</p>
                <p className="text-sm text-slate-400 mt-1">
                  Ficam indisponíveis automaticamente e não podem mais receber novas reservas.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Horários do dia atual</p>
                <p className="text-sm text-slate-400 mt-1">
                  Horários já encerrados aparecem como indisponíveis ou encerrados no sistema.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Dias futuros</p>
                <p className="text-sm text-slate-400 mt-1">
                  As reservas futuras obedecem a abertura após as 22h do dia anterior à data escolhida.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">Perguntas frequentes</h2>
            <div className="space-y-4 mt-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Quando os horários abrem?</p>
                <p className="text-sm text-slate-400 mt-1">
                  Os horários ficam disponíveis conforme a regra de liberação do sistema, considerando a abertura após as 22h do dia anterior.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">Posso cancelar uma reserva?</p>
                <p className="text-sm text-slate-400 mt-1">
                  Sim. O cancelamento pelo morador depende da antecedência mínima exigida no sistema.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-medium">O que acontece se a quadra estiver bloqueada?</p>
                <p className="text-sm text-slate-400 mt-1">
                  Horários bloqueados pela administração não ficam disponíveis para reserva até que sejam liberados.
                </p>
              </div>
            </div>
          </div>
        </section>

        {admin && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Modo administrador</h2>
                <p className="text-slate-400 mt-1">
                  Como admin, você pode editar os textos desta página e salvar as alterações diretamente no navegador.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {!editando ? (
                  <button
                    onClick={() => setEditando(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:opacity-90 transition"
                  >
                    Editar regras
                  </button>
                ) : (
                  <>
                    <button
                      onClick={salvarAlteracoes}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:opacity-90 transition"
                    >
                      Salvar alterações
                    </button>
                    <button
                      onClick={() => setEditando(false)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                    >
                      Cancelar edição
                    </button>
                  </>
                )}

                <button
                  onClick={restaurarPadrao}
                  className="rounded-lg border border-red-700 px-4 py-2 text-sm text-red-300 hover:bg-red-950/30 transition"
                >
                  Restaurar padrão
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-6">
          {regras.map((regra) => (
            <div
              key={regra.id}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6"
            >
              {editando && admin ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={regra.titulo}
                    onChange={(e) => atualizarCampo(regra.id, "titulo", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-xl font-semibold text-white outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={regra.conteudo}
                    onChange={(e) => atualizarCampo(regra.id, "conteudo", e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-200 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-semibold">{regra.titulo}</h2>
                  <p className="text-slate-400 mt-3 leading-relaxed">{regra.conteudo}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </AuthGuard>
  );
}