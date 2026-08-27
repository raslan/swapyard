import { Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ManagedModel } from "@/types/model";

type FileRow = { name: string; kind: "weights" | "mmproj" };

export function ManagedFilesDialog({
  model,
  onDeleteFile,
  children,
}: {
  model: ManagedModel;
  onDeleteFile: (filename: string) => void;
  children: React.ReactNode;
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const files: FileRow[] = [
    ...model.ggufFiles.map((name) => ({ name, kind: "weights" as const })),
    ...model.mmprojFiles.map((name) => ({ name, kind: "mmproj" as const })),
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Downloaded files</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{model.repoId}</span> — weight and projector files. Config
            and tokenizer files aren't listed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between gap-3 rounded border border-surface/40 bg-black/30 px-3 py-2"
            >
              <span className="font-mono text-xs truncate" title={file.name}>
                {file.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge badge-quant text-[10px]">{file.kind}</span>
                <button
                  type="button"
                  aria-label={`Delete ${file.name}`}
                  className="text-text-muted hover:text-danger"
                  onClick={() => setPendingDelete(file.name)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-mono">{pendingDelete}</span> from disk.
              The model's other downloaded files are left untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) onDeleteFile(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
