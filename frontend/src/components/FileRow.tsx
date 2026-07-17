import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/format";
import type { ModelFile } from "@/types/model";

export function FileRow({ file, onDownload }: { file: ModelFile; onDownload: () => void }) {
  return (
    <div className="file-row flex items-center justify-between p-4">
      <div className="min-w-0">
        <p className="text-sm font-mono text-text-primary truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-text-muted font-mono">
          {formatSize(file.size)} · {file.category.toUpperCase()}
        </p>
      </div>
      <Button size="sm" onClick={onDownload}>
        Download
      </Button>
    </div>
  );
}
