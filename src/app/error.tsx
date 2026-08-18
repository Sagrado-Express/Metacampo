"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen p-6 md:p-10 flex items-center justify-center">
      <div className="glass-card p-8 text-center space-y-3 max-w-md">
        <AlertTriangle className="mx-auto text-red-500" size={32} />
        <h1 className="text-lg font-bold text-slate-800">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          A tela não conseguiu carregar. O erro já foi registrado — tenta de novo, ou volta pro início.
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={14} /> Tentar de novo
          </button>
          <Link
            href="/workspace"
            className="text-sm text-emerald-700 font-semibold underline"
          >
            Voltar pro início
          </Link>
        </div>
      </div>
    </div>
  );
}
