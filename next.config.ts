import { withSentryConfig } from "@sentry/nextjs";
import path from "path";

const nextConfig = {
  turbopack: {},
  eslint: {
    ignoreDuringBuilds: true,
  },
} as any;

export default withSentryConfig(nextConfig, {
  org: "metacampo",
  project: "metacampo-front",
  silent: true,
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
} as any);
