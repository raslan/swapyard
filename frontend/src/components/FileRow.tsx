import { Brain, Database, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/format";
import type { ModelFile } from "@/types/model";

const CATEGORY_ICONS = {
  gguf: Database,
  mmproj: Brain,
  other: FileText,
} as const;

export function FileRow({ file, onDownload }: { file: ModelFile; onDownload: () => void }) {
  const CategoryIcon = CATEGORY_ICONS[file.category];

  return (
    <div className="file-row flex items-center justify-between p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-abyss border border-surface/40 flex items-center justify-center flex-shrink-0">
          <CategoryIcon className="w-4 h-4 text-text-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-mono text-text-primary truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-text-muted font-mono">
            {formatSize(file.size)} · {file.category.toUpperCase()}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onDownload}>
        <Download className="w-4 h-4" />
        Download
      </Button>
    </div>
  );
}
