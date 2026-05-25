import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  /* config options here */
  turbopack: {}, // Silences strict Turbopack vs Webpack config block in Next.js 16
} as any;

export default withSentryConfig(nextConfig, {
  org: "metacampo",
  project: "metacampo-front",
  silent: true,
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
} as any);
