"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users2,
  TrendingUp,
  Settings2,
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sprout,
  Tags,
  Ruler,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState<string>("");
  const [setup, setSetup] = useState<Setup | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (!sessionRes.ok) {
          router.push("/login");
          return;
        }
        const { session } = await sessionRes.json();
        setNome(session?.user?.user_metadata?.full_name || session?.user?.email || "");

        const [cult, clas, it, cli] = await Promise.all([
          fetch("/api/cultures"),
          fetch("/api/classifications?activeOnly=true"),
          fetch("/api/indice-tecnologico"),
          fetch("/api/clientes"),
        ]);

        const lista = async (r: Response) => {
          if (!r.ok) return [];
          const j = await r.json();
          return Array.isArray(j) ? j : j?.data ?? [];
        };

        setSetup({
          culturas: (await lista(cult)).length,
          segmentos: (await lista(clas)).length,
          indices: (await lista(it)).length,
          clientes: (await lista(cli)).length,
        });
      } catch {
        // Sem dados de configuração a tela ainda explica o fluxo; não trava.
        setSetup(null);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  const passos = [
    {
      icon: <Sprout size={16} />,
      titulo: "Cadastrar culturas",
      descricao: "Soja, milho, algodão — o que a sua carteira atende.",
      feito: (setup?.culturas ?? 0) > 0,
      contagem: setup?.culturas,
      href: "/workspace/settings/configuracao",
    },
    {
      icon: <Tags size={16} />,
      titulo: "Cadastrar segmentos",
      descricao: "As linhas de produto que você vende em cada cultura.",
      feito: (setup?.segmentos ?? 0) > 0,
      contagem: setup?.segmentos,
      href: "/workspace/settings/segments",
    },
    {
      icon: <Ruler size={16} />,
      titulo: "Definir o Índice Tecnológico",
      descricao: "Quanto vale, por hectare, cada cultura em cada segmento.",
      feito: (setup?.indices ?? 0) > 0,
      contagem: setup?.indices,
      href: "/workspace/settings/configuracao",
    },
    {
      icon: <Users2 size={16} />,
      titulo: "Cadastrar produtores",
      descricao: "Com as áreas e culturas de cada um.",
      feito: (setup?.clientes ?? 0) > 0,
      contagem: setup?.clientes,
      href: "/workspace/clientes",
    },
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

      {/* Primeiros passos, com estado real do tenant */}
      {setup && (
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
      )}

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
