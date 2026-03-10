import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARGSOFT",
  description: "Sistema para la gestion de tu negocio",
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
