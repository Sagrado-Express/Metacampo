'use client'

import { motion } from 'framer-motion'
import { Microscope, ShieldCheck, AlertCircle, TrendingDown, Thermometer } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const managementData = [
  { stage: 'Dessecação', target: 'Herbicida', realized: 4.8, needed: 5.0, index: 96 },
  { stage: 'Vegetativo (V3-V6)', target: 'Inseticida', realized: 0.1, needed: 0.4, index: 25 },
  { stage: 'Reprodutivo (R1)', target: 'Fungicida 1', realized: 0.0, needed: 0.65, index: 0 },
]

export function ManagementIntelligence() {
  return (
    <div className="glass-card p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Inteligência de Manejo (Embrapa)</h3>
          <p className="text-sm text-muted-foreground">Análise de Cobertura Técnica (IT-SE Ativo)</p>
        </div>
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <Microscope size={24} />
        </div>
      </div>

      <div className="space-y-6">
        {managementData.map((item, i) => {
          const isCritical = item.index < 50
          const isWarning = item.index < 80 && item.index >= 50

          return (
            <div key={item.stage} className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.stage}</p>
                  <p className="text-sm font-bold">{item.target}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Manejo</p>
                    <p className={cn(
                      "text-sm font-bold",
                      isCritical ? "text-destructive" : isWarning ? "text-warning" : "text-success"
                    )}>
                      {item.index}%
                    </p>
                  </div>
                  {isCritical && (
                    <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center text-destructive animate-pulse">
                      <AlertCircle size={16} />
                    </div>
                  )}
                </div>
              </div>

              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.index}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={cn(
                    "h-full transition-all",
                    isCritical ? "bg-destructive shadow-[0_0_10px_rgba(var(--destructive),0.4)]" : 
                    isWarning ? "bg-warning" : "bg-success"
                  )}
                />
              </div>

              {isCritical && (
                <p className="text-[9px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1">
                  <TrendingDown size={10} /> Gap Crítico: CTV deve priorizar venda de {item.target}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-6 border-t">
        <div className="bg-accent/5 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
            <Thermometer size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">Estádio Fenológico Atual</p>
            <p className="text-lg font-bold">V5 (Vegetativo Pleno)</p>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Próximo Alvo: R1 (Início Floração) em ~12 dias</p>
          </div>
        </div>
      </div>
    </div>
  )
}
