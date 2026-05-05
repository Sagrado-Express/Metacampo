'use client'

import { motion } from 'framer-motion'
import { PieChart, Landmark, TrendingUp, ChevronRight } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function MarketShareChart({ 
  companyRevenue, 
  municipalityTotal, 
  municipalityName 
}: { 
  companyRevenue: number, 
  municipalityTotal: number,
  municipalityName: string
}) {
  const share = (companyRevenue / municipalityTotal) * 100
  const isDominant = share >= 50

  return (
    <div className="glass-card p-8 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Share de Acesso (Acesso)</h3>
          <p className="text-sm text-muted-foreground">Participação no Município: {municipalityName}</p>
        </div>
        <Landmark size={24} className="text-muted-foreground opacity-50" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative py-8">
        {/* Simple Progress Circle Visualization */}
        <div className="relative w-48 h-48 rounded-full border-[12px] border-muted/20 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <motion.circle
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: share / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="50%"
              cy="50%"
              r="86"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className={cn(
                "transition-colors",
                isDominant ? "text-success" : "text-primary"
              )}
            />
          </svg>
          <div className="text-center">
            <p className="text-4xl font-bold tracking-tighter">{share.toFixed(1)}%</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acesso Realizado</p>
          </div>
        </div>

        {isDominant && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-success/10 text-success px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <TrendingUp size={12} /> Status: Dona da Rua
          </motion.div>
        )}
      </div>

      <div className="mt-auto pt-8 border-t space-y-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-bold uppercase tracking-widest">Faturamento Empresa</span>
          <span className="font-bold">R$ {(companyRevenue / 1e6).toFixed(1)}M</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-bold uppercase tracking-widest">Acesso Disponível (Potencial)</span>
          <span className="font-bold">R$ {(municipalityTotal / 1e6).toFixed(1)}M</span>
        </div>
        
        <button className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent hover:underline">
          Ver Deep Dive por Cultura <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
