"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "@/providers/SidebarProvider";
import { QueryProvider } from "@/providers/QueryProvider";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SidebarProvider>
        <div className="flex">
          <Sidebar />
          <LayoutContent>{children}</LayoutContent>
        </div>
      </SidebarProvider>
    </QueryProvider>
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
