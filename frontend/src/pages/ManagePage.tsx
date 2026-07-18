import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { ActiveDownloadRow, ManageRow } from "@/components/ManageRow";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/hooks/useDownloads";
import { useManagedModels } from "@/hooks/useManagedModels";
import type { DownloadState } from "@/types/download";

export function ManagePage() {
  const { models, sort, setSort, remove, refetch } = useManagedModels();
  const { downloads, cancel } = useDownloads();
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
  const isEmpty = models.length === 0 && inProgress.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">Manage</h1>
          <p className="text-sm text-text-secondary">Your downloaded models.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setSort("name")}
            className={sort === "name" ? "bg-surface/30" : ""}
          >
            Name
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSort("size")}
            className={sort === "size" ? "bg-surface/30" : ""}
          >
            Size
          </Button>
        </div>
      </div>

      <div className="px-10 flex-1 overflow-y-auto">
        {isEmpty && (
          <div className="text-center py-24">
            <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
              No models downloaded
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Browse the catalog and download a model to get started.
            </p>
            <Button onClick={() => navigate("/browse")}>Browse Models</Button>
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
            {models.map((m) => (
              <motion.div
                key={m.repoId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <ManageRow model={m} onDelete={() => remove(m.repoId)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
