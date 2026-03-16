"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("nome");
    window.location.href = "/login";
  }

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const isActive = (href: string) => pathname === href;

  const linkClass = (href: string) =>
    `transition hover:text-white ${
      isActive(href) ? "text-white" : "text-slate-300"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-8 py-4 flex items-center justify-between">
        {/* ESQUERDA: Condomínio + subtítulo Boulevard Elegance */}
        <Link href="/" className="leading-tight">
          <div className="text-lg font-semibold text-white">Condomínio</div>
          <div className="text-xs text-slate-400 -mt-0.5">Boulevard Elegance</div>
        </Link>

        {/* DIREITA: links */}
        <div className="flex items-center gap-6 text-sm">
          <Link className={linkClass("/")} href="/">Início</Link>
          <Link className={linkClass("/reservas")} href="/reservas">Reservas</Link>
          <Link className={linkClass("/minhas")} href="/minhas-reservas">Minhas Reservas</Link>
          <Link className={linkClass("/regras")} href="/regras">Regras e Informações</Link>
          {!role ? (
            <Link className={linkClass("/login")} href="/login">Login</Link>
          ) : (
            <button
              onClick={handleLogout}
              className="transition hover:text-white text-slate-300"
            >
              Logout
            </button>
          )}

          {/* Só aparece se for admin */}
          {role === "admin" && (
            <Link className={linkClass("/admin")} href="/admin">Admin</Link>
          )}
        </div>
      </div>
    </nav>
  );
}