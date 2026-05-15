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
import { SidebarProvider, useSidebar } from "@/providers/SidebarProvider";

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
            <SidebarProvider>
              <div className="flex">
                <Sidebar />
                <LayoutContent>{children}</LayoutContent>
              </div>
            </SidebarProvider>
          </MeetingModeProvider>
        </Suspense>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <main className={`flex-1 transition-all duration-300 ${isCollapsed ? "ml-20" : "ml-64"} min-h-screen`}>
      {children}
    </main>
  );
}


