import { Editor, useMonaco } from "@monaco-editor/react";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConfigDiffView } from "@/components/ConfigDiffView";
import { ConfigRevisionList } from "@/components/ConfigRevisionList";
import { useConfig } from "@/hooks/useConfig";
import { getConfigFlags, getConfigSchema } from "@/lib/api";
import { registerCmdFlagProvider } from "@/lib/cmdFlagProvider";
import { configureYamlSchema, setupMonacoEnvironment } from "@/lib/monacoWorkers";
import { SWAPYARD_THEME_ID, THEME_OPTIONS, registerMonacoThemes } from "@/lib/monacoThemes";

// Must run before any <Editor> mounts (React runs child effects before parent
// effects, so a useEffect here would fire too late) - see monacoWorkers.ts.
setupMonacoEnvironment();

export function ConfigPage() {
  const {
    content,
    isDirty,
    loading,
    status,
    history,
    applyResult,
    conflict,
    validationError,
    saveError,
    setContent,
    save,
    resolveConflictKeepMine,
    resolveConflictLoadLatest,
    loadRevisionIntoEditor,
  } = useConfig();

  const monaco = useMonaco();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [theme, setTheme] = useState(SWAPYARD_THEME_ID);

  useEffect(() => {
    if (!monaco) return;
    registerMonacoThemes(monaco);
    getConfigSchema().then((schema) => configureYamlSchema(monaco, schema));

    let disposable: { dispose(): void } | undefined;
    getConfigFlags().then((flags) => {
      disposable = registerCmdFlagProvider(monaco, flags);
    });
    return () => disposable?.dispose();
  }, [monaco]);

  // Transient outcomes surface as toasts rather than banners so they never
  // push the editor around - a fixed editor area (no page scroll) was an
  // explicit requirement.
  useEffect(() => {
    if (applyResult.kind === "ok") toast.success("Applied and verified healthy.");
    else if (applyResult.kind === "unverified")
      toast.warning("Applied — couldn't verify (no reachable llama-swap URL configured).");
    else if (applyResult.kind === "failed")
      toast.error(`Apply failed: ${applyResult.logs ?? "llama-swap did not become healthy in time"}`);
  }, [applyResult]);

  useEffect(() => {
    if (validationError) toast.error(validationError);
  }, [validationError]);

  useEffect(() => {
    if (saveError) toast.error(`Save failed: ${saveError}`);
  }, [saveError]);

  if (loading) return <div className="p-10 text-text-secondary">Loading config...</div>;

  const lastFailed = status.status?.startsWith("failed") ?? false;

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">
            <span className="text-gradient-animate">Config</span>
          </h1>
          <p className="text-sm text-text-secondary">Edit llama-swap's config.yaml directly.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={theme}
            onValueChange={(v) => {
              setTheme(v);
              monaco?.editor.setTheme(v);
            }}
          >
            <SelectTrigger className="w-40 border-surface/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative border-surface/40">
                <History className="w-4 h-4" />
                History
                {lastFailed && (
                  <span
                    data-testid="history-failed-badge"
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"
                  />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Revision history</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-4">
                {lastFailed && (
                  <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    Last apply failed: {status.status}
                  </div>
                )}
                {history.length === 0 ? (
                  <p className="text-sm text-text-muted">No revisions yet. Save & Apply to create one.</p>
                ) : (
                  <ConfigRevisionList
                    revisions={history}
                    onLoadIntoEditor={(revision) => {
                      loadRevisionIntoEditor(revision);
                      setHistoryOpen(false);
                    }}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={() => setConfirmOpen(true)} disabled={!isDirty}>
            Save & Apply
          </Button>
        </div>
      </div>

      {conflict && (
        <div className="mx-10 mb-4 space-y-3">
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            config.yaml changed on disk since this editor loaded it.
          </div>
          <ConfigDiffView
            original={conflict.diskContent}
            modified={content}
            originalLabel="On disk now"
            modifiedLabel="Your unsaved edits"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={resolveConflictLoadLatest}>
              Discard my edits, reload latest
            </Button>
            <Button onClick={resolveConflictKeepMine}>Save my version anyway</Button>
          </div>
        </div>
      )}

      <div className="px-10 pb-10 flex-1 min-h-0">
        <Editor
          height="100%"
          language="yaml"
          theme={theme}
          value={content}
          onChange={(v) => setContent(v ?? "")}
          options={{
            fontFamily: "'JetBrainsMono Nerd Font', 'JetBrains Mono', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
          }}
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this config?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restart llama-swap and drop any currently loaded models.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                save();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
