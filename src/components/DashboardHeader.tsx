"use client";

import React from "react";
import { Search, Bell, User } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-8 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar portfolio..."
            className="h-9 w-64 rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-sm transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        
        <button className="relative rounded-full p-2 hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent animate-pulse" />
        </button>

        <div className="h-8 w-px bg-border mx-2" />

        <button className="flex items-center gap-2 rounded-lg pl-2 pr-1 py-1 hover:bg-muted transition-colors">
          <span className="text-xs font-medium">Daniel</span>
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            D
          </div>
        </button>
      </div>
    </header>
  );
}
