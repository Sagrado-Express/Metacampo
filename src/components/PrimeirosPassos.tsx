"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, CheckCircle2, Circle, ArrowRight, Sprout, Tags, Ruler, Users2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";

// Extraído de /workspace/page.tsx (03/09/2026) — até então só existia
// embutido na tela Início, sem jeito de reabrir depois de já ter passado
// por ali (pedido do Marco Polo: acessar de novo em Configurações).
// Mesmas query keys/staleTime do Início, de propósito: react-query dedupa
// e reaproveita o cache entre as duas telas, sem refetch duplicado.

async function fetchCount(url: string): Promise<number> {
  const r = await fetch(url);
  if (!r.ok) return 0;
  const j = await r.json();
  return Array.isArray(j) ? j.length : (j?.data ?? []).length;
}

type Setup = {
  culturas: number;
  segmentos: number;
  indices: number;
  clientes: number;
};

export function PrimeirosPassos() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const isAdmin = sessionData?.role === "admin";
  const staleTime = 5 * 60 * 1000;
  const enabled = !isLoadingSession && !!sessionData && isAdmin;

  const culturasQ = useQuery({ queryKey: ["inicio-count", "culturas"], queryFn: () => fetchCount("/api/cultures"), staleTime, enabled });
  const segmentosQ = useQuery({ queryKey: ["inicio-count", "segmentos"], queryFn: () => fetchCount("/api/classifications?activeOnly=true"), staleTime, enabled });
  const indicesQ = useQuery({ queryKey: ["inicio-count", "indices"], queryFn: () => fetchCount("/api/indice-tecnologico"), staleTime, enabled });
  const clientesQ = useQuery({ queryKey: ["inicio-count", "clientes"], queryFn: () => fetchCount("/api/clientes"), staleTime, enabled });

  if (!isAdmin) return null;

  const loadingSetup = culturasQ.isLoading || segmentosQ.isLoading || indicesQ.isLoading || clientesQ.isLoading;
  if (isLoadingSession || loadingSetup) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const setup: Setup = {
    culturas: culturasQ.data ?? 0,
    segmentos: segmentosQ.data ?? 0,
    indices: indicesQ.data ?? 0,
    clientes: clientesQ.data ?? 0,
  };

  const passos = [
    {
      icon: <Sprout size={16} />,
      titulo: "Cadastrar culturas",
      descricao: "Soja, milho, algodão — o que a sua carteira atende.",
      feito: setup.culturas > 0,
      contagem: setup.culturas,
      href: "/workspace/settings/configuracao",
    },
    {
      icon: <Tags size={16} />,
      titulo: "Cadastrar segmentos",
      descricao: "As linhas de produto que você vende em cada cultura.",
      feito: setup.segmentos > 0,
      contagem: setup.segmentos,
      href: "/workspace/settings/segments",
    },
    {
      icon: <Ruler size={16} />,
      titulo: "Definir o Índice Tecnológico",
      descricao: "Quanto vale, por hectare, cada cultura em cada segmento.",
      feito: setup.indices > 0,
      contagem: setup.indices,
      href: "/workspace/settings/configuracao",
    },
    {
      icon: <Users2 size={16} />,
      titulo: "Cadastrar produtores",
      descricao: "Com as áreas e culturas de cada um.",
      feito: setup.clientes > 0,
      contagem: setup.clientes,
      href: "/workspace/clientes",
    },
  ];

  const pendentes = passos.filter((p) => !p.feito).length;

  return (
    <div className="glass-card-premium p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">
          Primeiros passos
        </h2>
        <span className="text-xs text-muted-foreground">
          {pendentes === 0 ? "tudo configurado" : `${pendentes} pendente(s)`}
        </span>
      </div>

      <ol className="space-y-1">
        {passos.map((p, i) => (
          <li key={p.titulo}>
            <Link
              href={p.href}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/20 transition-colors group"
            >
              <span className="mt-0.5 shrink-0">
                {p.feito ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <Circle size={18} className="text-muted-foreground/40" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground/60">{p.icon}</span>
                  <span
                    className={`text-sm font-bold ${p.feito ? "text-slate-700" : "text-[#3E2723]"}`}
                  >
                    {i + 1}. {p.titulo}
                  </span>
                  {p.feito && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {p.contagem} cadastrado(s)
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {p.descricao}
                </span>
              </span>
              <ArrowRight
                size={15}
                className="mt-1 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors"
              />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
