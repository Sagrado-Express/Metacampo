'use client'

import { motion } from 'framer-motion'
import { Target, AlertTriangle, CheckCircle2, TrendingUp, PieChart } from 'lucide-react'

export function GoalDiagnostic() {
  const meta = 15000000
  const shareAlvo = 35
  const vpmNecessario = meta / (shareAlvo / 100)
  const vpmMapeado = 38000000
  const isViavel = vpmMapeado >= vpmNecessario

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="text-accent" size={24} />
        <h3 className="text-lg font-bold">Diagnóstico de Desafio</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">VPM Mínimo Necessário</p>
            <p className="text-2xl font-black text-foreground font-tabular">R$ {vpmNecessario.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">VPM Mapeado na Carteira</p>
            <p className="text-2xl font-black text-accent font-tabular">R$ {vpmMapeado.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10">
          {isViavel ? (
            <>
              <CheckCircle2 className="text-success mb-2" size={32} />
              <p className="text-sm font-bold text-success uppercase">Desafio Viável</p>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Sua carteira suporta a meta de R$ {(meta/1000000).toFixed(1)}M com {shareAlvo}% de share.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="text-destructive mb-2" size={32} />
              <p className="text-sm font-bold text-destructive uppercase">Atenção: Gap de Potencial</p>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Necessário mapear mais R$ {((vpmNecessario - vpmMapeado)/1000000).toFixed(1)}M em áreas.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function SegmentDrillDown() {
  const segments = [
    { label: 'Semente', value: 4500000, color: 'bg-blue-500' },
    { label: 'Fertilizante', value: 6800000, color: 'bg-emerald-500' },
    { label: 'Defensivos', value: 3200000, color: 'bg-amber-500' },
    { label: 'Nutrição', value: 850000, color: 'bg-purple-500' },
    { label: 'Biológicos', value: 450000, color: 'bg-pink-500' },
  ]

  const total = segments.reduce((acc, s) => acc + s.value, 0)

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <PieChart className="text-accent" size={24} />
          <h3 className="text-lg font-bold">Meta por Segmento (Drill-down)</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Previsto</p>
          <p className="text-xl font-black font-tabular text-foreground">R$ {total.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {segments.map((s) => (
          <div key={s.label} className="space-y-1">
            <div className="flex justify-between items-end text-xs font-bold uppercase">
              <span>{s.label}</span>
              <span className="font-tabular text-muted-foreground">
                R$ {s.value.toLocaleString('pt-BR')} ({(s.value/total*100).toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(s.value/total*100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full ${s.color} shadow-lg shadow-black/20`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
