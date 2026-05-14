"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LucideLayoutDashboard, 
  LucideUsers, 
  LucideSettings, 
  LucideLogOut, 
  LucideShieldCheck,
  LucideTrendingUp,
  LucideFileUp
} from "lucide-react";

/**
 * Sidebar Menu for MetaCampo (Morning Dew Design)
 */
export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: <LucideLayoutDashboard />, label: "Cockpit", href: "/workspace" },
    { icon: <LucideShieldCheck />, label: "Admin", href: "/admin" },
    { icon: <LucideUsers />, label: "Tabela Mãe", href: "/ctv/tabela-mae" },
    { icon: <LucideTrendingUp />, label: "ITAA Matrix", href: "/admin" }, 
    { icon: <LucideFileUp />, label: "Ingestão", href: "/workspace" },
  ];


  return (
    <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 border-r border-border/50 flex flex-col p-6 bg-white/20 backdrop-blur-md z-40">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
          M
        </div>
        <span className="hidden lg:block font-black text-xl tracking-tighter text-foreground">METACAMPO</span>
      </div>
      
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`
                w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative group
                ${isActive 
                  ? "bg-primary text-white glow-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }
              `}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebarActive"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                />
              )}
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              <span className="hidden lg:block font-bold text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
            </Link>

          );
        })}
      </nav>

      <button className="mt-auto flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive transition-colors">
        <LucideLogOut size={20} />
        <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">Sair</span>
      </button>
    </aside>
  );
}
