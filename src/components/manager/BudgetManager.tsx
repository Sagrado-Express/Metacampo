'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Landmark, Calendar, ChevronDown, Split, Info } from 'lucide-react'

export default function BudgetManager() {
  const [activeMonth, setActiveMonth] = useState('Outubro')
  
  const segments = ['Semente', 'Fertilizante', 'Agroquímicos', 'Nutrição', 'Biológico', 'Regulador de Crescimento']
  const months = ['Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro', 'Fevereiro']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="text-accent" size={24} />
            Orçamento Mensalizado (Budget)
          </h2>
          <p className="text-sm text-muted-foreground">Distribuição de metas financeiras por mês, cultura e segmento</p>
        </div>
        
        <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
          {months.map(month => (
            <button 
              key={month}
              onClick={() => setActiveMonth(month)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeMonth === month ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Budget Entry Form */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="text-muted-foreground" size={18} />
              Alocação: {activeMonth}
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Copiar do Mês Anterior</button>
            </div>
          </div>

          <div className="space-y-6">
            {segments.map(segmento => (
              <div key={segmento} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase text-muted-foreground">{segmento}</span>
                  <span className="text-[10px] text-muted-foreground/60">Cultura: Soja</span>
                </div>
                <div className="md:col-span-2 flex gap-4 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                    <input 
                      type="number" 
                      placeholder="0,00"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-tabular"
                    />
                  </div>
                  <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-muted-foreground hover:text-accent hover:border-accent/30 transition-all">
                    <Split size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Region Summary */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-accent/20 bg-accent/5">
            <div className="flex items-center gap-2 mb-4">
              <Info className="text-accent" size={18} />
              <h4 className="text-sm font-bold uppercase tracking-widest">Resumo Regional</h4>
            </div>
            <div className="space-y-4">
              <StatRow label="Budget Total (Mês)" value="R$ 4.250.000" />
              <StatRow label="Planejado (CTV)" value="R$ 3.890.000" />
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Gap de Alocação</span>
                <span className="text-sm font-black text-warning">R$ 360.000</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Split por Vendedor</h4>
            <div className="space-y-4">
              <VendedorRow nome="Daniel" share={45} valor="R$ 1.912.500" />
              <VendedorRow nome="Ricardo" share={35} valor="R$ 1.487.500" />
              <VendedorRow nome="Aline" share={20} valor="R$ 850.000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatRowProps {
  label: string;
  value: string;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <span className="text-lg font-black font-tabular">{value}</span>
    </div>
  )
}

interface VendedorRowProps {
  nome: string;
  share: number;
  valor: string;
}

function VendedorRow({ nome, share, valor }: VendedorRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase">
        <span>{nome}</span>
        <span className="text-muted-foreground">{valor}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${share}%` }} />
      </div>
    </div>
  )
}
