import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Orval output — do not lint generated HTTP client
    "src/lib/api/generated/**"
  ]),
  {
    files: [
      "src/app/dashboard/check-in/check-in-page-inner.tsx",
      "src/components/check-in-detail-modal.tsx",
      "src/components/selfie-capture.tsx"
    ],
    rules: {
      // Data URLs from canvas / API are not suited to next/image without a custom loader.
      "@next/next/no-img-element": "off"
    }
  },
  {
    files: ["src/app/ops/activations/activation-detail-view.tsx"],
    rules: {
      // Reset local form state when activation id or loaded detail changes (intentional sync).
      "react-hooks/set-state-in-effect": "off"
    }
  }
]);

export default eslintConfig;
