import { spawnSync } from "node:child_process";

import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? "";
const gitStdout = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout;
const gitHead = typeof gitStdout === "string" ? gitStdout.trim() : "";
const revision =
  vercelSha.length > 0 ? vercelSha : gitHead.length > 0 ? gitHead : `build-${String(Date.now())}`;

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  /** Avoid service worker caching surprises during local development. */
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }]
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
