"use client";

import React, { createContext, useContext, useState } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  /** Menu em tela cheia (gaveta) no mobile — conceito separado do collapse
   *  do desktop, que só encolhe pra ícones sem sumir da tela (sugestão de
   *  UX, 05/09/2026: sidebar fixa tomava quase metade da tela em mobile). */
  isMobileOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => setIsCollapsed((prev) => !prev);
  const openMobileSidebar = () => setIsMobileOpen(true);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, toggleSidebar, isMobileOpen, openMobileSidebar, closeMobileSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
