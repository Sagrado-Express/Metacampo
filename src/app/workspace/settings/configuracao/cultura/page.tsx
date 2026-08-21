"use client";

import { SegmentSettings, type CulturaItem } from "@/components/admin/SegmentSettings";
import type { TipoCultura } from "@/data/culturas_ibge";
import { useCultureDictionary } from "@/hooks/useCultureDictionary";
import { useSession } from "@/hooks/useSession";

export default function CulturaPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";

  const { cultures, invalidate: invalidateCultures, isLoading, isError } = useCultureDictionary(tenantId);

  const handleSaveCultura = async (item: CulturaItem) => {
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

  // Segundo cultivo apontando pro mesmo produto do catálogo, com nome
  // próprio — caso de Milho safra vs. Milho safrinha (Regra Nº6 do CLAUDE.md).
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
    const response = await fetch(`/api/cultures?tenantId=${tenantId}&id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao deletar cultura");
    }
    invalidateCultures();
  };

  if (isLoadingSession || (isLoading && !isError)) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
        Carregando culturas…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessionData?.role && sessionData.role !== "admin" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Somente leitura.</strong> Só administradores podem alterar as culturas do tenant.
        </div>
      )}
      {isError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Conexão com o banco indisponível.</strong> Os dados serão salvos localmente até a conexão ser restabelecida.
        </div>
      )}
      <div className="glass-card p-6">
        <SegmentSettings
          classificacoes={[]}
          culturas={cultures}
          onSaveClassificacao={async () => {}}
          onPromoteAlias={async () => {}}
          onCreateClassificacao={async () => {}}
          onDeleteClassificacao={async () => {}}
          onSaveCultura={handleSaveCultura}
          onCreateCultura={handleCreateCultura}
          onDeleteCultura={handleDeleteCultura}
          onHabilitarDoCatalogo={handleHabilitarDoCatalogo}
          onAdicionarVariante={handleAdicionarVariante}
          showOnlyCulturas
        />
      </div>
    </div>
  );
}
