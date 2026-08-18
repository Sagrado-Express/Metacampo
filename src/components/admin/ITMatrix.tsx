"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useITConfigurations, UpsertITConfigInput } from "@/hooks/useITConfigurations";
import { useQueryClient } from "@tanstack/react-query";
import { TenantCultura, TenantClassificacao } from "@/types/schema";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

interface ITMatrixProps {
  culturas: TenantCultura[];
  classificacoes: TenantClassificacao[];
  safra: string;
  onSafraChange: (safra: string) => void;
}

// Local draft: cultivo|segmento → value (centavos)
type MatrixDraft = Record<string, number>;

// ============================================================
// Helpers
// ============================================================

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRL(raw: string): number {
  // Accept "4.000,00" or "4000.00" or plain "4000"
  const cleaned = raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  // Block decimals: round to nearest integer before converting to centavos
  const rounded = Math.round(parsed);
  return rounded * 100; // Store as centavos (always whole R$)
}

function cellKey(cultivo: string, segmento: string): string {
  return `${cultivo}|${segmento}`;
}

// ============================================================
// Component
// ============================================================

/**
 * ITMatrix — Índice Tecnológico SE (R$/ha) Matrix
 *
 * Displays a cultivo × segmento grid with editable R$/ha values.
 * Saves to /api/indice-tecnologico via upsert (POST or PATCH).
 *
 * Design: Morning Dew — glass cards with micro-animations.
 */
export function ITMatrix({
  culturas,
  classificacoes,
  safra,
  onSafraChange,
}: ITMatrixProps) {
  const {
    getCellValue,
    upsertConfig,
    isLoading: isLoadingIT,
    isError,
  } = useITConfigurations(safra);
  const queryClient = useQueryClient();
  const [editingSafra, setEditingSafra] = useState(false);
  const [safraDraft, setSafraDraft] = useState(safra);

  // Active classifications only (roots)
  const activeSegmentos = classificacoes.filter(
    (c) => c.isActive && c.parentKey === null
  );
  const activeCulturas = culturas.filter((c) => c.isActive);

  // Local draft for batch editing
  const [draft, setDraft] = useState<MatrixDraft>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Initialize draft from server data when cultures/classifications/configs change.
  // Não dá para calcular durante o render: precisa mesclar com dirtyKeys (edição
  // local do usuário) e preservar o que já foi digitado, algo que depende do
  // estado da renderização anterior, não só das props atuais.
  useEffect(() => {
    const initial: MatrixDraft = {};
    activeCulturas.forEach((cultura) => {
      activeSegmentos.forEach((seg) => {
        const key = cellKey(cultura.customName, seg.customName);
        initial[key] = getCellValue(cultura.customName, seg.customName);
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((prev) => {
      // Only update non-dirty cells to preserve user edits
      const merged = { ...initial };
      dirtyKeys.forEach((k) => {
        if (prev[k] !== undefined) merged[k] = prev[k];
      });
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCulturas.length, activeSegmentos.length, getCellValue]);

  const handleCellChange = useCallback(
    (cultivo: string, segmento: string, rawValue: string) => {
      const key = cellKey(cultivo, segmento);
      const centavos = parseBRL(rawValue);
      setDraft((prev) => ({ ...prev, [key]: centavos }));
      setDirtyKeys((prev) => new Set(prev).add(key));
      setSavedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    []
  );

  const handleSaveAll = async () => {
    if (dirtyKeys.size === 0) return;
    setSavingAll(true);
    setError(null);

    try {
      const ops: Promise<unknown>[] = [];

      dirtyKeys.forEach((key) => {
        const [cultivo, segmento] = key.split("|");
        const input: UpsertITConfigInput = {
          safra,
          cultivo,
          segmento,
          valorPorHectareCentavos: draft[key] ?? 0,
        };
        ops.push(upsertConfig(input));
      });

      await Promise.all(ops);

      // Invalidate VPM-dependent queries so other pages refetch with new IT values
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['planejamento'] });

      setSavedKeys(new Set(dirtyKeys));
      setDirtyKeys(new Set());
      toast.success('Índice Tecnológico salvo');
    } catch (err) {
      setError(getErrorMessage(err) || "Erro ao salvar configurações.");
      toast.error('Erro ao salvar Índice Tecnológico');
    } finally {
      setSavingAll(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  // Total por linha (soma de R$/ha entre classificações, pra um mesmo
  // cultivo) faz sentido como "investimento tecnológico total daquele
  // cultivo". Não existe total por coluna nem geral: somar R$/ha de
  // cultivos diferentes não é uma conta válida (cada um é uma taxa por
  // hectare do seu próprio cultivo, não uma quantidade somável entre
  // cultivos) — removido a pedido do Marco Polo, 13/08/2026.
  //
  // Antes era um .reduce() dentro do JSX, refeito a cada render (cada tecla
  // digitada em qualquer célula) — achado em auditoria de performance
  // 11/08/2026, sem custo real hoje com poucas culturas/segmentos, mas
  // cresce O(culturas×segmentos) por tecla.
  const rowTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cultura of activeCulturas) {
      map[cultura.customName] = activeSegmentos.reduce(
        (sum, seg) => sum + (draft[cellKey(cultura.customName, seg.customName)] ?? 0),
        0
      );
    }
    return map;
  }, [activeCulturas, activeSegmentos, draft]);

  if (isLoadingIT) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Carregando Índice Tecnológico...
      </div>
    );
  }

  if (activeCulturas.length === 0 || activeSegmentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
        <Info size={32} className="text-muted-foreground/40" />
        <p className="text-sm font-medium">
          {activeCulturas.length === 0
            ? "Nenhuma cultura ativa. Adicione culturas na aba Cultivos."
            : "Nenhum grupo de produto ativo. Adicione na aba Grupos de Produtos."}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Índice Tecnológico</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              Valor de referência R$/ha por cultivo × grupo de produto — Safra{" "}
              {editingSafra ? (
                <input
                  autoFocus
                  value={safraDraft}
                  onChange={(e) => setSafraDraft(e.target.value)}
                  onBlur={() => {
                    setEditingSafra(false);
                    const trimmed = safraDraft.trim();
                    if (trimmed && trimmed !== safra) onSafraChange(trimmed);
                    else setSafraDraft(safra);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      setSafraDraft(safra);
                      setEditingSafra(false);
                    }
                  }}
                  placeholder="ex: 26/27"
                  className="px-2 py-0.5 rounded-lg border border-violet-300 bg-white text-xs font-medium text-foreground w-20 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
              ) : (
                <button
                  onClick={() => {
                    setSafraDraft(safra);
                    setEditingSafra(true);
                  }}
                  className="font-medium text-foreground underline decoration-dotted decoration-violet-400 underline-offset-2 hover:text-violet-700 transition-colors"
                  title="Clique para trocar de safra"
                >
                  {safra}
                </button>
              )}
            </p>
          </div>
        </div>

        <button
          id="btn-save-it-matrix"
          onClick={handleSaveAll}
          disabled={dirtyKeys.size === 0 || savingAll}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-500/20"
        >
          {savingAll ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Salvar{dirtyKeys.size > 0 ? ` (${dirtyKeys.size} alterações)` : ""}
        </button>
      </div>

      {/* Error Banner */}
      {(isError || error) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={14} />
          <span>
            {error ||
              "Falha ao carregar dados do servidor. Verifique o Supabase."}
          </span>
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-700">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          Edite o valor R$/ha para cada combinação cultivo × grupo de produto.
          Clique em{" "}
          <strong>Salvar</strong> para persistir as alterações no banco de dados.
        </span>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider border-b border-border/40 min-w-[140px]">
                Cultivo ↓ / Grupo de Produto →
              </th>
              {activeSegmentos.map((seg) => (
                <th
                  key={seg.id}
                  className="px-3 py-3 font-semibold text-center text-xs uppercase tracking-wider border-b border-border/40 min-w-[130px]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color || "#6B7280" }}
                    />
                    <span className="truncate max-w-[100px]">{seg.customName}</span>
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 font-semibold text-center text-xs uppercase tracking-wider border-b border-border/40 min-w-[100px] text-violet-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {activeCulturas.map((cultura, rowIdx) => (
              <tr
                key={cultura.id}
                className={rowIdx % 2 === 0 ? "bg-white/60" : "bg-muted/10"}
              >
                {/* Row label */}
                <td className="px-4 py-3 font-medium border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <span>{cultura.customName}</span>
                    <span className="text-[9px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded-full">
                      {cultura.internalKey}
                    </span>
                  </div>
                </td>

                {/* Cells */}
                {activeSegmentos.map((seg) => {
                  const key = cellKey(cultura.customName, seg.customName);
                  const isDirty = dirtyKeys.has(key);
                  const isSaved = savedKeys.has(key);
                  const cellVal = draft[key] ?? 0;
                  const isEditing = editingCell === key;

                  return (
                    <td
                      key={seg.id}
                      className="px-2 py-2 border-b border-border/20 text-center"
                    >
                      <div className="relative">
                        <input
                          id={`it-cell-${cultura.internalKey}-${seg.internalKey}`}
                          type="text"
                          defaultValue={
                            isEditing
                              ? String(cellVal / 100)
                              : formatBRL(cellVal)
                          }
                          onFocus={(e) => {
                            setEditingCell(key);
                            // Show raw number on focus for easier editing
                            e.target.value = cellVal > 0 ? String(cellVal / 100) : "";
                          }}
                          onBlur={(e) => {
                            setEditingCell(null);
                            handleCellChange(
                              cultura.customName,
                              seg.customName,
                              e.target.value
                            );
                            // Re-format on blur
                            const centavos = parseBRL(e.target.value);
                            e.target.value = formatBRL(centavos);
                          }}
                          onChange={(e) => {
                            // Allow free typing but update draft
                            handleCellChange(
                              cultura.customName,
                              seg.customName,
                              e.target.value
                            );
                          }}
                          placeholder="R$ 0,00"
                          className={`w-full px-2 py-1.5 rounded-lg text-center text-xs font-medium border transition-all focus:outline-none focus:ring-2 ${
                            isDirty
                              ? "border-violet-400 bg-violet-50 focus:ring-violet-300 text-violet-900"
                              : isSaved
                              ? "border-green-300 bg-green-50/60 focus:ring-green-200 text-green-900"
                              : "border-border/40 bg-white/70 focus:ring-primary/20 text-foreground"
                          }`}
                        />
                        {isSaved && !isDirty && (
                          <CheckCircle2
                            size={10}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none"
                          />
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Row total */}
                <td className="px-2 py-2 border-b border-border/20 text-center">
                  <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-1.5 rounded-lg inline-block min-w-[90px]">
                    {formatBRL(rowTotals[cultura.customName] ?? 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      {dirtyKeys.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-200 text-sm"
        >
          <span className="text-violet-700">
            <strong>{dirtyKeys.size}</strong> célula
            {dirtyKeys.size !== 1 ? "s" : ""} com alterações não salvas
          </span>
          <button
            onClick={handleSaveAll}
            disabled={savingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
          >
            {savingAll ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Salvar tudo
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
