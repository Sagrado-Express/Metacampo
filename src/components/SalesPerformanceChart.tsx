'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Users, Target } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const salesData = [
  { name: 'Ricardo Santos', potential: 12.5, actual: 8.2 },
  { name: 'Ana Paula', potential: 9.8, actual: 7.1 },
  { name: 'Carlos Oliveira', potential: 15.2, actual: 6.8 },
  { name: 'Mariana Costa', potential: 7.5, actual: 7.2 },
  { name: 'Joao Silva', potential: 11.0, actual: 4.5 },
]

export function SalesPerformanceChart() {
  return (
    <div className="glass-card p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight uppercase">Performance por Vendedor</h3>
          <p className="text-sm text-muted-foreground">Faturamento Realizado vs. Potencial de Carteira (VPM)</p>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent/20 rounded-sm" />
            <span>VPM (Potencial)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-sm" />
            <span>Realizado</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {salesData.map((seller, i) => {
          const actualPercent = (seller.actual / 16) * 100 // Normalize against max scale
          const potentialPercent = (seller.potential / 16) * 100
          const gap = seller.potential - seller.actual

          return (
            <div key={seller.name} className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  <span className="text-sm font-bold">{seller.name}</span>
                </div>
                <div className="text-[10px] font-bold space-x-2">
                  <span className="text-muted-foreground">GAP: R$ {gap.toFixed(1)}M</span>
                  <span className="text-primary">R$ {seller.actual}M / R$ {seller.potential}M</span>
                </div>
              </div>
              
              <div className="relative h-4 w-full bg-muted/30 rounded-full overflow-hidden">
                {/* Potential Bar */}
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${potentialPercent}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className="absolute inset-y-0 left-0 bg-accent/20 rounded-full"
                />
                {/* Actual Bar */}
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${actualPercent}%` }}
                  transition={{ duration: 1.2, delay: i * 0.1 + 0.2 }}
                  className="absolute inset-y-0 left-0 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-6 border-t grid grid-cols-2 gap-4">
        <div className="bg-muted/30 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-accent">
            <Target size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Top Oportunidade</span>
          </div>
          <p className="text-sm font-bold">Carlos Oliveira</p>
          <p className="text-xs text-muted-foreground">R$ 8.4M de potencial não explorado</p>
        </div>
        <div className="bg-muted/30 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-success">
            <TrendingUp size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Maior Eficiência</span>
          </div>
          <p className="text-sm font-bold">Mariana Costa</p>
          <p className="text-xs text-muted-foreground">96% de atingimento do potencial</p>
        </div>
      </div>
    </div>
  )
}
