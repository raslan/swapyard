import type * as Monaco from "monaco-editor";
import { parseDocument } from "yaml";

import type { LlamaServerFlag } from "@/types/config";

// Mirrors backend/app/services/model_entry.py's parse_allowed_values - both read the
// same llama_server_flags.json description text (e.g. "...allowed values: f32, f16,
// bf16, q8_0, ... (default: f16)"), so a flag's enum options come from one real source
// (the actual llama-server binary's --help output) instead of two hand-copied lists
// that could silently drift apart.
const ALLOWED_VALUES_RE = /allowed values:\s*([^(]+)/i;

/** Extracts the comma-separated "allowed values: ..." list from a flag's description. */
export function parseAllowedValues(description: string): string[] {
  const match = description.match(ALLOWED_VALUES_RE);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** True if `offset` falls inside the *value* of some `models.*.cmd` scalar. */
export function isInsideCmdBlock(content: string, offset: number): boolean {
  const doc = parseDocument(content);
  const models = doc.get("models", true);
  if (!models || typeof (models as { items?: unknown }).items === "undefined") return false;

  for (const pair of (models as { items: { value: unknown }[] }).items) {
    const modelMap = pair.value as { items?: { key: { value: unknown }; value: { range?: [number, number, number] } }[] };
    if (!modelMap?.items) continue;
    for (const modelPair of modelMap.items) {
      if (modelPair.key.value !== "cmd") continue;
      const range = modelPair.value?.range;
      if (range && offset >= range[0] && offset <= range[1]) return true;
    }
  }
  return false;
}

function findFlagAtOffset(content: string, offset: number): string | null {
  const lineStart = content.lastIndexOf("\n", offset - 1) + 1;
  const lineEnd = content.indexOf("\n", offset);
  const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
  const match = line.match(/-{1,2}[\w-]+/);
  return match ? match[0] : null;
}

export function registerCmdFlagProvider(
  monaco: typeof Monaco,
  flags: LlamaServerFlag[],
): { dispose(): void } {
  const flagsByName = new Map<string, LlamaServerFlag>();
  for (const f of flags) {
    flagsByName.set(f.flag, f);
    for (const alias of f.aliases) flagsByName.set(alias, f);
  }

  const hoverDisposable = monaco.languages.registerHoverProvider("yaml", {
    provideHover(model, position) {
      const offset = model.getOffsetAt(position);
      const content = model.getValue();
      if (!isInsideCmdBlock(content, offset)) return null;

      const flagName = findFlagAtOffset(content, offset);
      const flag = flagName ? flagsByName.get(flagName) : undefined;
      if (!flag) return null;

      return {
        contents: [
          { value: `**${flag.flag}**` },
          { value: flag.description + (flag.default ? `\n\ndefault: \`${flag.default}\`` : "") },
          { value: "[llama-server docs](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)" },
        ],
      };
    },
  });

  const completionDisposable = monaco.languages.registerCompletionItemProvider("yaml", {
    triggerCharacters: ["-"],
    provideCompletionItems(model, position) {
      const offset = model.getOffsetAt(position);
      const content = model.getValue();
      if (!isInsideCmdBlock(content, offset)) return { suggestions: [] };

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: flags.map((f) => ({
          label: f.flag,
          kind: monaco.languages.CompletionItemKind.Property,
          insertText: f.flag,
          detail: f.default ? `default: ${f.default}` : undefined,
          documentation: f.description,
          range,
        })),
      };
    },
  });

  return {
    dispose() {
      hoverDisposable.dispose();
      completionDisposable.dispose();
    },
  };
}
