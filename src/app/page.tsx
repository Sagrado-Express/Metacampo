'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { MapPin, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react'

// Dummy Data for the UI
const cockpitData = {
  gestor: "Daniel",
  pendentes: "12.4",
  metaGlobal: "50.0",
  realizadoYtd: "37.6",
  percentualRealizado: 75.2,
  topClientes: [
    { nome: "Fazenda São Jorge", valor: "R$ 4.2M", cor: "bg-[#1D4ED8] text-white" }, // Azul
    { nome: "Grupo Bom Futuro", valor: "R$ 3.8M", cor: "bg-[#1D4ED8] text-white" }, // Azul
    { nome: "Agropecuária Maggi", valor: "R$ 2.1M", cor: "bg-[#15803D] text-white" }, // Verde
    { nome: "Sementes Jotabasso", valor: "R$ 1.5M", cor: "bg-[#15803D] text-white" }, // Verde
    { nome: "Fazenda Progresso", valor: "R$ 950K", cor: "bg-[#CA8A04] text-white" }, // Amarelo
    { nome: "Irmãos Scheffer", valor: "R$ 800K", cor: "bg-[#CA8A04] text-white" }, // Amarelo
  ],
  vendedoresRanking: [
    { nome: "Mariana Fontes", gap: "R$ 1.2M", gapPercent: 8, status: "bg-[#15803D]" },
    { nome: "João Dias", gap: "R$ 2.5M", gapPercent: 15, status: "bg-[#15803D]" },
    { nome: "Carlos Mendes", gap: "R$ 4.1M", gapPercent: 25, status: "bg-[#CA8A04]" },
    { nome: "Ana Costa", gap: "R$ 4.6M", gapPercent: 30, status: "bg-[#EF4444]" },
  ],
  mapAvatars: [
    { initials: "MF", top: "20%", left: "30%", color: "bg-[#1D4ED8]" },
    { initials: "JD", top: "50%", left: "60%", color: "bg-[#15803D]" },
    { initials: "CM", top: "70%", left: "40%", color: "bg-[#CA8A04]" },
    { initials: "AC", top: "30%", left: "75%", color: "bg-[#EF4444]" },
  ]
}

export default function CockpitGestor() {
  const isHighGap = (parseFloat(cockpitData.metaGlobal) - parseFloat(cockpitData.realizadoYtd)) > 10;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Logo size="lg" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-right"
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">
              Cockpit do Gestor
            </p>
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Olá, {cockpitData.gestor}. Seu território tem <span className="text-[#CA8A04]">R$ {cockpitData.pendentes}M</span> pendentes.
            </h1>
          </motion.div>
        </header>

        {/* TOP ROW: KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard 
            label="Meta Global (Budget)" 
            value={`R$ ${cockpitData.metaGlobal}M`} 
            delay={0.1}
          />
          <div className="glass-card p-6 flex flex-col justify-between">
            <p className="label-finance">Realizado YTD</p>
            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-end">
                <h3 className="text-4xl font-black font-tabular tracking-tighter text-primary">
                  R$ {cockpitData.realizadoYtd}M
                </h3>
                <span className="text-sm font-bold text-[#15803D]">{cockpitData.percentualRealizado}%</span>
              </div>
              <div className="w-full bg-[#F5F5F4] rounded-full h-2.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${cockpitData.percentualRealizado}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-[#15803D] h-2.5 rounded-full"
                ></motion.div>
              </div>
            </div>
          </div>
          <KpiCard 
            label="Saldo TO-GO" 
            value={`R$ ${cockpitData.pendentes}M`} 
            highlight={isHighGap}
            delay={0.3}
          />
        </div>

        {/* MIDDLE SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
          
          {/* Esquerda: Mix de Produtos */}
          <div className="glass-card p-6 lg:col-span-3 flex flex-col">
            <h3 className="label-finance mb-6 flex items-center gap-2"><TrendingUp size={14}/> Mix de Produtos</h3>
            <div className="flex-1 flex flex-col justify-center gap-6">
              <MixBar label="Sementes" percent={45} color="bg-[#1D4ED8]" />
              <MixBar label="Fertilizantes" percent={35} color="bg-[#15803D]" />
              <MixBar label="Químicos" percent={20} color="bg-[#CA8A04]" />
            </div>
          </div>

          {/* Centro: Mapa Topográfico/Abstrato */}
          <div className="glass-card p-6 lg:col-span-6 relative flex flex-col overflow-hidden items-center justify-center border-none bg-gradient-to-br from-[#F9F8F6] to-[#F5F5F4]">
            {/* Topographic Lines background simulation */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03] text-primary" xmlns="http://www.w3.org/2000/svg">
              <pattern id="topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0,80 Q25,55 50,80 T100,80" fill="none" stroke="currentColor" strokeWidth="1"/>
                <path d="M0,20 Q25,-5 50,20 T100,20" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#topo)" />
            </svg>
            
            <h3 className="label-finance absolute top-6 left-6 flex items-center gap-2"><MapPin size={14}/> Mapa de Território</h3>
            
            {/* Avatares */}
            {cockpitData.mapAvatars.map((av, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ring-4 ring-white ${av.color}`}
                style={{ top: av.top, left: av.left }}
              >
                {av.initials}
              </motion.div>
            ))}
          </div>

          {/* Direita: Top 10 Clientes */}
          <div className="glass-card p-6 lg:col-span-3 flex flex-col">
            <h3 className="label-finance mb-4">Top Clientes Estratégicos</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {cockpitData.topClientes.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-bold text-primary truncate max-w-[120px]" title={c.nome}>{c.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-tabular">{c.valor}</span>
                    <span className={`w-2 h-2 rounded-full ${c.cor.split(' ')[0]}`}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Ranking de Vendedores */}
        <div className="glass-card p-6">
          <h3 className="label-finance mb-6">Ranking Comercial (Menor Gap TO-GO)</h3>
          <div className="w-full">
            <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              <div className="col-span-1">Pos</div>
              <div className="col-span-4">Consultor Técnico (CTV)</div>
              <div className="col-span-3 text-right">Gap (R$)</div>
              <div className="col-span-4">Percentual TO-GO</div>
            </div>
            {cockpitData.vendedoresRanking.map((v, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                key={i} 
                className="grid grid-cols-12 gap-4 py-4 border-b border-border/50 items-center hover:bg-black/[0.02] transition-colors -mx-6 px-6 cursor-default"
              >
                <div className="col-span-1 font-black text-muted-foreground">{i + 1}º</div>
                <div className="col-span-4 font-bold text-primary">{v.nome}</div>
                <div className="col-span-3 text-right font-black font-tabular">{v.gap}</div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-full bg-[#F5F5F4] rounded-full h-1.5 overflow-hidden">
                    <div className={`${v.status} h-1.5 rounded-full`} style={{ width: `${100 - v.gapPercent}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground w-8 text-right">{v.gapPercent}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function KpiCard({ label, value, highlight = false, delay = 0 }: { label: string, value: string, highlight?: boolean, delay?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-6 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <p className="label-finance">{label}</p>
        {highlight && <AlertCircle size={16} className="text-[#CA8A04]" />}
      </div>
      <h3 className={`text-4xl font-black font-tabular tracking-tighter mt-4 ${highlight ? 'text-[#CA8A04]' : 'text-primary'}`}>
        {value}
      </h3>
    </motion.div>
  )
}

function MixBar({ label, percent, color }: { label: string, percent: number, color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-muted-foreground uppercase">{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-[#F5F5F4] rounded-full h-1.5 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className={`${color} h-1.5 rounded-full`}
        ></motion.div>
      </div>
    </div>
  )
}
