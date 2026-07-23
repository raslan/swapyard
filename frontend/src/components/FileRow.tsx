import { Brain, CheckCircle, CheckCircle2, Database, Download, FileText, Loader2, Sparkles, Zap } from "lucide-react";

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
  fits = false,
  recommended = false,
  onDownload,
}: {
  file: ModelFile;
  status?: "none" | "downloading" | "downloaded";
  fits?: boolean;
  recommended?: boolean;
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
      <div className="flex items-center gap-3 shrink-0">
        {recommended && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-cyan bg-cyan/10 border border-cyan/30 rounded-full px-3 py-1.5"
            title="The largest quant that fits your configured VRAM budget"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Recommended
          </span>
        )}
        {fits && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-success bg-success/10 border border-success/30 rounded-full px-3 py-1.5"
            title="Estimated to fit your configured VRAM budget"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Fits your GPU
          </span>
        )}
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
    </div>
  );
}
