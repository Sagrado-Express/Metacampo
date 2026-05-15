"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSidebar } from "@/providers/SidebarProvider";
import { 
  LucideLayoutDashboard, 
  LucideUsers, 
  LucideSettings, 
  LucideLogOut, 
  LucideShieldCheck,
  LucideTrendingUp,
  LucideFileUp,
  LucideChevronLeft,
  LucideMenu
} from "lucide-react";

/**
 * Sidebar Menu for MetaCampo (Morning Dew Design)
 * Collapsible version for optimized navigation.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    { icon: <LucideLayoutDashboard />, label: "Cockpit", href: "/workspace" },
    { icon: <LucideShieldCheck />, label: "Admin", href: "/admin" },
    { icon: <LucideUsers />, label: "Plano de Negócios", href: "/ctv/tabela-mae" },
    { icon: <LucideTrendingUp />, label: "ITAA Matrix", href: "/admin" }, 
    { icon: <LucideFileUp />, label: "Ingestão", href: "/workspace" },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="fixed left-0 top-0 h-screen border-r border-border/50 flex flex-col p-4 bg-white/20 backdrop-blur-md z-40 transition-all duration-300 overflow-hidden"
    >
      {/* Header & Toggle */}
      <div className="flex items-center justify-between mb-12 px-2 overflow-hidden">
        <div className="flex items-center gap-3 min-w-max">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 shrink-0">
            M
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-black text-xl tracking-tighter text-foreground whitespace-nowrap"
            >
              METACAMPO
            </motion.span>
          )}
        </div>
        
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground ml-auto"
        >
          {isCollapsed ? <LucideMenu size={20} /> : <LucideChevronLeft size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`
                w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all relative group
                ${isActive 
                  ? "bg-primary text-white glow-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }
              `}
              title={isCollapsed ? item.label : ""}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebarActive"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                />
              )}
              <div className="shrink-0 w-6 flex justify-center">
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              </div>
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      <button className="mt-auto flex items-center gap-4 px-3 py-3 text-muted-foreground hover:text-destructive transition-colors overflow-hidden">
        <div className="shrink-0 w-6 flex justify-center">
          <LucideLogOut size={20} />
        </div>
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap"
          >
            Sair
          </motion.span>
        )}
      </button>
    </motion.aside>
  );
}

