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
