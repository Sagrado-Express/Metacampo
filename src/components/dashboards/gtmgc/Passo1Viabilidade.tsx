import React from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Passo1Props {
  metaVendas: number;
  shareEstimado: number; // ex: 0.05 para 5%
  vpmRealCarteira: number;
}

export function Passo1Viabilidade({ metaVendas, shareEstimado, vpmRealCarteira }: Passo1Props) {
  const vpmNecessario = metaVendas / shareEstimado;
  const gap = vpmRealCarteira - vpmNecessario;
  const coverage = (vpmRealCarteira / vpmNecessario) * 100;
  
  const isViable = gap >= 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Decoração de Fundo */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Passo 1</span>
          <h2 className="text-xl font-bold text-white">Diagnóstico de Viabilidade da Meta</h2>
        </div>
        <p className="text-sm text-slate-400">O VPM necessário para entregar o resultado esperado considerando o share médio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Input: Meta */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Meta de Vendas</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(metaVendas)}</p>
        </div>

        {/* Input: Share */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Share Estimado</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{(shareEstimado * 100).toFixed(1)}%</p>
        </div>

        {/* Output: VPM Necessário */}
        <div className="bg-indigo-900/40 rounded-2xl p-4 border border-indigo-500/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-indigo-300 uppercase">VPM Necessário</span>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          </div>
          <p className="text-2xl font-black text-indigo-100">{formatCurrency(vpmNecessario)}</p>
        </div>
      </div>

      <div className={`rounded-2xl p-6 border ${isViable ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-1 uppercase tracking-wider">Diagnóstico de Carteira Atual</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-white">{formatCurrency(vpmRealCarteira)}</span>
              <span className={`text-sm font-bold ${isViable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {coverage.toFixed(1)}% do VPM alvo
              </span>
            </div>
            
            <p className="text-sm text-slate-400 mt-3">
              Com a carteira atual e share de {(shareEstimado*100).toFixed(1)}%, a entrega seria de {formatCurrency(vpmRealCarteira * shareEstimado)}.
              <br/>Gap para a meta: <strong className={isViable ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(metaVendas - (vpmRealCarteira * shareEstimado))}</strong>
            </p>
          </div>
          
          <div className={`p-3 rounded-xl ${isViable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {isViable ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
        </div>
      </div>
    </div>
  );
}
