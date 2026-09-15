"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { ChevronLeft, UploadCloud, Download, CheckCircle2, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { IngestionCenter } from "@/components/ingestion/IngestionCenter";
import { validateSafeUpload } from "@/lib/security";
import { toast } from "@/lib/toast";

interface FaturamentoCsvRow {
  mes?: string;
  email_ctv?: string;
  segmento?: string;
  valor_realizado?: string | number;
}

interface RowPreview {
  key: string;
  mes: string;
  ctvEmail: string;
  ctvId: string | null;
  segmentoOriginal: string;
  segmentoResolvido: string | null;
  valorRealizadoCentavos: number;
  valorMetaCentavos: number;
  action: "create" | "update" | "error";
  erro: string | null;
  resultado?: "criado" | "substituido" | "erro";
  erroCommit?: string | null;
}

interface ResumoImportacao {
  total: number;
  criar?: number;
  substituir?: number;
  erro?: number;
  criados?: number;
  substituidos?: number;
  erros?: number;
}

const REQUIRED_COLUMNS = ["mes", "email_ctv", "segmento", "valor_realizado"];

const fmt = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ImportarFaturamentoPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const [parsing, setParsing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rows, setRows] = useState<FaturamentoCsvRow[] | null>(null);
  const [preview, setPreview] = useState<{ rows: RowPreview[]; resumo: ResumoImportacao } | null>(null);
  const [committed, setCommitted] = useState<{ rows: RowPreview[]; resumo: ResumoImportacao } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const isAdmin = sessionData?.role === "admin";

  const handleUpload = async (file: File) => {
    const validationError = validateSafeUpload(file, 10);
    if (validationError) {
      setParseError(validationError);
      return;
    }

    setParsing(true);
    setParseError(null);
    setPreview(null);
    setCommitted(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        const parsed = results.data as FaturamentoCsvRow[];
        const headers = results.meta.fields || [];
        const faltando = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (faltando.length > 0) {
          setParseError(`Colunas obrigatórias ausentes no CSV: ${faltando.join(", ")}`);
          setRows(null);
          return;
        }
        setRows(parsed);
      },
      error: (err) => {
        setParsing(false);
        setParseError(err.message || "Erro ao ler o arquivo.");
      },
    });
  };

  const runPreview = async () => {
    if (!rows) return;
    setPreviewing(true);
    try {
      const res = await fetch("/api/faturamento/import?dryRun=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Erro ao pré-visualizar importação");
        return;
      }
      setPreview(data);
    } catch {
      toast.error("Erro de conexão ao pré-visualizar");
    } finally {
      setPreviewing(false);
    }
  };

  const runCommit = async () => {
    if (!rows) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/faturamento/import?dryRun=false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Erro ao importar");
        return;
      }
      setCommitted(data);
      toast.success(`Importação concluída — ${data.resumo.criados} criados, ${data.resumo.substituidos} substituídos`);
    } catch {
      toast.error("Erro de conexão ao importar");
    } finally {
      setCommitting(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Carregando sessão…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-6 md:p-10 max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center space-y-3">
          <AlertTriangle className="mx-auto text-amber-500" size={32} />
          <h1 className="text-lg font-bold text-slate-800">Só administradores podem importar</h1>
          <p className="text-sm text-muted-foreground">
            Peça pra um administrador do seu tenant fazer essa importação, ou pedir pra ser convidado como admin.
          </p>
          <Link href="/workspace/planejamento" className="inline-block text-sm text-emerald-700 font-semibold underline">
            Voltar pra Planejamento
          </Link>
        </div>
      </div>
    );
  }

  const displayData = committed || preview;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/workspace/planejamento"
          className="mt-1 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          title="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <UploadCloud size={20} className="text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-[#3E2723]">Importar Faturamento</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Suba um CSV com o realizado do mês por CTV e grupo de produto, pra comparar contra a meta em Acompanhamento.
          </p>
        </div>
        <a
          href="/modelo-importacao-faturamento.csv"
          download
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 text-xs font-black uppercase tracking-wider text-muted-foreground hover:bg-muted/30 transition-colors shrink-0"
        >
          <Download size={14} /> Baixar modelo
        </a>
      </div>

      {!rows && (
        <IngestionCenter
          onUpload={handleUpload}
          isProcessing={parsing}
          progress={parsing ? 50 : 0}
          error={parseError}
          title="Importar faturamento"
          description={<>Arraste o CSV com colunas: mes (01-12), email_ctv, segmento, valor_realizado.</>}
        />
      )}

      {rows && !preview && (
        <div className="glass-card p-6 space-y-4">
          <p className="text-sm text-slate-700">
            <strong>{rows.length}</strong> linha(s) lida(s) do arquivo. Clique em pré-visualizar pra ver o que será
            criado/substituído antes de confirmar.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setRows(null);
                setParseError(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-border/40 text-xs font-black uppercase tracking-wider text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              Trocar arquivo
            </button>
            <button
              onClick={runPreview}
              disabled={previewing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {previewing ? <Loader2 size={14} className="animate-spin" /> : null}
              Pré-visualizar
            </button>
          </div>
        </div>
      )}

      {displayData && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex flex-wrap gap-4 text-xs font-black uppercase tracking-wider">
            <span className="text-slate-600">Total: {displayData.resumo.total}</span>
            {committed ? (
              <>
                <span className="text-emerald-600">Criados: {displayData.resumo.criados}</span>
                <span className="text-sky-600">Substituídos: {displayData.resumo.substituidos}</span>
                <span className="text-red-600">Erros: {displayData.resumo.erros}</span>
              </>
            ) : (
              <>
                <span className="text-emerald-600">Vai criar: {displayData.resumo.criar}</span>
                <span className="text-sky-600">Vai substituir: {displayData.resumo.substituir}</span>
                <span className="text-red-600">Erro: {displayData.resumo.erro}</span>
              </>
            )}
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground uppercase tracking-widest">
                  <th className="p-3">Status</th>
                  <th className="p-3">Mês</th>
                  <th className="p-3">CTV</th>
                  <th className="p-3">Grupo de Produto</th>
                  <th className="p-3">Realizado</th>
                  <th className="p-3">Meta</th>
                  <th className="p-3">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {displayData.rows.map((r) => {
                  const status = committed ? r.resultado : r.action;
                  const cor =
                    status === "criado" || status === "create"
                      ? "text-emerald-600"
                      : status === "substituido" || status === "update"
                        ? "text-sky-600"
                        : "text-red-600";
                  const label =
                    status === "create"
                      ? "Vai criar"
                      : status === "update"
                        ? "Vai substituir"
                        : status === "criado"
                          ? "Criado"
                          : status === "substituido"
                            ? "Substituído"
                            : "Erro";
                  return (
                    <tr key={r.key} className="border-b border-border/20">
                      <td className={`p-3 font-black ${cor}`}>{label}</td>
                      <td className="p-3 text-slate-700">{r.mes || "—"}</td>
                      <td className="p-3 text-muted-foreground">{r.ctvEmail}</td>
                      <td className="p-3 font-semibold text-slate-800">{r.segmentoResolvido || r.segmentoOriginal}</td>
                      <td className="p-3 text-slate-700">{r.action !== "error" ? fmt(r.valorRealizadoCentavos) : "—"}</td>
                      <td className="p-3 text-muted-foreground">{r.action !== "error" ? fmt(r.valorMetaCentavos) : "—"}</td>
                      <td className="p-3 text-red-600">{r.erroCommit || r.erro || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!committed && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRows(null);
                  setPreview(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-border/40 text-xs font-black uppercase tracking-wider text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={runCommit}
                disabled={committing || (displayData.resumo.criar ?? 0) + (displayData.resumo.substituir ?? 0) === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {committing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirmar importação
              </button>
            </div>
          )}

          {committed && (
            <button
              onClick={() => {
                setRows(null);
                setPreview(null);
                setCommitted(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw size={14} /> Importar outro arquivo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
