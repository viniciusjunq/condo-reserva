import "./globals.css";
import Navbar from "../componentes/Navbar";

export const metadata = {
  title: "Boulevard Elegance",
  description: "Sistema de Reservas da Quadra",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}