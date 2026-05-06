'use client'

import { motion } from 'framer-motion'
import { GoalDiagnostic, SegmentDrillDown } from '@/components/ctv/PlanningWidgets'
import { Activity, AlertCircle, TrendingUp, Info } from 'lucide-react'

export default function DiagnosisWorkspace() {
  return (
    <div className="space-y-12">
      {/* Header: Velocímetro (Gauge) Placeholder */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-6 flex items-center gap-2">
            <Activity className="text-accent" size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Diagnóstico de Viabilidade (Passo 1)</h3>
          </div>

          {/* Simple Gauge SVG */}
          <div className="relative w-64 h-32 mt-8">
            <svg viewBox="0 0 100 50" className="w-full h-full">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/5"
              />
              <motion.path
                initial={{ strokeDasharray: "0, 1000" }}
                animate={{ strokeDasharray: "95, 1000" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 text-center">
              <p className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">78%</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Capacidade Utilizada</p>
            </div>
          </div>

          <div className="grid grid-cols-3 w-full mt-12 border-t border-white/5 pt-8 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Meta (R$)</p>
              <p className="text-lg font-black font-tabular">15.0M</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">VPM Necessário</p>
              <p className="text-lg font-black font-tabular">42.8M</p>
            </div>
            <div className="text-accent">
              <p className="text-[10px] uppercase font-bold">VPM Real</p>
              <p className="text-lg font-black font-tabular">38.0M</p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="text-destructive" size={14} />
            <span className="text-[10px] font-bold text-destructive uppercase tracking-wide">GAP Absoluto Detectado: -R$ 4.8M</span>
          </div>
        </div>

        <div className="glass-card p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-success" size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Share-of-Wallet (Passo 6)</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Baseado no VPM atual, seu share mdia alvo deve ser de <span className="text-foreground font-bold">39.4%</span> para atingir a meta.
            </p>
          </div>

          <div className="space-y-2 mt-8">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Aderncia ao Mix</span>
              <span className="text-success">92%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-success" style={{ width: '92%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Passo 3 & 6 and 7 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 ml-2">
            <Info className="text-muted-foreground" size={14} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Distribuição por Cultivo (Passo 3 & 6)</span>
          </div>
          <GoalDiagnostic />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 ml-2">
            <Info className="text-muted-foreground" size={14} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Previsão por Segmento (Passo 7)</span>
          </div>
          <SegmentDrillDown />
        </div>
      </section>
    </div>
  )
}
