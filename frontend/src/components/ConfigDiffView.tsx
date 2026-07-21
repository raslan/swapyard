import { DiffEditor } from "@monaco-editor/react";
import { useEffect } from "react";

import { setupMonacoEnvironment } from "@/lib/monacoWorkers";

interface ConfigDiffViewProps {
  original: string;
  modified: string;
  originalLabel: string;
  modifiedLabel: string;
}

export function ConfigDiffView({ original, modified, originalLabel, modifiedLabel }: ConfigDiffViewProps) {
  useEffect(() => {
    setupMonacoEnvironment();
  }, []);

  return (
    <div className="rounded-lg border border-surface/40 overflow-hidden">
      <div className="flex text-xs text-text-muted border-b border-surface/40">
        <div className="flex-1 px-3 py-1.5">{originalLabel}</div>
        <div className="flex-1 px-3 py-1.5">{modifiedLabel}</div>
      </div>
      <DiffEditor
        height="400px"
        language="yaml"
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false } }}
      />
    </div>
  );
}
