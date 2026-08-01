import { Clock, Trash2, X, Zap } from "lucide-react";
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
import { CreateConfigEntryDialog } from "@/components/CreateConfigEntryDialog";
import { CountIcon, SizeIcon, Stat } from "@/components/SpecStat";
import { formatEta, formatSize, formatSpeed, formatQuantLabel, formatRelativeTime } from "@/lib/format";
import type { DownloadState } from "@/types/download";
import type { ManagedModel } from "@/types/model";

export function ManageRow({
  model,
  onDelete,
  onDeleteFile,
}: {
  model: ManagedModel;
  onDelete: (removeConfigEntries: boolean) => void;
  onDeleteFile: (filename: string) => void;
}) {
  const [removeConfigEntries, setRemoveConfigEntries] = useState(false);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<string | null>(null);
  const hasConfigEntries = model.configEntries.length > 0;
  // Per-quant delete only makes sense when there's more than one quant - with a
  // single file, the whole-repo Delete button above already does the same thing.
  const canDeletePerFile = model.ggufFiles.length > 1;
  const slashIndex = model.repoId.indexOf("/");
  const author = slashIndex === -1 ? null : model.repoId.slice(0, slashIndex);
  const name = slashIndex === -1 ? model.repoId : model.repoId.slice(slashIndex + 1);

  return (
    <div className="manage-row p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-display font-semibold text-text-primary truncate" title={model.repoId}>
            {name}
          </p>
          {author && <p className="text-xs text-text-muted font-mono mt-0.5 truncate">{author}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!hasConfigEntries && <CreateConfigEntryDialog model={model} />}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-5 rounded bg-black/40 border border-surface/40 pr-3 py-1.5">
          <Stat label="Size" value={formatSize(model.sizeOnDisk)} icon={SizeIcon} />
          <Stat label="Files" value={String(model.nbFiles)} icon={CountIcon} />
          <Stat label="Updated" value={formatRelativeTime(model.lastModified)} icon={Clock} />
        </div>
        {model.ggufFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {model.ggufFiles.map((file) => (
              <span key={file} className="badge badge-quant gap-1">
                {formatQuantLabel(file)}
                {canDeletePerFile && (
                  <button
                    type="button"
                    aria-label={`Delete ${file}`}
                    className="hover:text-danger"
                    onClick={() => setPendingDeleteFile(file)}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={pendingDeleteFile !== null} onOpenChange={(open) => !open && setPendingDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quant?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-mono">{pendingDeleteFile}</span> from disk.
              The model's other downloaded quants are left untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteFile) onDeleteFile(pendingDeleteFile);
                setPendingDeleteFile(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          <span className="flex items-center gap-1.5 text-info">
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
