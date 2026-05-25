"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/providers/SidebarProvider";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  ShieldCheck,
  TrendingUp,
  FileUp,
  ChevronLeft,
  Menu
} from "lucide-react";

/**
 * Sidebar Menu for MetaCampo (Morning Dew Design)
 * Collapsible version for optimized navigation.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    { icon: <LayoutDashboard />, label: "Cockpit", href: "/workspace" },
    { icon: <ShieldCheck />, label: "Admin", href: "/admin" },
    { icon: <Users />, label: "Simulador CTV", href: "/ctv" },
    { icon: <TrendingUp />, label: "ITAA Matrix", href: "/admin" }, 
    { icon: <FileUp />, label: "Ingestão", href: "/workspace" },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 80 : 280,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }}
      className="fixed left-0 top-0 h-screen border-r border-border/40 flex flex-col p-4 bg-white/40 backdrop-blur-xl z-50 overflow-hidden group/sidebar shadow-2xl shadow-primary/5"
    >
      {/* Header & Toggle Indicator */}
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3 min-w-max">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 shrink-0">
            M
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-black text-xl tracking-tighter text-primary whitespace-nowrap"
              >
                METACAMPO
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-primary/10 rounded-xl transition-all text-primary/60 hover:text-primary"
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 space-y-3">
        {menuItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`
                w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl transition-all relative group/item
                ${isActive 
                  ? "bg-primary text-white glow-primary" 
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                }
              `}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebarActive"
                  className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_white]"
                />
              )}
              
              <div className="shrink-0 w-6 flex justify-center">
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22 })}
              </div>

              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-[10px] uppercase tracking-[0.25em] whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Enhanced Tooltip for Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                  <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 border-8 border-transparent border-right-primary" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <button className="mt-auto flex items-center gap-4 px-3 py-4 text-muted-foreground hover:text-destructive transition-all rounded-2xl hover:bg-destructive/5 group/logout relative">
        <div className="shrink-0 w-6 flex justify-center">
          <LogOut size={20} />
        </div>
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-black text-[10px] uppercase tracking-[0.25em] whitespace-nowrap"
          >
            Sair do Sistema
          </motion.span>
        )}
        
        {isCollapsed && (
          <div className="absolute left-full ml-4 px-3 py-2 bg-destructive text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/logout:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
            Sair
          </div>
        )}
      </button>
    </motion.aside>
  );
}


