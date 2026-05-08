'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3, 
  ArrowUpRight,
  Info
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Cell,
  Legend
} from 'recharts'
import { VpmService } from '@/domain/services/vpm.service'
import { PerformanceBand } from '@/types/schema'

// Mock Data (In real world, this comes from the Tabela Mae state)
const MOCK_CLIENTS = [
  { id: '1', name: 'Fazenda Boa Esperança', vpmTotal: 3550000 },
  { id: '2', name: 'Agropecuária Schneider', vpmTotal: 8875000 },
  { id: '3', name: 'Sítio Novo Horizonte', vpmTotal: 1775000 },
  { id: '4', name: 'Grupo Agrícola Werner', vpmTotal: 14910000 },
  { id: '5', name: 'Fazenda Progresso', vpmTotal: 2500000 },
  { id: '6', name: 'Sementes Jotabasso', vpmTotal: 4200000 },
  { id: '7', name: 'Fazenda São Jorge', vpmTotal: 1200000 },
  { id: '8', name: 'Grupo Bom Futuro', vpmTotal: 9500000 },
  { id: '9', name: 'Fazenda Santa Maria', vpmTotal: 600000 },
  { id: '10', name: 'Sítio Recanto', vpmTotal: 300000 },
];

export default function ParetoPlanning() {
  const paretoData = useMemo(() => {
    return VpmService.calculatePareto(MOCK_CLIENTS);
  }, []);

  const stats = useMemo(() => {
    const totalVpm = MOCK_CLIENTS.reduce((acc, c) => acc + c.vpmTotal, 0);
    const topClients = paretoData.filter(c => c.performanceBand === 'AZUL' || c.performanceBand === 'VERDE');
    const concentration = (topClients.length / paretoData.length) * 100;
    const valueConcentration = (topClients.reduce((acc, c) => acc + (c as any).vpmTotal, 0) / totalVpm) * 100;

    return { totalVpm, concentration, valueConcentration, clientCount: paretoData.length };
  }, [paretoData]);

  // Chart Formatting
  const chartData = paretoData.map(c => ({
    name: c.name.split(' ')[1] || c.name, // Short name for Axis
    vpm: (c as any).vpmTotal,
    acumulado: c.cumulativePercentage,
    band: c.performanceBand
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-3">
            <Target size={32} />
            SEGMENTAÇÃO DE PARETO (80/20)
          </h2>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Passo 15: Fatiamento Estratégico da Carteira</p>
        </div>
        
        <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
          <p className="text-[10px] font-black uppercase text-primary/60 tracking-wider">Potencial Total</p>
          <p className="text-lg font-black text-primary">R$ {(stats.totalVpm / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiSummary 
          label="Concentração de Valor" 
          value={`${stats.valueConcentration.toFixed(0)}%`} 
          subLabel={`Em apenas ${stats.concentration.toFixed(0)}% dos clientes`}
          icon={TrendingUp}
          color="text-primary"
        />
        <KpiSummary 
          label="Grupo Estratégico" 
          value={paretoData.filter(c => c.performanceBand === 'AZUL' || c.performanceBand === 'VERDE').length.toString()} 
          subLabel="Clientes Azul e Verde"
          icon={Users}
          color="text-success"
        />
        <KpiSummary 
          label="Foco de Atendimento" 
          value="80/20" 
          subLabel="Regra de Ouro GTMGC"
          icon={BarChart3}
          color="text-accent"
        />
      </div>

      {/* Main Pareto Chart */}
      <div className="glass-card p-8 min-h-[450px] flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
            <BarChart3 size={16} /> Curva de Concentração (VPM)
          </h3>
          <div className="flex items-center gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/20"></span> VPM Individual</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent"></span> % Acumulado</span>
          </div>
        </div>

        <div className="flex-1 w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#78716C' }}
                dy={10}
              />
              <YAxis 
                yAxisId="left" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#78716C' }}
                tickFormatter={(val) => `R$${(val/1000000).toFixed(1)}M`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                domain={[0, 100]}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#D97706' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value: any, name: string) => [name === 'vpm' ? `R$ ${value.toLocaleString('pt-BR')}` : `${value}%`, name === 'vpm' ? 'VPM' : 'Acumulado']}
              />
              <Bar yAxisId="left" dataKey="vpm" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBandColor(entry.band)} fillOpacity={0.8} />
                ))}
              </Bar>
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="acumulado" 
                stroke="#D97706" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#D97706', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary/70 mb-6">Resumo por Segmento</h3>
          <div className="space-y-4">
            <SegmentRow 
              band="AZUL" 
              label="Estratégico Top" 
              count={paretoData.filter(c => c.performanceBand === 'AZUL').length}
              percent={(paretoData.filter(c => c.performanceBand === 'AZUL').reduce((acc, c) => acc + (c as any).vpmTotal, 0) / stats.totalVpm * 100).toFixed(1)}
              color="bg-[#1E40AF]"
            />
            <SegmentRow 
              band="VERDE" 
              label="Estratégico Base" 
              count={paretoData.filter(c => c.performanceBand === 'VERDE').length}
              percent={(paretoData.filter(c => c.performanceBand === 'VERDE').reduce((acc, c) => acc + (c as any).vpmTotal, 0) / stats.totalVpm * 100).toFixed(1)}
              color="bg-[#15803D]"
            />
            <SegmentRow 
              band="AMARELO" 
              label="Complementar" 
              count={paretoData.filter(c => c.performanceBand === 'AMARELO').length}
              percent={(paretoData.filter(c => c.performanceBand === 'AMARELO').reduce((acc, c) => acc + (c as any).vpmTotal, 0) / stats.totalVpm * 100).toFixed(1)}
              color="bg-[#EAB308]"
            />
            <SegmentRow 
              band="VERMELHO" 
              label="Cauda Longa" 
              count={paretoData.filter(c => c.performanceBand === 'VERMELHO').length}
              percent={(paretoData.filter(c => c.performanceBand === 'VERMELHO').reduce((acc, c) => acc + (c as any).vpmTotal, 0) / stats.totalVpm * 100).toFixed(1)}
              color="bg-[#BE123C]"
            />
          </div>
        </div>

        <div className="glass-card p-6 bg-primary text-white border-none shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Info size={20} className="text-accent" />
              <h3 className="text-sm font-black uppercase tracking-widest">Diretriz GTMGC</h3>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-90">
              O seu foco comercial deve estar nos grupos <span className="font-black text-accent">AZUL e VERDE</span>. 
              Eles representam {stats.valueConcentration.toFixed(0)}% do seu potencial financeiro. 
              Qualquer desvio de agenda para o grupo Vermelho sem justificativa estratégica reduz a eficiência do território.
            </p>
          </div>
          <button className="mt-8 flex items-center justify-between w-full p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all group">
            <span className="text-xs font-black uppercase tracking-widest">Ver Plano de Ação</span>
            <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiSummary({ label, value, subLabel, icon: Icon, color }: any) {
  return (
    <div className="glass-card p-6 flex items-start gap-4">
      <div className={`p-3 rounded-2xl bg-primary/5 ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</p>
        <p className={`text-3xl font-black font-tabular my-1 ${color}`}>{value}</p>
        <p className="text-[10px] font-bold text-muted-foreground">{subLabel}</p>
      </div>
    </div>
  )
}

function SegmentRow({ band, label, count, percent, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/5">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <div>
          <p className="text-xs font-black text-primary">{band}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-black text-primary">{count} Produtores</p>
        <p className="text-[10px] font-bold text-muted-foreground">{percent}% do VPM</p>
      </div>
    </div>
  )
}

function getBandColor(band: string) {
  switch (band) {
    case 'AZUL': return '#1E40AF'
    case 'VERDE': return '#15803D'
    case 'AMARELO': return '#EAB308'
    case 'VERMELHO': return '#BE123C'
    default: return '#E7E5E4'
  }
}
