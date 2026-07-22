import { CheckCircle2 } from "lucide-react";

import { FileRow } from "@/components/FileRow";
import { formatNumber, formatQuantLabel, formatSize } from "@/lib/format";
import type { ModelFile } from "@/types/model";
import type { QuantEstimate } from "@/types/vram";

export function QuantGroup({
  estimate,
  files,
  fits,
  fileStatus,
  onDownload,
}: {
  estimate: QuantEstimate;
  files: ModelFile[];
  fits: boolean;
  fileStatus: (file: ModelFile) => "none" | "downloading" | "downloaded";
  onDownload: (file: ModelFile) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 text-xs font-mono text-text-muted">
        <span className="text-text-secondary">{formatQuantLabel(estimate.quant)}</span>
        <span>
          ≈{formatSize(estimate.weightBytes + estimate.kvCacheMaxBytes)} at {formatNumber(estimate.contextLength)}{" "}
          ctx · ≈{formatSize(estimate.weightBytes + estimate.kvCacheHalfBytes)} at{" "}
          {formatNumber(Math.floor(estimate.contextLength / 2))} ctx
        </span>
        {fits && (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Fits your GPU
          </span>
        )}
      </div>
      {files.map((file) => (
        <FileRow key={file.name} file={file} status={fileStatus(file)} onDownload={() => onDownload(file)} />
      ))}
    </div>
  );
}
