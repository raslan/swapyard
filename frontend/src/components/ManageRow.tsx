import { Plus, Trash2, X, Zap } from "lucide-react";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createConfigEntry } from "@/lib/api";
import { formatEta, formatQuantLabel, formatSize, formatSpeed } from "@/lib/format";
import type { DownloadState } from "@/types/download";
import type { ManagedModel } from "@/types/model";

export function ManageRow({
  model,
  onDelete,
}: {
  model: ManagedModel;
  onDelete: (removeConfigEntries: boolean) => void;
}) {
  const [removeConfigEntries, setRemoveConfigEntries] = useState(false);
  const hasConfigEntries = model.configEntries.length > 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modelId, setModelId] = useState(() => model.repoId.split("/").pop() ?? model.repoId);
  const [selectedFile, setSelectedFile] = useState(model.ggufFiles[0] ?? "");
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (open) {
      setModelId(model.repoId.split("/").pop() ?? model.repoId);
      setSelectedFile(model.ggufFiles[0] ?? "");
      setCreateError(null);
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const result = await createConfigEntry(model.repoId, selectedFile, modelId);
      if (result.status === "ok") toast.success("Config entry created and verified healthy.");
      else if (result.status === "unverified")
        toast.warning(
          "Config entry created — couldn't verify (no reachable llama-swap URL configured).",
        );
      else
        toast.error(
          `Config entry created but apply failed: ${result.logs ?? "llama-swap did not become healthy in time"}`,
        );
      setCreateOpen(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create config entry.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="manage-row p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate">{model.repoId}</p>
          <p className="text-xs text-text-muted font-mono">
            {formatSize(model.sizeOnDisk)} · {model.nbFiles} files
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!hasConfigEntries && (
            <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                  Create config entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create config entry</DialogTitle>
                  <DialogDescription>
                    Adds a minimal entry to config.yaml for{" "}
                    <span className="font-mono">{model.repoId}</span>, relying on llama-swap's{" "}
                    <span className="font-mono">--fit</span> for sizing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor={`model-id-${model.repoId}`} className="text-sm font-medium">
                      Model ID
                    </label>
                    <Input
                      id={`model-id-${model.repoId}`}
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                    />
                  </div>
                  {model.ggufFiles.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">GGUF file</label>
                      <Select value={selectedFile} onValueChange={setSelectedFile}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {model.ggufFiles.map((file) => (
                            <SelectItem key={file} value={file}>
                              {formatQuantLabel(file)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {createError && <p className="text-sm text-danger">{createError}</p>}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !modelId.trim() || !selectedFile}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <AlertDialog onOpenChange={(open) => !open && setRemoveConfigEntries(false)}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-danger">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this model?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the downloaded files for{" "}
                  <span className="font-mono">{model.repoId}</span> from disk. If this model is
                  currently loaded by another process (e.g. llama-swap), that process keeps running
                  fine off its already-open file handle, but the disk space won't be reclaimed until
                  it closes or restarts.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {hasConfigEntries && (
                <label className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <Checkbox
                    checked={removeConfigEntries}
                    onCheckedChange={(v) => setRemoveConfigEntries(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Also remove config.yaml{" "}
                    {model.configEntries.length === 1
                      ? "entry"
                      : `entries (${model.configEntries.length})`}{" "}
                    referencing this model:{" "}
                    <span className="font-mono">{model.configEntries.join(", ")}</span>
                  </span>
                </label>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => onDelete(removeConfigEntries)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {model.ggufFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {model.ggufFiles.map((file) => (
            <span key={file} className="badge badge-quant">
              {formatQuantLabel(file)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActiveDownloadRow({
  download,
  onCancel,
}: {
  download: DownloadState;
  onCancel: () => void;
}) {
  const pct = download.total > 0 ? Math.round((download.downloaded / download.total) * 100) : 0;
  const eta = formatEta(download.total - download.downloaded, download.rate);
  return (
    <div className="manage-row downloading p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate">{download.filename}</p>
          <p className="text-xs text-text-muted font-mono">
            {download.repoId} · {formatSize(download.downloaded)} / {formatSize(download.total)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </div>
      <Progress value={pct} />
      <div className="flex items-center justify-between mt-2 text-xs font-mono text-text-muted">
        {download.isXet ? (
          <span className="flex items-center gap-1.5 text-cyan">
            <Zap className="w-3 h-3" />
            Fast transfer via Xet — progress updates in a few big steps, not smoothly
          </span>
        ) : (
          <>
            <span>{pct}%</span>
            <span>
              {formatSpeed(download.rate)}
              {eta ? ` · ${eta}` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
