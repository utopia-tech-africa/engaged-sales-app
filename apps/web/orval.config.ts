import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: process.env.ORVAL_OPENAPI_URL ?? "../api/openapi/openapi.json",
    output: {
      target: "src/lib/api/generated/client.ts",
      schemas: "src/lib/api/generated/model",
      client: "react-query",
      mode: "split",
      override: {
        mutator: {
          path: "src/lib/api/generated/orval-fetcher.ts",
          name: "orvalFetcher"
        }
      }
    }
  }
});
