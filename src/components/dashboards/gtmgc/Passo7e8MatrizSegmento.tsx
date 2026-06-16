import React from 'react';
import { Layers } from 'lucide-react';

export interface MatrizData {
  segmento: string;
  valoresPorCultivo: Record<string, number>;
  totalSegmento: number;
}

interface Passo7e8Props {
  matriz: MatrizData[];
  cultivosAtivos: string[];
}

export function Passo7e8MatrizSegmento({ matriz, cultivosAtivos }: Passo7e8Props) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const totalGeral = matriz.reduce((acc, curr) => acc + curr.totalSegmento, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Passos 7 e 8</span>
          <h2 className="text-xl font-bold text-white">Previsão por Segmento x Cultivo</h2>
        </div>
        <p className="text-sm text-slate-400">O alinhamento entre o apetite do CTV, a estratégia da empresa e o gap cirúrgico de desenvolvimento.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 font-bold rounded-tl-xl flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" /> Segmento
              </th>
              {cultivosAtivos.map(cultivo => (
                <th key={cultivo} className="px-4 py-3 font-bold text-right">
                  {cultivo}
                </th>
              ))}
              <th className="px-4 py-3 font-bold text-right rounded-tr-xl">Total do Segmento</th>
              <th className="px-4 py-3 font-bold text-right">% do Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {matriz.map((row, i) => {
              const percTotal = totalGeral > 0 ? (row.totalSegmento / totalGeral) * 100 : 0;
              
              // Verifica se tem algum gap gritante
              const isLowPerc = percTotal < 5 && row.totalSegmento > 0;
              
              return (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{row.segmento}</td>
                  
                  {cultivosAtivos.map(cultivo => {
                    const valor = row.valoresPorCultivo[cultivo] || 0;
                    return (
                      <td key={cultivo} className={`px-4 py-3 text-right ${valor === 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                        {formatCurrency(valor)}
                      </td>
                    );
                  })}
                  
                  <td className="px-4 py-3 text-right font-bold text-white">
                    {formatCurrency(row.totalSegmento)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${isLowPerc ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
                      {percTotal.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-700 font-bold text-white bg-slate-800/30">
            <tr>
              <td className="px-4 py-3">TOTAL GERAL</td>
              {cultivosAtivos.map(cultivo => {
                const totalCol = matriz.reduce((acc, curr) => acc + (curr.valoresPorCultivo[cultivo] || 0), 0);
                return <td key={cultivo} className="px-4 py-3 text-right text-emerald-400">{formatCurrency(totalCol)}</td>;
              })}
              <td className="px-4 py-3 text-right text-emerald-400 text-lg">{formatCurrency(totalGeral)}</td>
              <td className="px-4 py-3 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
