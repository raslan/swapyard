import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    // Playwright's e2e/*.spec.ts files use their own `test()`/`expect()` from
    // @playwright/test; Vitest's default include glob (**/*.spec.ts) would
    // otherwise pick them up and crash trying to run them as unit tests.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
