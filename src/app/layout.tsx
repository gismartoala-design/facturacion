import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOVI VELAS",
  description: "Boutique de velas y flores - Sistema de Gestión",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
