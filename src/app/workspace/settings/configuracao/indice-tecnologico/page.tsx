"use client";

import { useState } from "react";
import { ITMatrix } from "@/components/admin/ITMatrix";
import { useSegmentDictionary } from "@/hooks/useSegmentDictionary";
import { useCultureDictionary } from "@/hooks/useCultureDictionary";
import { useSession } from "@/hooks/useSession";

export default function IndiceTecnologicoPage() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  // String vazia, não um UUID placeholder: com "enabled: !!tenantId" nos
  // hooks de dicionário, isso bloqueia o fetch até a sessão real resolver
  // em vez de disparar 2x (achado em auditoria de performance 31/08/2026).
  const tenantId = sessionData?.tenantId || "";
  const [safra, setSafra] = useState("25/26");

  const { classifications, isLoading: isLoadingClassifications, isError: isErrorClassifications } = useSegmentDictionary(tenantId);
  const { cultures, isLoading: isLoadingCultures, isError: isErrorCultures } = useCultureDictionary(tenantId);

  const isLoading = isLoadingSession || (isLoadingClassifications && !isErrorClassifications) || (isLoadingCultures && !isErrorCultures);
  const hasApiError = isErrorClassifications || isErrorCultures;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
        Carregando Índice Tecnológico…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessionData?.role && sessionData.role !== "admin" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Somente leitura.</strong> Só administradores podem alterar o Índice Tecnológico do tenant.
        </div>
      )}
      {hasApiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>⚠ Conexão com o banco indisponível.</strong> Os dados serão salvos localmente até a conexão ser restabelecida.
        </div>
      )}
      <div className="glass-card p-6">
        {/* Sem `key={safra}` (removido 03/09/2026): remontar a cada troca de
            safra descartava silenciosamente edições não salvas — o usuário
            zerava uma célula, trocava de safra pra mexer em outra, e a
            primeira edição sumia sem aviso. Agora o componente persiste
            entre safras (o próprio ITMatrix isola o estado por chave
            safra+cultivo+segmento) e ele pode revisar/salvar edições de
            mais de uma safra de uma vez, com aviso de pendência cruzada. */}
        <ITMatrix culturas={cultures} classificacoes={classifications} safra={safra} onSafraChange={setSafra} />
      </div>
    </div>
  );
}
