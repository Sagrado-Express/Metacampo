import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://placeholder@o0.ingest.sentry.io/0",

  // Performance Monitoring
  tracesSampleRate: 0.1, // Captures 10% of transactions to optimize quotas

  debug: false,
});
