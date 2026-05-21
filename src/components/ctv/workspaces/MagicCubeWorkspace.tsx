"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCtvPlanning, PlanningLimits, StatusColor } from '@/hooks/useCtvPlanning';
import { ArrowDownAZ, ArrowDown01, AlertTriangle, ChevronDown } from 'lucide-react';

const MOCK_DATA = [
  { clientId: 'c1', clientName: 'Fazenda Boa Esperança', vpm: 1500000, realizedLastYear: 800000, targetCurrentYear: 800000 },
  { clientId: 'c2', clientName: 'Agropecuária São José', vpm: 2500000, realizedLastYear: 1200000, targetCurrentYear: 1200000 },
  { clientId: 'c3', clientName: 'Grupo Maggi - Filial MT', vpm: 5000000, realizedLastYear: 3000000, targetCurrentYear: 3000000 },
  { clientId: 'c4', clientName: 'Sítio Novo Horizonte', vpm: 500000, realizedLastYear: 200000, targetCurrentYear: 200000 },
];

const DEFAULT_LIMITS: PlanningLimits = {
  minGrowthVerde: 5,
  minGrowthAzul: 15,
  minShareVerde: 10,
};

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

export function MagicCubeWorkspace() {
  const { rows, updateTarget, sortByValue, sortByShare } = useCtvPlanning(MOCK_DATA, DEFAULT_LIMITS);

  // Estados dos filtros apenas visuais para o MVP
  const [segment, setSegment] = useState('Todos os Segmentos');
  const [crop, setCrop] = useState('Todas as Culturas');

  return (
    <div className="w-full min-h-screen bg-[#F9F8F6] text-[#4A3B32] p-6 font-sans">
      
      {/* Header e Filtros (O "Cubo") */}
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Planejamento Safra (O Cubo Mágico)</h1>
        
        <div className="flex gap-4 items-center bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-sm">
          <div className="flex-1 flex gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition">
              {crop} <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition">
              {segment} <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => sortByValue(false)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8E6E1] text-[#4A3B32] rounded-lg hover:bg-[#DCDAD4] transition font-medium text-sm"
            >
              <ArrowDown01 className="w-4 h-4" /> Valor
            </button>
            <button 
              onClick={() => sortByShare(false)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8E6E1] text-[#4A3B32] rounded-lg hover:bg-[#DCDAD4] transition font-medium text-sm"
            >
              <ArrowDownAZ className="w-4 h-4" /> Share %
            </button>
          </div>
        </div>
      </div>

      {/* Tabela Dinâmica (Grid de Inputs) */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/40 shadow-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#E8E6E1]/50 text-sm uppercase tracking-wider text-[#7A6A60]">
              <th className="p-4 font-semibold">Cliente</th>
              <th className="p-4 font-semibold text-right">VPM</th>
              <th className="p-4 font-semibold text-right">Realizado (Ano Ant.)</th>
              <th className="p-4 font-semibold text-right">Alvo (Ano Atual)</th>
              <th className="p-4 font-semibold text-center">Share %</th>
              <th className="p-4 font-semibold text-center">Cresc. (YoY)</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {rows.map((row) => (
                <RowItem 
                  key={row.clientId} 
                  row={row} 
                  onUpdateTarget={(val) => updateTarget(row.clientId, val)} 
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente isolado para a linha, usando memo para performance (evita re-render de linhas não afetadas)
const RowItem = React.memo(function RowItem({ row, onUpdateTarget }: { row: any, onUpdateTarget: (val: number) => void }) {
  const [localTarget, setLocalTarget] = useState(row.targetCurrentYear / 100); // lidando em R$ na view

  // Sincroniza estado local -> global com pequeno atraso para UX fluida (ou onChange direto)
  useEffect(() => {
    onUpdateTarget(localTarget * 100);
  }, [localTarget]);

  const colorVariants = {
    vermelho: 'bg-red-50/80 border-l-4 border-l-red-500',
    amarelo: 'bg-yellow-50/80 border-l-4 border-l-yellow-500',
    verde: 'bg-emerald-50/80 border-l-4 border-l-emerald-500',
    azul: 'bg-blue-50/80 border-l-4 border-l-blue-500',
    neutro: 'bg-transparent border-l-4 border-l-transparent'
  };

  const isWarning = row.targetCurrentYear < row.realizedLastYear;

  return (
    <motion.tr 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-b border-gray-100 transition-colors duration-500 ${colorVariants[row.statusColor as StatusColor]}`}
    >
      <td className="p-4 font-medium text-[#4A3B32]">{row.clientName}</td>
      <td className="p-4 text-right text-gray-500">{formatCurrency(row.vpm)}</td>
      <td className="p-4 text-right text-gray-500">{formatCurrency(row.realizedLastYear)}</td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {isWarning && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} title="Atenção: A reduzir meta face ao ano passado?">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </motion.div>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
            <input 
              type="number" 
              value={localTarget}
              onChange={(e) => setLocalTarget(Number(e.target.value))}
              className="w-32 py-1.5 pl-9 pr-3 text-right border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#8E9B68] focus:border-[#8E9B68] outline-none font-medium bg-white"
            />
          </div>
        </div>
      </td>
      <td className="p-4 text-center">
        <span className="inline-block px-2 py-1 bg-white/60 rounded-md font-semibold text-sm">
          {row.shareProjected.toFixed(1)}%
        </span>
      </td>
      <td className="p-4 text-center">
        <span className="inline-block px-2 py-1 bg-white/60 rounded-md font-semibold text-sm">
          {row.growthYoY > 0 ? '+' : ''}{row.growthYoY.toFixed(1)}%
        </span>
      </td>
    </motion.tr>
  );
});
