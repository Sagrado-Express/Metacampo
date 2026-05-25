import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "metacampo",
  project: "metacampo-front",
  silent: true,
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
});
