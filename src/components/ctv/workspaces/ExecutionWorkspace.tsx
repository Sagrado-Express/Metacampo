'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, Clock, CheckCircle2, ChevronRight, Filter } from 'lucide-react'

export default function ExecutionWorkspace() {
  const [confidence, setConfidence] = useState<Record<string, string>>({
    '1': 'AZUL',
    '2': 'VERDE'
  })

  const executionData = [
    { id: '1', nome: 'Fazenda Boa Esperança', meta: 450000, real: 320000, pedidos: 50000 },
    { id: '2', nome: 'Agropecuária Schneider', meta: 1200000, real: 850000, pedidos: 100000 },
    { id: '3', nome: 'Sítio Recanto', meta: 250000, real: 50000, pedidos: 20000 },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard label="Meta Consolidada" value="R$ 15.0M" subValue="Faturamento YTD" />
        <KPICard label="Realizado (Sales)" value="R$ 8.2M" subValue="54% da Meta" color="text-success" />
        <KPICard label="Pedidos Carteira" value="R$ 2.1M" subValue="Em Processamento" color="text-accent" />
        <KPICard label="Saldo TO GO" value="R$ 4.7M" subValue="Gap para Meta" color="text-warning" />
      </div>

      {/* Execution List */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-accent" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest">Acompanhamento Financeiro (Passos 12, 13)</h3>
          </div>
          <button className="flex items-center gap-2 text-[10px] font-bold uppercase hover:text-accent transition-colors">
            <Filter size={14} /> Filtrar por Status
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                <th className="px-6 py-4 text-left">Cliente</th>
                <th className="px-6 py-4 text-center">Progresso (%)</th>
                <th className="px-6 py-4 text-right">Meta (R$)</th>
                <th className="px-6 py-4 text-right">Real + Pedidos</th>
                <th className="px-6 py-4 text-right text-warning">Saldo TO GO</th>
                <th className="px-6 py-4 text-center">Confiança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {executionData.map(item => {
                const total = item.real + item.pedidos
                const progress = (total / item.meta) * 100
                const toGo = item.meta - total
                
                return (
                  <tr key={item.id} className="hover:bg-white/2">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{item.nome}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className={`h-full ${progress >= 100 ? 'bg-success' : 'bg-accent'}`}
                          />
                        </div>
                        <span className="text-[10px] font-black mt-1">{progress.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-tabular">
                      R$ {item.meta.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-tabular text-success">
                      R$ {total.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-tabular text-warning font-bold">
                      R$ {toGo.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select 
                        value={confidence[item.id] || 'AMARELO'}
                        onChange={(e) => setConfidence(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 outline-none cursor-pointer ${
                          confidence[item.id] === 'AZUL' ? 'text-primary' : 
                          confidence[item.id] === 'VERDE' ? 'text-success' : 
                          confidence[item.id] === 'AMARELO' ? 'text-warning' : 'text-destructive'
                        }`}
                      >
                        <option value="AZUL">Azul (Vou bater)</option>
                        <option value="VERDE">Verde (No rastro)</option>
                        <option value="AMARELO">Amarelo (Risco)</option>
                        <option value="VERMELHO">Vermelho (Perdi)</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temporal Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AlertCard 
          icon={Clock} 
          title="Janela de Plantio" 
          description="A janela de adubação de base do Café fecha em 15 dias." 
          status="URGENTE"
          color="text-destructive"
          value="R$ 400k Pendentes"
        />
        <AlertCard 
          icon={AlertCircle} 
          title="Gap de Biológicos" 
          description="Você tem R$ 1.2M mapeados mas apenas R$ 200k faturados." 
          status="CRÍTICO"
          color="text-warning"
          value="83% de Gap"
        />
        <AlertCard 
          icon={CheckCircle2} 
          title="Meta Batida: Soja" 
          description="O segmento de sementes atingiu 105% da meta planejada." 
          status="OK"
          color="text-success"
          value="+R$ 50k Extra"
        />
      </div>
    </div>
  )
}

function KPICard({ label, value, subValue, color = "text-foreground" }: { label: string, value: string, subValue: string, color?: string }) {
  return (
    <div className="glass-card p-6 border-white/5">
      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black mt-2 font-tabular ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{subValue}</p>
    </div>
  )
}

function AlertCard({ icon: Icon, title, description, status, color, value }: any) {
  return (
    <div className="glass-card p-6 flex gap-4 items-start border-l-4 border-l-accent hover:translate-x-2 transition-transform cursor-pointer">
      <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
        <Icon size={24} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded bg-white/10 ${color}`}>{status}</span>
          <h4 className="text-sm font-bold uppercase tracking-tight">{title}</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        <p className={`text-[10px] font-black uppercase pt-2 ${color}`}>{value}</p>
      </div>
    </div>
  )
}
