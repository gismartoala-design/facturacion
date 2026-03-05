import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARGSOFT MVP | Inventario y Ventas",
  description: "MVP monolito para inventario, ventas y facturacion SRI",
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
