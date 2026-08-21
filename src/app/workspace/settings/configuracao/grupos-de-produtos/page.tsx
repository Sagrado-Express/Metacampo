"use client";

import { SegmentSettings, type ClassificacaoItem } from "@/components/admin/SegmentSettings";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";
import { useSession } from "@/hooks/useSession";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function GruposDeProdutosPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const tenantId = sessionData?.tenantId || "00000000-0000-0000-0000-000000000000";
  const { labelGrupoProduto, setLabelGrupoProduto } = useTenantSettings();

  const { classifications, invalidate: invalidateClassifications, isLoading, isError } = useSegmentDictionary(tenantId);

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

  const handleCreateClassificacao = async (customName: string, parentKey?: string | null) => {
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
    const response = await fetch(`/api/classifications?tenantId=${tenantId}&id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao deletar grupo de produto");
    }
    invalidateClassifications();
  };

  if (isLoadingSession || (isLoading && !isError)) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
        Carregando grupos de produtos…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessionData?.role && sessionData.role !== "admin" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Somente leitura.</strong> Só administradores podem alterar os grupos de produtos do tenant.
        </div>
      )}
      {isError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Conexão com o banco indisponível.</strong> Os dados serão salvos localmente até a conexão ser restabelecida.
        </div>
      )}
      <div className="glass-card p-6">
        <SegmentSettings
          classificacoes={classifications}
          onSaveClassificacao={handleSaveClassificacao}
          onPromoteAlias={handlePromoteAlias}
          onCreateClassificacao={handleCreateClassificacao}
          onDeleteClassificacao={handleDeleteClassificacao}
          onSaveCultura={async () => {}}
          onCreateCultura={async () => {}}
          onDeleteCultura={async () => {}}
          labelGrupoProduto={labelGrupoProduto || undefined}
          onChangeLabelGrupoProduto={async (label) => {
            await setLabelGrupoProduto(label);
          }}
          showOnlyClassifications
        />
      </div>
    </div>
  );
}
