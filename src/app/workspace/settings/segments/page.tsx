"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsSegmentsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace/settings/configuracao");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground animate-pulse">
      Redirecionando para as configurações...
    </div>
  );
}
