"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Target, ArrowUpRight, Compass, MapPin } from "lucide-react";

interface ClientRadarData {
  id: string;
  name: string;
  city: string;
  vpmTotal: number;
  realizedMonth: number;
  toGoMonth: number;
  pareto: 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO';
  deficitTecnico?: number;
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
  // Logic: Sort by Deficit Tecnico (Passo 16), then zero billing, then TO-GO (DESC)
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      // Prioritize Passo 16 (Deficit Técnico)
      const aDeficit = a.deficitTecnico || 0;
      const bDeficit = b.deficitTecnico || 0;
      if (aDeficit > 0 || bDeficit > 0) {
        return bDeficit - aDeficit; // Highest deficit first
      }

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-foreground">
            <Compass className="text-primary" />
            Radar de Caça
          </h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Inteligência Territorial • Priorização por Saldo TO-GO</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border border-border shadow-sm">
            <div className="h-3 w-3 rounded-full bg-band-azul glow-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Foco Estratégico (AZUL)</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 shadow-sm">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Alerta Passo 16</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sortedClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card-premium p-8 group hover:border-primary/30"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-[0.2em] ${getParetoStyles(client.pareto)}`}>
                    {client.pareto}
                  </span>
                  {(client.deficitTecnico || 0) > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-[0.2em] bg-destructive/10 text-destructive border-destructive/20 animate-pulse">
                      Passo 16: Deficit Técnico
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-tight">
                  {client.name}
                </h3>
                <div className="flex items-center gap-1.5 text-primary/70">
                  <MapPin size={12} strokeWidth={3} />
                  <p className="text-[10px] font-black uppercase tracking-widest">{client.city}</p>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner border border-border/10">
                <Target size={24} />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-1">
                <div className="label-finance">Potencial (VPM)</div>
                <div className="text-sm font-black text-foreground font-tabular">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.vpmTotal)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="label-finance">Realizado Mês</div>
                <div className={`text-sm font-black font-tabular ${client.realizedMonth === 0 ? 'text-destructive' : 'text-primary'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.realizedMonth)}
                </div>
              </div>
            </div>

            {(client.deficitTecnico || 0) > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-destructive flex items-center gap-1.5">
                  <Target size={10} /> Risco de Fuga de Carteira
                </span>
                <p className="text-xs text-muted-foreground">
                  Faturamento abaixo da recomendação de insumos. <strong className="text-destructive">Deficit: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.deficitTecnico!)}</strong>
                </p>
              </div>
            )}

            {/* TO-GO Indicator */}
            <div className="p-5 rounded-3xl bg-muted/20 border border-border/10 group-hover:border-primary/10 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="label-finance !text-primary">Saldo TO-GO</span>
                <span className="text-sm font-black text-primary font-tabular">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.toGoMonth)}
                </span>
              </div>
              <div className="pill-progress-container h-2 bg-white shadow-inner">
                <div 
                  className="pill-progress-fill !bg-primary glow-primary" 
                  style={{ width: `${Math.max(5, (1 - client.toGoMonth / client.vpmTotal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Footer Action */}
            <button className="w-full mt-8 flex items-center justify-center gap-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all border-t border-border/40 pt-6">
              <span>Manejo Técnico (Passo 5)</span>
              <ArrowUpRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>

  );
}
