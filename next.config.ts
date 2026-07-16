import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withSentryConfig(nextConfig, {
  org: "metacampo",
  project: "metacampo-front",
  silent: true,
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
});
