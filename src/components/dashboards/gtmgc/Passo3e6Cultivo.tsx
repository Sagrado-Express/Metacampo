"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sprout } from 'lucide-react';

export interface CultivoData {
  nome: string;
  areaHa: number;
  vpmReal: number;
  previsaoVendas: number;
}

interface Passo3e6Props {
  cultivos: CultivoData[];
}

export function Passo3e6Cultivo({ cultivos }: Passo3e6Props) {
  const vpmTotal = cultivos.reduce((acc, curr) => acc + curr.vpmReal, 0);
  const previsaoTotal = cultivos.reduce((acc, curr) => acc + curr.previsaoVendas, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const chartData = cultivos.map(c => ({
    name: c.nome,
    vpm: c.vpmReal,
    previsao: c.previsaoVendas,
    sharePlanejado: c.vpmReal > 0 ? (c.previsaoVendas / c.vpmReal) * 100 : 0
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Passos 3 e 6</span>
          <h2 className="text-xl font-bold text-white">Dashboard de Carteira por Cultivo</h2>
        </div>
        <p className="text-sm text-slate-400">Visão do potencial bruto (VPM) vs a previsão declarada (Share).</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 font-bold rounded-tl-xl">Cultivo</th>
                <th className="px-4 py-3 font-bold text-right">Área (ha)</th>
                <th className="px-4 py-3 font-bold text-right">VPM (R$)</th>
                <th className="px-4 py-3 font-bold text-right">Previsto (R$)</th>
                <th className="px-4 py-3 font-bold text-right rounded-tr-xl">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {cultivos.map((cultivo, i) => {
                const shareVpm = vpmTotal > 0 ? (cultivo.vpmReal / vpmTotal) * 100 : 0;
                const shareApetite = cultivo.vpmReal > 0 ? (cultivo.previsaoVendas / cultivo.vpmReal) * 100 : 0;
                
                return (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-emerald-500" />
                      {cultivo.nome}
                    </td>
                    <td className="px-4 py-3 text-right">{cultivo.areaHa.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col">
                        <span>{formatCurrency(cultivo.vpmReal)}</span>
                        <span className="text-[10px] text-slate-500 font-bold">{shareVpm.toFixed(1)}% do VPM</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                      {formatCurrency(cultivo.previsaoVendas)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${shareApetite < 2 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {shareApetite.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-700 font-bold text-white bg-slate-800/30">
              <tr>
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right">{cultivos.reduce((a,b)=>a+b.areaHa, 0).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(vpmTotal)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(previsaoTotal)}</td>
                <td className="px-4 py-3 text-right">
                   {vpmTotal > 0 ? ((previsaoTotal/vpmTotal)*100).toFixed(2) : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Gráfico */}
        <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase text-center mb-6 tracking-wider">
            Potencial vs Previsão de Vendas
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="vpm" name="VPM Total" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.3} />
                <Bar dataKey="previsao" name="Previsão" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
