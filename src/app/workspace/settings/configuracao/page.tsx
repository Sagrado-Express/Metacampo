"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Sprout,
  TrendingUp,
  Settings2,
  ChevronLeft,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { SegmentSettings, type ClassificacaoItem, type CulturaItem } from "@/components/admin/SegmentSettings";
import { UserInvites } from "@/components/admin/UserInvites";
import { EstruturaComercial } from "@/components/admin/EstruturaComercial";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import type { TipoCultura } from "@/data/culturas_ibge";
import { ITMatrix } from "@/components/admin/ITMatrix";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";
import { useCultureDictionary } from "@/hooks/useCultureDictionary";
import { useSession } from "@/hooks/useSession";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { cn } from "@/lib/utils";

/**
 * /workspace/settings/configuracao
 *
 * Unified tenant settings page:
 *   - Cultura (catálogo IBGE + dicionário do tenant — unificados numa aba só
 *     a pedido do Marco Polo, 19/08/2026; eram "Culturas" e "Cultivos"
 *     separadas, o que ele achou confuso desde o feedback de 13/08)
 *   - Grupos de Produtos (Product Segments — nome de exibição trocado de
 *     "Classificação" a pedido do Marco Polo, 13/08/2026; internalKey/
 *     tabela/rotas continuam "classificac(oes|ao)" de propósito)
 *   - Índice Tecnológico (matriz R$/ha)
 *
 * Uses existing SegmentSettings component + new ITMatrix.
 * tenantId: resolved dynamically via useSession.
 */

type Tab = "classificacoes" | "cultura" | "it-se" | "usuarios";

// Ordem pedida pelo Marco Polo (13/08/2026): cultura, depois grupo de
// produtos, depois Índice Tecnológico — a matriz do IT cruza cultura x
// grupo de produto, então faz sentido o usuário já ter passado pelos dois
// antes de chegar nela.
//
// "Culturas" (catálogo IBGE) e "Cultivos" (dicionário do tenant) eram duas
// abas separadas até 19/08/2026 — unificadas numa só a pedido do Marco Polo
// (feedback de 13/08 já apontava a nomenclatura como confusa; o texto
// explicativo adicionado em 17/08 não foi suficiente). Ver reunião 19/08.
const TABS: { id: Tab; label: string; icon: LucideIcon; color: string }[] = [
  {
    id: "cultura",
    label: "Cultura",
    icon: Sprout,
    color: "text-green-600",
  },
  {
    id: "classificacoes",
    label: "Grupos de Produtos",
    icon: Layers,
    color: "text-blue-600",
  },
  {
    id: "it-se",
    label: "Índice Tecnológico (R$/ha)",
    icon: TrendingUp,
    color: "text-violet-600",
  },
  {
    id: "usuarios",
    label: "Usuários",
    icon: Users,
    color: "text-amber-600",
  },
];

export default function ConfiguracaoPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";
  const [activeTab, setActiveTab] = useState<Tab>("cultura");
  const [safra, setSafra] = useState("25/26");
  const { labelGrupoProduto, setLabelGrupoProduto } = useTenantSettings();

  const {
    classifications,
    invalidate: invalidateClassifications,
    isLoading: isLoadingClassifications,
    isError: isErrorClassifications,
  } = useSegmentDictionary(tenantId);

  const {
    cultures,
    invalidate: invalidateCultures,
    isLoading: isLoadingCultures,
    isError: isErrorCultures,
  } = useCultureDictionary(tenantId);

  // ============================================================
  // Classification handlers
  // ============================================================

  const handleSaveClassificacao = async (item: ClassificacaoItem) => {
    const response = await fetch("/api/classifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        id: item.id,
        customName: item.customName,
        aliases: item.aliases,
        isActive: item.isActive,
        displayOrder: item.displayOrder,
        color: item.color,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao salvar grupo de produto");
    }
    invalidateClassifications();
  };

  const handlePromoteAlias = async (id: string, alias: string) => {
    const response = await fetch("/api/classifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, promoverAlias: alias }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao trocar o nome");
    }
    invalidateClassifications();
  };

  const handleCreateClassificacao = async (
    customName: string,
    parentKey?: string | null
  ) => {
    const response = await fetch("/api/classifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, customName, parentKey: parentKey || null }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao criar grupo de produto");
    }
    invalidateClassifications();
  };

  const handleDeleteClassificacao = async (id: string) => {
    const response = await fetch(
      `/api/classifications?tenantId=${tenantId}&id=${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao deletar grupo de produto");
    }
    invalidateClassifications();
  };

  // ============================================================
  // Culture handlers
  // ============================================================

  const handleSaveCultura = async (item: CulturaItem) => {
    // Toggle isActive: update the culture's active state without deleting
    const response = await fetch("/api/cultures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        id: item.id,
        customName: item.customName,
        displayOrder: item.displayOrder,
        isActive: item.isActive,
        aliases: item.aliases,
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao salvar cultura");
    }
    invalidateCultures();
  };

  // ── Catálogo IBGE ──────────────────────────────────────────
  // Habilitar reaproveita o registro se a cultura já existiu e foi desligada,
  // em vez de criar outro com o mesmo internal_key (que a unique bloquearia).

  const handleHabilitarDoCatalogo = async (produto: string, tipo: TipoCultura) => {
    const existente = cultures.find((c) => c.ibgeProduto === produto);

    const response = existente
      ? await fetch("/api/cultures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existente.id, isActive: true }),
        })
      : await fetch("/api/cultures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customName: produto, ibgeProduto: produto, ibgeTipo: tipo }),
        });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao habilitar cultura");
    }
    invalidateCultures();
  };

  // Cria um SEGUNDO cultivo apontando pro mesmo produto do catálogo, com nome
  // próprio — não reaproveita registro existente de propósito, é sempre um
  // novo (diferente de handleHabilitarDoCatalogo). Caso de uso pedido pelo
  // Marco Polo (13/08/2026): Milho 1ª safra e Milho 2ª safra/safrinha usam
  // tecnologia muito diferente, mas são o mesmo produto "Milho (em grão)" no
  // IBGE — ver Regra Nº6 do CLAUDE.md.
  const handleAdicionarVariante = async (produto: string, tipo: TipoCultura, customName: string) => {
    const response = await fetch("/api/cultures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, customName, ibgeProduto: produto, ibgeTipo: tipo }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao criar variante");
    }
    invalidateCultures();
  };

  const handleCreateCultura = async (customName: string) => {
    const response = await fetch("/api/cultures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, customName }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao criar cultura");
    }
    invalidateCultures();
  };

  const handleDeleteCultura = async (id: string) => {
    const response = await fetch(
      `/api/cultures?tenantId=${tenantId}&id=${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao deletar cultura");
    }
    invalidateCultures();
  };

  // ============================================================
  // Loading / Error states
  // ============================================================

  const isInitialLoading =
    isLoadingSession ||
    (isLoadingClassifications && !isErrorClassifications) ||
    (isLoadingCultures && !isErrorCultures);

  const hasApiError = isErrorClassifications || isErrorCultures;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
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
            <Settings2 size={20} className="text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Defina suas culturas, grupos de produtos e Índice Tecnológico (R$/ha).
          </p>
        </div>
      </div>

      {/* Aviso de somente-leitura: grupos de produtos/culturas/cultivos/
          Índice Tecnológico passaram a ser admin-only numa auditoria de
          segurança (11/08/2026) — configurar isso afeta o VPM de todos os
          CTVs do tenant. A aba Usuários já mostra o próprio aviso. */}
      {sessionData?.role && sessionData.role !== "admin" && activeTab !== "usuarios" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Somente leitura.</strong> Só administradores podem alterar
          grupos de produtos, culturas e o Índice Tecnológico do tenant.
        </div>
      )}

      {/* API error banner */}
      {hasApiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Conexão com o banco indisponível.</strong> Os dados serão
          salvos localmente até a conexão ser restabelecida.
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl border border-border/40">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              id={`tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              <Icon
                size={15}
                className={isActive ? tab.color : "text-muted-foreground/60"}
              />
              <span className="hidden sm:inline">
                {tab.id === "classificacoes" && labelGrupoProduto ? labelGrupoProduto : tab.label}
              </span>
              <span className="sm:hidden">
                {tab.id === "classificacoes"
                  ? "Grupos"
                  : tab.id === "cultura"
                  ? "Cultura"
                  : tab.id === "usuarios"
                  ? "Users"
                  : "IT"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content
          O loading fica FORA do AnimatePresence de propósito. Antes, o spinner e
          o conteúdo eram dois filhos de um <AnimatePresence mode="wait">: quando
          a animação de saída do spinner não completava, o conteúdo nunca entrava
          e a tela ficava presa em "Carregando configurações…" para sempre, mesmo
          com as requisições respondendo 200. */}
      {isInitialLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
          Carregando configurações…
        </div>
      ) : (
        /* Sem AnimatePresence aqui de propósito.
           Com mode="wait" a troca de aba dependia da animação de saída
           terminar; quando ela não terminava, o conteúdo novo nunca entrava
           e a aba parecia não responder ao clique. Com a key no motion.div,
           o React remonta e a entrada anima sozinha, sem coordenação de saída. */
        <div>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Grupos de Produtos ── */}
            {activeTab === "classificacoes" && (
              <div className="glass-card p-6">
                <SegmentSettings
                  classificacoes={classifications}
                  culturas={cultures}
                  onSaveClassificacao={handleSaveClassificacao}
                  onPromoteAlias={handlePromoteAlias}
                  onCreateClassificacao={handleCreateClassificacao}
                  onDeleteClassificacao={handleDeleteClassificacao}
                  onSaveCultura={handleSaveCultura}
                  onCreateCultura={handleCreateCultura}
                  onDeleteCultura={handleDeleteCultura}
                  labelGrupoProduto={labelGrupoProduto || undefined}
                  onChangeLabelGrupoProduto={async (label) => {
                    await setLabelGrupoProduto(label);
                  }}
                  showOnlyClassifications
                />
              </div>
            )}

            {/* ── Cultura (catálogo IBGE + dicionário do tenant, unificados 19/08/2026) ── */}
            {activeTab === "cultura" && (
              <div className="glass-card p-6">
                <SegmentSettings
                  classificacoes={classifications}
                  culturas={cultures}
                  onSaveClassificacao={handleSaveClassificacao}
                  onPromoteAlias={handlePromoteAlias}
                  onCreateClassificacao={handleCreateClassificacao}
                  onDeleteClassificacao={handleDeleteClassificacao}
                  onSaveCultura={handleSaveCultura}
                  onCreateCultura={handleCreateCultura}
                  onDeleteCultura={handleDeleteCultura}
                  onHabilitarDoCatalogo={handleHabilitarDoCatalogo}
                  onAdicionarVariante={handleAdicionarVariante}
                  showOnlyCulturas
                />
              </div>
            )}

            {/* ── Índice Tecnológico ── */}
            {activeTab === "it-se" && (
              <div className="glass-card p-6">
                <ITMatrix
                  key={safra}
                  culturas={cultures}
                  classificacoes={classifications}
                  safra={safra}
                  onSafraChange={setSafra}
                />
              </div>
            )}

            {/* ── Usuários ── */}
            {activeTab === "usuarios" && (
              <div className="glass-card p-6 space-y-8">
                <UserInvites />
                <div className="border-t border-border/40 pt-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                    Estrutura Comercial
                  </h3>
                  <EstruturaComercial />
                </div>
                <div className="border-t border-border/40 pt-6">
                  <ChangePasswordForm />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
