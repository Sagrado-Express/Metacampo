"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronDown, ChevronRight, UploadCloud, TrendingUp } from "lucide-react";
import { useSession } from "@/hooks/useSession";

interface PorCtv {
  ctvUserId: string;
  metaCentavos: number;
  realizadoCentavos: number;
  saldoToGoCentavos: number;
  mesesComDado: string[];
}
interface PorCtvSegmento {
  ctvUserId: string;
  segmento: string;
  metaCentavos: number;
  realizadoCentavos: number;
}
interface AcompanhamentoResponse {
  role: string;
  porCtv: PorCtv[];
  porCtvSegmento: PorCtvSegmento[];
}
interface Member {
  userId: string;
  email: string;
  fullName: string;
}
interface Regional {
  id: string;
  codigo: string;
  userId: string;
}
interface Distrital {
  id: string;
  regionalId: string;
  codigo: string;
  userId: string;
}
interface Territorio {
  id: string;
  distritalId: string;
  nome: string;
  ctvUserId: string;
}
interface Tree {
  regionais: Regional[];
  distritais: Distrital[];
  territorios: Territorio[];
}

interface Totais {
  metaCentavos: number;
  realizadoCentavos: number;
}

const fmt = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function somaTotais(list: Totais[]): Totais {
  return list.reduce(
    (acc, t) => ({ metaCentavos: acc.metaCentavos + t.metaCentavos, realizadoCentavos: acc.realizadoCentavos + t.realizadoCentavos }),
    { metaCentavos: 0, realizadoCentavos: 0 }
  );
}

/** Meta / Realizado / Saldo TO-GO com barra de progresso — mesmo padrão visual dos cards "Por Cultivo". */
function KpiRow({ meta, realizado }: { meta: number; realizado: number }) {
  const saldo = Math.max(0, meta - realizado);
  const pct = meta > 0 ? Math.min(100, (realizado / meta) * 100) : 0;
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between text-xs">
        <span className="font-bold text-muted-foreground uppercase">Meta</span>
        <span className="font-black text-slate-800">{fmt(meta)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="font-bold text-muted-foreground uppercase">Realizado</span>
        <span className="font-black text-emerald-600">{fmt(realizado)}</span>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="font-bold text-muted-foreground uppercase">Saldo TO-GO</span>
        <span className="font-black text-amber-700">{fmt(saldo)}</span>
      </div>
    </div>
  );
}

function SegmentoBreakdown({ linhas }: { linhas: PorCtvSegmento[] }) {
  if (linhas.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Nenhum grupo de produto com meta ou realizado ainda.</p>;
  }
  return (
    <div className="space-y-1.5 py-1">
      {linhas.map((l) => (
        <div key={l.segmento} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-muted/10">
          <span className="font-semibold text-slate-700">{l.segmento}</span>
          <span className="text-muted-foreground">
            Meta {fmt(l.metaCentavos)} · Realizado <strong className="text-emerald-700">{fmt(l.realizadoCentavos)}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Acompanhamento Orçamentário — completa o Passo 5 do GTMGC (docs/PRD.md
 * §16.1): meta (planejamento_cliente_segmento) vs realizado (importado via
 * /api/faturamento/import) ao longo da safra. Não-admin só vê a própria
 * linha; admin vê o rollup território → distrital → regional, mesmo padrão
 * de src/app/workspace/settings/configuracao/estrutura-comercial/page.tsx,
 * trocando a soma de VPM potencial por um par meta/realizado.
 */
export default function Acompanhamento() {
  const { data: sessionData } = useSession();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery<AcompanhamentoResponse>({
    queryKey: ["planejamento", "acompanhamento"],
    queryFn: async () => {
      const res = await fetch("/api/planejamento/acompanhamento");
      if (!res.ok) throw new Error("Falha ao carregar acompanhamento");
      return res.json();
    },
  });

  const isAdmin = data?.role === "admin";

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["tenant-members"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/members");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: tree } = useQuery<Tree>({
    queryKey: ["estrutura-comercial"],
    queryFn: async () => {
      const res = await fetch("/api/estrutura-comercial");
      if (!res.ok) throw new Error("Falha ao buscar estrutura comercial");
      return res.json();
    },
    enabled: isAdmin,
  });

  const memberById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
  const nomeDe = (userId: string) => memberById.get(userId)?.fullName || memberById.get(userId)?.email || userId;

  const porCtvById = useMemo(() => new Map((data?.porCtv || []).map((c) => [c.ctvUserId, c])), [data?.porCtv]);
  const segmentosPorCtv = useMemo(() => {
    const map = new Map<string, PorCtvSegmento[]>();
    for (const l of data?.porCtvSegmento || []) {
      if (!map.has(l.ctvUserId)) map.set(l.ctvUserId, []);
      map.get(l.ctvUserId)!.push(l);
    }
    return map;
  }, [data?.porCtvSegmento]);

  const totaisPorDistrital = useMemo(() => {
    const map = new Map<string, Totais>();
    for (const t of tree?.territorios || []) {
      const ctv = porCtvById.get(t.ctvUserId);
      const totais = ctv ? { metaCentavos: ctv.metaCentavos, realizadoCentavos: ctv.realizadoCentavos } : { metaCentavos: 0, realizadoCentavos: 0 };
      const atual = map.get(t.distritalId) || { metaCentavos: 0, realizadoCentavos: 0 };
      map.set(t.distritalId, somaTotais([atual, totais]));
    }
    return map;
  }, [tree?.territorios, porCtvById]);

  const totaisPorRegional = useMemo(() => {
    const map = new Map<string, Totais>();
    for (const d of tree?.distritais || []) {
      const atual = map.get(d.regionalId) || { metaCentavos: 0, realizadoCentavos: 0 };
      map.set(d.regionalId, somaTotais([atual, totaisPorDistrital.get(d.id) || { metaCentavos: 0, realizadoCentavos: 0 }]));
    }
    return map;
  }, [tree?.distritais, totaisPorDistrital]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar o acompanhamento. Verifique a conexão com o banco e tente novamente.
      </div>
    );
  }

  const importarBotao = (
    <Link
      href="/workspace/planejamento/faturamento/importar"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black uppercase tracking-wider hover:bg-violet-700 transition-colors"
    >
      <UploadCloud size={14} /> Importar Faturamento
    </Link>
  );

  // Não-admin: só a própria linha, sem rollup de hierarquia (mesmo nível
  // de sensibilidade que /api/tenant/members já trata pra dado de colega).
  if (!isAdmin) {
    const meu = data.porCtv.find((c) => c.ctvUserId === sessionData?.userId);
    const minhasLinhas = segmentosPorCtv.get(sessionData?.userId || "") || [];
    return (
      <div className="space-y-6">
        <div className="glass-card-premium p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-violet-600" size={18} />
            <h3 className="text-base font-black text-slate-800">Meu Acompanhamento</h3>
          </div>
          <KpiRow meta={meu?.metaCentavos || 0} realizado={meu?.realizadoCentavos || 0} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">Por Grupo de Produto</h3>
          <SegmentoBreakdown linhas={minhasLinhas} />
        </div>
      </div>
    );
  }

  const regionais = tree?.regionais || [];
  const distritais = tree?.distritais || [];
  const territorios = tree?.territorios || [];

  // Sem estrutura comercial cadastrada ainda: lista plana de CTVs em vez
  // de árvore vazia — a tela precisa funcionar mesmo pra tenant que não
  // configurou Regional/Distrital/Território.
  if (regionais.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">{importarBotao}</div>
        {data.porCtv.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum dado de meta ou realizado ainda. Calibre o apetite em <strong>Editar</strong> e importe o faturamento do mês.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.porCtv.map((c) => (
              <div key={c.ctvUserId} className="glass-card-premium p-5">
                <h4 className="text-sm font-black text-slate-800 mb-3">{nomeDe(c.ctvUserId)}</h4>
                <KpiRow meta={c.metaCentavos} realizado={c.realizadoCentavos} />
                <button
                  onClick={() => toggle(c.ctvUserId)}
                  className="mt-3 text-[10px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  {expanded.has(c.ctvUserId) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  Por grupo de produto
                </button>
                {expanded.has(c.ctvUserId) && <SegmentoBreakdown linhas={segmentosPorCtv.get(c.ctvUserId) || []} />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">{importarBotao}</div>
      <div className="space-y-2">
        {regionais.map((regional) => {
          const distritaisDaRegional = distritais.filter((d) => d.regionalId === regional.id);
          const isOpenR = expanded.has(regional.id);
          const totaisRegional = totaisPorRegional.get(regional.id) || { metaCentavos: 0, realizadoCentavos: 0 };
          return (
            <div key={regional.id} className="rounded-xl border border-border/50 bg-white/60">
              <button onClick={() => toggle(regional.id)} className="w-full flex items-center justify-between p-3 text-left">
                <span className="flex items-center gap-2">
                  {isOpenR ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {regional.codigo}
                  </span>
                  <span className="font-medium text-sm">{nomeDe(regional.userId)}</span>
                </span>
                <span className="text-xs font-black">
                  <span className="text-slate-500">Meta {fmt(totaisRegional.metaCentavos)}</span>{" "}
                  <span className="text-emerald-700">· Real. {fmt(totaisRegional.realizadoCentavos)}</span>
                </span>
              </button>

              {isOpenR && (
                <div className="pl-8 pb-3 space-y-1.5">
                  {distritaisDaRegional.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">Nenhum distrital nesta regional ainda.</p>
                  )}
                  {distritaisDaRegional.map((distrital) => {
                    const territoriosDoDistrital = territorios.filter((t) => t.distritalId === distrital.id);
                    const isOpenD = expanded.has(distrital.id);
                    const totaisDistrital = totaisPorDistrital.get(distrital.id) || { metaCentavos: 0, realizadoCentavos: 0 };
                    return (
                      <div key={distrital.id} className="rounded-lg border border-border/30 bg-white/40">
                        <button onClick={() => toggle(distrital.id)} className="w-full flex items-center justify-between p-2.5 text-left">
                          <span className="flex items-center gap-2">
                            {isOpenD ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                              {distrital.codigo}
                            </span>
                            <span className="text-sm">{nomeDe(distrital.userId)}</span>
                          </span>
                          <span className="text-xs font-bold">
                            <span className="text-slate-500">Meta {fmt(totaisDistrital.metaCentavos)}</span>{" "}
                            <span className="text-emerald-700">· Real. {fmt(totaisDistrital.realizadoCentavos)}</span>
                          </span>
                        </button>

                        {isOpenD && (
                          <div className="pl-8 pb-2 space-y-1">
                            {territoriosDoDistrital.length === 0 && (
                              <p className="text-xs text-muted-foreground py-1.5">Nenhum território neste distrital ainda.</p>
                            )}
                            {territoriosDoDistrital.map((territorio) => {
                              const ctv = porCtvById.get(territorio.ctvUserId);
                              const isOpenT = expanded.has(territorio.id);
                              return (
                                <div key={territorio.id} className="rounded-lg bg-muted/10 px-2 py-2">
                                  <button onClick={() => toggle(territorio.id)} className="w-full flex items-center justify-between text-left text-sm">
                                    <span>
                                      {isOpenT ? <ChevronDown size={11} className="inline mr-1" /> : <ChevronRight size={11} className="inline mr-1" />}
                                      <strong className="font-semibold">{territorio.nome}</strong>{" "}
                                      <span className="text-muted-foreground">— {nomeDe(territorio.ctvUserId)}</span>
                                    </span>
                                    <span className="text-xs font-semibold">
                                      <span className="text-slate-500">Meta {fmt(ctv?.metaCentavos || 0)}</span>{" "}
                                      <span className="text-emerald-700">· Real. {fmt(ctv?.realizadoCentavos || 0)}</span>
                                    </span>
                                  </button>
                                  {isOpenT && <SegmentoBreakdown linhas={segmentosPorCtv.get(territorio.ctvUserId) || []} />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
