"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users2,
  TrendingUp,
  Settings2,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { PrimeirosPassos } from "@/components/PrimeirosPassos";

// Cada lista aqui só serve pra contar itens do checklist — cacheada 5min
// (mesmo padrão dos hooks de dicionário) pra não recarregar do zero toda
// vez que o usuário volta pra Início, a tela mais visitada do app (achado
// em auditoria de performance 31/08/2026).
async function fetchCount(url: string): Promise<number> {
  const r = await fetch(url);
  if (!r.ok) return 0;
  const j = await r.json();
  return Array.isArray(j) ? j.length : (j?.data ?? []).length;
}

/**
 * Início — porta de entrada do MetaCampo.
 *
 * Substitui o antigo Cockpit, que exibia orçamento, faturado YTD, ranking de
 * gerentes e top clientes vindos de MOCK_TEST_DATA / MONTHLY_MASTER_BASE.
 * Aqueles números eram fabricados e apareciam sem qualquer distinção dos reais
 * (ex.: "FATURADO YTD R$ 6.580.000" com faturamento_snapshots vazio no banco).
 *
 * Esta tela só mostra contagens que vêm do banco do próprio tenant.
 */

type Setup = {
  culturas: number;
  segmentos: number;
  indices: number;
  clientes: number;
};

export default function InicioPage() {
  const router = useRouter();
  const { data: sessionData, isLoading: isLoadingSession, isError: isSessionError } = useSession();
  const nome = sessionData?.fullName || "";

  useEffect(() => {
    if (isSessionError) router.push("/login");
  }, [isSessionError, router]);

  const staleTime = 5 * 60 * 1000;
  const enabled = !isLoadingSession && !!sessionData;
  const culturasQ = useQuery({ queryKey: ["inicio-count", "culturas"], queryFn: () => fetchCount("/api/cultures"), staleTime, enabled });
  const segmentosQ = useQuery({ queryKey: ["inicio-count", "segmentos"], queryFn: () => fetchCount("/api/classifications?activeOnly=true"), staleTime, enabled });
  const indicesQ = useQuery({ queryKey: ["inicio-count", "indices"], queryFn: () => fetchCount("/api/indice-tecnologico"), staleTime, enabled });
  const clientesQ = useQuery({ queryKey: ["inicio-count", "clientes"], queryFn: () => fetchCount("/api/clientes"), staleTime, enabled });

  const loadingSetup = culturasQ.isLoading || segmentosQ.isLoading || indicesQ.isLoading || clientesQ.isLoading;
  const setup: Setup | null = loadingSetup || isSessionError
    ? null
    : {
        culturas: culturasQ.data ?? 0,
        segmentos: segmentosQ.data ?? 0,
        indices: indicesQ.data ?? 0,
        clientes: clientesQ.data ?? 0,
      };

  const isAdmin = sessionData?.role === "admin";

  if (isLoadingSession || loadingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  // A renderização do checklist em si virou <PrimeirosPassos /> (03/09/2026,
  // pra poder reabrir em Configurações) — este array sobrevive só pra contar
  // pendentes(), usado no aviso de "sistema não configurado" pro não-admin.
  const passos = [
    { feito: (setup?.culturas ?? 0) > 0 },
    { feito: (setup?.segmentos ?? 0) > 0 },
    { feito: (setup?.indices ?? 0) > 0 },
    { feito: (setup?.clientes ?? 0) > 0 },
  ];

  const abas = [
    {
      icon: <Users2 size={20} />,
      nome: "Clientes",
      href: "/workspace/clientes",
      texto:
        "Cadastro dos produtores da carteira, com as áreas e culturas de cada um. É aqui que aparece o VPM potencial por produtor — e o aviso quando a cultura informada não está cadastrada ou ainda não tem Índice Tecnológico.",
    },
    {
      icon: <TrendingUp size={20} />,
      nome: "Planejamento",
      href: "/workspace/planejamento",
      texto:
        "Distribuição da meta por cliente, cultura e segmento. Parte do VPM potencial calculado na aba Clientes e permite ajustar o share que você pretende capturar em cada combinação.",
    },
    {
      icon: <Settings2 size={20} />,
      nome: "Configuração",
      href: "/workspace/settings/configuracao",
      texto:
        "Culturas, segmentos e Índice Tecnológico do seu tenant. Nada é lista fixa: tudo é configurável. Esta aba é o pré-requisito das outras — sem Índice Tecnológico cadastrado, o VPM não é calculado.",
    },
  ];

  const pendentes = passos.filter((p) => !p.feito).length;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Boas-vindas */}
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600 mb-2">
          Bem-vindo ao MetaCampo
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#3E2723]">
          {nome ? `Olá, ${nome.split(" ")[0]}` : "Olá"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          O MetaCampo organiza a gestão comercial da carteira de CTVs: você configura como
          o seu negócio calcula valor, cadastra os produtores, e a partir daí planeja a meta
          por cliente, cultura e segmento.
        </p>
      </div>

      {/* Como o cálculo funciona */}
      <div className="glass-card-premium p-6">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground mb-4">
          Como o VPM é calculado
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
            hectares do produtor
          </span>
          <span className="text-muted-foreground font-bold">×</span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
            Índice Tecnológico (cultura × segmento)
          </span>
          <span className="text-muted-foreground font-bold">=</span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold">
            VPM potencial
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Enquanto o Índice Tecnológico não estiver cadastrado para uma cultura, o VPM dela
          fica zerado — o sistema não estima nem preenche valor por conta própria.
        </p>
      </div>

      {/* Primeiros passos, com estado real do tenant — conteúdo muda por
          papel: admin vê o checklist acionável (os links levam a telas que
          só ele pode editar, desde a auditoria de 11/08/2026); CTV, se o
          tenant ainda não está configurado, vê um aviso pra procurar o
          admin em vez de links pra telas onde ele só bateria num 403. */}
      {setup && pendentes > 0 && !isAdmin && (
        <div className="glass-card-premium p-6 border border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Sistema ainda não configurado
              </h2>
              <p className="text-xs text-amber-800 mt-1 max-w-xl">
                Antes de cadastrar produtores, um administrador do seu tenant precisa definir
                culturas, segmentos e o Índice Tecnológico. Peça pra ele completar essa
                configuração — {pendentes} passo(s) ainda pendente(s).
              </p>
            </div>
          </div>
        </div>
      )}

      {setup && isAdmin && <PrimeirosPassos />}

      {/* O que cada aba faz */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground mb-4">
          O que cada aba faz
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {abas.map((aba) => (
            <Link
              key={aba.nome}
              href={aba.href}
              className="glass-card-premium p-5 hover:border-emerald-300 transition-colors group flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-3 text-emerald-600">
                {aba.icon}
                <span className="font-black text-sm tracking-tight text-[#3E2723]">
                  {aba.nome}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{aba.texto}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Abrir
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
