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

import { AppWrapper } from "@/components/layout/AppWrapper";

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
            <AppWrapper>{children}</AppWrapper>
          </MeetingModeProvider>
        </Suspense>
      </body>
    </html>
  );
}



