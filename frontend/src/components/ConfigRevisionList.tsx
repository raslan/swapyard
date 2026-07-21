import { useState } from "react";

import { ConfigDiffView } from "@/components/ConfigDiffView";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConfigRevision } from "@/types/config";

interface ConfigRevisionListProps {
  revisions: ConfigRevision[];
  currentContent: string;
  onLoadIntoEditor: (revision: ConfigRevision) => void;
}

export function ConfigRevisionList({ revisions, currentContent, onLoadIntoEditor }: ConfigRevisionListProps) {
  const [previewSha, setPreviewSha] = useState<string | null>(null);
  const previewing = revisions.find((r) => r.sha === previewSha) ?? null;

  return (
    <div className="space-y-2">
      {revisions.map((revision) => (
        <div key={revision.sha} className="border border-surface/40 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-mono text-text-muted">{revision.sha.slice(0, 8)}</span>{" "}
              <span>{new Date(revision.timestamp * 1000).toLocaleString()}</span>{" "}
              <span
                className={revision.status.startsWith("failed") ? "text-red-400" : "text-text-secondary"}
              >
                {revision.status}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewSha(revision.sha)}>
                Preview diff
              </Button>
              <Button size="sm" onClick={() => onLoadIntoEditor(revision)}>
                Load into editor
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewSha(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {previewing ? `Diff against revision ${previewing.sha.slice(0, 8)}` : "Diff"}
            </DialogTitle>
          </DialogHeader>
          {previewing && (
            <ConfigDiffView
              original={currentContent}
              modified={previewing.content}
              originalLabel="Current"
              modifiedLabel={`Revision ${previewing.sha.slice(0, 8)}`}
              height="65vh"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
