import { FileRow } from "@/components/FileRow";
import type { ModelFile } from "@/types/model";

export function QuantGroup({
  files,
  fits,
  recommended,
  fileStatus,
  onDownload,
}: {
  files: ModelFile[];
  fits: boolean;
  recommended: boolean;
  fileStatus: (file: ModelFile) => "none" | "downloading" | "downloaded";
  onDownload: (file: ModelFile) => void;
}) {
  return (
    <div className="space-y-1">
      {files.map((file) => (
        <FileRow
          key={file.name}
          file={file}
          status={fileStatus(file)}
          fits={fits}
          recommended={recommended}
          onDownload={() => onDownload(file)}
        />
      ))}
    </div>
  );
}
