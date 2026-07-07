"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Target, 
  Users, 
  Settings, 
  Settings2,
  ChevronRight,
  Leaf,
  Network,
  Radar
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Cockpit do Gestor", href: "/", icon: LayoutDashboard },
  { name: "Estrutura Comercial", href: "/ctv/estrutura", icon: Network },
  { name: "Radar de Caça (CTV)", href: "/ctv/radar", icon: Radar },
  { name: "Clientes", href: "/workspace/clientes", icon: Users },
  { name: "Segmentação (Pareto)", href: "/ctv/planejamento", icon: Target },
  { name: "Planejamento", href: "/workspace/planejamento", icon: TrendingUp },
  { name: "Configuração", href: "/workspace/settings/configuracao", icon: Settings2 },
  { name: "Configurações", href: "/admin", icon: Settings },
];


export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
      <div className="flex h-16 shrink-0 items-center px-6">
        <span className="text-xl font-black tracking-tighter text-primary">
          METACAMPO
        </span>
      </div>
      
      <nav className="flex flex-1 flex-col px-4 py-6">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-accent" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                  )} />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 text-accent" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="flex items-center gap-x-3 px-2 py-3">
          <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-xs">
            AL
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-primary">Agro Lider</span>
            <span className="text-xs text-sidebar-foreground/60">Sair</span>
          </div>
        </div>
      </div>
    </div>
  );
}
