"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Shield, TrendingUp, MapPin, Award } from "lucide-react";

interface CityMetric {
  city: string;
  uf: string;
  haTotal: number;
  vpmTotal: number;
  realized: number;
  pedidos: number;
  share: number;
}

interface MarketShareDashboardProps {
  cityMetrics: CityMetric[];
}

export function MarketShareDashboard({ cityMetrics }: MarketShareDashboardProps) {
  const sortedMetrics = useMemo(() => {
    return [...cityMetrics].sort((a, b) => b.share - a.share);
  }, [cityMetrics]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  const getDominanceBadge = (share: number) => {
    if (share >= 50) {
      return (
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase rounded-full glow-primary">
          🏆 Dona da Rua (Líder)
        </span>
      );
    } else if (share >= 20) {
      return (
        <span className="px-3 py-1 bg-sky-500/10 text-sky-600 border border-sky-500/20 text-[10px] font-black uppercase rounded-full">
          ⚡ Concentração Forte
        </span>
      );
    } else if (share >= 5) {
      return (
        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase rounded-full">
          🟡 Presença Moderada
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-black uppercase rounded-full">
          ⚠️ Incipiente
        </span>
      );
    }
  };

  const chartData = useMemo(() => {
    return sortedMetrics.map(m => ({
      name: m.city,
      "VPM Total": m.vpmTotal,
      "Faturamento + Pedidos": m.realized + m.pedidos,
    }));
  }, [sortedMetrics]);

  return (
    <div className="space-y-8">
      {/* Top Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-[#3E2723] flex items-center gap-2">
            <Shield className="text-primary" />
            Dashboard de Dominância ("Dona da Rua")
          </h3>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">
            Análise de penetração e share de mercado municipal em relação ao potencial técnico total (VPM)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table representation */}
        <div className="lg:col-span-2 glass-card-premium p-7 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6 block">
            Share de Mercado por Município
          </span>
          <div className="overflow-auto max-h-[350px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="pb-3 pr-4">Município</th>
                  <th className="pb-3 pr-4">Hectares</th>
                  <th className="pb-3 pr-4">VPM Potencial</th>
                  <th className="pb-3 pr-4">Vendas Realizadas</th>
                  <th className="pb-3 pr-4">Market Share</th>
                  <th className="pb-3">Dominância</th>
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((city) => (
                  <tr key={city.city} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="py-3 pr-4 font-black text-[#3E2723]">
                      {city.city} - {city.uf}
                    </td>
                    <td className="py-3 pr-4 font-black font-mono text-muted-foreground">
                      {city.haTotal.toLocaleString("pt-BR")} ha
                    </td>
                    <td className="py-3 pr-4 font-black text-muted-foreground font-tabular">
                      {fmt(city.vpmTotal)}
                    </td>
                    <td className="py-3 pr-4 font-black text-primary font-tabular">
                      {fmt(city.realized + city.pedidos)}
                    </td>
                    <td className="py-3 pr-4 font-black text-primary font-tabular">
                      {city.share.toFixed(1)}%
                    </td>
                    <td className="py-3">
                      {getDominanceBadge(city.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart representation */}
        <div className="glass-card-premium p-7 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6 block">
            Potencial de Mercado vs Captura
          </span>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#3E2723", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fill: "#3E2723", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,.1)" }} />
                <Legend tick={{ fill: "#3E2723", fontSize: 9, fontWeight: 700 }} />
                <Bar dataKey="VPM Total" fill="#E2DDD5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Faturamento + Pedidos" fill="#2D5A27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
