import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { MeetingModeProvider } from "@/providers/MeetingModeProvider";
import { Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GTM-GC | Simulador de Carteira Agribusiness",
  description: "Plataforma profissional de gestão e simulação de carteiras para o agronegócio.",
};

import { Sidebar } from "@/components/layout/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light">
      <body className={`${inter.variable} antialiased bg-background`}>
        <Suspense fallback={<div>Carregando...</div>}>
          <MeetingModeProvider>
            <div className="flex">
              <Sidebar />
              <main className="flex-1 ml-20 lg:ml-64 min-h-screen">
                {children}
              </main>
            </div>
          </MeetingModeProvider>
        </Suspense>
      </body>
    </html>
  );
}

