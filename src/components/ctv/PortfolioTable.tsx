'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, TrendingUp, Users } from 'lucide-react'
import { Cliente } from '@/types/blueprint'

export default function PortfolioTable() {
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: '1',
      nome: 'Fazenda Boa Esperança',
      municipio: 'Passo Fundo/RS',
      hectares: { soja: 500, milho: 200, algodao: 0 },
      previsaoVendas: 450000,
      vpmIndividual: 1200000,
      shareAcesso: 37.5,
      nota: 8.2,
      segmentacao: 'VERDE'
    },
    {
      id: '2',
      nome: 'Agropecuária Schneider',
      municipio: 'Carazinho/RS',
      hectares: { soja: 1200, milho: 0, algodao: 0 },
      previsaoVendas: 1200000,
      vpmIndividual: 1500000,
      shareAcesso: 80.0,
      nota: 9.1,
      segmentacao: 'AZUL'
    }
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="text-accent" size={24} />
            Tabela Mãe (Gestão de Hectares)
          </h2>
          <p className="text-sm text-muted-foreground">Mapeamento de potencial e faturamento previsto por cliente</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Buscar produtor..." 
              className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-64"
            />
          </div>
          <button className="bg-white/5 border border-white/10 p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Produtor / Município</th>
                <th className="px-6 py-4 text-center">Hectares (S/M/A)</th>
                <th className="px-6 py-4">VPM Individual</th>
                <th className="px-6 py-4">Previsão Vendas</th>
                <th className="px-6 py-4 text-center">Share Acesso</th>
                <th className="px-6 py-4 text-center">Scoring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold">{cliente.nome}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{cliente.municipio}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <HecBadge label="S" value={cliente.hectares.soja} color="bg-success/20 text-success" />
                      <HecBadge label="M" value={cliente.hectares.milho} color="bg-warning/20 text-warning" />
                      <HecBadge label="A" value={cliente.hectares.algodao} color="bg-accent/20 text-accent" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold font-tabular">R$ {cliente.vpmIndividual.toLocaleString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <input 
                        type="number" 
                        defaultValue={cliente.previsaoVendas}
                        className="bg-transparent border-b border-white/10 focus:border-accent outline-none text-sm font-bold w-32 font-tabular"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-black text-accent">{cliente.shareAcesso}%</span>
                      <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${cliente.shareAcesso}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getBadgeColor(cliente.segmentacao)}`}>
                      {cliente.segmentacao} ({cliente.nota})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface HecBadgeProps {
  label: string;
  value: number;
  color: string;
}

function HecBadge({ label, value, color }: HecBadgeProps) {
  if (value === 0) return null
  return (
    <div className={`px-2 py-1 rounded text-[10px] font-bold ${color}`}>
      {label}: {value}
    </div>
  )
}

function getBadgeColor(seg: string) {
  switch (seg) {
    case 'AZUL': return 'bg-primary text-primary-foreground shadow-primary/20'
    case 'VERDE': return 'bg-success text-success-foreground shadow-success/20'
    case 'AMARELO': return 'bg-warning text-warning-foreground shadow-warning/20'
    case 'VERMELHO': return 'bg-destructive text-destructive-foreground shadow-destructive/20'
    default: return 'bg-muted text-muted-foreground'
  }
}
