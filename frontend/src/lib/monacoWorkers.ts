import { loader } from "@monaco-editor/react";
// Narrow imports (not the "monaco-editor" package root) to avoid every bundled
// language spamming worker errors - editor.api (base), editor.all (contributions:
// hover/suggest/etc), and just the yaml language. monaco-editor pinned at exactly
// 0.52.2, not latest - see HISTORY.md for both.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/editor.all";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import type * as Monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { configureMonacoYaml } from "monaco-yaml";
import YamlWorker from "@/workers/yaml.worker?worker";

let configured = false;

export function setupMonacoEnvironment(): void {
  if (configured) return;
  configured = true;
  self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === "yaml") return new YamlWorker();
      if (label === "json") return new JsonWorker();
      return new EditorWorker();
    },
  };
  // Without this, @monaco-editor/react's <Editor> loads monaco-editor from a
  // CDN by default, ignoring the locally bundled instance the workers/theme/
  // schema setup above targets - causing worker RPC version mismatches and
  // themes silently failing to apply.
  loader.config({ monaco });
}

export function configureYamlSchema(monaco: typeof Monaco, schema: object): void {
  configureMonacoYaml(monaco, {
    enableSchemaRequest: false,
    schemas: [
      {
        uri: "inmemory://llama-swap-config-schema.json",
        fileMatch: ["*"],
        schema,
      },
    ],
  });
}
