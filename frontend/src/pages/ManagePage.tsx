import { ArrowRight, ArrowUpDown, HardDrive } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { ActiveDownloadRow, FailedDownloadRow, ManageRow } from "@/components/ManageRow";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDownloads } from "@/hooks/useDownloads";
import { useManagedModels } from "@/hooks/useManagedModels";
import type { DownloadState } from "@/types/download";

export function ManagePage() {
  const { models, sort, setSort, remove, removeFile, refetch } = useManagedModels();
  const { downloads, cancel, dismiss } = useDownloads();
  const navigate = useNavigate();

  const prevStatuses = useRef<Map<string, DownloadState["status"]>>(new Map());

  // A download completing doesn't, by itself, change the managed-models list — that list
  // only comes from listManagedModels(). Detect the "downloading" -> "complete" transition
  // here and refetch so the newly-finished model appears without a manual reload.
  useEffect(() => {
    const prev = prevStatuses.current;
    const justCompleted = downloads.some(
      (d) => d.status === "complete" && prev.get(d.id) !== "complete",
    );
    prevStatuses.current = new Map(downloads.map((d) => [d.id, d.status]));

    if (justCompleted) {
      queueMicrotask(() => {
        refetch(sort);
      });
    }
  }, [downloads, sort, refetch]);

  const inProgress = downloads.filter((d) => d.status === "downloading");
  const failed = downloads.filter((d) => d.status === "error");
  const isEmpty = models.length === 0 && inProgress.length === 0 && failed.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">
            Manage
          </h1>
          <p className="text-sm text-text-secondary">Your downloaded models.</p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as "name" | "size")}>
          <SelectTrigger className="w-36 gap-2 border-surface/40">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="px-10 flex-1 overflow-y-auto">
        {isEmpty && (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-lg bg-dark border border-edge flex items-center justify-center mx-auto mb-5">
              <HardDrive className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
              No models downloaded
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Browse the catalog and download a model to get started.
            </p>
            <Button onClick={() => navigate("/browse")} className="gap-2">
              Browse Models
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="space-y-3 py-4">
          <AnimatePresence initial={false}>
            {inProgress.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <ActiveDownloadRow download={d} onCancel={() => cancel(d.id)} />
              </motion.div>
            ))}
            {failed.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <FailedDownloadRow download={d} onDismiss={() => dismiss(d.id)} />
              </motion.div>
            ))}
            {models.map((m) => (
              <motion.div
                key={m.repoId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <ManageRow
                  model={m}
                  onDelete={(removeConfigEntries) => remove(m.repoId, removeConfigEntries)}
                  onDeleteFile={(filename) => removeFile(m.repoId, filename)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
