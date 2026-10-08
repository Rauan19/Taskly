import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Taskly", template: "%s · Taskly" },
  description: "Gerenciamento de projetos e tarefas para pequenas equipes.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f5f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
