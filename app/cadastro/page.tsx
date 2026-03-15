"use client";

import { useState } from "react";

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [casa, setCasa] = useState("");
  const [erro, setErro] = useState("");

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    try {
      const response = await fetch("http://localhost:5001/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome,
          email,
          senha,
          numero_casa: casa
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao cadastrar");
        return;
      }

      const loginResponse = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          senha
        })
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        setErro(loginData.error || "Cadastro realizado, mas não foi possível entrar automaticamente");
        return;
      }

      localStorage.setItem("token", loginData.token);
      localStorage.setItem("role", loginData.user.is_admin ? "admin" : "morador");
      localStorage.setItem("nome", loginData.user.nome || "morador");

      window.location.href = "/";

    } catch (err) {
      console.error(err);
      setErro("Erro ao conectar com o servidor");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Cadastro
        </h1>

        {erro && (
          <div className="mb-4 text-red-400 text-sm text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleCadastro} className="space-y-5">

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Número da Casa
            </label>
            <input
              type="text"
              value={casa}
              onChange={(e) => setCasa(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500"
          >
            Cadastrar
          </button>

        </form>
      </div>
    </div>
  );
}