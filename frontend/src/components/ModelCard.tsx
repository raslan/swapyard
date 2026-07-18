import { Download } from "lucide-react";

import { formatNumber } from "@/lib/format";
import type { ModelSummary } from "@/types/model";

export function ModelCard({ model, onClick }: { model: ModelSummary; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="model-card rounded-xl p-5 cursor-pointer"
    >
      <div className="card-glow" />
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-display font-semibold text-base text-text-primary truncate" title={model.repoId}>
            {model.repoId}
          </h3>
          <p className="text-xs text-text-muted font-mono mt-1">{model.author}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-mono text-text-muted flex-shrink-0">
          <Download className="w-3 h-3" />
          {formatNumber(model.downloads)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {model.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="badge badge-other">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
