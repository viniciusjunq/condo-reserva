"use client";

import { useState } from "react";

export default function ReclamacoesPage() {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState("");

  async function enviarReclamacao(e: any) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setStatus("Você precisa estar logado.");
      return;
    }

    if (!titulo.trim()) {
      setStatus("Digite um título.");
      return;
    }

    if (!mensagem.trim()) {
      setStatus("Digite uma mensagem.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/reclamacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ titulo, mensagem }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("Reclamação enviada com sucesso.");
        setMensagem("");
      } else {
        console.log(data);
        setStatus(data?.error || "Erro ao enviar.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Erro no servidor.");
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">Enviar Reclamação</h1>

      <form onSubmit={enviarReclamacao} className="space-y-4">
        <input
          type="text"
          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white"
          placeholder="Título da reclamação"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <textarea
          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white"
          rows={5}
          placeholder="Descreva sua reclamação..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 px-5 py-3 rounded-xl text-white hover:opacity-90"
        >
          Enviar
        </button>
      </form>

      {status && (
        <p className="mt-4 text-sm text-slate-300">{status}</p>
      )}
    </div>
  );
}