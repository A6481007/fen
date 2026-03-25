import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      { find: "@/lib/firebaseAdmin", replacement: path.resolve(__dirname, "__mocks__/firebaseAdmin.ts") },
      { find: "../firebaseAdmin", replacement: path.resolve(__dirname, "__mocks__/firebaseAdmin.ts") },
      { find: "server-only", replacement: path.resolve(__dirname, "__mocks__/server-only.ts") },
      { find: "next-auth/react", replacement: path.resolve(__dirname, "__mocks__/next-auth/react.ts") },
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
});
