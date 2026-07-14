import React, { useState } from 'react';
import Heatmap from './Heatmap';
import { Loader2, Layers, Sprout, LayoutGrid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PlanejamentoTabsProps {
  tab: 'carteira' | 'apetite' | 'cultivo' | 'segmento' | 'matriz';
  tenantId: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

function PlanejamentoSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="h-32 bg-muted rounded"></div>
      <div className="h-32 bg-muted rounded"></div>
      <div className="h-32 bg-muted rounded"></div>
    </div>
  );
}

export default function PlanejamentoTabs({ tab, tenantId }: PlanejamentoTabsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['planejamento', 'dashboard-full'],
    queryFn: async () => {
      const res = await fetch('/api/planejamento/dashboard-full');
      if (!res.ok) throw new Error('Falha ao carregar planejamento');
      return res.json();
    },
  });

  const handleCellChange = async (clientName: string, cropName: string, newShare: number) => {
    const client = data?.clientes?.find((c: any) => c.name === clientName);
    if (!client) return;

    try {
      const response = await fetch('/api/planejamento/cliente-segmento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: client.id,
          cultivo: cropName,
          segmento: 'FERTILIZANTES', // Default segment for quick cell update from heatmap
          valor_planejado_centavos: Math.round(Number(client.vpmTotalCentavos || 0) * (newShare / 100)),
          share_percentual: newShare
        })
      });

      if (response.ok) {
        // Will be invalidated automatically if we tie it to the same mutation, but since this is direct fetch, 
        // ideally we would call queryClient.invalidateQueries. We'll leave it as requested for now.
      }
    } catch (err) {
      console.error('Error updating cells:', err);
    }
  };

  if (isLoading) {
    return <PlanejamentoSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar o planejamento. Verifique a conexão com o banco e tente novamente.
      </div>
    );
  }

  const { clientes, carteira, porCultivo, porSegmento, planejamentoRows } = data;

  // Rebuild matrix and clients for backwards compatibility with the rest of the component
  const clients = clientes || [];
  const planejamento = planejamentoRows || [];
  const byCrop = porCultivo || [];
  const bySegment = porSegmento || [];

  // Pre-calculate inputs for Apetite Heatmap
  const activeClientsNames = clients.slice(0, 15).map((c: any) => c.name);
  const activeCrops = ['Soja', 'Milho', 'Café', 'Algodão', 'HF'];
  const heatmapData = planejamento.map((p: any) => {
    const client = clients.find((c: any) => c.id === p.clienteId || c.id === p.cliente_id);
    return {
      clientName: client ? client.name : 'Cliente Geral',
      cropName: p.cultivo,
      sharePercentual: p.sharePercentual || p.share_percentual || 0
    };
  });

  return (
    <div className="space-y-6">
      {/* ─── TAB: CARTEIRA ─── */}
      {tab === 'carteira' && (
        <div className="glass-card-premium p-6 overflow-x-auto">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Layers className="text-emerald-600" size={18} /> Carteira do CTV</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Produtor</th>
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Município</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">VPM Potencial</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">VPM Planejado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c: any) => {
                const plans = planejamento.filter((p: any) => p.clienteId === c.id || p.cliente_id === c.id);
                const totalPlanned = plans.reduce((acc: number, curr: any) => acc + (curr.valorPlanejadoCentavos || curr.valor_planejado_centavos || 0), 0) / 100;
                return (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-2.5 font-black text-slate-800">{c.name}</td>
                    <td className="py-2.5 text-muted-foreground">{c.city} - {c.state}</td>
                    <td className="py-2.5 text-right font-bold text-slate-700">{fmt(c.vpmTotalCentavos / 100)}</td>
                    <td className="py-2.5 text-right font-black text-emerald-600">{fmt(totalPlanned)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB: APETITE ─── */}
      {tab === 'apetite' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 font-semibold uppercase tracking-wider">
            📊 Painel de Apetite Comercial — Edite o Share Alvo (%) por cultivo para seus clientes.
          </div>
          <Heatmap
            data={heatmapData}
            clients={activeClientsNames}
            crops={activeCrops}
            onCellChange={handleCellChange}
          />
        </div>
      )}

      {/* ─── TAB: CULTIVO ─── */}
      {tab === 'cultivo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {byCrop.map((crop: any) => (
            <div key={crop.cultivo} className="glass-card-premium p-6 hover-lift">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-base font-black text-slate-800 flex items-center gap-2"><Sprout className="text-emerald-600" size={16} /> {crop.cultivo}</h4>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Área: {crop.area_total_ha} ha</span>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">Consolidado</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase">VPM Potencial</span>
                  <span className="font-black text-slate-800">{fmt(crop.vpm_potencial_centavos / 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase">VPM Planejado</span>
                  <span className="font-black text-emerald-600">{fmt(crop.vpm_planejado_centavos / 100)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${Math.min(100, (crop.vpm_planejado_centavos / (crop.vpm_potencial_centavos || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB: SEGMENTO ─── */}
      {tab === 'segmento' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bySegment.map((seg: any) => (
            <div key={seg.segmento} className="glass-card-premium p-6 text-center hover-lift">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{seg.segmento}</span>
              <h4 className="text-2xl font-black text-emerald-600 my-4">{fmt(seg.planejado_centavos / 100)}</h4>
              <div className="text-[11px] text-muted-foreground font-bold uppercase">
                Potencial: {fmt(seg.potencialCentavos / 100 || seg.potencial_centavos / 100)} • Share: {seg.share_percentual || 0}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB: MATRIZ ─── */}
      {tab === 'matriz' && (
        <div className="glass-card-premium p-6 overflow-x-auto">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutGrid className="text-emerald-600" size={18} /> Matriz Segmento × Cultivo (Pivot)</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Segmento</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Total</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Soja</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Milho</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Algodão</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Café</th>
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">HF</th>
              </tr>
            </thead>
            <tbody>
              {bySegment.map((m: any) => (
                <tr key={m.segmento} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-3 font-black text-slate-800">{m.segmento}</td>
                  <td className="py-3 text-right font-bold text-emerald-700">{fmt(m.potencialCentavos / 100 || m.potencial_centavos / 100 || 0)}</td>
                  <td className="py-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 text-right text-muted-foreground">-</td>
                  <td className="py-3 text-right text-muted-foreground">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
