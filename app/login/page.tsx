"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    try {
      const response = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao fazer login");
        return;
      }

      // salva token e dados
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.is_admin ? "admin" : "morador");
      localStorage.setItem("nome", data.user.nome);

      window.location.href = "/";
    } catch (err) {
      setErro("Erro ao conectar com o servidor");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Login
        </h1>

        {erro && (
          <div className="mb-4 text-red-400 text-sm text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 transition"
          >
            Entrar
          </button>
          <div className="text-center text-sm text-slate-400 mt-4">
              Não tem conta?{" "}
            <a href="/cadastro" className="text-blue-400 hover:underline">
               Criar conta
            </a>
           </div>
        </form>
      </div>
    </div>
  );
}