"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { ChevronLeft, UploadCloud, Download, CheckCircle2, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { IngestionCenter } from "@/components/ingestion/IngestionCenter";
import { validateSafeUpload } from "@/lib/security";
import { toast } from "@/lib/toast";

interface AreaPreview {
  cultivo: string;
  hectares: number;
  valida: boolean;
  motivo?: string;
  areaAnteriorHa?: number | null;
}

interface GroupPreview {
  key: string;
  nome: string;
  cidade: string;
  uf: string;
  ctvEmail: string;
  ctvId: string | null;
  action: "create" | "update" | "error";
  erro: string | null;
  areas: AreaPreview[];
  resultado?: "criado" | "atualizado" | "erro";
  erroCommit?: string | null;
}

interface ResumoImportacao {
  total: number;
  criar?: number;
  atualizar?: number;
  erro?: number;
  criados?: number;
  atualizados?: number;
  erros?: number;
}

interface CsvRow {
  documento?: string;
  nome_cliente?: string;
  cidade?: string;
  uf?: string;
  email_ctv?: string;
  grupo_economico?: string;
  cultivo?: string;
  hectares?: string | number;
}

const REQUIRED_COLUMNS = ["email_ctv", "nome_cliente", "cidade", "uf", "cultivo", "hectares"];

export default function ImportarClientesPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const [parsing, setParsing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [preview, setPreview] = useState<{ groups: GroupPreview[]; resumo: ResumoImportacao } | null>(null);
  const [committed, setCommitted] = useState<{ groups: GroupPreview[]; resumo: ResumoImportacao } | null>(null);
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
        const parsed = results.data as CsvRow[];
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
      const res = await fetch("/api/clientes/import?dryRun=true", {
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
      const res = await fetch("/api/clientes/import?dryRun=false", {
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
      toast.success(`Importação concluída — ${data.resumo.criados} criados, ${data.resumo.atualizados} atualizados`);
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
          <Link href="/workspace/clientes" className="inline-block text-sm text-emerald-700 font-semibold underline">
            Voltar pra Clientes
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
          href="/workspace/clientes"
          className="mt-1 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          title="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <UploadCloud size={20} className="text-emerald-600" />
            <h1 className="text-2xl font-bold tracking-tight text-[#3E2723]">Importar Clientes</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Suba um CSV com clientes atribuídos a qualquer CTV do seu tenant, um cultivo por linha.
          </p>
        </div>
        <a
          href="/modelo-importacao-clientes.csv"
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
          title="Importar carteira de clientes"
          description={
            <>
              Arraste o CSV com colunas: email_ctv, nome_cliente, documento
              (opcional), cidade, uf, cultivo, hectares, grupo_economico
              (opcional).
            </>
          }
        />
      )}

      {rows && !preview && (
        <div className="glass-card p-6 space-y-4">
          <p className="text-sm text-slate-700">
            <strong>{rows.length}</strong> linha(s) lida(s) do arquivo. Clique em pré-visualizar pra ver o que será
            criado/atualizado antes de confirmar.
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
                <span className="text-sky-600">Atualizados: {displayData.resumo.atualizados}</span>
                <span className="text-red-600">Erros: {displayData.resumo.erros}</span>
              </>
            ) : (
              <>
                <span className="text-emerald-600">Vai criar: {displayData.resumo.criar}</span>
                <span className="text-sky-600">Vai atualizar: {displayData.resumo.atualizar}</span>
                <span className="text-red-600">Erro: {displayData.resumo.erro}</span>
              </>
            )}
          </div>

          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground uppercase tracking-widest">
                  <th className="p-3">Status</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">CTV</th>
                  <th className="p-3">Cultivos</th>
                  <th className="p-3">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {displayData.groups.map((g) => {
                  const status = committed ? g.resultado : g.action;
                  const cor =
                    status === "criado" || status === "create"
                      ? "text-emerald-600"
                      : status === "atualizado" || status === "update"
                        ? "text-sky-600"
                        : "text-red-600";
                  const label =
                    status === "create"
                      ? "Vai criar"
                      : status === "update"
                        ? "Vai atualizar"
                        : status === "criado"
                          ? "Criado"
                          : status === "atualizado"
                            ? "Atualizado"
                            : "Erro";
                  return (
                    <tr key={g.key} className="border-b border-border/20">
                      <td className={`p-3 font-black ${cor}`}>{label}</td>
                      <td className="p-3 font-semibold text-slate-800">{g.nome || "—"}</td>
                      <td className="p-3 text-muted-foreground">{g.ctvEmail}</td>
                      <td className="p-3 text-slate-700">
                        {g.areas.map((a, i) => (
                          <div key={i} className={a.valida ? "" : "text-red-600"}>
                            {a.cultivo}: {a.valida ? `${a.hectares}ha` : a.motivo}
                            {a.valida && a.areaAnteriorHa != null && a.areaAnteriorHa !== a.hectares && (
                              <span className="text-amber-600"> (substituindo {a.areaAnteriorHa}ha)</span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="p-3 text-red-600">{g.erroCommit || g.erro || ""}</td>
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
                disabled={committing || (displayData.resumo.criar ?? 0) + (displayData.resumo.atualizar ?? 0) === 0}
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
