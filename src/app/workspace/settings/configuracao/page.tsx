"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /workspace/settings/configuracao virou um índice que redireciona pro
 * primeiro submenu ("Cultura") — a página com abas internas foi quebrada em
 * 5 sub-rotas navegáveis pela Sidebar (20/08/2026, ver layout.tsx).
 */
export default function ConfiguracaoIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace/settings/configuracao/cultura");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">
      Redirecionando...
    </div>
  );
}
