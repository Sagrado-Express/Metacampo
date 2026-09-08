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
    // Skeleton no formato real da matriz — mesmo padrão de Usuários/Convites,
    // Cultura e Grupos de Produtos, em vez de spinner central (sugestão de
    // UX, 05/09/2026).
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6 animate-pulse">
            <div className="size-9 rounded-xl bg-muted/50" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-muted/60" />
              <div className="h-3 w-56 rounded bg-muted/40" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/40 overflow-hidden animate-pulse">
            <div className="flex gap-3 p-3 bg-muted/20 border-b border-border/30">
              <div className="h-3.5 flex-1 max-w-[140px] rounded bg-muted/50" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-3.5 flex-1 rounded bg-muted/50" />
              ))}
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3 p-3 border-b border-border/20 last:border-0">
                <div className="h-7 flex-1 max-w-[140px] rounded-lg bg-muted/40" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-7 flex-1 rounded-lg bg-muted/30" />
                ))}
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
