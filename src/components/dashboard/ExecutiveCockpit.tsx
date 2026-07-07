"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from "recharts";
import { TrendingUp, AlertTriangle, Users, MapPin, Award } from "lucide-react";
import { MONTHLY_MASTER_BASE, MONTH_LABELS, TERRITORY_COORDINATES } from "@/data/monthly_master";
import { MOCK_TEST_DATA } from "@/data/mock_database";
import { MarketShareDashboard } from "./MarketShareDashboard";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";
import { useSession } from "@/hooks/useSession";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  green:  "#2D5A27",
  amber:  "#D97706",
  brown:  "#3E2723",
  pie:    ["#2D5A27","#3B7A33","#4A9A40","#78B87A","#A8D5AB"],
  bar:    "#2D5A27",
  togo:   "#D97706",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

// ─── Segmented Control ───────────────────────────────────────────────────────
function SegCtrl({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 bg-white/60 border border-white/40 rounded-xl p-1 backdrop-blur-sm">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
            value === o.value ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white/60"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, amber }: { label: string; value: string; sub?: string; amber?: boolean }) {
  return (
    <div className="glass-card-premium p-7 flex flex-col justify-between hover-lift">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-4">
        <span className={`text-3xl font-black tracking-tight ${amber ? "text-amber-600" : "text-[#3E2723]"}`}>{value}</span>
        {sub && <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function ExecutiveCockpit() {
  const months = Object.keys(MONTH_LABELS);
  const [selectedMonth, setSelectedMonth] = useState("05");
  const [selectedGerenteId, setSelectedGerenteId] = useState<string>("");
  const [selectedCtvId, setSelectedCtvId] = useState<string>("");

  // Tenant context dictionary
  const { data: sessionData } = useSession();
  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";
  const { translateKey, getColor } = useSegmentDictionary(tenantId);
  const [gerenteMetric, setGerenteMetric] = useState<"realizado"|"togo">("realizado");
  const [ctvMetric, setCtvMetric] = useState<"realizado"|"togo">("realizado");
  const [activeTab, setActiveTab] = useState<"macro" | "dominance">("macro");

  const [dbClients, setDbClients] = useState<any[]>([]);
  const [faturamentoList, setFaturamentoList] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, fRes] = await Promise.all([
          fetch("/api/clientes"),
          fetch("/api/faturamento")
        ]);
        if (cRes.ok) setDbClients(await cRes.json());
        if (fRes.ok) setFaturamentoList(await fRes.json());
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    }
    loadData();
  }, []);

  // Combine faturamentoList and static base
  const activeMasterData = useMemo(() => {
    if (faturamentoList.length === 0) return MONTHLY_MASTER_BASE;
    return faturamentoList.map(item => {
      const client = dbClients.find(c => c.ctvId === item.id_ctv) || { name: "Cliente Geral", document: "000000000" };
      return {
        tenantId: item.tenant_id,
        mes: item.mes,
        ctvId: item.id_ctv,
        ctvName: item.id_ctv === "CTV01" ? "Joao Silva" : item.id_ctv === "CTV02" ? "Beatriz Santos" : item.id_ctv === "CTV03" ? "Carlos Gomes" : item.id_ctv === "CTV04" ? "Fernanda Melo" : item.id_ctv === "CTV05" ? "Gabriel Neves" : "Daniela Lima",
        gerenteId: item.id_ctv === "CTV04" || item.id_ctv === "CTV05" ? "G02" : "G01",
        gerenteName: item.id_ctv === "CTV04" || item.id_ctv === "CTV05" ? "Ana Paula Costa" : "Ricardo Oliveira",
        documento: client.document || "000000000",
        clientName: client.name || "Cliente Geral",
        segmento: item.segmento,
        meta: (item.valor_meta_centavos || 0) / 100,
        realizado: (item.valor_realizado_centavos || 0) / 100,
        pedidos: 0
      };
    });
  }, [faturamentoList, dbClients]);

  // Slice of data for selected month
  const monthData = useMemo(() =>
    activeMasterData.filter(r => r.mes === selectedMonth), [selectedMonth, activeMasterData]);

  // Gerentes available this month
  const gerentesAvail = useMemo(() => {
    const map = new Map<string, string>();
    monthData.forEach(r => map.set(r.gerenteId, r.gerenteName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [monthData]);

  // CTVs cascaded by selected gerente
  const ctvsAvail = useMemo(() => {
    if (!selectedGerenteId) return [];
    const map = new Map<string, string>();
    monthData.filter(r => r.gerenteId === selectedGerenteId)
      .forEach(r => map.set(r.ctvId, r.ctvName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [monthData, selectedGerenteId]);

  // Filtered rows per selections
  const filtered = useMemo(() => {
    let rows = monthData;
    if (selectedGerenteId) rows = rows.filter(r => r.gerenteId === selectedGerenteId);
    if (selectedCtvId)    rows = rows.filter(r => r.ctvId === selectedCtvId);
    return rows;
  }, [monthData, selectedGerenteId, selectedCtvId]);

  const dominanceMetrics = useMemo(() => {
    const result = new Map<string, { city: string; uf: string; haTotal: number; vpmTotal: number; realized: number; pedidos: number }>();
    
    const activeClients = dbClients.length > 0 ? dbClients : MOCK_TEST_DATA.map(d => ({
      ...d,
      areas: [
        { cropName: "Soja", areaHa: d.areas.soja },
        { cropName: "Milho", areaHa: d.areas.milho },
        { cropName: "Algodão", areaHa: d.areas.algodao },
        { cropName: "Cana", areaHa: d.areas.cana },
        { cropName: "Café", areaHa: d.areas.cafe }
      ],
      performanceBand: d.rating === 'A' ? "AZUL" : "VERDE",
      city: d.city,
      uf: d.uf
    }));

    activeClients.forEach(client => {
      const clientHa = client.areas ? client.areas.reduce((acc: number, curr: any) => acc + (curr.areaHa || curr.area_ha || 0), 0) : 0;
      const clientVpm = (client.vpmTotalCentavos || (clientHa * 3500 * 100)) / 100;
      
      const clientRealized = filtered
        .filter(r => r.documento === client.documento || r.documento === client.document)
        .reduce((acc, curr) => acc + curr.realizado, 0);
        
      const clientPedidos = filtered
        .filter(r => r.documento === client.documento || r.documento === client.document)
        .reduce((acc, curr) => acc + ((curr as any).pedidos ?? 0), 0);

      const cur = result.get(client.city) ?? { city: client.city, uf: client.uf || client.state || '', haTotal: 0, vpmTotal: 0, realized: 0, pedidos: 0 };
      cur.haTotal += clientHa;
      cur.vpmTotal += clientVpm;
      cur.realized += clientRealized;
      cur.pedidos += clientPedidos;
      result.set(client.city, cur);
    });

    return Array.from(result.values()).map(c => ({
      ...c,
      share: c.vpmTotal > 0 ? ((c.realized + c.pedidos) / c.vpmTotal) * 100 : 0
    }));
  }, [filtered, dbClients]);

  // ── KPIs ──────────────────────────────────────────────
  const totalMeta     = useMemo(() => filtered.reduce((s, r) => s + r.meta, 0), [filtered]);
  const totalReal     = useMemo(() => filtered.reduce((s, r) => s + r.realizado, 0), [filtered]);
  const totalPedidos  = useMemo(() => filtered.reduce((s, r) => s + ((r as any).pedidos ?? 0), 0), [filtered]);
  const totalToGo     = Math.max(0, totalMeta - (totalReal + totalPedidos));
  const pctToGo       = totalMeta > 0 ? Math.round((totalToGo / totalMeta) * 100) : 0;

  // ── Gerente Ranking ───────────────────────────────────
  const gerenteRanking = useMemo(() => {
    const map = new Map<string, { name: string; realizado: number; togo: number }>();
    monthData.forEach(r => {
      const cur = map.get(r.gerenteId) ?? { name: r.gerenteName, realizado: 0, togo: 0 };
      cur.realizado += r.realizado;
      cur.togo      += Math.max(0, r.meta - (r.realizado + ((r as any).pedidos ?? 0)));
      map.set(r.gerenteId, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b[gerenteMetric] - a[gerenteMetric])
      .map(g => ({ name: g.name.split(" ")[0], value: g[gerenteMetric] }));
  }, [monthData, gerenteMetric]);

  // ── CTV Ranking ───────────────────────────────────────
  const ctvRanking = useMemo(() => {
    const base = selectedGerenteId
      ? monthData.filter(r => r.gerenteId === selectedGerenteId)
      : monthData;
    const map = new Map<string, { name: string; realizado: number; togo: number }>();
    base.forEach(r => {
      const cur = map.get(r.ctvId) ?? { name: r.ctvName, realizado: 0, togo: 0 };
      cur.realizado += r.realizado;
      cur.togo      += Math.max(0, r.meta - (r.realizado + ((r as any).pedidos ?? 0)));
      map.set(r.ctvId, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b[ctvMetric] - a[ctvMetric])
      .map(c => ({ name: c.name.split(" ")[0], value: c[ctvMetric] }));
  }, [monthData, selectedGerenteId, ctvMetric]);

  // ── Segment MIX ───────────────────────────────────────
  const mixData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => map.set(r.segmento, (map.get(r.segmento) ?? 0) + r.realizado));
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      name: translateKey(key),
      value,
      color: getColor(key),
    }));
  }, [filtered, translateKey, getColor]);

  // ── Top Clients ───────────────────────────────────────
  const topClients = useMemo(() => {
    const map = new Map<string, { doc: string; name: string; realizado: number; meta: number }>();
    filtered.forEach(r => {
      const cur = map.get(r.documento) ?? { doc: r.documento, name: r.clientName, realizado: 0, meta: 0 };
      cur.realizado += r.realizado;
      cur.meta      += r.meta;
      map.set(r.documento, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.realizado - a.realizado)
      .slice(0, 20)
      .map(c => ({ ...c, togo: Math.max(0, c.meta - c.realizado) }));
  }, [filtered]);

  // ── Heatmap — city VPM & TO-GO health ────────────────
  const cityMetrics = useMemo(() => {
    const result = new Map<string, { vpm: number; realizado: number; meta: number; city: string; uf: string }>();
    const activeClients = dbClients.length > 0 ? dbClients : MOCK_TEST_DATA.map(d => ({
      ...d,
      areas: [
        { cropName: "Soja", areaHa: d.areas.soja },
        { cropName: "Milho", areaHa: d.areas.milho },
        { cropName: "Algodão", areaHa: d.areas.algodao },
        { cropName: "Cana", areaHa: d.areas.cana },
        { cropName: "Café", areaHa: d.areas.cafe }
      ],
      performanceBand: d.rating === 'A' ? "AZUL" : "VERDE",
      city: d.city,
      uf: d.uf
    }));

    activeClients.forEach(client => {
      const coords = TERRITORY_COORDINATES[client.city];
      if (!coords) return;
      
      const clientHa = client.areas ? client.areas.reduce((acc: number, curr: any) => acc + (curr.areaHa || curr.area_ha || 0), 0) : 0;
      const vpm = (client.vpmTotalCentavos || (clientHa * 3500 * 100)) / 100;

      const realizedForClient = filtered
        .filter(r => r.documento === client.documento || r.documento === client.document)
        .reduce((s, r) => s + r.realizado, 0);
      const metaForClient = filtered
        .filter(r => r.documento === client.documento || r.documento === client.document)
        .reduce((s, r) => s + r.meta, 0);
      
      const cur = result.get(client.city) ?? { vpm: 0, realizado: 0, meta: 0, city: client.city, uf: client.uf || client.state || '' };
      cur.vpm       += vpm;
      cur.realizado += realizedForClient;
      cur.meta      += metaForClient;
      result.set(client.city, cur);
    });
    return Array.from(result.values());
  }, [filtered, dbClients]);

  const maxVpm = Math.max(...cityMetrics.map(c => c.vpm), 1);

  const handleGerenteChange = (id: string) => {
    setSelectedGerenteId(id);
    setSelectedCtvId(""); // reset cascade
  };

  return (
    <div className="w-full space-y-8 text-[#3E2723]">

      {/* ── FILTROS (Top Nav) ── */}
      <div className="glass-card-premium px-8 py-5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Período</span>
          <select
            value={selectedMonth}
            onChange={e => { setSelectedMonth(e.target.value); setSelectedGerenteId(""); setSelectedCtvId(""); }}
            className="text-xs font-black border border-border/40 rounded-xl px-3 py-2 bg-white/80 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {months.map(m => (
              <option key={m} value={m}>{MONTH_LABELS[m]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Users size={14} className="text-primary" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gerente</span>
          <select
            value={selectedGerenteId}
            onChange={e => handleGerenteChange(e.target.value)}
            className="text-xs font-black border border-border/40 rounded-xl px-3 py-2 bg-white/80 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            {gerentesAvail.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Award size={14} className="text-primary" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">CTV</span>
          <select
            value={selectedCtvId}
            onChange={e => setSelectedCtvId(e.target.value)}
            disabled={!selectedGerenteId}
            className="text-xs font-black border border-border/40 rounded-xl px-3 py-2 bg-white/80 text-[#3E2723] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            {ctvsAvail.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {(selectedGerenteId || selectedCtvId) && (
          <button onClick={() => { setSelectedGerenteId(""); setSelectedCtvId(""); }}
            className="text-[9px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors">
            ✕ Limpar filtros
          </button>
        )}

        <div className="flex items-center gap-1 bg-white/60 border border-white/40 rounded-xl p-1 backdrop-blur-sm ml-auto">
          <button onClick={() => setActiveTab("macro")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === "macro" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white/60"
            }`}>
            Cockpit Executivo
          </button>
          <button onClick={() => setActiveTab("dominance")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === "dominance" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-white/60"
            }`}>
            Dominância (Dona da Rua)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${selectedMonth}-${selectedGerenteId}-${selectedCtvId}-${activeTab}`}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }} className="space-y-8">

          {activeTab === "dominance" ? (
            <MarketShareDashboard cityMetrics={dominanceMetrics} />
          ) : (
            <>

           {/* ── LINHA 1: KPIs ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KpiCard label="Orçamento Total" value={fmt(totalMeta)} sub={`Mês: ${MONTH_LABELS[selectedMonth]}`} />
            <KpiCard label="Faturado YTD" value={fmt(totalReal)}
              sub={`${totalMeta > 0 ? Math.round((totalReal / totalMeta) * 100) : 0}% da meta`} />
            <KpiCard label="Pedidos Pendentes" value={fmt(totalPedidos)}
              sub={`${totalMeta > 0 ? Math.round((totalPedidos / totalMeta) * 100) : 0}% coberto`} />
            <KpiCard label="Saldo TO-GO" value={fmt(totalToGo)} sub={`${pctToGo}% gap restante`} amber />
          </div>

          {/* ── Pacing Progress Bar ── */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
              <span>Progresso do Orçamento (Realizado + Pedidos Pendentes)</span>
              <span className="text-primary">{totalMeta > 0 ? Math.round(((totalReal + totalPedidos) / totalMeta) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-white/40 border border-white/50 h-4 rounded-full overflow-hidden flex backdrop-blur-sm shadow-inner">
              <div className="h-full bg-primary relative group cursor-pointer transition-all duration-500" 
                   style={{ width: `${totalMeta > 0 ? Math.min(100, (totalReal / totalMeta) * 100) : 0}%` }}
                   title={`Faturado: ${fmt(totalReal)}`} />
              <div className="h-full bg-amber-500 relative group cursor-pointer transition-all duration-500" 
                   style={{ width: `${totalMeta > 0 ? Math.min(100 - (totalReal / totalMeta) * 100, (totalPedidos / totalMeta) * 100) : 0}%` }}
                   title={`Pedidos: ${fmt(totalPedidos)}`} />
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block bg-primary" /> Faturado YTD: {fmt(totalReal)} ({totalMeta > 0 ? Math.round((totalReal / totalMeta) * 100) : 0}%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block bg-amber-500" /> Pedidos Pendentes: {fmt(totalPedidos)} ({totalMeta > 0 ? Math.round((totalPedidos / totalMeta) * 100) : 0}%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block bg-white border border-border" /> Saldo TO-GO: {fmt(totalToGo)} ({pctToGo}%)</span>
            </div>
          </div>

          {/* ── LINHA 2: Rankings Paralelos ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Painel 2A: Gerentes */}
            <div className="glass-card-premium p-7">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Ranking de Gerentes
                </span>
                <SegCtrl
                  value={gerenteMetric}
                  onChange={v => setGerenteMetric(v as "realizado"|"togo")}
                  options={[{ label: "Faturamento", value: "realizado" }, { label: "Gap", value: "togo" }]}
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={gerenteMetric} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={gerenteRanking} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80}
                        tick={{ fill: "#3E2723", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => fmt(v)}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {gerenteRanking.map((_, i) => (
                          <Cell key={i} fill={gerenteMetric === "togo" ? C.togo : C.green} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Painel 2B: CTVs */}
            <div className="glass-card-premium p-7">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Ranking de Vendedores {selectedGerenteId && <span className="text-primary">(filtrado)</span>}
                </span>
                <SegCtrl
                  value={ctvMetric}
                  onChange={v => setCtvMetric(v as "realizado"|"togo")}
                  options={[{ label: "Faturamento", value: "realizado" }, { label: "Gap", value: "togo" }]}
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={ctvMetric} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ctvRanking} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80}
                        tick={{ fill: "#3E2723", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => fmt(v)}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {ctvRanking.map((_, i) => (
                          <Cell key={i} fill={ctvMetric === "togo" ? C.togo : C.green} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── LINHA 3: MIX + Top Clientes ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3A: Donut MIX */}
            <div className="glass-card-premium p-7 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">
                Vendas por Segmento
              </span>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mixData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                      paddingAngle={6} dataKey="value" stroke="none">
                      {mixData.map((item, i) => <Cell key={i} fill={item.color || C.pie[i % C.pie.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {mixData.map((item, i) => (
                  <div key={item.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || C.pie[i % C.pie.length] }} />
                      <span className="font-black text-[10px] uppercase tracking-wider text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-black text-[#3E2723]">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3B: Top 20 Clients table */}
            <div className="lg:col-span-2 glass-card-premium p-7 flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">
                Top Clientes — Faturamento Mês
              </span>
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      {["CNPJ/CPF","Cliente","Faturado","TO-GO"].map(h => (
                        <th key={h} className="text-[8px] font-black uppercase tracking-widest text-muted-foreground pb-3 text-left pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((c, i) => (
                      <tr key={c.doc} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4 font-mono text-[9px] text-muted-foreground">{c.doc}</td>
                        <td className="py-2.5 pr-4 font-black text-[#3E2723] max-w-[140px] truncate">{c.name}</td>
                        <td className="py-2.5 pr-4 font-black text-primary font-tabular">{fmt(c.realizado)}</td>
                        <td className={`py-2.5 font-black font-tabular ${c.togo > 0 ? "text-amber-600" : "text-primary"}`}>
                          {fmt(c.togo)}
                        </td>
                      </tr>
                    ))}
                    {topClients.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">Sem dados para o filtro selecionado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── LINHA 4: Heatmap de Cobertura ── */}
          <div className="glass-card-premium p-8 relative overflow-hidden bg-gradient-to-br from-[#FDFDFD] to-[#F5F4F0] min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                Heatmap de Cobertura — VPM &amp; Saúde TO-GO por Município
              </span>
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-[#2D5A27]" /> Em ritmo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-amber-500" /> Em risco</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-red-500" /> Crítico</span>
              </div>
            </div>

            {/* SVG topo lines */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none text-primary">
              <pattern id="ec-topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0,80 Q25,55 50,80 T100,80" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#ec-topo)" />
            </svg>

            <div className="relative flex-1 border border-border/30 rounded-3xl bg-white/30 shadow-inner" style={{ minHeight: 320 }}>
              {cityMetrics.map(city => {
                const coords = TERRITORY_COORDINATES[city.city];
                if (!coords) return null;

                const bubbleSize = Math.max(16, Math.min(52, (city.vpm / maxVpm) * 52));
                const pct = city.meta > 0 ? city.realizado / city.meta : 0;
                const color = pct >= 0.8 ? C.green : pct >= 0.5 ? "#D97706" : "#EF4444";

                return (
                  <div key={city.city} className="absolute" style={{ top: `${coords.y}%`, left: `${coords.x}%` }}>
                    {/* Pulse */}
                    <span className="absolute inline-flex rounded-full opacity-40 animate-ping"
                      style={{ width: bubbleSize, height: bubbleSize, backgroundColor: color, top: -(bubbleSize/2), left: -(bubbleSize/2) }} />
                    {/* Bubble */}
                    <motion.div whileHover={{ scale: 1.25 }} title={`${city.city} — VPM: ${fmt(city.vpm)}`}
                      className="relative rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer font-black text-white"
                      style={{ width: bubbleSize, height: bubbleSize, backgroundColor: color, fontSize: Math.max(7, bubbleSize * 0.22), marginTop: -(bubbleSize/2), marginLeft: -(bubbleSize/2) }}>
                      {city.uf}
                    </motion.div>
                    {/* Label */}
                    <span className="absolute whitespace-nowrap bg-white/90 border border-border/60 shadow rounded-lg px-1.5 py-0.5 text-[8px] font-black text-[#3E2723]"
                      style={{ top: bubbleSize/2 + 4, left: 0 }}>
                      {city.city}
                    </span>
                  </div>
                );
              })}

              {cityMetrics.length === 0 && (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-bold">
                  Sem dados georreferenciados para o filtro atual.
                </div>
              )}
            </div>
          </div>
            </>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
