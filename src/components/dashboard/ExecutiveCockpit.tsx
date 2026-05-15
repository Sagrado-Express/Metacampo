"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart, 
  Pie 
} from "recharts";
import { 
  LucideTrendingUp, 
  LucideTarget, 
  LucideAlertCircle, 
  LucideShieldCheck, 
  LucideUsers, 
  LucideAward,
  LucideChevronDown
} from "lucide-react";

type Role = "DIRETOR" | "GERENTE_G01";

const COLORS = {
  budget: "#64748b", // slate-500
  realized: "#22c55e", // green-500
  togo: "#eab308", // yellow-500
  pie: ["#16a34a", "#22c55e", "#4ade80", "#86efac"]
};

// --- MOCK DATA ---
const DATA = {
  DIRETOR: {
    kpis: {
      budget: 50000000,
      realized: 30000000,
      togo: 20000000,
      gapPercent: 40
    },
    waterfall: [
      { name: "Orçamento", value: 50, fill: COLORS.budget },
      { name: "Sementes", value: -10, fill: COLORS.realized },
      { name: "Fertilizantes", value: -12, fill: COLORS.realized },
      { name: "Químicos", value: -8, fill: COLORS.realized },
      { name: "TO-GO", value: 20, fill: COLORS.togo, isTotal: true }
    ],
    mix: [
      { name: "Sementes", value: 33 },
      { name: "Fertilizantes", value: 40 },
      { name: "Químicos", value: 27 }
    ],
    gerentes: [
      { rank: 1, name: "Ana Paula Costa", region: "G02", gap: 35 },
      { rank: 2, name: "Ricardo Oliveira", region: "G01", gap: 45 }
    ],
    vendedores: [
      { rank: 1, name: "Fernanda Melo", region: "MG", achieved: 65 },
      { rank: 2, name: "Joao Silva", region: "MT", achieved: 55 },
      { rank: 3, name: "Carlos Gomes", region: "BA", achieved: 50 },
      { rank: 4, name: "Daniela Lima", region: "PR", achieved: 48 },
      { rank: 5, name: "Beatriz Santos", region: "GO", achieved: 45 }
    ]
  },
  GERENTE_G01: {
    kpis: {
      budget: 20000000,
      realized: 11000000,
      togo: 9000000,
      gapPercent: 45
    },
    waterfall: [
      { name: "Orçamento", value: 20, fill: COLORS.budget },
      { name: "Sementes", value: -4, fill: COLORS.realized },
      { name: "Fertilizantes", value: -5, fill: COLORS.realized },
      { name: "Químicos", value: -2, fill: COLORS.realized },
      { name: "TO-GO", value: 9, fill: COLORS.togo, isTotal: true }
    ],
    mix: [
      { name: "Sementes", value: 36 },
      { name: "Fertilizantes", value: 46 },
      { name: "Químicos", value: 18 }
    ],
    gerentes: [], // Hidden
    vendedores: [
      { rank: 1, name: "Joao Silva", region: "MT", achieved: 55 },
      { rank: 2, name: "Beatriz Santos", region: "GO", achieved: 45 },
      { rank: 3, name: "Carlos Gomes", region: "BA", achieved: 50 },
      { rank: 4, name: "Daniela Lima", region: "PR", achieved: 48 },
      { rank: 5, name: "Eduardo Rocha", region: "MS", achieved: 40 }
    ].sort((a, b) => b.achieved - a.achieved)
  }
};

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export function ExecutiveCockpit() {
  const [role, setRole] = useState<Role>("DIRETOR");
  const data = DATA[role];

  // Waterfall Chart Preparation
  // Recharts BarChart can do waterfall if we use stacked bars.
  // A simple way is to use a custom shape or just two bars (transparent base, visible top).
  // For a pure visualization, let's format data for stacked bars.
  const waterfallData = data.waterfall.map((item, index, arr) => {
    if (index === 0 || item.isTotal) {
      return { name: item.name, Base: 0, Valor: item.value, fill: item.fill };
    }
    // Calculate running total for the base
    const prevRunningTotal = arr.slice(0, index).reduce((acc, curr) => curr.isTotal ? acc : acc + curr.value, 0);
    const currentBase = prevRunningTotal + item.value; // Since item.value is negative
    return {
      name: item.name,
      Base: currentBase,
      Valor: Math.abs(item.value),
      fill: item.fill
    };
  });

  return (
    <div className="w-full bg-slate-900 text-slate-50 min-h-screen p-8 rounded-3xl font-sans relative overflow-hidden shadow-2xl border border-white/5">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 relative z-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
            Cockpit Executivo
          </h1>
          <p className="text-slate-400 font-medium tracking-wide text-sm mt-1">
            MetaCampo Agro 4.0 Premium • Safra 26/27
          </p>
        </div>

        {/* ROLE TOGGLE */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setRole("DIRETOR")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              role === "DIRETOR" 
                ? "bg-green-500 text-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Diretor
          </button>
          <button
            onClick={() => setRole("GERENTE_G01")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              role === "GERENTE_G01" 
                ? "bg-green-500 text-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Gerente G01
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 space-y-8"
        >
          {/* ROW 1: KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard 
              title="Orçamento Total" 
              value={formatCurrency(data.kpis.budget)} 
              icon={<LucideTarget className="text-slate-400" />} 
            />
            <KpiCard 
              title="Faturado YTD" 
              value={formatCurrency(data.kpis.realized)} 
              icon={<LucideTrendingUp className="text-green-500" />} 
            />
            <div className="bg-slate-800/50 backdrop-blur-md border border-yellow-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                <LucideAlertCircle size={48} className="text-yellow-500" />
              </div>
              <p className="text-yellow-500/80 text-xs font-black uppercase tracking-widest mb-2 relative z-10">Saldo TO-GO</p>
              <h3 className="text-3xl font-black text-yellow-400 tracking-tight relative z-10">
                {formatCurrency(data.kpis.togo)}
              </h3>
              <div className="mt-4 flex items-center gap-2 relative z-10">
                <span className="px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                  {data.kpis.gapPercent}% Gap
                </span>
                <span className="text-slate-400 text-xs">para fechamento</span>
              </div>
            </div>
          </div>

          {/* ROW 2: CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Waterfall Chart */}
            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-lg">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Desconstrução do Orçamento (Milhões)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontWeight: 'bold', color: '#f8fafc' }}
                      formatter={(value: number, name: string) => name === 'Base' ? [] : [`R$ ${value}M`, 'Valor']}
                    />
                    <Bar dataKey="Base" stackId="a" fill="transparent" />
                    <Bar dataKey="Valor" stackId="a" radius={[4, 4, 4, 4]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-lg flex flex-col">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Mix de Faturamento
              </h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.mix}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.mix.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', fontWeight: 'bold' }}
                      formatter={(value: number) => [`${value}%`, 'Participação']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {data.mix.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-bold text-slate-300 bg-slate-900/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.pie[i % COLORS.pie.length] }} />
                      {item.name}
                    </div>
                    <span>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: RANKINGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Ranking Gerentes (ONLY FOR DIRETOR) */}
            {role === "DIRETOR" && (
              <div className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-lg">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                  <LucideShieldCheck size={18} className="text-green-500" />
                  Ranking de Gerentes (Gap %)
                </h3>
                <div className="space-y-3">
                  {data.gerentes.map((g) => (
                    <div key={g.name} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-slate-400 text-xs border border-white/5">
                          #{g.rank}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{g.name}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">{g.region}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-black text-sm">{g.gap}%</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Gap</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Vendedores */}
            <div className={`bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-lg ${role === "GERENTE_G01" ? "md:col-span-2 max-w-2xl" : ""}`}>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
                <LucideAward size={18} className="text-green-500" />
                Top Vendedores (Atingimento %)
              </h3>
              <div className="space-y-3">
                {data.vendedores.slice(0, role === "GERENTE_G01" ? 3 : 5).map((v) => (
                  <div key={v.name} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${v.rank === 1 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-400 border-white/5'}`}>
                        #{v.rank}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{v.name}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">{v.region}</p>
                      </div>
                    </div>
                    <div className="w-1/3">
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="text-slate-400">Atingido</span>
                        <span className="text-green-400">{v.achieved}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${v.achieved}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KpiCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{title}</p>
        <div className="p-2 bg-slate-900/50 rounded-lg border border-white/5">
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
    </div>
  );
}
