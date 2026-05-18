"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { LucideRadar, LucideMapPin, LucideTarget, LucideTrendingUp, LucideAlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClienteMix {
  sementes: number;
  fertilizantes: number;
  biologicos: number;
  nutricao: number;
}

interface ClienteCTV {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  pareto: "AZUL" | "VERDE" | "AMARELO" | "VERMELHO";
  vpm: number;
  faturado: number;
  mix: ClienteMix;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CTV_INFO = { nome: "Joao Silva", meta: 5200000, faturado: 3150000 };

const CLIENTES: ClienteCTV[] = [
  { id: "1", nome: "Fazenda Esperança",    cidade: "Sorriso",              uf: "MT", pareto: "AZUL",     vpm: 9800000,  faturado: 3200000, mix: { sementes: 1200000, fertilizantes: 1400000, biologicos: 350000, nutricao: 250000 } },
  { id: "2", nome: "Fazenda Boa Vista",    cidade: "Sorriso",              uf: "MT", pareto: "AZUL",     vpm: 11900000, faturado: 4500000, mix: { sementes: 2200000, fertilizantes: 1500000, biologicos: 500000, nutricao: 300000 } },
  { id: "3", nome: "Fazenda Progressiva",  cidade: "Sinop",                uf: "MT", pareto: "VERDE",    vpm: 4900000,  faturado: 580000,  mix: { sementes: 380000,  fertilizantes: 120000,  biologicos: 60000,  nutricao: 20000  } },
  { id: "4", nome: "Fazenda União",        cidade: "Lucas do Rio Verde",   uf: "MT", pareto: "AZUL",     vpm: 19250000, faturado: 0,       mix: { sementes: 0,       fertilizantes: 0,       biologicos: 0,      nutricao: 0      } },
  { id: "5", nome: "Fazenda Santa Maria",  cidade: "Rio Verde",            uf: "GO", pareto: "VERDE",    vpm: 17500000, faturado: 920000,  mix: { sementes: 550000,  fertilizantes: 270000,  biologicos: 80000,  nutricao: 20000  } },
  { id: "6", nome: "Fazenda Sol Nascente", cidade: "Jataí",               uf: "GO", pareto: "AMARELO",  vpm: 16450000, faturado: 680000,  mix: { sementes: 280000,  fertilizantes: 260000,  biologicos: 100000, nutricao: 40000  } },
  { id: "7", nome: "Fazenda Terra Rica",   cidade: "Cascavel",             uf: "PR", pareto: "AZUL",     vpm: 6300000,  faturado: 2800000, mix: { sementes: 1100000, fertilizantes: 1000000, biologicos: 450000, nutricao: 250000 } },
  { id: "8", nome: "Fazenda Jatobá",       cidade: "Unaí",                 uf: "MG", pareto: "VERMELHO", vpm: 5100000,  faturado: 120000,  mix: { sementes: 80000,   fertilizantes: 30000,   biologicos: 10000,  nutricao: 0      } },
];

// ─── Map pins (abstract heatmap positions) ────────────────────────────────────
const MAP_PINS = [
  { id: "1", label: "Esperança",    x: 25, y: 28, color: "#3B82F6" },
  { id: "2", label: "Boa Vista",    x: 32, y: 35, color: "#3B82F6" },
  { id: "3", label: "Progressiva",  x: 42, y: 22, color: "#22C55E" },
  { id: "4", label: "União",        x: 20, y: 45, color: "#3B82F6" },
  { id: "5", label: "Santa Maria",  x: 58, y: 55, color: "#22C55E" },
  { id: "6", label: "Sol Nascente", x: 51, y: 65, color: "#EAB308" },
  { id: "7", label: "Terra Rica",   x: 45, y: 80, color: "#3B82F6" },
  { id: "8", label: "Jatobá",       x: 70, y: 50, color: "#EF4444" },
];

// ─── Design constants ─────────────────────────────────────────────────────────
const PARETO_STYLES: Record<ClienteCTV["pareto"], { badge: string; dot: string }> = {
  AZUL:     { badge: "bg-blue-900/60 text-blue-300 border-blue-700/50",     dot: "bg-blue-400" },
  VERDE:    { badge: "bg-green-900/60 text-green-300 border-green-700/50",  dot: "bg-green-400" },
  AMARELO:  { badge: "bg-yellow-900/60 text-yellow-300 border-yellow-700/50", dot: "bg-yellow-400" },
  VERMELHO: { badge: "bg-red-900/60 text-red-300 border-red-700/50",        dot: "bg-red-400" },
};

const MIX_COLORS = { sementes: "#22C55E", fertilizantes: "#3B82F6", biologicos: "#A855F7", nutricao: "#F59E0B" };

const PIE_COLORS = ["#22C55E", "#3B82F6", "#A855F7", "#F59E0B"];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

// ─── Sub-components ───────────────────────────────────────────────────────────
function DarkKpiCard({ label, value, amber, icon }: { label: string; value: string; amber?: boolean; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-800/80 border border-white/10 backdrop-blur-md p-6 flex flex-col justify-between hover:border-white/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <span className={`text-2xl font-black tracking-tight ${amber ? "text-yellow-400" : "text-white"}`}>{value}</span>
    </div>
  );
}

function MiniStackBar({ mix }: { mix: ClienteMix }) {
  const total = mix.sementes + mix.fertilizantes + mix.biologicos + mix.nutricao;
  if (total === 0) return <span className="text-slate-600 text-[9px] font-bold">Sem vendas</span>;
  return (
    <div className="flex h-2 w-28 rounded-full overflow-hidden gap-px">
      {Object.entries(mix).map(([key, val]) => (
        <div key={key} className="h-full" title={key}
          style={{ width: `${(val / total) * 100}%`, backgroundColor: MIX_COLORS[key as keyof ClienteMix] }} />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function CTVCockpit() {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"vpm" | "faturado" | "togo">("togo");

  const toGo = Math.max(0, CTV_INFO.meta - CTV_INFO.faturado);
  const pct = CTV_INFO.meta > 0 ? Math.round((CTV_INFO.faturado / CTV_INFO.meta) * 100) : 0;

  // Pie data — aggregate mix
  const pieData = useMemo(() => {
    const agg = { sementes: 0, fertilizantes: 0, biologicos: 0, nutricao: 0 };
    CLIENTES.forEach(c => {
      agg.sementes     += c.mix.sementes;
      agg.fertilizantes+= c.mix.fertilizantes;
      agg.biologicos   += c.mix.biologicos;
      agg.nutricao     += c.mix.nutricao;
    });
    return [
      { name: "Sementes",      value: agg.sementes },
      { name: "Fertilizantes", value: agg.fertilizantes },
      { name: "Biológicos",    value: agg.biologicos },
      { name: "Nutrição",      value: agg.nutricao },
    ].filter(d => d.value > 0);
  }, []);

  // Sorted clients
  const sortedClients = useMemo(() =>
    [...CLIENTES].sort((a, b) => {
      if (sortCol === "togo") return (b.vpm - b.faturado) - (a.vpm - a.faturado);
      return b[sortCol] - a[sortCol];
    }), [sortCol]);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 lg:p-10 space-y-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-900/50 border border-green-700/40">
            <LucideRadar size={20} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white">Radar de Caça</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{CTV_INFO.nome} • Workspace Individual</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <DarkKpiCard label="Minha Meta" value={fmt(CTV_INFO.meta)}
            icon={<LucideTarget size={16} />} />
          <DarkKpiCard label="Meu Faturamento" value={`${fmt(CTV_INFO.faturado)} (${pct}%)`}
            icon={<LucideTrendingUp size={16} />} />
          <DarkKpiCard label="Saldo TO-GO" value={fmt(toGo)} amber
            icon={<LucideAlertTriangle size={16} className="text-yellow-400" />} />
        </div>
      </div>

      {/* ── SECTION 2: MAP + DONUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Heatmap (Abstract) */}
        <div className="lg:col-span-3 rounded-2xl bg-slate-800/70 border border-white/10 backdrop-blur-md p-6 relative overflow-hidden" style={{ minHeight: 340 }}>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
            <LucideMapPin size={12} className="text-green-400" /> Mapa de Calor — Território
          </span>

          {/* Topographic SVG background */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06] text-green-400 pointer-events-none">
            <pattern id="ctv-topo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M0,40 Q20,20 40,40 T80,40" fill="none" stroke="currentColor" strokeWidth="1"/>
              <path d="M0,65 Q20,45 40,65 T80,65" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#ctv-topo)" />
          </svg>

          {/* Pins */}
          {MAP_PINS.map(pin => {
            const client = CLIENTES.find(c => c.id === pin.id);
            const isHovered = hoveredPin === pin.id;
            const toGoVal = client ? Math.max(0, client.vpm - client.faturado) : 0;
            return (
              <div key={pin.id} className="absolute"
                style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
                onMouseEnter={() => setHoveredPin(pin.id)}
                onMouseLeave={() => setHoveredPin(null)}>
                <span className="absolute animate-ping inline-flex h-5 w-5 rounded-full opacity-30"
                  style={{ backgroundColor: pin.color, top: -10, left: -10 }} />
                <motion.div whileHover={{ scale: 1.4 }}
                  className="relative z-10 h-4 w-4 rounded-full border-2 border-slate-900 cursor-pointer shadow-lg"
                  style={{ backgroundColor: pin.color, marginTop: -8, marginLeft: -8 }} />

                <AnimatePresence>
                  {isHovered && client && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute z-30 bg-slate-900/95 border border-white/20 rounded-xl p-3 shadow-2xl whitespace-nowrap"
                      style={{ top: -80, left: -40 }}>
                      <p className="text-[10px] font-black text-white">{client.nome}</p>
                      <p className="text-[9px] text-green-400 font-bold">VPM: {fmt(client.vpm)}</p>
                      <p className="text-[9px] text-slate-400 font-bold">Fat: {fmt(client.faturado)}</p>
                      <p className="text-[9px] text-yellow-400 font-bold">TO-GO: {fmt(toGoVal)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Donut MIX */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-800/70 border border-white/10 backdrop-blur-md p-6 flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Mix por Categoria</span>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">{item.name}</span>
                </div>
                <span className="text-white font-black font-tabular">{fmt(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: TABELA MÃE ── */}
      <div className="rounded-2xl bg-slate-800/70 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tabela Mãe — Clientes em Carteira</span>
          <div className="flex items-center gap-2">
            {(["togo", "faturado", "vpm"] as const).map(col => (
              <button key={col} onClick={() => setSortCol(col)}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  sortCol === col ? "bg-green-700 text-white" : "bg-slate-700/60 text-slate-400 hover:bg-slate-700"
                }`}>
                {col === "togo" ? "Gap" : col === "faturado" ? "Faturado" : "VPM"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {["Cliente", "Pareto", "VPM (Potencial)", "Faturado YTD", "Saldo TO-GO", "Wallet Share", "Mix"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((c, i) => {
                const togo = Math.max(0, c.vpm - c.faturado);
                const share = c.vpm > 0 ? (c.faturado / c.vpm) * 100 : 0;
                const ps = PARETO_STYLES[c.pareto];
                return (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-black text-white">{c.nome}</p>
                        <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                          <LucideMapPin size={8} />{c.cidade} - {c.uf}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${ps.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                        {c.pareto}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-300 font-tabular">{fmt(c.vpm)}</td>
                    <td className="px-5 py-4 font-black text-green-400 font-tabular">{fmt(c.faturado)}</td>
                    <td className="px-5 py-4 font-black font-tabular">
                      <span className={togo > 2000000 ? "text-red-400" : "text-yellow-400"}>{fmt(togo)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(100, share)}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400">{share.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <MiniStackBar mix={c.mix} />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
