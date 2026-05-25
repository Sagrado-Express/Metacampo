import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://placeholder@o0.ingest.sentry.io/0",

  // Performance Monitoring
  tracesSampleRate: 0.1, // Captures 10% of transactions in production to optimize quotas

  // Session Replay
  replaysSessionSampleRate: 0.1, // Replay sample rate
  replaysOnErrorSampleRate: 1.0, // Replays 100% of sessions with errors

  debug: false,
});
