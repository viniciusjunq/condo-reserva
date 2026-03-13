"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const publicRoutes = ["/login", "/cadastro"];
    const token = localStorage.getItem("token");

    if (!publicRoutes.includes(pathname) && !token) {
      router.push("/login");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked && pathname !== "/login" && pathname !== "/cadastro") {
    return null;
  }

  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}