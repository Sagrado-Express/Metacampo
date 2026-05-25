'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Filter, 
  DollarSign, 
  MapPin, 
  UserCheck, 
  RotateCcw, 
  ChevronRight,
  Database,
  Search,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react'

// --- Types ---
interface InactiveProduct {
  name: string;
  segment: string;
  value: number;
  volume: string;
  crop: string;
}

interface InactiveClient {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  venda2025: number;
  crops: string[];
  produtos: InactiveProduct[];
}

interface ActiveClient {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  meta: number;
  real: number;
  pedidos: number;
  forecastSuccess: number; // The distributed gap value the CTV believes they will close
  confidence: 'AZUL' | 'VERDE' | 'AMARELO' | 'VERMELHO';
}

export default function ExecutionWorkspace() {
  // CTV Consolidated Target Goals
  const metaConsolidada = 5200000;
  const realConsolidado = 3150000;
  const pedidosConsolidado = 600000;
  const totalConquistado = realConsolidado + pedidosConsolidado;
  const totalGap = Math.max(0, metaConsolidada - totalConquistado); // R$ 1.450.000

  // State for active clients under planning/execution
  const [activeClients, setActiveClients] = useState<ActiveClient[]>([
    { id: '1', nome: 'Fazenda Esperança', cidade: 'Sorriso', uf: 'MT', meta: 1200000, real: 750000, pedidos: 150000, forecastSuccess: 100000, confidence: 'VERDE' },
    { id: '2', nome: 'Fazenda Boa Vista', cidade: 'Sorriso', uf: 'MT', meta: 1800000, real: 1200000, pedidos: 200000, forecastSuccess: 250000, confidence: 'AZUL' },
    { id: '3', nome: 'Fazenda Progressiva', cidade: 'Sinop', uf: 'MT', meta: 900000, real: 580000, pedidos: 50000, forecastSuccess: 120000, confidence: 'AMARELO' },
    { id: '4', nome: 'Fazenda Santa Maria', cidade: 'Rio Verde', uf: 'GO', meta: 800000, real: 420000, pedidos: 100000, forecastSuccess: 80000, confidence: 'VERDE' },
    { id: '5', nome: 'Fazenda Terra Rica', cidade: 'Cascavel', uf: 'PR', meta: 500000, real: 200000, pedidos: 100000, forecastSuccess: 50000, confidence: 'VERDE' },
  ]);

  // State for Churn Radar / Inactive clients
  const [inactiveClients, setInactiveClients] = useState<InactiveClient[]>([
    {
      id: 'churn_1',
      nome: 'Fazenda União',
      cidade: 'Lucas do Rio Verde',
      uf: 'MT',
      venda2025: 1500000,
      crops: ['Soja', 'Milho'],
      produtos: [
        { name: 'Sementes Soja Monsoy 6210', segment: 'Sementes', value: 600000, volume: '1.500 scs', crop: 'Soja' },
        { name: 'Sementes Milho DKB 265', segment: 'Sementes', value: 300000, volume: '800 scs', crop: 'Milho' },
        { name: 'Adubo Fertilizante NPK 04-14-08', segment: 'Fertilizantes', value: 400000, volume: '120 ton', crop: 'Soja' },
        { name: 'Agroquímico Fungicida Priori Xtra', segment: 'Agroquímicos', value: 200000, volume: '1.000 L', crop: 'Soja' }
      ]
    },
    {
      id: 'churn_2',
      nome: 'Fazenda Sol Nascente',
      cidade: 'Jataí',
      uf: 'GO',
      venda2025: 850000,
      crops: ['Milho', 'Cana'],
      produtos: [
        { name: 'Fertilizante Especial Cana-Forte', segment: 'Fertilizantes', value: 500000, volume: '150 ton', crop: 'Cana' },
        { name: 'Sementes Milho Pioneer P3858', segment: 'Sementes', value: 250000, volume: '650 scs', crop: 'Milho' },
        { name: 'Biológico Inoculante Nitro-Pro', segment: 'Biológicos', value: 100000, volume: '500 L', crop: 'Milho' }
      ]
    },
    {
      id: 'churn_3',
      nome: 'Fazenda Jatobá',
      cidade: 'Unaí',
      uf: 'MG',
      venda2025: 600000,
      crops: ['Café'],
      produtos: [
        { name: 'Nutrição Foliar Café-Plus', segment: 'Nutrição', value: 350000, volume: '12.000 L', crop: 'Café' },
        { name: 'Agroquímico Defensivo Comet', segment: 'Agroquímicos', value: 250000, volume: '800 L', crop: 'Café' }
      ]
    }
  ]);

  // Selected client for detail drill-down (YoY Purchase History)
  const [selectedInactiveClient, setSelectedInactiveClient] = useState<InactiveClient | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Sum of current bottom-up forecast distribution
  const totalForecastDistributed = useMemo(() => {
    return activeClients.reduce((sum, c) => sum + c.forecastSuccess, 0);
  }, [activeClients]);

  const gapRestante = Math.max(0, totalGap - totalForecastDistributed);

  // Formatting helper
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  // Interactive slider/input change
  const handleForecastChange = (id: string, value: number) => {
    setActiveClients(prev => prev.map(c => {
      if (c.id === id) {
        // Capped at the maximum gap for this client
        const maxClientGap = Math.max(0, c.meta - (c.real + c.pedidos));
        const finalVal = Math.min(maxClientGap, Math.max(0, value));
        return { ...c, forecastSuccess: finalVal };
      }
      return c;
    }));
  };

  // Change confidence status
  const handleConfidenceChange = (id: string, value: ActiveClient['confidence']) => {
    setActiveClients(prev => prev.map(c => c.id === id ? { ...c, confidence: value } : c));
  };

  // Activate a churned client
  const handleActivateClient = (client: InactiveClient) => {
    // Add to active clients list
    const newActive: ActiveClient = {
      id: client.id,
      nome: client.nome,
      cidade: client.cidade,
      uf: client.uf,
      meta: client.venda2025 * 1.1, // Set default meta as last year + 10%
      real: 0,
      pedidos: 0,
      forecastSuccess: client.venda2025 * 0.5, // Predict recovering 50% first
      confidence: 'AMARELO'
    };

    setActiveClients(prev => [...prev, newActive]);
    setInactiveClients(prev => prev.filter(c => c.id !== client.id));
    setSelectedInactiveClient(null);
  };

  return (
    <div className="space-y-10 text-[#3E2723]">
      
      {/* ─── KPIS CONSOLIDADOS DO CTV ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard label="Meta Consolidada" value={fmt(metaConsolidada)} subValue="Alvo para Safra 26/27" />
        <KPICard label="Vendido Realizado" value={fmt(realConsolidado)} subValue={`${Math.round((realConsolidado / metaConsolidada) * 100)}% da Meta`} color="text-emerald-700" />
        <KPICard label="Pedidos Pendentes" value={fmt(pedidosConsolidado)} subValue="Aguardando liberação" color="text-sky-700" />
        <KPICard label="Saldo TO-GO (GAP)" value={fmt(totalGap)} subValue="Diferença para meta" color="text-amber-600 font-bold" />
      </div>

      {/* ─── PAINEL INTERATIVO DE DISTRIBUIÇÃO DO GAP ─── */}
      <section className="glass-card-premium p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-primary animate-pulse" size={20} />
              Painel Interativo de Distribuição de Gap
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Distribua seu gap de vendas nos clientes com maior probabilidade de conversão
            </p>
          </div>
          
          {/* Progress / Pacing Indicator */}
          <div className="flex items-center gap-4 bg-white/50 border border-white p-3 rounded-2xl shadow-inner">
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-muted-foreground block">Gap Planejado</span>
              <span className="text-xs font-black text-primary">{fmt(totalForecastDistributed)}</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-muted-foreground block">Gap Restante</span>
              <span className={`text-xs font-black ${gapRestante > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-700'}`}>
                {fmt(gapRestante)}
              </span>
            </div>
          </div>
        </div>

        {/* Global Forecast Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            <span>Pacing de Cobertura do Gap do CTV</span>
            <span>{totalGap > 0 ? Math.round((totalForecastDistributed / totalGap) * 100) : 0}% Planejado</span>
          </div>
          <div className="w-full h-3 bg-white/30 border border-white/50 rounded-full overflow-hidden flex shadow-inner backdrop-blur-sm">
            <motion.div 
              className="h-full bg-primary"
              animate={{ width: `${totalGap > 0 ? Math.min(100, (totalForecastDistributed / totalGap) * 100) : 0}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Interactive Active Clients Table */}
        <div className="overflow-x-auto rounded-2xl border border-border/30 shadow-sm bg-white/10">
          <table className="w-full text-xs text-left">
            <thead className="bg-primary/5 text-[9px] font-black uppercase tracking-widest text-primary/70">
              <tr>
                <th className="px-6 py-4">Cliente / Praça</th>
                <th className="px-6 py-4 text-right">Meta Individual</th>
                <th className="px-6 py-4 text-right">Faturado + Pedidos</th>
                <th className="px-6 py-4 text-right text-amber-600">Saldo TO-GO</th>
                <th className="px-6 py-4 text-center min-w-[220px]">Distribuição de Recuperação</th>
                <th className="px-6 py-4 text-center">Status Confiança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {activeClients.map(c => {
                const totalRealized = c.real + c.pedidos;
                const clientGap = Math.max(0, c.meta - totalRealized);
                const pctClosed = c.meta > 0 ? Math.round((totalRealized / c.meta) * 100) : 0;
                
                return (
                  <tr key={c.id} className="hover:bg-white/30 transition-colors">
                    {/* Client Info */}
                    <td className="px-6 py-5">
                      <p className="font-black text-[#3E2723]">{c.nome}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-primary/70" /> {c.cidade} - {c.uf}
                      </p>
                    </td>

                    {/* Meta */}
                    <td className="px-6 py-5 text-right font-black font-tabular text-[#3E2723]">
                      {fmt(c.meta)}
                    </td>

                    {/* Realizado + Pedidos */}
                    <td className="px-6 py-5 text-right font-black font-tabular text-emerald-700">
                      <div>{fmt(totalRealized)}</div>
                      <div className="text-[8px] text-muted-foreground font-bold uppercase">{pctClosed}% batido</div>
                    </td>

                    {/* Individual Gap */}
                    <td className="px-6 py-5 text-right font-black font-tabular text-amber-600">
                      {fmt(clientGap)}
                    </td>

                    {/* Interactive Gap Allocation Slider */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 justify-center">
                        <input 
                          type="range"
                          min="0"
                          max={clientGap}
                          step="10000"
                          value={c.forecastSuccess}
                          onChange={(e) => handleForecastChange(c.id, Number(e.target.value))}
                          className="w-32 accent-primary cursor-ew-resize h-1 bg-primary/20 rounded-lg appearance-none"
                        />
                        <input 
                          type="number"
                          value={c.forecastSuccess}
                          step="5000"
                          onChange={(e) => handleForecastChange(c.id, Number(e.target.value))}
                          className="w-24 p-1 text-center bg-white border border-border rounded-lg font-black text-xs text-[#3E2723] focus:border-primary outline-none"
                        />
                      </div>
                    </td>

                    {/* Confidence Selector */}
                    <td className="px-6 py-5 text-center">
                      <select 
                        value={c.confidence}
                        onChange={(e) => handleConfidenceChange(c.id, e.target.value as ActiveClient['confidence'])}
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl bg-white border-2 border-border/40 outline-none cursor-pointer ${
                          c.confidence === 'AZUL' ? 'text-blue-600 border-blue-200 bg-blue-50' : 
                          c.confidence === 'VERDE' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 
                          c.confidence === 'AMARELO' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-rose-600 border-rose-200 bg-rose-50'
                        }`}
                      >
                        <option value="AZUL">🔵 AZUL (Garantido)</option>
                        <option value="VERDE">🟢 VERDE (No Rastro)</option>
                        <option value="AMARELO">🟡 AMARELO (Risco)</option>
                        <option value="VERMELHO">🔴 VERMELHO (Perdido)</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── RADAR DE CHURN: CLIENTES INATIVOS (VENDEU ANO PASSADO, NÃO ESTE ANO) ─── */}
      <section className="grid grid-cols-1 gap-6">
        <div className="flex items-center gap-2 ml-2">
          <AlertCircle className="text-amber-600 animate-pulse" size={18} />
          <h3 className="text-sm font-black uppercase tracking-widest text-[#3E2723]">
            Radar de Recuperação: Clientes Inativos (Venda 2025 vs 2026)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {inactiveClients.map(client => (
            <motion.div 
              key={client.id}
              whileHover={{ y: -4 }}
              className="glass-card-premium p-6 border-l-4 border-l-amber-500 flex flex-col justify-between cursor-pointer hover:border-r hover:border-r-border/30"
              onClick={() => setSelectedInactiveClient(client)}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-black text-[#3E2723]">{client.nome}</h4>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {client.cidade} - {client.uf}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-200 text-[8px] font-black uppercase tracking-widest rounded-full">
                    R$ 0 em 2026
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground font-bold">
                  <Database size={12} className="text-primary/70" />
                  <span>Cultivos históricos:</span>
                  <div className="flex gap-1">
                    {client.crops.map(crop => (
                      <span key={crop} className="px-1.5 py-0.5 bg-white border rounded text-[8px] font-black text-primary">
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border/30 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">Comprado em 2025</span>
                  <span className="text-sm font-black text-[#3E2723]">{fmt(client.venda2025)}</span>
                </div>
                <span className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform">
                  Detalhar Histórico <ChevronRight size={14} />
                </span>
              </div>
            </motion.div>
          ))}

          {inactiveClients.length === 0 && (
            <div className="col-span-3 glass-card-premium p-8 text-center text-muted-foreground font-bold text-xs">
              🎉 Nenhum cliente inativo pendente de recuperação na carteira!
            </div>
          )}
        </div>
      </section>

      {/* ─── MODAL DRILL-DOWN HISTÓRICO DE COMPRAS (SLIDE-OVER DRAWER) ─── */}
      <AnimatePresence>
        {selectedInactiveClient && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInactiveClient(null)}
              className="absolute inset-0 bg-[#3E2723]/30 backdrop-blur-sm"
            />

            {/* Slide Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-[#FDFDFD] border-l border-border/50 shadow-2xl flex flex-col justify-between p-8 z-10"
            >
              <div className="space-y-8 overflow-y-auto max-h-[85%] pr-2">
                {/* Header */}
                <div className="border-b border-border/40 pb-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-200 text-[8px] font-black uppercase tracking-widest rounded-full">
                        Histórico YoY (Ano vs Ano)
                      </span>
                      <h3 className="text-xl font-black tracking-tight text-[#3E2723] mt-2">
                        {selectedInactiveClient.nome}
                      </h3>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-primary/70" /> {selectedInactiveClient.cidade} - {selectedInactiveClient.uf}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedInactiveClient(null)}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center font-black hover:bg-muted text-muted-foreground"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Purchase Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl">
                    <span className="text-[8px] font-black uppercase text-primary/70 tracking-widest block">Potencial VPM Estimado</span>
                    <span className="text-md font-black text-primary font-tabular mt-1 block">
                      {fmt(selectedInactiveClient.venda2025 * 1.5)}
                    </span>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl">
                    <span className="text-[8px] font-black uppercase text-amber-600/70 tracking-widest block">Total Comprado em 2025</span>
                    <span className="text-md font-black text-amber-600 font-tabular mt-1 block">
                      {fmt(selectedInactiveClient.venda2025)}
                    </span>
                  </div>
                </div>

                {/* Detailed Purchases Receipt List */}
                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block flex items-center gap-2">
                    <Database size={14} className="text-primary/80" />
                    Detalhamento dos Pedidos Comprados em 2025
                  </span>

                  <div className="space-y-3">
                    {selectedInactiveClient.produtos.map((p, idx) => (
                      <div key={idx} className="bg-white border border-border/30 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                        <div className="space-y-1">
                          <p className="font-black text-xs text-[#3E2723]">{p.name}</p>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold">
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary uppercase text-[8px] font-black rounded">
                              {p.crop}
                            </span>
                            <span>•</span>
                            <span>Segmento: {p.segment}</span>
                            <span>•</span>
                            <span>Qtd: {p.volume}</span>
                          </div>
                        </div>
                        <span className="font-black text-xs text-[#3E2723] font-tabular">
                          {fmt(p.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="border-t border-border/40 pt-6">
                <button 
                  onClick={() => handleActivateClient(selectedInactiveClient)}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors shadow-lg shadow-primary/20"
                >
                  <UserCheck size={18} />
                  Reativar Cliente e Distribuir Gap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KPICard({ label, value, subValue, color = "text-[#3E2723]" }: { label: string; value: string; subValue: string; color?: string }) {
  return (
    <div className="glass-card-premium p-6 border-white/40 flex flex-col justify-between">
      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</span>
      <div className="mt-4">
        <span className={`text-2xl font-black tracking-tight font-tabular ${color}`}>{value}</span>
        <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">{subValue}</p>
      </div>
    </div>
  );
}
