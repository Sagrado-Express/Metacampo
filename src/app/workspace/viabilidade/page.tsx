"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, Target, Loader2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";

/**
 * /workspace/viabilidade — Passo 1 do GTMGC.
 *
 * Meta individual do CTV (persistida em ctv_metas) vs apetite total já
 * comprometido no planejamento (soma de planejamento_cliente_segmento onde
 * ctv_id = eu), com o potencial bruto da carteira do tenant como contexto.
 */

interface ViabilidadeData {
  safra: string;
  metaVendasCentavos: number | null;
  shareEstimado: number | null;
  vpmNecessario: number | null;
  apetiteTotalCentavos: number;
  vpmPotencialCarteiraCentavos: number;
  viavel: boolean | null;
  deficit: number;
}

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRL(raw: string): number {
  const cleaned = raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed) * 100;
}

export default function ViabilidadePage() {
  const queryClient = useQueryClient();
  const [metaInput, setMetaInput] = useState("");
  const [shareInput, setShareInput] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError } = useQuery<ViabilidadeData>({
    queryKey: ["diagnostico", "viabilidade"],
    queryFn: async () => {
      const res = await fetch("/api/diagnostico/viabilidade");
      if (!res.ok) throw new Error("Falha ao carregar viabilidade");
      return res.json();
    },
  });

  const handleSalvarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const metaVendasCentavos = parseBRL(metaInput);
    const shareEstimado = parseFloat(shareInput.replace(",", ".")) / 100;

    if (!metaVendasCentavos) {
      toast.error("Informe a meta de vendas");
      return;
    }
    if (!shareEstimado || shareEstimado <= 0 || shareEstimado > 1) {
      toast.error("Share estimado deve ser entre 0 e 100%");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/diagnostico/viabilidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaVendasCentavos, shareEstimado }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message || "Erro ao salvar meta");
        return;
      }
      toast.success("Meta salva");
      setMetaInput("");
      setShareInput("");
      queryClient.setQueryData(["diagnostico", "viabilidade"], body);
    } catch {
      toast.error("Erro de conexão ao salvar meta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-6">
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
            <Target size={20} className="text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-[#3E2723]">Viabilidade</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sua meta de vendas, o quanto já comprometeu de apetite, e se a carteira dá conta.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
          Carregando viabilidade…
        </div>
      ) : isError || !data ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          Não foi possível carregar a viabilidade. Verifique a conexão com o banco e tente novamente.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Minha Meta */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" /> Minha Meta — Safra {data.safra}
            </h3>
            <form onSubmit={handleSalvarMeta} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Meta de vendas (R$)
                </label>
                <input
                  type="text"
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                  placeholder={data.metaVendasCentavos != null ? formatBRL(data.metaVendasCentavos) : "0,00"}
                  className="w-48 rounded-xl border border-border/40 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Share estimado (%)
                </label>
                <input
                  type="text"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  placeholder={data.shareEstimado != null ? String(data.shareEstimado * 100) : "0"}
                  className="w-28 rounded-xl border border-border/40 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Salvar
              </button>
            </form>
            {data.vpmNecessario == null ? (
              <p className="text-xs text-muted-foreground mt-4">
                Meta ainda não configurada para esta safra.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-4">
                VPM necessário (meta ÷ share):{" "}
                <strong className="text-slate-800">{formatBRL(data.vpmNecessario)}</strong>
              </p>
            )}
          </div>

          {/* Meu Apetite */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" /> Meu Apetite
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Já comprometido no planejamento
              </span>
              <span className="text-lg font-black text-slate-800">
                {formatBRL(data.apetiteTotalCentavos)}
              </span>
            </div>
            {data.vpmNecessario != null && (
              <>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all ${data.viavel ? "bg-emerald-600" : "bg-amber-500"}`}
                    style={{
                      width: `${Math.min(100, (data.apetiteTotalCentavos / (data.vpmNecessario || 1)) * 100)}%`,
                    }}
                  />
                </div>
                {data.viavel ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase rounded-full">
                    ✓ Meta viável com o apetite atual
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase rounded-full">
                    Faltam {formatBRL(data.deficit)} de apetite pra bater a meta
                  </span>
                )}
              </>
            )}
          </div>

          {/* Potencial da Carteira */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
              Potencial da Carteira
            </h3>
            <p className="text-lg font-black text-slate-800">
              {formatBRL(data.vpmPotencialCarteiraCentavos)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Potencial bruto de toda a carteira do tenant (todos os clientes, todos os CTVs) — não é
              exclusivo da sua carteira, é o contexto de quanto existe pra se planejar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
