import { loader } from "@monaco-editor/react";
// The bare "monaco-editor" package root eagerly registers every bundled
// language (JSON, TypeScript, CSS, HTML, ...), each expecting its own worker -
// our getWorker below only implements "yaml", so those languages spam
// "Missing requestHandler" console errors and bloat the bundle. This narrower
// import brings in only the base editor, which is all this app's YAML-only
// editor needs.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
// editor.api alone registers no languages at all - not even syntax
// highlighting. This side-effect import registers the YAML language +
// monarch tokenizer (the narrow per-language equivalent of what the full
// "monaco-editor" package root would pull in for every bundled language).
import "monaco-editor/esm/vs/languages/definitions/yaml/register";
import type * as Monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { configureMonacoYaml } from "monaco-yaml";
import YamlWorker from "@/workers/yaml.worker?worker";

let configured = false;

export function setupMonacoEnvironment(): void {
  if (configured) return;
  configured = true;
  self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === "yaml") return new YamlWorker();
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
