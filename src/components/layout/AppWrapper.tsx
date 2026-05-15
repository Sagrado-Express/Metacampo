"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "@/providers/SidebarProvider";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex">
        <Sidebar />
        <LayoutContent>{children}</LayoutContent>
      </div>
    </SidebarProvider>
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
