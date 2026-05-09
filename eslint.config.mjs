import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**", "**/src/generated/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs", "*.cjs", "apps/api/prisma.config.ts"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-floating-promises": "error"
    }
  },
  {
    files: ["**/*.module.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off"
    }
  },
  {
    files: ["apps/api/prisma.config.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-useless-default-assignment": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off"
    }
  },
  {
    files: ["apps/web/src/lib/api/generated/**/*.ts"],
    rules: {
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-misused-spread": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/unified-signatures": "off"
    }
  }
);
