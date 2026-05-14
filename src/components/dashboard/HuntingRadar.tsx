"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { LucideTarget, LucideArrowUpRight, LucideCompass } from "lucide-react";

interface ClientRadarData {
  id: string;
  name: string;
  city: string;
  vpmTotal: number;
  realizedMonth: number;
  toGoMonth: number;
  pareto: 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO';
}

interface HuntingRadarProps {
  clients: ClientRadarData[];
}

/**
 * HuntingRadar: The Mother Table (Radar de Caça)
 * Focused on Monthly TO-GO Balance.
 * Prioritizes High VPM + Zero Billing (The Hunting Ground).
 */
export function HuntingRadar({ clients }: HuntingRadarProps) {
  // Logic: Sort by TO-GO (DESC), then VPM (DESC)
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      // Prioritize those with zero billing this month
      if (a.realizedMonth === 0 && b.realizedMonth > 0) return -1;
      if (b.realizedMonth === 0 && a.realizedMonth > 0) return 1;
      
      // Then by TO-GO balance
      return b.toGoMonth - a.toGoMonth;
    });
  }, [clients]);

  const getParetoStyles = (pareto: string) => {
    switch (pareto) {
      case 'AZUL': return "bg-band-azul/10 text-band-azul border-band-azul/20";
      case 'VERDE': return "bg-band-verde/10 text-band-verde border-band-verde/20";
      case 'AMARELO': return "bg-band-amarelo/10 text-band-amarelo border-band-amarelo/20";
      case 'VERMELHO': return "bg-band-vermelho/10 text-band-vermelho border-band-vermelho/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <LucideCompass className="text-primary" />
            Radar de Caça
          </h2>
          <p className="text-muted-foreground text-sm">Priorização estratégica por Saldo TO-GO Mensal</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-border shadow-sm">
            <div className="h-3 w-3 rounded-full bg-band-azul" />
            <span className="text-[10px] font-bold">TOP PARETO</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card p-6 group"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${getParetoStyles(client.pareto)}`}>
                  {client.pareto}
                </span>
                <h3 className="text-lg font-bold mt-2 group-hover:text-primary transition-colors line-clamp-1">{client.name}</h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{client.city}</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <LucideTarget size={20} />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="label-finance">Potencial (VPM)</div>
                <div className="text-sm font-bold font-tabular">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.vpmTotal)}
                </div>
              </div>
              <div>
                <div className="label-finance">Realizado Mês</div>
                <div className={`text-sm font-bold font-tabular ${client.realizedMonth === 0 ? 'text-destructive' : 'text-primary'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.realizedMonth)}
                </div>
              </div>
            </div>

            {/* TO-GO Indicator */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex justify-between items-center mb-2">
                <span className="label-finance !text-primary">Saldo TO-GO</span>
                <span className="text-xs font-black text-primary font-tabular">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.toGoMonth)}
                </span>
              </div>
              <div className="pill-progress-container h-1.5">
                <div 
                  className="pill-progress-fill !bg-primary" 
                  style={{ width: `${Math.max(0, (1 - client.toGoMonth / client.vpmTotal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Footer Action */}
            <button className="w-full mt-6 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors border-t border-border/40 pt-4">
              <span>Ver Detalhes do Cultivo</span>
              <LucideArrowUpRight size={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
