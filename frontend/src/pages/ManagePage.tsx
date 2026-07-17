import { useNavigate } from "react-router-dom";

import { ActiveDownloadRow, ManageRow } from "@/components/ManageRow";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/hooks/useDownloads";
import { useManagedModels } from "@/hooks/useManagedModels";

export function ManagePage() {
  const { models, sort, setSort, remove } = useManagedModels();
  const { downloads, cancel } = useDownloads();
  const navigate = useNavigate();

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
          {inProgress.map((d) => (
            <ActiveDownloadRow key={d.id} download={d} onCancel={() => cancel(d.id)} />
          ))}
          {models.map((m) => (
            <ManageRow key={m.repoId} model={m} onDelete={() => remove(m.repoId)} />
          ))}
        </div>
      </div>
    </div>
  );
}
