import type * as Monaco from "monaco-editor";
import draculaTheme from "monaco-themes/themes/Dracula.json";
import githubDarkTheme from "monaco-themes/themes/GitHub Dark.json";
import monokaiTheme from "monaco-themes/themes/Monokai.json";
import nordTheme from "monaco-themes/themes/Nord.json";
import solarizedDarkTheme from "monaco-themes/themes/Solarized-dark.json";

export const SWAPYARD_THEME_ID = "swapyard-dark";

export const THEME_OPTIONS: { id: string; label: string }[] = [
  { id: SWAPYARD_THEME_ID, label: "Swapyard" },
  { id: "dracula", label: "Dracula" },
  { id: "monokai", label: "Monokai" },
  { id: "nord", label: "Nord" },
  { id: "github-dark", label: "GitHub Dark" },
  { id: "solarized-dark", label: "Solarized Dark" },
];

let registered = false;

export function registerMonacoThemes(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.editor.defineTheme(SWAPYARD_THEME_ID, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "585870", fontStyle: "italic" },
      { token: "string", foreground: "22d3ee" },
      { token: "keyword", foreground: "8b5cf6" },
      { token: "number", foreground: "34d399" },
    ],
    colors: {
      "editor.background": "#050505",
      "editor.foreground": "#e8e8f0",
      "editorLineNumber.foreground": "#585870",
      "editor.selectionBackground": "#22d3ee33",
      "editor.lineHighlightBackground": "#ffffff08",
    },
  });

  monaco.editor.defineTheme("dracula", draculaTheme as Monaco.editor.IStandaloneThemeData);
  monaco.editor.defineTheme("monokai", monokaiTheme as Monaco.editor.IStandaloneThemeData);
  monaco.editor.defineTheme("nord", nordTheme as Monaco.editor.IStandaloneThemeData);
  monaco.editor.defineTheme("github-dark", githubDarkTheme as Monaco.editor.IStandaloneThemeData);
  monaco.editor.defineTheme(
    "solarized-dark",
    solarizedDarkTheme as Monaco.editor.IStandaloneThemeData,
  );
}
