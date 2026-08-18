import * as Sentry from "@sentry/nextjs";

// Substitui sentry.client.config.ts — sob Turbopack, o Next não importa
// mais aquele arquivo automaticamente (achado em auditoria 18/08/2026: o
// próprio build avisava que o SDK de browser não carregava). Esse arquivo
// é importado automaticamente pelo Next independente de bundler.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://placeholder@o0.ingest.sentry.io/0",

  // Performance Monitoring
  tracesSampleRate: 0.1, // Captures 10% of transactions in production to optimize quotas

  // Session Replay
  replaysSessionSampleRate: 0.1, // Replay sample rate
  replaysOnErrorSampleRate: 1.0, // Replays 100% of sessions with errors

  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
