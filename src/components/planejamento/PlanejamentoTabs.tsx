import React, { useState, useMemo } from 'react';
import Heatmap from './Heatmap';
import { Layers, Sprout, LayoutGrid, Pencil } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

/**
 * Planejamento consolidado em 2 abas (decisão de UX 07/2026 — padrão Excel):
 *  - "resumo": visão executiva (cards por cultivo + por segmento + carteira)
 *  - "editar": UMA superfície de edição (Heatmap Cliente × Cultivo) + Matriz pivot (leitura)
 *
 * Correções incluídas nesta versão:
 *  1. Campos da API dashboard-full são camelCase (vpmPotencialCentavos etc.) —
 *     a versão anterior lia snake_case e renderizava NaN. Corrigido.
 *  2. Cultivos deixam de ser hardcoded: agora vêm de `culturas` do tenant (Regra #6).
 *  3. Segmento deixou de ser hardcoded 'FERTILIZANTES': reusa o segmento da linha
 *     de planejamento existente do cliente×cultivo, ou o 1º segmento ativo do tenant.
 *  4. Cache do React Query é invalidado após salvar (antes o dado salvo não aparecia).
 *  5. Feedback visual (toast) de sucesso/erro ao salvar.
 */

interface PlanejamentoTabsProps {
  tab: 'resumo' | 'editar';
  onGoToEditar?: () => void;
}

// Formato de `/api/planejamento/dashboard-full` — ver
// src/app/api/planejamento/dashboard-full/route.ts para a origem de cada
// campo. `clientes` e `planejamentoRows` são linhas cruas do banco
// (snake_case); os demais já vêm computados em camelCase.
interface ClienteResumo {
  id: string;
  name: string;
}

interface CarteiraLinha {
  clienteId: string;
  clienteNome: string;
  cultura: string;
  segmento: string;
  hectares: number;
  vpmCentavos: number;
}

interface PorCultivo {
  cultivo: string;
  areaTotalHa: number;
  vpmPotencialCentavos: number;
}

interface PorSegmento {
  segmento: string;
  potencialCentavos: number;
}

interface CulturaResumo {
  custom_name: string;
}

interface SegmentoResumo {
  custom_name: string;
}

interface PlanejamentoRow {
  cliente_id?: string;
  clienteId?: string;
  cultivo: string;
  segmento: string;
  valor_planejado_centavos?: number;
  valorPlanejadoCentavos?: number;
  share_percentual?: number;
  sharePercentual?: number;
}

interface DashboardFullResponse {
  clientes: ClienteResumo[];
  carteira: CarteiraLinha[];
  porCultivo: PorCultivo[];
  porSegmento: PorSegmento[];
  planejamentoRows: PlanejamentoRow[];
  culturas: CulturaResumo[];
  segmentos: SegmentoResumo[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

function PlanejamentoSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="h-32 bg-muted rounded"></div>
      <div className="h-32 bg-muted rounded"></div>
    </div>
  );
}

export default function PlanejamentoTabs({ tab, onGoToEditar }: PlanejamentoTabsProps) {
  const queryClient = useQueryClient();
  const [editView, setEditView] = useState<'heatmap' | 'matriz'>('heatmap');
  // null = ainda não escolhido; cai no primeiro segmento ativo do tenant.
  // Não dá para inicializar com o dado aqui: os hooks rodam antes do fetch.
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['planejamento', 'dashboard-full'],
    queryFn: async (): Promise<DashboardFullResponse> => {
      const res = await fetch('/api/planejamento/dashboard-full');
      if (!res.ok) throw new Error('Falha ao carregar planejamento');
      return res.json();
    },
  });

  // Precisa ficar antes dos returns condicionais abaixo (regra dos hooks).
  // Antes era um for-loop refeito em toda renderização do componente (troca
  // de aba, seleção de segmento) — achado em auditoria de performance
  // 11/08/2026, sem custo real hoje com poucas linhas de planejamento.
  const planejamento: PlanejamentoRow[] = useMemo(() => data?.planejamentoRows || [], [data?.planejamentoRows]);
  const { planejadoPorCultivo, planejadoPorSegCrop } = useMemo(() => {
    const porCultivo: Record<string, number> = {};
    const porSegCrop: Record<string, Record<string, number>> = {};
    for (const p of planejamento) {
      const valor = Number(p.valorPlanejadoCentavos ?? p.valor_planejado_centavos ?? 0);
      porCultivo[p.cultivo] = (porCultivo[p.cultivo] || 0) + valor;
      const seg = p.segmento || '—';
      porSegCrop[seg] ??= {};
      porSegCrop[seg][p.cultivo] = (porSegCrop[seg][p.cultivo] || 0) + valor;
    }
    return { planejadoPorCultivo: porCultivo, planejadoPorSegCrop: porSegCrop };
  }, [planejamento]);

  if (isLoading) return <PlanejamentoSkeleton />;

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar o planejamento. Verifique a conexão com o banco e tente novamente.
      </div>
    );
  }

  const clients: ClienteResumo[] = data.clientes || [];
  const carteira: CarteiraLinha[] = data.carteira || [];
  const byCrop: PorCultivo[] = data.porCultivo || [];
  const bySegment: PorSegmento[] = data.porSegmento || [];
  const culturas: CulturaResumo[] = data.culturas || [];
  const segmentosAtivos: SegmentoResumo[] = data.segmentos || [];

  // Cultivos do tenant (Regra #6: nada hardcoded). Fallback: cultivos presentes na carteira.
  const activeCrops: string[] =
    culturas.length > 0
      ? culturas.map((c) => c.custom_name)
      : Array.from(new Set(byCrop.map((c) => c.cultivo)));

  const activeClientsNames = clients.slice(0, 15).map((c) => c.name);

  // Combinações cliente × cultivo que realmente existem (o cliente tem área
  // cadastrada daquela cultura) — usado para desabilitar no Heatmap as
  // células de cultivo que o cliente não planta. Achado em auditoria
  // 11/08/2026: a Fazenda Boa Vista (só planta Milho) tinha a coluna Soja
  // editável, e ao salvar um share ali a rota bloqueava com a mensagem
  // "Sem Índice Tecnológico" — enganosa, já que o índice existe, só não há
  // área daquela cultura para esse cliente.
  const combosComArea = new Set<string>(
    carteira.map((l) => `${l.clienteNome}::${String(l.cultura).toUpperCase()}`)
  );

  // O planejamento é por Cliente × Cultivo × Segmento. O heatmap é 2D, então
  // edita-se um segmento por vez — com 10 cultivos e 5 segmentos, colunas
  // aninhadas dariam 50 colunas.
  const segmentoAtivo: string | undefined =
    segmentoSelecionado ?? segmentosAtivos[0]?.custom_name;

  const heatmapData = planejamento
    .filter((p) => String(p.segmento ?? '') === String(segmentoAtivo ?? ''))
    .map((p) => {
      const client = clients.find((c) => c.id === p.cliente_id || c.id === p.clienteId);
      return {
        clientName: client ? client.name : 'Cliente Geral',
        cropName: p.cultivo,
        sharePercentual: Number(p.sharePercentual ?? p.share_percentual ?? 0),
      };
    });

  /** VPM potencial de um cliente × cultivo × segmento, vindo de `carteira`. */
  const vpmDaCombinacao = (clienteId: string, cultivo: string, segmento: string): number =>
    carteira
      .filter(
        (l) =>
          l.clienteId === clienteId &&
          String(l.cultura).toUpperCase() === cultivo.toUpperCase() &&
          String(l.segmento).toUpperCase() === segmento.toUpperCase()
      )
      .reduce((acc, l) => acc + Number(l.vpmCentavos ?? 0), 0);

  const handleCellChange = async (clientName: string, cropName: string, newShare: number) => {
    const client = clients.find((c) => c.name === clientName);
    if (!client) return;

    const segmento = segmentoAtivo;
    if (!segmento) {
      toast.error('Configure ao menos um grupo de produto antes de planejar.');
      return;
    }

    // O valor planejado é o share sobre o VPM DAQUELA combinação
    // cliente × cultivo × segmento, lido de `carteira`.
    //
    // Antes lia-se `client.vpmTotalCentavos`, campo que não existe em
    // `data.clientes` — a rota devolve a linha crua da tabela `clientes`.
    // O resultado era Math.round(0 * share) = 0 em toda gravação, e a Matriz
    // ficava só com traços porque só renderiza valores maiores que zero.
    const vpmCombinacao = vpmDaCombinacao(client.id, cropName, segmento);

    if (vpmCombinacao === 0 && newShare > 0) {
      const clienteTemArea = combosComArea.has(`${clientName}::${cropName.toUpperCase()}`);
      toast.error(
        clienteTemArea
          ? `Sem Índice Tecnológico para ${cropName} × ${segmento}. O valor planejado ficaria zerado.`
          : `${clientName} não tem área cadastrada de ${cropName}.`
      );
      return;
    }

    try {
      const response = await fetch('/api/planejamento/cliente-segmento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: client.id,
          cultivo: cropName,
          segmento,
          valor_planejado_centavos: Math.round(vpmCombinacao * (newShare / 100)),
          share_percentual: newShare,
        }),
      });

      if (response.ok) {
        toast.success(`Salvo · ${fmt((vpmCombinacao * (newShare / 100)) / 100)}`);
        queryClient.invalidateQueries({ queryKey: ['planejamento', 'dashboard-full'] });
      } else {
        toast.error('Erro ao salvar. Tente novamente.');
      }
    } catch (err) {
      console.error('Error updating cells:', err);
      toast.error('Erro de conexão ao salvar.');
    }
  };

  /* ───────────────────────── ABA: RESUMO ───────────────────────── */
  if (tab === 'resumo') {
    const totalPotencial = byCrop.reduce(
      (acc, c) => acc + Number(c.vpmPotencialCentavos ?? 0), 0
    );
    const totalPlanejado = Object.values(planejadoPorCultivo).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-6">
        {/* Header do resumo + CTA para edição */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
            Potencial total: <strong>{fmt(totalPotencial / 100)}</strong> · Planejado:{' '}
            <strong>{fmt(totalPlanejado / 100)}</strong>
          </div>
          <button
            onClick={onGoToEditar}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
          >
            <Pencil size={14} /> Editar planejamento
          </button>
        </div>

        {/* Cards por cultivo */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Sprout className="text-emerald-600" size={16} /> Por Cultivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byCrop.map((crop) => {
              const potencial = Number(crop.vpmPotencialCentavos ?? 0);
              const planejado = planejadoPorCultivo[crop.cultivo] || 0;
              return (
                <div key={crop.cultivo} className="glass-card-premium p-5 hover-lift">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-base font-black text-slate-800">{crop.cultivo}</h4>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Área: {crop.areaTotalHa ?? 0} ha
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-muted-foreground uppercase">Potencial</span>
                      <span className="font-black text-slate-800">{fmt(potencial / 100)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-muted-foreground uppercase">Planejado</span>
                      <span className="font-black text-emerald-600">{fmt(planejado / 100)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${Math.min(100, (planejado / (potencial || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cards por segmento */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="text-emerald-600" size={16} /> Por Grupo de Produto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bySegment.map((seg) => {
              const potencial = Number(seg.potencialCentavos ?? 0);
              const planejadoSeg = Object.values(planejadoPorSegCrop[seg.segmento] || {}).reduce(
                (a, b) => a + b, 0
              );
              return (
                <div key={seg.segmento} className="glass-card-premium p-5 text-center hover-lift">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {seg.segmento}
                  </span>
                  <h4 className="text-xl font-black text-emerald-600 my-3">{fmt(planejadoSeg / 100)}</h4>
                  <div className="text-[11px] text-muted-foreground font-bold uppercase">
                    Potencial: {fmt(potencial / 100)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── ABA: EDITAR ───────────────────────── */
  return (
    <div className="space-y-4">
      {/* Seletor de visão de edição */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditView('heatmap')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            editView === 'heatmap'
              ? 'bg-emerald-600 text-white'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Apetite (Cliente × Cultivo)
        </button>
        <button
          onClick={() => setEditView('matriz')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            editView === 'matriz'
              ? 'bg-emerald-600 text-white'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Matriz (Grupo de Produto × Cultivo)
        </button>
      </div>

      {editView === 'heatmap' && (
        <div className="space-y-4">
          {/* Seletor de segmento: o planejamento é Cliente × Cultivo × Segmento,
              e o heatmap edita um segmento por vez. */}
          {segmentosAtivos.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
              Nenhum grupo de produto cadastrado. Configure em{' '}
              <strong>Configurações → Grupos de Produtos</strong> antes de planejar.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">
                Grupo de Produto
              </span>
              {segmentosAtivos.map((s) => {
                const nome = s.custom_name;
                const ativo = nome === segmentoAtivo;
                return (
                  <button
                    key={nome}
                    onClick={() => setSegmentoSelecionado(nome)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors ${
                      ativo
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {nome}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 font-semibold uppercase tracking-wider">
            📊 Share Alvo (%) em <strong>{segmentoAtivo ?? '—'}</strong>. Duplo clique na célula ·
            Enter salva · Esc cancela · Tab próxima.
          </div>
          <Heatmap
            data={heatmapData}
            clients={activeClientsNames}
            crops={activeCrops}
            validCombos={combosComArea}
            onCellChange={handleCellChange}
          />
        </div>
      )}

      {editView === 'matriz' && (
        <div className="glass-card-premium p-6 overflow-x-auto">
          <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
            <LayoutGrid className="text-emerald-600" size={18} /> Matriz Grupo de Produto × Cultivo
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Valores planejados consolidados. Para alterar, edite pelo Apetite (Cliente × Cultivo).
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-3 text-left font-black text-muted-foreground uppercase tracking-widest">Grupo de Produto</th>
                {activeCrops.map((crop) => (
                  <th key={crop} className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest px-2">
                    {crop}
                  </th>
                ))}
                <th className="pb-3 text-right font-black text-muted-foreground uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody>
              {bySegment.map((m) => {
                const linha = planejadoPorSegCrop[m.segmento] || {};
                const totalLinha = Object.values(linha).reduce((a, b) => a + b, 0);
                return (
                  <tr key={m.segmento} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-3 font-black text-slate-800">{m.segmento}</td>
                    {activeCrops.map((crop) => {
                      const v = Object.entries(linha).find(
                        ([c]) => c.toUpperCase() === crop.toUpperCase()
                      )?.[1] || 0;
                      return (
                        <td key={crop} className="py-3 px-2 text-right text-slate-700">
                          {v > 0 ? fmt(v / 100) : <span className="text-muted-foreground">–</span>}
                        </td>
                      );
                    })}
                    <td className="py-3 text-right font-bold text-emerald-700">{fmt(totalLinha / 100)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
