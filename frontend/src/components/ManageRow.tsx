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
import { Progress } from "@/components/ui/progress";
import { formatQuantLabel, formatSize } from "@/lib/format";
import type { DownloadState } from "@/types/download";
import type { ManagedModel } from "@/types/model";

export function ManageRow({ model, onDelete }: { model: ManagedModel; onDelete: () => void }) {
  return (
    <div className="manage-row p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate">{model.repoId}</p>
          <p className="text-xs text-text-muted font-mono">
            {formatSize(model.sizeOnDisk)} · {model.nbFiles} files
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-danger">
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
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={onDelete}
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
  return (
    <div className="manage-row downloading p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate">{download.filename}</p>
          <p className="text-xs text-text-muted font-mono">{download.repoId}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <Progress value={pct} />
    </div>
  );
}
