import { Editor } from "@monaco-editor/react";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getHarness, getHarnesses } from "@/lib/api";
import type { HarnessDetail, HarnessSummary } from "@/types/connect";

export function ConnectPage() {
  const [harnesses, setHarnesses] = useState<HarnessSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HarnessDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHarnesses().then((list) => {
      setHarnesses(list);
      setLoading(false);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    getHarness(selectedId).then(setDetail);
  }, [selectedId]);

  const handleCopy = async () => {
    if (!detail) return;
    await navigator.clipboard.writeText(detail.config);
    toast.success("Copied to clipboard.");
  };

  const handleDownload = () => {
    if (!detail) return;
    const basename = detail.configPath.split("/").pop() ?? "config";
    const blob = new Blob([detail.config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = basename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-10 text-text-secondary">Loading harnesses...</div>;

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r border-surface/40 overflow-y-auto shrink-0">
        {harnesses.map((h) => (
          <button
            key={h.id}
            data-testid={`harness-rail-item-${h.id}`}
            onClick={() => setSelectedId(h.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-surface/20 ${
              selectedId === h.id ? "bg-surface/40 text-text-primary" : "text-text-secondary"
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{h.name}</div>
              <div className="text-xs text-text-muted truncate">{h.configPath}</div>
            </div>
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-10 pt-10 pb-4">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">Connect</h1>
          <p className="text-sm text-text-secondary">
            Generate ready-to-use config for your coding-agent CLI.
          </p>
        </div>

        {detail && (
          <div className="flex-1 min-h-0 flex flex-col px-10 pb-10 gap-6 overflow-y-auto">
            {detail.baseUrlSource === "placeholder" && (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                No llama-swap URL configured in Settings — using a placeholder host/port.
                Fill it in on the Settings page for a config you can paste as-is.
              </div>
            )}

            <ol className="space-y-4">
              {detail.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-surface/40 text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <p className="text-sm text-text-secondary">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {detail.configPath.split("/").pop() ?? detail.configPath}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  Copy
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  Download
                </Button>
              </div>
            </div>
            <div className="h-96 border border-surface/40 rounded-lg overflow-hidden">
              <Editor
                height="100%"
                language={detail.format === "jsonc" ? "json" : detail.format}
                theme="vs-dark"
                value={detail.config}
                options={{ readOnly: true, minimap: { enabled: false } }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
