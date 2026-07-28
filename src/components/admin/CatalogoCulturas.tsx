"use client";

import React, { useMemo, useState } from "react";
import { Search, Check, Loader2, Tag, X, Sprout, TreePine } from "lucide-react";
import { CATALOGO_IBGE, TOTAL_TEMPORARIAS, TOTAL_PERMANENTES, type TipoCultura } from "@/data/culturas_ibge";
import { toast } from "@/lib/toast";

/**
 * Catálogo de culturas do IBGE.
 *
 * O tenant liga/desliga o que atende e pode dar um apelido — o nome oficial é
 * longo ("Algodão herbáceo (em caroço)") e ninguém fala assim no campo.
 *
 * O catálogo não limita: culturas próprias como "HF" ou "Milho safrinha"
 * continuam sendo criadas na aba Cultivos e aparecem aqui como "fora do
 * catálogo", para o usuário ver tudo o que tem num lugar só.
 */

interface CulturaTenant {
  id: string;
  customName: string;
  aliases: string[];
  ibgeProduto: string | null;
  isActive: boolean;
}

interface Props {
  culturas: CulturaTenant[];
  onHabilitar: (produto: string, tipo: TipoCultura) => Promise<void>;
  onDesabilitar: (id: string) => Promise<void>;
  onDefinirApelido: (id: string, apelido: string) => Promise<void>;
}

export function CatalogoCulturas({ culturas, onHabilitar, onDesabilitar, onDefinirApelido }: Props) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todas" | TipoCultura | "ativas">("todas");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [editandoApelido, setEditandoApelido] = useState<string | null>(null);
  const [rascunhoApelido, setRascunhoApelido] = useState("");

  // Mapa produto IBGE -> cultura do tenant. Mais de uma cultura pode apontar
  // para o mesmo produto (Milho safra e Milho safrinha), então guardamos lista.
  const porProduto = useMemo(() => {
    const m = new Map<string, CulturaTenant[]>();
    culturas.forEach((c) => {
      if (!c.ibgeProduto) return;
      const lista = m.get(c.ibgeProduto) || [];
      lista.push(c);
      m.set(c.ibgeProduto, lista);
    });
    return m;
  }, [culturas]);

  const foraDoCatalogo = useMemo(
    () => culturas.filter((c) => !c.ibgeProduto),
    [culturas]
  );

  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return CATALOGO_IBGE.filter((p) => {
      if (q && !normalizar(p.nome).includes(q)) return false;
      if (filtro === "temporaria" || filtro === "permanente") return p.tipo === filtro;
      if (filtro === "ativas") return (porProduto.get(p.nome) || []).some((c) => c.isActive);
      return true;
    });
  }, [busca, filtro, porProduto]);

  const totalAtivas = culturas.filter((c) => c.isActive).length;

  const acao = async (chave: string, fn: () => Promise<void>, msg: string) => {
    setOcupado(chave);
    try {
      await fn();
      toast.success(msg);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar");
    } finally {
      setOcupado(null);
    }
  };

  const salvarApelido = async (c: CulturaTenant) => {
    const apelido = rascunhoApelido.trim();
    setEditandoApelido(null);
    setRascunhoApelido("");
    if (!apelido || c.aliases.includes(apelido)) return;
    await acao(c.id, () => onDefinirApelido(c.id, apelido), "Apelido salvo");
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <p className="text-sm text-muted-foreground">
          Catálogo do IBGE com {TOTAL_TEMPORARIAS} culturas temporárias e {TOTAL_PERMANENTES}{" "}
          permanentes. Habilite as que a sua carteira atende e, se quiser, dê um apelido —
          o nome oficial costuma ser longo demais para o dia a dia.
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          O catálogo não limita: culturas próprias como <strong>HF</strong> ou{" "}
          <strong>Milho safrinha</strong> continuam sendo criadas na aba Cultivos.
        </p>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cultura..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/40 bg-white/60 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
        {(
          [
            ["todas", "Todas"],
            ["temporaria", "Temporárias"],
            ["permanente", "Permanentes"],
            ["ativas", `Habilitadas (${totalAtivas})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFiltro(id as any)}
            className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors ${
              filtro === id
                ? "bg-emerald-600 text-white"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista do catálogo */}
      <div className="border border-border/40 rounded-2xl divide-y divide-border/30 overflow-hidden">
        {visiveis.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Nenhuma cultura encontrada para esse filtro.
          </p>
        )}

        {visiveis.map((produto) => {
          const vinculadas = porProduto.get(produto.nome) || [];
          const ativa = vinculadas.find((c) => c.isActive);
          const inativa = vinculadas.find((c) => !c.isActive);
          const registro = ativa || inativa;
          const carregando = ocupado === (registro?.id ?? produto.nome);

          return (
            <div
              key={produto.nome}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                ativa ? "bg-emerald-50/40" : "hover:bg-muted/10"
              }`}
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground/50" title={produto.tipo === "temporaria" ? "Temporária" : "Permanente"}>
                {produto.tipo === "temporaria" ? <Sprout size={14} /> : <TreePine size={14} />}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{produto.nome}</p>

                {/* Apelidos do registro habilitado */}
                {ativa && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {ativa.aliases.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-[10px]"
                      >
                        <Tag size={9} />
                        {a}
                      </span>
                    ))}

                    {editandoApelido === ativa.id ? (
                      <input
                        autoFocus
                        value={rascunhoApelido}
                        onChange={(e) => setRascunhoApelido(e.target.value)}
                        onBlur={() => salvarApelido(ativa)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") salvarApelido(ativa);
                          if (e.key === "Escape") {
                            setEditandoApelido(null);
                            setRascunhoApelido("");
                          }
                        }}
                        placeholder="apelido"
                        className="px-2 py-0.5 rounded-full border border-emerald-300 text-[10px] w-28 focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoApelido(ativa.id);
                          setRascunhoApelido("");
                        }}
                        className="text-[10px] text-emerald-700 hover:underline font-semibold"
                      >
                        + apelido
                      </button>
                    )}
                  </div>
                )}

                {/* Mais de um registro para o mesmo produto (Milho safra/safrinha) */}
                {vinculadas.filter((c) => c.isActive).length > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {vinculadas.filter((c) => c.isActive).map((c) => c.customName).join(" · ")}
                  </p>
                )}
              </div>

              {/* Ação */}
              <button
                disabled={carregando}
                onClick={() =>
                  ativa
                    ? acao(ativa.id, () => onDesabilitar(ativa.id), `${produto.nome} desabilitada`)
                    : acao(
                        registro?.id ?? produto.nome,
                        () => onHabilitar(produto.nome, produto.tipo),
                        `${produto.nome} habilitada`
                      )
                }
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${
                  ativa
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {carregando ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : ativa ? (
                  <Check size={11} />
                ) : null}
                {ativa ? "habilitada" : "habilitar"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Culturas próprias, fora do catálogo */}
      {foraDoCatalogo.length > 0 && (
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Culturas próprias (fora do catálogo)
          </h3>
          <div className="flex flex-wrap gap-2">
            {foraDoCatalogo.map((c) => (
              <span
                key={c.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ${
                  c.isActive ? "bg-emerald-50 text-emerald-800" : "bg-muted/30 text-muted-foreground line-through"
                }`}
              >
                {c.customName}
                {c.aliases.length > 0 && (
                  <span className="opacity-60">({c.aliases.join(", ")})</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Criadas na aba Cultivos, sem correspondência no catálogo — é o caso de
            agrupamentos como HF. Já desdobramentos de um mesmo produto, como Milho
            safra e Milho safrinha, aparecem acima, sob o item de origem.
          </p>
        </div>
      )}
    </div>
  );
}
