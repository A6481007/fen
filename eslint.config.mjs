import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const lintFiles = [
  "app/**/*.{js,jsx,ts,tsx}",
  "components/**/*.{js,jsx,ts,tsx}",
  "hooks/**/*.{js,jsx,ts,tsx}",
  "lib/**/*.{js,jsx,ts,tsx}",
  "store.ts",
];

export default [
  {
    ignores: [
      "node_modules",
      ".next",
      ".tmp",
      ".sanity",
      "actions",
      "code-backups",
      "1. News Hub",
      "2. Catalog Hub & News Update",
      "3. Order and Quotation",
      "Promotion",
      "news-hub-backups",
      "__tests__",
      "**/__tests__/**",
      "coverage",
      "public/sw.js",
      "sanity",
      "sanity/schemaTypes",
      "sanity.config.ts",
      "scripts",
    ],
  },
  {
    ...js.configs.recommended,
    files: lintFiles,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: lintFiles,
  })),
  {
    files: lintFiles,
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
    settings: {
      next: {
        rootDir: ".",
      },
    },
  },
];
