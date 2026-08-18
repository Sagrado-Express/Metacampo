"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Só dispara se o próprio layout raiz (providers, Sidebar) quebrar — error.tsx
// cobre o resto. Precisa renderizar <html>/<body> porque substitui o layout
// inteiro; por isso não reusa AppWrapper nem classes que dependam dele.
export default function GlobalError({
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
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 420,
            padding: "2rem",
            background: "#fff",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>
            O MetaCampo não conseguiu carregar
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1.25rem" }}>
            O erro já foi registrado. Tenta recarregar a página.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "0.75rem",
              background: "#059669",
              color: "#fff",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
