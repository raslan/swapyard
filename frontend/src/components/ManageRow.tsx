import { Trash2, X, Zap } from "lucide-react";
import { useState } from "react";

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
import { Progress } from "@/components/ui/progress";
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

  return (
    <div className="manage-row p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate">{model.repoId}</p>
          <p className="text-xs text-text-muted font-mono">
            {formatSize(model.sizeOnDisk)} · {model.nbFiles} files
          </p>
        </div>
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
                  {model.configEntries.length === 1 ? "entry" : `entries (${model.configEntries.length})`}{" "}
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
