import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // monaco-editor's package.json "exports" map only defines a bare
      // "./*" -> "./esm/vs/*.js" wildcard. Callers (including monaco-yaml's own
      // monaco-worker-manager dependency, and our own worker setup below) import
      // using the pre-exports-map convention "monaco-editor/esm/vs/...", which
      // the wildcard then double-prefixes into a nonexistent "esm/vs/esm/vs/..."
      // path. This alias resolves those deep imports directly against the
      // filesystem, bypassing the broken wildcard.
      {
        find: /^monaco-editor\/esm\/vs\/(.*)$/,
        replacement: path.resolve(__dirname, "node_modules/monaco-editor/esm/vs/") + "/$1",
      },
      // monaco-themes' package.json "exports" map doesn't list per-theme JSON
      // files at all, so deep imports of them need the same filesystem bypass.
      {
        find: /^monaco-themes\/themes\/(.*)\.json$/,
        replacement: path.resolve(__dirname, "node_modules/monaco-themes/themes/") + "/$1.json",
      },
    ],
  },
  // Vite's dev-time dependency pre-bundler mishandles the `?worker` imports
  // above (produces a chunk with no default export); excluding these from
  // pre-bundling avoids it. Doesn't affect the production build.
  optimizeDeps: {
    exclude: ["monaco-editor", "monaco-yaml"],
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
