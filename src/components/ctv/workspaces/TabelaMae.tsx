'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown,
  Info,
  DollarSign,
  Maximize2,
  Target
} from 'lucide-react'
import { VpmService } from '@/domain/services/vpm.service'
import { PerformanceBand, ITSEConfig } from '@/types/schema'

// Mock ITAA Matrix Reference for calculation (DNA Financeiro)
const MOCK_ITAA_CONFIGS: ITSEConfig[] = [
  { id: '1', empresaId: 'e1', safraId: 's1', cultivoId: 'Soja', productSegmentId: 'Semente', valuePerHectare: 800 },
  { id: '2', empresaId: 'e1', safraId: 's1', cultivoId: 'Soja', productSegmentId: 'Fertilizante', valuePerHectare: 1200 },
  { id: '3', empresaId: 'e1', safraId: 's1', cultivoId: 'Soja', productSegmentId: 'Agroquímicos', valuePerHectare: 900 },
  { id: '4', empresaId: 'e1', safraId: 's1', cultivoId: 'Soja', productSegmentId: 'Nutrição', valuePerHectare: 300 },
  { id: '5', empresaId: 'e1', safraId: 's1', cultivoId: 'Soja', productSegmentId: 'Biológico', valuePerHectare: 200 },
  { id: '6', empresaId: 'e1', safraId: 's1', cultivoId: 'Soja', productSegmentId: 'Regulador de Crescimento', valuePerHectare: 150 },
];

const ITAA_TOTAL = MOCK_ITAA_CONFIGS.reduce((acc, c) => acc + c.valuePerHectare, 0); // 3550

interface ClienteInterativo {
  id: string;
  name: string;
  municipio: string;
  areaHa: number;
  metaVenda: number;
  shareAlvo: number;
  rating: string;
  // Computed fields
  vpmTotal: number;
  areaNecessaria: number;
  areaInvalida: boolean;
  performanceBand: PerformanceBand;
}

import { MOCK_TEST_DATA } from '@/data/mock_database'

export default function TabelaMae({ onNavigate }: { onNavigate?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Transform MOCK_TEST_DATA to ClienteInterativo format
  const [clientes, setClientes] = useState<ClienteInterativo[]>(
    MOCK_TEST_DATA.map(d => {
      const totalArea = d.areas.soja + d.areas.milho + d.areas.algodao + d.areas.cana + d.areas.cafe;
      return {
        id: d.id,
        name: d.name,
        municipio: `${d.city}/${d.uf}`,
        areaHa: totalArea,
        metaVenda: totalArea * 450, // Initial mock meta for demo
        shareAlvo: 0.20,
        rating: d.rating,
        vpmTotal: 0,
        areaNecessaria: 0,
        areaInvalida: false,
        performanceBand: 'CINZA'
      };
    })
  );


  // Motor de Cálculo Dinâmico (Reativo a qualquer mudança na tabela)
  const clientesProcessados = useMemo(() => {
    // 1. Calcular VPM e Viabilidade Individual para cada cliente
    let processed = clientes.map(c => {
      const vpmTotal = c.areaHa * ITSE_TOTAL;
      const { areaNecessaria, areaInvalida } = VpmService.calculateRequiredArea(
        c.metaVenda, 
        c.shareAlvo, 
        ITSE_TOTAL, 
        c.areaHa
      );

      return { ...c, vpmTotal, areaNecessaria, areaInvalida };
    });

    // 2. Calcular Pareto V4 (Performance + Risco)
    const paretoResults = VpmService.calculatePareto(
      processed.map(p => ({ 
        id: p.id, 
        name: p.name, 
        vpmTotal: p.vpmTotal,
        realizedValue: p.metaVenda, // Using meta as proxy for demo
        rating: p.rating
      }))
    );

    // 3. Mesclar resultados do Pareto de volta aos clientes
    return processed.map(p => {
      const pareto = paretoResults.find(r => r.clientId === p.id);
      return { ...p, performanceBand: pareto?.performanceBand || 'CINZA' };
    });
  }, [clientes]);


  const updateCliente = (id: string, field: keyof ClienteInterativo, value: number) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const filteredClientes = clientesProcessados.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header com Diagnóstico de Carteira */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-3 text-gradient">
            <Users size={32} />
            PLANO DE NEGÓCIOS: INVENTÁRIO ESTRATÉGICO
          </h2>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Passos 2, 3 e 15 (Materialização e Segmentação)</p>
        </div>

        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente ou município..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/50 border-2 border-primary/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/30 outline-none w-64 transition-all"
            />
          </div>
          <button className="p-2 bg-white border-2 border-primary/10 rounded-xl hover:bg-muted transition-colors shadow-sm">
            <Filter size={20} className="text-primary" />
          </button>
        </div>
      </div>

      {/* Grid da Tabela */}
      <div className="glass-card overflow-hidden shadow-2xl border-white/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                <th className="px-6 py-5 border-b-2 border-primary/10">Produtor / Município</th>
                <th className="px-6 py-5 border-b-2 border-primary/10 text-center">Materialização (ha)</th>
                <th className="px-6 py-5 border-b-2 border-primary/10">VPM Individual</th>
                <th className="px-6 py-5 border-b-2 border-primary/10">Meta Consolidada</th>
                <th className="px-6 py-5 border-b-2 border-primary/10 text-center">Share Alvo %</th>
                <th className="px-6 py-5 border-b-2 border-primary/10 text-center">Viabilidade</th>
                <th className="px-6 py-5 border-b-2 border-primary/10 text-center">Segmentação</th>
                <th className="px-6 py-5 border-b-2 border-primary/10 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              <AnimatePresence mode='popLayout'>
                {filteredClientes.map((cliente) => (
                  <motion.tr 
                    key={cliente.id} 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-primary/[0.02] transition-colors"
                  >
                    <td className="px-6 py-6">
                      <p className="text-sm font-black text-primary">{cliente.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">{cliente.municipio}</p>
                    </td>
                    
                    <td className="px-6 py-6">
                      <div className="flex justify-center">
                        <input 
                          type="number"
                          value={cliente.areaHa}
                          onChange={(e) => updateCliente(cliente.id, 'areaHa', Number(e.target.value))}
                          className="w-24 p-2 bg-white border-2 border-primary/5 rounded-xl text-center text-sm font-black focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <p className="text-sm font-black text-primary/80 font-tabular">
                        R$ {cliente.vpmTotal.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                        DNA: {ITSE_TOTAL.toLocaleString('pt-BR')} /ha
                      </p>

                    </td>

                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">R$</span>
                        <input 
                          type="number"
                          value={cliente.metaVenda}
                          onChange={(e) => updateCliente(cliente.id, 'metaVenda', Number(e.target.value))}
                          className={`w-32 p-2 bg-white border-2 rounded-xl text-sm font-black focus:ring-2 outline-none transition-all ${cliente.areaInvalida ? 'border-destructive text-destructive bg-destructive/5' : 'border-primary/5'}`}
                        />
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <div className="flex justify-center">
                        <select 
                          value={cliente.shareAlvo}
                          onChange={(e) => updateCliente(cliente.id, 'shareAlvo', Number(e.target.value))}
                          className="bg-white border-2 border-primary/5 rounded-xl px-3 py-2 text-xs font-black outline-none focus:border-primary transition-all cursor-pointer"
                        >
                          <option value={0.10}>10%</option>
                          <option value={0.15}>15%</option>
                          <option value={0.20}>20%</option>
                          <option value={0.25}>25%</option>
                          <option value={0.30}>30%</option>
                        </select>
                      </div>
                    </td>

                    <td className="px-6 py-6">
                      <div className="flex flex-col items-center">
                        {cliente.areaInvalida ? (
                          <div className="flex items-center gap-1 text-destructive animate-pulse">
                            <AlertCircle size={16} />
                            <span className="text-[10px] font-black uppercase">Meta Inválida</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-success">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black uppercase">Viável</span>
                          </div>
                        )}
                        <p className="text-[9px] text-muted-foreground font-bold mt-1">Req: {cliente.areaNecessaria.toLocaleString('pt-BR')} ha</p>
                      </div>
                    </td>


                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-lg ${getBandStyle(cliente.performanceBand)}`}>
                        {cliente.performanceBand}
                      </span>
                    </td>

                    <td className="px-6 py-6 text-right">
                      <button 
                        onClick={onNavigate}
                        className="p-2.5 bg-accent/10 border-2 border-accent/20 rounded-xl text-accent hover:bg-accent hover:text-white transition-all shadow-sm hover:shadow-accent/20"
                        title="Abrir Planejamento de Pareto"
                      >
                        <Target size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer com Resumo da Estratégia Pareto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-primary shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">VPM Total da Carteira</p>
          <h4 className="text-2xl font-black text-primary">
            R$ {clientesProcessados.reduce((acc, c) => acc + c.vpmTotal, 0).toLocaleString('pt-BR')}
          </h4>
        </div>
        <div className="glass-card p-6 border-l-4 border-success shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Meta Consolidada (Budget)</p>
          <h4 className="text-2xl font-black text-success">
            R$ {clientesProcessados.reduce((acc, c) => acc + c.metaVenda, 0).toLocaleString('pt-BR')}
          </h4>
        </div>
        <div className="glass-card p-6 border-l-4 border-accent shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Market Share Médio</p>
          <h4 className="text-2xl font-black text-accent">
            {(clientesProcessados.reduce((acc, c) => acc + c.shareAlvo, 0) / clientes.length * 100).toFixed(1)}%
          </h4>
        </div>
      </div>
    </div>
  )
}

function getBandStyle(band: PerformanceBand) {
  switch (band) {
    case 'AZUL': return 'bg-[#1E40AF] text-white shadow-[#1E40AF]/20'
    case 'VERDE': return 'bg-[#15803D] text-white shadow-[#15803D]/20'
    case 'AMARELO': return 'bg-[#EAB308] text-white shadow-[#EAB308]/20'
    case 'VERMELHO': return 'bg-[#BE123C] text-white shadow-[#BE123C]/20'
    default: return 'bg-slate-200 text-slate-500 shadow-none'
  }
}
