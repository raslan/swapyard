import { Editor, useMonaco } from "@monaco-editor/react";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getHarness, getHarnesses } from "@/lib/api";
import { HarnessIcon } from "@/lib/harnessIcons";
import { setupMonacoEnvironment } from "@/lib/monacoWorkers";
import { SWAPYARD_THEME_ID, registerMonacoThemes } from "@/lib/monacoThemes";
import type { HarnessDetail, HarnessSummary } from "@/types/connect";

// Must run before any <Editor> mounts (React runs child effects before parent
// effects, so a useEffect here would fire too late) - see monacoWorkers.ts.
setupMonacoEnvironment();

export function ConnectGrid() {
  const [harnesses, setHarnesses] = useState<HarnessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHarnesses()
      .then((list) => {
        setHarnesses(list);
        setLoading(false);
      })
      .catch((e) => {
        setLoading(false);
        toast.error(
          `Failed to load harnesses: ${e instanceof Error ? e.message : "unexpected error"}`,
        );
      });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-10 pt-10 pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">Connect</h1>
        <p className="text-sm text-text-secondary">
          Pick your coding-agent CLI for a ready-to-use config.
        </p>
      </div>

      {loading ? (
        <div className="px-10 pb-10 text-text-secondary">Loading harnesses...</div>
      ) : (
        <div className="px-10 pb-10 grid gap-4 grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))]">
          {harnesses.map((h) => (
            <Link
              key={h.id}
              to={`/connect/${h.id}`}
              data-testid={`harness-card-${h.id}`}
              className="group flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-xl border border-surface/40 bg-surface/20 px-6 py-8 text-center transition-colors hover:border-surface/60 hover:bg-surface/40"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/40 text-text-primary transition-colors group-hover:bg-surface/60">
                <HarnessIcon id={h.id} className="h-7 w-7" />
              </span>
              <div className="min-w-0 max-w-full">
                <div className="font-display text-base font-semibold text-text-primary">{h.name}</div>
                <div className="mt-0.5 truncate text-xs text-text-muted">{h.configPath}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConnectGuide() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<HarnessDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  const monaco = useMonaco();
  useEffect(() => {
    if (!monaco) return;
    registerMonacoThemes(monaco);
    // Configs mapped from format "jsonc" render as "json"; allow comments so
    // they don't get red squiggles.
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      allowComments: true,
      validate: true,
    });
  }, [monaco]);

  useEffect(() => {
    if (!id) return;
    setStatus("loading");
    setDetail(null);
    getHarness(id)
      .then((d) => {
        setDetail(d);
        setStatus("ready");
      })
      .catch((e) => {
        setStatus("notfound");
        toast.error(
          `Failed to load harness config: ${e instanceof Error ? e.message : "unexpected error"}`,
        );
      });
  }, [id]);

  const handleCopy = async () => {
    if (!detail) return;
    await navigator.clipboard.writeText(detail.config);
    toast.success("Copied to clipboard.");
  };

  const handleDownload = () => {
    if (!detail) return;
    const basename =
      detail.format === "env" ? ".env" : (detail.configPath.split("/").pop() ?? "config");
    const blob = new Blob([detail.config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = basename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backLink = (
    <Link
      to="/connect"
      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
    >
      <ArrowLeft className="w-4 h-4" />
      All harnesses
    </Link>
  );

  if (status === "notfound") {
    return (
      <div className="flex flex-col gap-4 px-10 pt-10">
        {backLink}
        <p className="text-sm text-text-secondary">Harness not found.</p>
      </div>
    );
  }

  if (status === "loading" || !detail) {
    return (
      <div className="flex flex-col gap-4 px-10 pt-10">
        {backLink}
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="px-10 pt-10 pb-4 flex flex-col gap-3">
        {backLink}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <HarnessIcon id={detail.id} className="w-7 h-7 shrink-0 text-text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight">{detail.name}</h1>
          </div>
          <a
            href={detail.docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            data-testid="learn-more-link"
          >
            Learn more ↗
          </a>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-10 pb-10 gap-6 overflow-y-auto">
        {detail.baseUrlSource === "placeholder" && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            No llama-swap URL configured in Settings — using a placeholder host/port. Fill it in on
            the Settings page for a config you can paste as-is.
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
            {detail.format === "env"
              ? ".env"
              : (detail.configPath.split("/").pop() ?? detail.configPath)}
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
            language={
              detail.format === "jsonc"
                ? "json"
                : detail.format === "env"
                  ? "shell"
                  : detail.format
            }
            theme={SWAPYARD_THEME_ID}
            value={detail.config}
            options={{ readOnly: true, minimap: { enabled: false } }}
          />
        </div>
      </div>
    </div>
  );
}
