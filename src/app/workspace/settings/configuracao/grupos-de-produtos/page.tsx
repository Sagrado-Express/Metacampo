"use client";

import { SegmentSettings, type ClassificacaoItem } from "@/components/admin/SegmentSettings";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";
import { useSession } from "@/hooks/useSession";
import { useTenantSettings } from "@/hooks/useTenantSettings";

export default function GruposDeProdutosPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  // String vazia, não um UUID placeholder: com "enabled: !!tenantId" no
  // hook de dicionário, isso bloqueia o fetch até a sessão real resolver
  // em vez de disparar 2x (achado em auditoria de performance 31/08/2026).
  const tenantId = sessionData?.tenantId || "";
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
    // Skeleton no formato real das linhas — mesmo padrão de Usuários/Convites
    // e Cultura, em vez de spinner central (sugestão de UX, 05/09/2026).
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="h-5 w-40 rounded bg-muted/60 animate-pulse mb-2" />
          <div className="h-3.5 w-full max-w-md rounded bg-muted/40 animate-pulse mb-6" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-white/40 animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="size-3.5 rounded bg-muted/50" />
                  <span className="size-4 rounded-full bg-muted/50" />
                  <div className="h-4 w-32 rounded bg-muted/60" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 rounded bg-muted/40" />
                  <span className="size-5 rounded-full bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
