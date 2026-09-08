"use client";

import React from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "@/providers/SidebarProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/components/Toast/ToastContext";
import { ToastContainer } from "@/components/Toast/ToastContainer";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <SidebarProvider>
          <div className="flex">
            <Sidebar />
            <LayoutContent>{children}</LayoutContent>
          </div>
        </SidebarProvider>
        <ToastContainer />
      </ToastProvider>
    </QueryProvider>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, openMobileSidebar } = useSidebar();
  return (
    <main
      className={`flex-1 min-h-screen ml-0 transition-[margin] duration-300 ${
        isCollapsed ? "md:ml-20" : "md:ml-64"
      }`}
    >
      {/* Botão de abrir a gaveta — só existe em mobile, onde a sidebar some
          da tela por padrão em vez de tomar quase metade da largura
          (sugestão de UX, 05/09/2026). */}
      <button
        onClick={openMobileSidebar}
        className="md:hidden fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-border/40 shadow-lg text-primary"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      {children}
    </main>
  );
}
