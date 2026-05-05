'use client'

import { motion } from 'framer-motion'
import { TrendingUp, ArrowUpRight, AlertCircle, CheckCircle2, ChevronRight, type LucideIcon } from 'lucide-react'

export default function ForecastToGo() {
  const data = {
    realYTD: 12450000,
    previsaoOriginal: 18500000,
    budget: 19000000
  }

  const toGo = data.previsaoOriginal - data.realYTD
  const forecastTotal = data.realYTD + toGo
  const gapVsBudget = data.budget - forecastTotal
  const hasGap = gapVsBudget > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="text-accent" size={24} />
            Motor de Forecast "TO GO"
          </h2>
          <p className="text-sm text-muted-foreground">Transformando planejamento em saldo a buscar (Realizado vs. Previsto)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ForecastCard 
          label="Realizado YTD" 
          value={`R$ ${(data.realYTD / 1000000).toFixed(1)}M`} 
          description="Faturamento consolidado" 
          icon={CheckCircle2} 
          color="text-success"
        />
        <ForecastCard 
          label="TO GO (Faltante)" 
          value={`R$ ${(toGo / 1000000).toFixed(1)}M`} 
          description="Saldo do plano original" 
          icon={ArrowUpRight} 
          color="text-accent"
        />
        <ForecastCard 
          label="Forecast Total" 
          value={`R$ ${(forecastTotal / 1000000).toFixed(1)}M`} 
          description="Projeção (Real + TO GO)" 
          icon={TrendingUp} 
          color="text-foreground"
        />
        <ForecastCard 
          label="Status vs Budget" 
          value={hasGap ? "Gap Detectado" : "Meta Batida"} 
          description={hasGap ? `Faltam R$ ${(gapVsBudget / 1000).toFixed(0)}k` : "Projeção acima do budget"} 
          icon={hasGap ? AlertCircle : CheckCircle2} 
          color={hasGap ? "text-destructive" : "text-success"}
          alert={hasGap}
        />
      </div>

      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold">Análise de GAP de Faturamento</h3>
          <button className="text-accent text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:underline">
            Ver Drill-down por Cliente <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-8">
          <div className="relative h-12 bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex">
            {/* Realizado Bar */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(data.realYTD / data.budget * 100)}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-success/80 flex items-center px-4 relative z-10"
            >
              <span className="text-[10px] font-black uppercase text-white whitespace-nowrap">Realizado YTD</span>
            </motion.div>
            
            {/* TO GO Bar */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(toGo / data.budget * 100)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-accent/60 flex items-center px-4 relative z-0"
            >
              <span className="text-[10px] font-black uppercase text-white whitespace-nowrap">TO GO</span>
            </motion.div>

            {/* Budget Line */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-destructive/50 z-20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <AlertCircle size={14} /> Alertas de Consistência
              </h4>
              <ul className="space-y-2">
                <li className="text-xs bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>GAP Financeiro:</strong> A projeção atual está R$ 550k abaixo do budget regional.</span>
                </li>
                <li className="text-xs bg-warning/10 text-warning p-3 rounded-lg border border-warning/20 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-warning rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Capacidade de VPM:</strong> O saldo TO GO é 100% suportado pelo potencial técnico (VPM) mapeado.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col justify-center items-center p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Confiança da Projeção</p>
              <h3 className="text-4xl font-black text-success">92%</h3>
              <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px]">
                Baseado no histórico de conversão do CTV e aderência ao plano.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ForecastCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  alert?: boolean;
}

function ForecastCard({ label, value, description, icon: Icon, color, alert }: ForecastCardProps) {
  return (
    <div className={`glass-card p-6 ${alert ? 'border-destructive/30 bg-destructive/5' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
        <Icon className={color} size={18} />
      </div>
      <h3 className={`text-2xl font-black font-tabular tracking-tighter ${color}`}>{value}</h3>
      <p className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">{description}</p>
    </div>
  )
}
