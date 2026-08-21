"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";

interface Member {
  userId: string;
  email: string;
  fullName: string;
  vpmPotencialCentavos?: number;
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

const fmt = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Estrutura Comercial: Regional → Distrital → Território → CTV, com código
 * por Regional/Distrital (ex.: "SP", "SP-1") e nome de Território (ex.:
 * "Oeste"). Substitui a árvore antiga por manager_id (ainda existe no
 * schema, não usada aqui) — pedido do usuário, 20/08/2026, pra cadastrar em
 * formato de planilha e ter código de referência por regional/distrital.
 */
export default function EstruturaComercialPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [linha, setLinha] = useState({
    regionalCodigo: "",
    regionalUserId: "",
    distritalCodigo: "",
    distritalUserId: "",
    territorioNome: "",
    ctvUserId: "",
  });
  const [salvando, setSalvando] = useState(false);

  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["tenant-members"],
    queryFn: async (): Promise<Member[]> => {
      const res = await fetch("/api/tenant/members");
      if (!res.ok) throw new Error("Falha ao buscar membros");
      return res.json();
    },
  });

  const {
    data: tree,
    isLoading: isLoadingTree,
    isError: isErrorTree,
  } = useQuery({
    queryKey: ["estrutura-comercial"],
    queryFn: async (): Promise<Tree> => {
      const res = await fetch("/api/estrutura-comercial");
      if (!res.ok) throw new Error("Falha ao buscar estrutura comercial");
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["estrutura-comercial"] });

  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.userId, m));
    return map;
  }, [members]);

  const nomeDe = (userId: string) => memberById.get(userId)?.fullName || memberById.get(userId)?.email || "—";

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const salvarLinha = async () => {
    const { regionalCodigo, regionalUserId, distritalCodigo, distritalUserId, territorioNome, ctvUserId } = linha;
    if (!regionalCodigo.trim() || !regionalUserId || !distritalCodigo.trim() || !distritalUserId || !territorioNome.trim() || !ctvUserId) {
      toast.error("Preencha código e responsável de cada nível");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/estrutura-comercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionalCodigo: regionalCodigo.trim(),
          regionalUserId,
          distritalCodigo: distritalCodigo.trim(),
          distritalUserId,
          territorioNome: territorioNome.trim(),
          ctvUserId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }
      toast.success("Linha adicionada à estrutura comercial");
      setLinha({ regionalCodigo: "", regionalUserId: "", distritalCodigo: "", distritalUserId: "", territorioNome: "", ctvUserId: "" });
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao salvar linha");
    } finally {
      setSalvando(false);
    }
  };

  const reatribuir = async (nivel: "regional" | "distrital" | "territorio", id: string, userId: string) => {
    try {
      const res = await fetch("/api/estrutura-comercial", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel, id, userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao reatribuir");
      }
      toast.success("Responsável atualizado");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao reatribuir");
    }
  };

  const excluir = async (nivel: "regional" | "distrital" | "territorio", id: string, label: string) => {
    const aviso =
      nivel === "regional"
        ? `Excluir a regional "${label}"? Todos os distritais e territórios dentro dela também serão excluídos.`
        : nivel === "distrital"
          ? `Excluir o distrital "${label}"? Todos os territórios dentro dele também serão excluídos.`
          : `Excluir o território "${label}"?`;
    if (!window.confirm(aviso)) return;
    try {
      const res = await fetch(`/api/estrutura-comercial?nivel=${nivel}&id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir");
      }
      toast.success("Excluído");
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao excluir");
    }
  };

  const isLoading = isLoadingSession || isLoadingMembers || isLoadingTree;
  const isAdmin = sessionData?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
        Carregando estrutura comercial…
      </div>
    );
  }

  const regionais = tree?.regionais || [];
  const distritais = tree?.distritais || [];
  const territorios = tree?.territorios || [];
  const vpmDoCtv = (ctvUserId: string) => Number(memberById.get(ctvUserId)?.vpmPotencialCentavos || 0);
  const vpmDoDistrital = (distritalId: string) =>
    territorios.filter((t) => t.distritalId === distritalId).reduce((s, t) => s + vpmDoCtv(t.ctvUserId), 0);
  const vpmDaRegional = (regionalId: string) =>
    distritais.filter((d) => d.regionalId === regionalId).reduce((s, d) => s + vpmDoDistrital(d.id), 0);

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Somente leitura.</strong> Só administradores podem alterar a estrutura comercial do tenant.
        </div>
      )}
      {isErrorTree && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Conexão com o banco indisponível.</strong> Tente novamente em instantes.
        </div>
      )}

      {/* Cadastro em linha (planilha) */}
      {isAdmin && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
              <MapIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Adicionar linha</h2>
              <p className="text-xs text-muted-foreground">
                Regional e Distrital são identificados pelo código — repetir um código já usado reatribui o responsável em vez de duplicar. Só quem já foi convidado (aba Usuários) aparece nos seletores.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <input
              value={linha.regionalCodigo}
              onChange={(e) => setLinha((p) => ({ ...p, regionalCodigo: e.target.value }))}
              placeholder="Regional (ex: SP)"
              className="px-3 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={linha.regionalUserId}
              onChange={(e) => setLinha((p) => ({ ...p, regionalUserId: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Nome Regional…</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName || m.email}
                </option>
              ))}
            </select>
            <input
              value={linha.distritalCodigo}
              onChange={(e) => setLinha((p) => ({ ...p, distritalCodigo: e.target.value }))}
              placeholder="Distrital (ex: SP-1)"
              className="px-3 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={linha.distritalUserId}
              onChange={(e) => setLinha((p) => ({ ...p, distritalUserId: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Nome Distrital…</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName || m.email}
                </option>
              ))}
            </select>
            <input
              value={linha.territorioNome}
              onChange={(e) => setLinha((p) => ({ ...p, territorioNome: e.target.value }))}
              placeholder="Território (ex: Oeste)"
              className="px-3 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={linha.ctvUserId}
              onChange={(e) => setLinha((p) => ({ ...p, ctvUserId: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Nome CTV…</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName || m.email}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={salvarLinha}
            disabled={salvando}
            className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={14} />
            Adicionar linha
          </button>
        </div>
      )}

      {/* Árvore resultante */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Hierarquia</h2>

        {regionais.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma regional cadastrada ainda — use o formulário acima pra começar.
          </p>
        ) : (
          <div className="space-y-2">
            {regionais.map((regional) => {
              const distritaisDaRegional = distritais.filter((d) => d.regionalId === regional.id);
              const isOpenR = expanded.has(regional.id);
              return (
                <div key={regional.id} className="rounded-xl border border-border/50 bg-white/60">
                  <div className="flex items-center justify-between p-3">
                    <button onClick={() => toggle(regional.id)} className="flex items-center gap-2 flex-1 text-left">
                      {isOpenR ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {regional.codigo}
                      </span>
                      <span className="font-medium text-sm">{nomeDe(regional.userId)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        · {distritaisDaRegional.length} distrital{distritaisDaRegional.length !== 1 && "is"}
                      </span>
                    </button>
                    <span className="text-xs font-black text-emerald-700 mr-3">{fmt(vpmDaRegional(regional.id))}</span>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <select
                          value={regional.userId}
                          onChange={(e) => reatribuir("regional", regional.id, e.target.value)}
                          className="text-[10px] px-1.5 py-1 rounded-lg border border-border/40 bg-white/70"
                          title="Reatribuir responsável"
                        >
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.fullName || m.email}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => excluir("regional", regional.id, regional.codigo)}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors"
                          title="Excluir regional"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isOpenR && (
                    <div className="pl-8 pb-2 space-y-1.5">
                      {distritaisDaRegional.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">Nenhum distrital nesta regional ainda.</p>
                      )}
                      {distritaisDaRegional.map((distrital) => {
                        const territoriosDoDistrital = territorios.filter((t) => t.distritalId === distrital.id);
                        const isOpenD = expanded.has(distrital.id);
                        return (
                          <div key={distrital.id} className="rounded-lg border border-border/30 bg-white/40">
                            <div className="flex items-center justify-between p-2.5">
                              <button onClick={() => toggle(distrital.id)} className="flex items-center gap-2 flex-1 text-left">
                                {isOpenD ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                  {distrital.codigo}
                                </span>
                                <span className="text-sm">{nomeDe(distrital.userId)}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  · {territoriosDoDistrital.length} território{territoriosDoDistrital.length !== 1 && "s"}
                                </span>
                              </button>
                              <span className="text-xs font-bold text-emerald-700 mr-3">{fmt(vpmDoDistrital(distrital.id))}</span>
                              {isAdmin && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={distrital.userId}
                                    onChange={(e) => reatribuir("distrital", distrital.id, e.target.value)}
                                    className="text-[10px] px-1.5 py-1 rounded-lg border border-border/40 bg-white/70"
                                    title="Reatribuir responsável"
                                  >
                                    {members.map((m) => (
                                      <option key={m.userId} value={m.userId}>
                                        {m.fullName || m.email}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => excluir("distrital", distrital.id, distrital.codigo)}
                                    className="text-muted-foreground/50 hover:text-destructive transition-colors"
                                    title="Excluir distrital"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {isOpenD && (
                              <div className="pl-8 pb-2 space-y-1">
                                {territoriosDoDistrital.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-1.5">Nenhum território neste distrital ainda.</p>
                                )}
                                {territoriosDoDistrital.map((territorio) => (
                                  <div key={territorio.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 text-sm">
                                    <span>
                                      <strong className="font-semibold">{territorio.nome}</strong>{" "}
                                      <span className="text-muted-foreground">— {nomeDe(territorio.ctvUserId)}</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-emerald-700">{fmt(vpmDoCtv(territorio.ctvUserId))}</span>
                                      {isAdmin && (
                                        <>
                                          <select
                                            value={territorio.ctvUserId}
                                            onChange={(e) => reatribuir("territorio", territorio.id, e.target.value)}
                                            className="text-[10px] px-1.5 py-1 rounded-lg border border-border/40 bg-white/70"
                                            title="Reatribuir CTV"
                                          >
                                            {members.map((m) => (
                                              <option key={m.userId} value={m.userId}>
                                                {m.fullName || m.email}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => excluir("territorio", territorio.id, territorio.nome)}
                                            className="text-muted-foreground/50 hover:text-destructive transition-colors"
                                            title="Excluir território"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
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
        )}
      </div>
    </div>
  );
}
