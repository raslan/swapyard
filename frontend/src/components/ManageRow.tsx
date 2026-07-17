import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatSize } from "@/lib/format";
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
        <Button variant="ghost" size="sm" className="text-danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
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
