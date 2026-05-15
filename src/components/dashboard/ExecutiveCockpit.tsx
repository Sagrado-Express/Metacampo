"use client";

import React, { useState, useMemo } from "react";
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
  LucideAward,
  LucideChevronDown,
  LucideMapPin
} from "lucide-react";
import { MONTHLY_MASTER_BASE } from "@/data/monthly_master";
import { MOCK_TEST_DATA } from "@/data/mock_database";

type Role = "DIRETOR" | "GERENTE_G01";

const COLORS = {
  budget: "#5D4037", // Café Suave
  realized: "#2D5A27", // Verde Clorofila
  togo: "#D4AF37", // Amarelo Trigo
  pie: ["#2D5A27", "#3B7A33", "#4A9A40", "#59BA4D"]
};

export function ExecutiveCockpit() {
  const [role, setRole] = useState<Role>("DIRETOR");

  // --- DYNAMIC DATA PROCESSING ---
  const data = useMemo(() => {
    // Filter base data based on role
    const relevantData = role === "DIRETOR" 
      ? MONTHLY_MASTER_BASE 
      : MONTHLY_MASTER_BASE.filter(d => d.ctvId === "CTV01" || d.ctvId === "CTV02"); // G01 Gerente sees CTV01 and CTV02

    const totalMeta = relevantData.reduce((acc, curr) => acc + curr.meta, 0);
    const totalRealizado = relevantData.reduce((acc, curr) => acc + curr.realizado, 0);
    const totalToGo = Math.max(0, totalMeta - totalRealizado);
    const gapPercent = totalMeta > 0 ? Math.round((totalToGo / totalMeta) * 100) : 0;

    // Segment aggregation for Waterfall and Pie
    const segments = ["Sementes", "Fertilizantes", "Agroquímicos"];
    const segmentMetrics = segments.map(seg => {
      const segMeta = relevantData.filter(d => d.segmento === seg).reduce((acc, curr) => acc + curr.meta, 0);
      const segRealizado = relevantData.filter(d => d.segmento === seg).reduce((acc, curr) => acc + curr.realizado, 0);
      return { name: seg, meta: segMeta, realizado: segRealizado };
    });

    // Waterfall: Orçamento -> Segments -> TO-GO
    const waterfall = [
      { name: "Orçamento", value: totalMeta / 1000000, fill: COLORS.budget, isTotal: true }
    ];
    segmentMetrics.forEach(seg => {
      waterfall.push({ name: seg, value: -(seg.realizado / 1000000), fill: COLORS.realized, isTotal: false });
    });
    waterfall.push({ name: "Saldo TO-GO", value: totalToGo / 1000000, fill: COLORS.togo, isTotal: true });

    // Mix (Pie)
    const mix = segmentMetrics.map(seg => ({
      name: seg.name,
      value: totalRealizado > 0 ? Math.round((seg.realizado / totalRealizado) * 100) : 0
    }));

    // Rankings (Derived from MOCK_TEST_DATA)
    const filteredClients = role === "DIRETOR" 
      ? MOCK_TEST_DATA 
      : MOCK_TEST_DATA.filter(c => c.gerente === "Ricardo Oliveira"); // G01 Manager

    const vendedores = Array.from(new Set(filteredClients.map(c => c.ctv))).map((name, i) => {
      return { rank: i + 1, name, region: filteredClients.find(c => c.ctv === name)?.uf || "BR", achieved: 40 + Math.floor(Math.random() * 25) };
    }).sort((a, b) => b.achieved - a.achieved);

    const gerentes = role === "DIRETOR" ? [
      { rank: 1, name: "Ana Paula Costa", region: "G02", gap: 35 },
      { rank: 2, name: "Ricardo Oliveira", region: "G01", gap: 45 }
    ] : [];

    return {
      kpis: {
        budget: totalMeta,
        realized: totalRealizado,
        togo: totalToGo,
        gapPercent
      },
      waterfall,
      mix,
      gerentes,
      vendedores
    };
  }, [role]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // Waterfall preparation for stacked bar
  const waterfallData = data.waterfall.map((item, index, arr) => {
    if (index === 0 || item.isTotal) {
      return { name: item.name, Base: 0, Valor: Math.abs(item.value), fill: item.fill };
    }
    const prevRunningTotal = arr.slice(0, index).reduce((acc, curr) => curr.isTotal ? acc : acc + curr.value, 0);
    const currentBase = (arr[0].value) + prevRunningTotal + item.value;
    return {
      name: item.name,
      Base: currentBase,
      Valor: Math.abs(item.value),
      fill: item.fill
    };
  });

  return (
    <div className="w-full bg-background text-foreground rounded-[32px] p-6 lg:p-10 font-sans relative overflow-hidden border border-border/40 shadow-xl">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient">
            Executive Cockpit
          </h1>
          <p className="text-muted-foreground font-medium tracking-wide text-sm mt-1 uppercase">
            Plataforma Antigravity V4 • Safra 26/27
          </p>
        </div>

        {/* ROLE TOGGLE */}
        <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-border/20 backdrop-blur-md shadow-inner">
          <button
            onClick={() => setRole("DIRETOR")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              role === "DIRETOR" 
                ? "bg-primary text-white shadow-lg glow-primary" 
                : "text-muted-foreground hover:bg-white/50"
            }`}
          >
            Diretor
          </button>
          <button
            onClick={() => setRole("GERENTE_G01")}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              role === "GERENTE_G01" 
                ? "bg-primary text-white shadow-lg glow-primary" 
                : "text-muted-foreground hover:bg-white/50"
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
          transition={{ duration: 0.4 }}
          className="space-y-10 relative z-10"
        >
          {/* ROW 1: KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <KpiCard 
              title="Orçamento Total" 
              value={formatCurrency(data.kpis.budget)} 
              icon={<LucideTarget className="text-muted-foreground/60" />} 
            />
            <KpiCard 
              title="Faturado YTD" 
              value={formatCurrency(data.kpis.realized)} 
              icon={<LucideTrendingUp className="text-primary" />} 
            />
            <div className="glass-card-premium p-8 flex flex-col justify-between border-accent/20 group hover:border-accent transition-all relative overflow-hidden">
              <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-125 transition-transform">
                <LucideAlertCircle size={80} className="text-accent" />
              </div>
              <p className="text-accent text-[10px] font-black uppercase tracking-widest mb-2">Saldo TO-GO</p>
              <h3 className="text-4xl font-black text-accent tracking-tight">
                {formatCurrency(data.kpis.togo)}
              </h3>
              <div className="mt-4 flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black tracking-widest">
                  {data.kpis.gapPercent}% GAP
                </span>
                <span className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-tight">para o objetivo</span>
              </div>
            </div>
          </div>

          {/* ROW 2: CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Waterfall Chart */}
            <div className="lg:col-span-2 glass-card-premium p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Ponte de Orçamento (Waterfall) • R$ Milhões
                </h3>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string) => name === 'Base' ? [] : [`R$ ${value.toFixed(1)}M`, 'Valor']}
                    />
                    <Bar dataKey="Base" stackId="a" fill="transparent" />
                    <Bar dataKey="Valor" stackId="a" radius={[6, 6, 6, 6]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="glass-card-premium p-8 flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Mix de Realizado
              </h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.mix}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={105}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.mix.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {data.mix.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS.pie[i % COLORS.pie.length] }} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-primary">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: RANKINGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Ranking Gerentes */}
            {role === "DIRETOR" && (
              <div className="glass-card-premium p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-3">
                  <LucideShieldCheck size={18} className="text-primary" />
                  Ranking de Gestão (GAP %)
                </h3>
                <div className="space-y-4">
                  {data.gerentes.map((g) => (
                    <div key={g.name} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/10 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-muted-foreground text-xs shadow-sm border border-border/10">
                          #{g.rank}
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground">{g.name}</p>
                          <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">{g.region}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-accent font-black text-sm">{g.gap}%</p>
                        <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Budget Gap</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Vendedores */}
            <div className={`glass-card-premium p-8 ${role === "GERENTE_G01" ? "md:col-span-2" : ""}`}>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-3">
                <LucideAward size={18} className="text-primary" />
                Performance da Força de Vendas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.vendedores.slice(0, 4).map((v) => (
                  <div key={v.name} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/10">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${v.rank === 1 ? 'bg-primary text-white' : 'bg-white text-muted-foreground border border-border/10'}`}>
                        #{v.rank}
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{v.name}</p>
                        <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          <LucideMapPin size={8} /> {v.region}
                        </div>
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <div className="text-[10px] font-black text-primary mb-1">{v.achieved}%</div>
                      <div className="w-full bg-white h-1.5 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${v.achieved}%` }} />
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
    <div className="glass-card-premium p-8 flex flex-col justify-between hover-lift">
      <div className="flex justify-between items-start mb-6">
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{title}</p>
        <div className="p-3 bg-muted/50 rounded-xl shadow-inner">
          {icon}
        </div>
      </div>
      <h3 className="text-4xl font-black text-foreground tracking-tight">{value}</h3>
    </div>
  );
}
