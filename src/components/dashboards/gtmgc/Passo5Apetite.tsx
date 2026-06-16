import React from 'react';
import { Activity, AlertOctagon, Info } from 'lucide-react';

export interface ApetiteData {
  cliente: string;
  cultivo: string;
  valorMedioHa: number;
  itseReferencia: number;
  numSegmentos: number;
  shareMedio: number;
}

interface Passo5Props {
  apetites: ApetiteData[];
}

export function Passo5Apetite({ apetites }: Passo5Props) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Passo 5</span>
          <h2 className="text-xl font-bold text-white">Dashboard de Apetite Comercial</h2>
        </div>
        <p className="text-sm text-slate-400">Termômetro de qualidade do plano: Onde o CTV está deixando dinheiro na mesa ou superestimando (wishful thinking).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-xs text-slate-300">
            <strong>Ticket Médio vs IT-SE:</strong> Indica se a ambição está proporcional ao potencial.
          </p>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-xs text-slate-300">
            <strong>Segmentos:</strong> A profundidade do relacionamento e a adoção do portfólio.
          </p>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex gap-3">
          <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-300">
            <strong>Share Médio:</strong> A fatia que planejamos capturar no VPM daquele cliente.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 font-bold rounded-tl-xl">Cliente</th>
              <th className="px-4 py-3 font-bold">Cultivo</th>
              <th className="px-4 py-3 font-bold text-right">Planejado (R$/ha)</th>
              <th className="px-4 py-3 font-bold text-right">IT-SE (R$/ha)</th>
              <th className="px-4 py-3 font-bold text-center">Qtd. Segmentos</th>
              <th className="px-4 py-3 font-bold text-right rounded-tr-xl">Share %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {apetites.map((row, i) => {
              // Diagnóstico de alerta
              const ratio = row.itseReferencia > 0 ? row.valorMedioHa / row.itseReferencia : 0;
              const isConservador = ratio < 0.1; // Menos de 10% do IT-SE
              const isWishful = ratio > 0.9 && row.numSegmentos <= 2; // Muito alto mas poucos produtos (Risco)
              
              return (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                    {isConservador && <AlertOctagon className="w-4 h-4 text-rose-500" title="Conservador Demais" />}
                    {isWishful && <AlertOctagon className="w-4 h-4 text-amber-500" title="Desejo Sem Fundamento" />}
                    {!isConservador && !isWishful && <div className="w-4 h-4 rounded-full border-2 border-emerald-500" />}
                    {row.cliente}
                  </td>
                  <td className="px-4 py-3">{row.cultivo}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-400">
                    {formatCurrency(row.valorMedioHa)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatCurrency(row.itseReferencia)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${row.numSegmentos < 2 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {row.numSegmentos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(row.shareMedio * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
