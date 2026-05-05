'use client'

import { motion } from 'framer-motion'
import { PieChart, ListFilter, TrendingUp, Users } from 'lucide-react'

export default function ParetoSegmentation() {
  const segmentation = [
    { label: 'Azul', count: 8, vpm: 12500000, color: 'bg-primary', range: '> 8.5', description: 'Clientes Estratégicos' },
    { label: 'Verde', count: 15, vpm: 8400000, color: 'bg-success', range: '7.0 - 8.5', description: 'Potencial de Crescimento' },
    { label: 'Amarelo', count: 22, vpm: 4200000, color: 'bg-warning', range: '5.0 - 7.0', description: 'Manutenção / Risco' },
    { label: 'Vermelho', count: 12, vpm: 850000, color: 'bg-destructive', range: '< 5.0', description: 'Baixa Prioridade' },
  ]

  const totalVpm = segmentation.reduce((acc, s) => acc + s.vpm, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <PieChart className="text-accent" size={24} />
            Segmentação de Pareto (Color-Code)
          </h2>
          <p className="text-sm text-muted-foreground">Classificação automática da carteira baseada no Scoring Multicriterial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {segmentation.map((s) => (
          <div key={s.label} className="glass-card p-6 border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1 h-full ${s.color}`} />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <h3 className="text-xl font-black uppercase tracking-tighter">{s.description}</h3>
              </div>
              <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded border border-white/10">{s.range}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black font-tabular">{s.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Clientes</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-tabular text-accent">R$ {(s.vpm / 1000000).toFixed(1)}M</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">VPM Potencial</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold">Concentração de Valor (Pareto 80/20)</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Estratégico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/10 rounded-sm" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Outros</span>
            </div>
          </div>
        </div>

        <div className="relative h-12 bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex">
          {segmentation.map((s, idx) => (
            <motion.div 
              key={s.label}
              initial={{ width: 0 }}
              animate={{ width: `${(s.vpm / totalVpm * 100)}%` }}
              transition={{ duration: 1, delay: idx * 0.2 }}
              className={`h-full ${s.color} opacity-80 hover:opacity-100 transition-opacity relative group`}
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border border-white/10 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl pointer-events-none z-20">
                <p className="text-[10px] font-bold uppercase whitespace-nowrap">{s.label}: {(s.vpm/totalVpm*100).toFixed(1)}%</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp size={14} className="text-success" />
          <span>80% do potencial de faturamento está concentrado nos segmentos <strong>Azul</strong> e <strong>Verde</strong>.</span>
        </div>
      </div>
    </div>
  )
}
