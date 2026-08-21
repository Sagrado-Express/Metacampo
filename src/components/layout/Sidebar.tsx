"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/providers/SidebarProvider";
import {
  Home,
  Users,
  Settings,
  LogOut,
  TrendingUp,
  Target,
  ChevronLeft,
  ChevronDown,
  Menu,
  Sprout,
  Layers,
  Map,
} from "lucide-react";

/**
 * Sidebar Menu for MetaCampo (Morning Dew Design)
 * Collapsible version for optimized navigation.
 */
interface MenuItem {
  icon: React.ReactElement;
  label: string;
  href: string;
  children?: MenuItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const menuItems: MenuItem[] = [
    { icon: <Home />, label: "Início", href: "/workspace" },
    { icon: <Target />, label: "Viabilidade", href: "/workspace/viabilidade" },
    { icon: <Users />, label: "Clientes", href: "/workspace/clientes" },
    { icon: <TrendingUp />, label: "Planejamento", href: "/workspace/planejamento" },
    {
      icon: <Settings />,
      label: "Configuração",
      href: "/workspace/settings/configuracao",
      children: [
        { icon: <TrendingUp />, label: "Índice Tecnológico", href: "/workspace/settings/configuracao/indice-tecnologico" },
        { icon: <Sprout />, label: "Cultura", href: "/workspace/settings/configuracao/cultura" },
        { icon: <Layers />, label: "Grupo de Produtos", href: "/workspace/settings/configuracao/grupos-de-produtos" },
        { icon: <Users />, label: "Usuários", href: "/workspace/settings/configuracao/usuarios" },
        { icon: <Map />, label: "Estrutura Comercial", href: "/workspace/settings/configuracao/estrutura-comercial" },
      ],
    },
  ];

  // Item pai com submenu abre sozinho quando a rota atual entra nele (ex.:
  // link direto pra /configuracao/cultura) — derivado do pathname a cada
  // render, não guardado em estado (a Sidebar monta uma vez só pro
  // /workspace inteiro; um estado setado só na montagem nunca acompanharia
  // navegação client-side depois). `expandedMenu` só existe pra guardar uma
  // escolha manual do usuário que substitua esse padrão.
  const menuAbertoPelaRota = menuItems.find((item) => item.children?.some((c) => pathname.startsWith(c.href)))?.label ?? null;
  const [expandedMenuOverride, setExpandedMenuOverride] = useState<string | null | undefined>(undefined);
  const expandedMenu = expandedMenuOverride === undefined ? menuAbertoPelaRota : expandedMenuOverride;

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
        {menuItems.map((item) => {
          const hasChildren = !!item.children?.length;
          const isActive = hasChildren ? pathname.startsWith(item.href) : pathname === item.href;
          const isOpen = expandedMenu === item.label;

          const itemClasses = `
                w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl transition-all relative group/item
                ${isActive
                  ? "bg-primary text-white glow-primary"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                }
              `;

          const content = (
            <>
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_white]"
                />
              )}

              <div className="shrink-0 w-6 flex justify-center">
                {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 22 })}
              </div>

              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-[10px] uppercase tracking-[0.25em] whitespace-nowrap flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {hasChildren && !isCollapsed && (
                <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              )}

              {/* Enhanced Tooltip for Collapsed Mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                  <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 border-8 border-transparent border-right-primary" />
                </div>
              )}
            </>
          );

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => (isCollapsed ? router.push(item.href) : setExpandedMenuOverride(isOpen ? null : item.label))}
                  className={itemClasses}
                >
                  {content}
                </button>
              ) : (
                <Link href={item.href} className={itemClasses}>
                  {content}
                </Link>
              )}

              {hasChildren && !isCollapsed && (
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-6 mt-1 space-y-1"
                    >
                      {item.children!.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                              isChildActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            }`}
                          >
                            <div className="shrink-0 w-4 flex justify-center">
                              {React.cloneElement(child.icon as React.ReactElement<{ size?: number }>, { size: 15 })}
                            </div>
                            {child.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <button onClick={handleLogout} className="mt-auto flex items-center gap-4 px-3 py-4 text-muted-foreground hover:text-destructive transition-all rounded-2xl hover:bg-destructive/5 group/logout relative">
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


