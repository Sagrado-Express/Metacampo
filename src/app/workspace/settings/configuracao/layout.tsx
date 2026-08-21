"use client";

import Link from "next/link";
import { ChevronLeft, Settings2 } from "lucide-react";

/**
 * Layout compartilhado das sub-rotas de Configurações
 * (/workspace/settings/configuracao/{cultura,grupos-de-produtos,
 * indice-tecnologico,usuarios,estrutura-comercial}).
 *
 * Até 20/08/2026 isso era uma página única com abas internas — virou 5
 * rotas navegáveis pelo submenu "Configuração" da Sidebar (pedido do
 * usuário, 20/08/2026). Cada página cuida da própria busca de dado e do
 * próprio aviso de somente-leitura (a de Usuários já tem o dela).
 */
export default function ConfiguracaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto space-y-6">
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

      {children}
    </div>
  );
}
