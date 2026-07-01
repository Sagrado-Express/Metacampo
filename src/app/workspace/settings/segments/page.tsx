"use client";

import React from "react";
import { SegmentSettings } from "@/components/admin/SegmentSettings";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";
import { useCultureDictionary } from "@/hooks/useCultureDictionary";

/**
 * /workspace/settings/segments
 * 
 * Tenant Parametrization Page — Passo 0 do MVP
 * Acessível apenas por ADMIN e GESTOR.
 * 
 * Aqui o tenant configura:
 * - Quais culturas trabalha
 * - Classificação e subclassificação de produtos
 * - Nomes customizados, aliases para ERP, cores dos gráficos
 */
export default function SettingsSegmentsPage() {
  // TODO: Replace with real tenant context from auth
  const tenantId = "00000000-0000-0000-0000-000000000000";

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

  const handleSaveClassificacao = async (item: any) => {
    try {
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido");
      }

      invalidateClassifications();
    } catch (err: any) {
      console.error("Erro ao salvar classificação:", err);
      alert(`Erro ao salvar classificação: ${err.message}`);
    }
  };

  const handleCreateClassificacao = async (customName: string, parentKey?: string | null) => {
    try {
      const response = await fetch("/api/classifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          customName,
          parentKey: parentKey || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido");
      }

      invalidateClassifications();
    } catch (err: any) {
      console.error("Erro ao criar classificação:", err);
      alert(`Erro ao criar classificação: ${err.message}`);
    }
  };

  const handleDeleteClassificacao = async (id: string) => {
    try {
      const response = await fetch(`/api/classifications?tenantId=${tenantId}&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido");
      }

      invalidateClassifications();
    } catch (err: any) {
      console.error("Erro ao deletar classificação:", err);
      alert(`Erro ao deletar classificação: ${err.message}`);
    }
  };

  const handleSaveCultura = async (item: any) => {
    // Soft-deleting via toggle is done via DELETE in our simple api handler if we want to deactivate it
    try {
      if (item.isActive === false) {
        await handleDeleteCultura(item.id);
      } else {
        // Simple culture save or reactivate if needed (using POST as reactivation/creation)
        const response = await fetch("/api/cultures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            customName: item.customName,
            displayOrder: item.displayOrder,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro desconhecido");
        }

        invalidateCultures();
      }
    } catch (err: any) {
      console.error("Erro ao salvar cultura:", err);
      alert(`Erro ao salvar cultura: ${err.message}`);
    }
  };

  const handleCreateCultura = async (customName: string) => {
    try {
      const response = await fetch("/api/cultures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          customName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido");
      }

      invalidateCultures();
    } catch (err: any) {
      console.error("Erro ao criar cultura:", err);
      alert(`Erro ao criar cultura: ${err.message}`);
    }
  };

  const handleDeleteCultura = async (id: string) => {
    try {
      const response = await fetch(`/api/cultures?tenantId=${tenantId}&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro desconhecido");
      }

      invalidateCultures();
    } catch (err: any) {
      console.error("Erro ao deletar cultura:", err);
      alert(`Erro ao deletar cultura: ${err.message}`);
    }
  };

  const isInitialLoading = (isLoadingClassifications && !isErrorClassifications) || 
                           (isLoadingCultures && !isErrorCultures);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm font-medium text-muted-foreground animate-pulse">
          Carregando configurações...
        </div>
      </div>
    );
  }

  const hasApiError = isErrorClassifications || isErrorCultures;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      {hasApiError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Conexão com o banco indisponível.</strong> Verifique se a migration SQL foi executada no Supabase 
          e se as variáveis de ambiente estão configuradas. Você pode iniciar a configuração abaixo — os dados serão 
          salvos quando a conexão for restabelecida.
        </div>
      )}
      <SegmentSettings
        tenantId={tenantId}
        classificacoes={classifications}
        culturas={cultures}
        onSaveClassificacao={handleSaveClassificacao}
        onCreateClassificacao={handleCreateClassificacao}
        onDeleteClassificacao={handleDeleteClassificacao}
        onSaveCultura={handleSaveCultura}
        onCreateCultura={handleCreateCultura}
        onDeleteCultura={handleDeleteCultura}
      />
    </div>
  );
}

