'use client';

import { useSession } from '@/hooks/useSession';
import { useState } from 'react';
import PlanejamentoTabs from '@/components/planejamento/PlanejamentoTabs';
import Link from 'next/link';
import { ChevronLeft, BarChart3 } from 'lucide-react';

/**
 * Planejamento — consolidado de 5 abas para 2 (decisão de UX 07/2026):
 *  - Resumo: visão executiva (o que já foi planejado)
 *  - Editar: superfície única de edição (Heatmap) + Matriz consolidada
 * As antigas abas Carteira / Por Cultivo / Por Segmento foram absorvidas
 * pelo Resumo; a lista completa da carteira vive em /workspace/clientes.
 */
export default function PlanejamentoPage() {
  const { data: sessionData, isLoading } = useSession();
  const [tab, setTab] = useState<'resumo' | 'editar'>('resumo');

  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Carregando sessão...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/workspace"
          className="mt-1 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          title="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-[#3E2723]">Planejamento</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Veja o resumo do seu planejamento e edite o apetite comercial por cliente e cultivo.
          </p>
        </div>
      </div>

      {/* Tabs list — 2 abas */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl border border-border/40">
        {(['resumo', 'editar'] as const).map(t => (
          <button
            key={t}
            id={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-200 ${
              tab === t
                ? 'bg-white shadow-sm text-emerald-800 border-b-2 border-emerald-600'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            {t === 'resumo' && 'Resumo'}
            {t === 'editar' && 'Editar'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-card p-6 min-h-[300px]">
        <PlanejamentoTabs tab={tab} tenantId={tenantId} onGoToEditar={() => setTab('editar')} />
      </div>
    </div>
  );
}
