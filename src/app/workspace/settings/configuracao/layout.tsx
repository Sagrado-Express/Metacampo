"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Settings2, ListChecks, ChevronUp, ChevronDown } from "lucide-react";
import { PrimeirosPassos } from "@/components/PrimeirosPassos";
import { useSession } from "@/hooks/useSession";

/**
 * Layout compartilhado das sub-rotas de Configurações
 * (/workspace/settings/configuracao/{cultura,grupos-de-produtos,
 * indice-tecnologico,usuarios,estrutura-comercial}).
 *
 * Até 20/08/2026 isso era uma página única com abas internas — virou 5
 * rotas navegáveis pelo submenu "Configuração" da Sidebar (pedido do
 * usuário, 20/08/2026). Cada página cuida da própria busca de dado e do
 * próprio aviso de somente-leitura (a de Usuários já tem o dela).
 *
 * "Primeiros passos" (03/09/2026): até então só existia na tela Início e
 * sumia de vista assim que o usuário saía dela — pedido do Marco Polo pra
 * conseguir reabrir esse checklist depois, sem precisar voltar pra Início.
 */
export default function ConfiguracaoLayout({ children }: { children: React.ReactNode }) {
  const [showPrimeirosPassos, setShowPrimeirosPassos] = useState(false);
  // PrimeirosPassos só renderiza pra admin (mesmas ações — cadastrar
  // cultura, segmento etc. — são admin-only). Sem checar aqui, um não-admin
  // via um botão que, ao clicar, "não faz nada" (o componente já barra
  // internamente, mas o botão continuava aparecendo pra todo mundo).
  const { data: sessionData } = useSession();
  const isAdmin = sessionData?.role === "admin";

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
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
              Culturas, grupos de produtos, Índice Tecnológico, usuários e estrutura comercial do seu tenant.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowPrimeirosPassos((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all shrink-0"
          >
            <ListChecks size={14} />
            Primeiros passos
            {showPrimeirosPassos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {isAdmin && showPrimeirosPassos && <PrimeirosPassos />}

      {children}
    </div>
  );
}
