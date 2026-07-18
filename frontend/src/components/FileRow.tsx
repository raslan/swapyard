import { Brain, CheckCircle, Database, Download, FileText, Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/format";
import type { ModelFile } from "@/types/model";

const CATEGORY_ICONS = {
  gguf: Database,
  mmproj: Brain,
  other: FileText,
} as const;

export function FileRow({
  file,
  status = "none",
  onDownload,
}: {
  file: ModelFile;
  status?: "none" | "downloading" | "downloaded";
  onDownload: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[file.category];

  return (
    <div className="file-row flex items-center justify-between p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-abyss border border-surface/40 flex items-center justify-center shrink-0">
          <CategoryIcon className="w-4 h-4 text-text-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-text-muted font-mono flex items-center gap-1">
            {formatSize(file.size)} · {file.category.toUpperCase()}
            {file.isXet && (
              <span
                className="inline-flex items-center gap-0.5 text-cyan"
                title="Downloads fast via HF's Xet backend, but reports progress in only a couple of jumps rather than smoothly"
              >
                <Zap className="w-3 h-3" />
                fast transfer
              </span>
            )}
          </p>
        </div>
      </div>
      {status === "downloaded" && (
        <span className="flex items-center gap-1.5 text-xs font-mono text-success px-4 py-2">
          <CheckCircle className="w-3.5 h-3.5" />
          Downloaded
        </span>
      )}
      {status === "downloading" && (
        <span className="flex items-center gap-1.5 text-xs font-mono text-text-muted px-4 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Downloading
        </span>
      )}
      {status === "none" && (
        <Button size="sm" onClick={onDownload}>
          <Download className="w-4 h-4" />
          Download
        </Button>
      )}
    </div>
  );
}
