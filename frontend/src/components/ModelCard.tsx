import { Clock, Download, Heart, Lock } from "lucide-react";

import { CountIcon, SizeIcon, Stat } from "@/components/SpecStat";
import { formatNumber, formatParamCount, formatRelativeTime, formatSize } from "@/lib/format";
import { getCapabilities, getCardAccentGlow } from "@/lib/modelCapabilities";
import type { ModelSummary } from "@/types/model";

export function ModelCard({ model, onClick }: { model: ModelSummary; onClick: () => void }) {
  const capabilities = getCapabilities(model);
  const hasSpecs = model.params !== null || model.totalSize !== null;
  const slashIndex = model.repoId.indexOf("/");
  const author = slashIndex === -1 ? null : model.repoId.slice(0, slashIndex);
  const name = slashIndex === -1 ? model.repoId : model.repoId.slice(slashIndex + 1);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{ "--accent-glow": getCardAccentGlow(capabilities) } as React.CSSProperties}
      className="model-card px-4 py-3 cursor-pointer flex flex-col gap-2 h-full"
    >
      <div className="card-glow" />

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {model.gated && <Lock className="w-3 h-3 text-text-muted shrink-0" aria-label="Gated" />}
            <h3
              className="min-w-0 font-display font-semibold text-[15px] text-text-primary truncate"
              title={model.repoId}
            >
              {name}
            </h3>
          </div>
          {author && <p className="text-xs text-text-muted font-mono mt-0.5 truncate">{author}</p>}
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs font-mono text-text-secondary">
          {model.lastModified !== null && (
            <span className="flex items-center gap-1" title="Last updated">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(model.lastModified)}
            </span>
          )}
          <span className="flex items-center gap-1 w-14 justify-end">
            <Download className="w-3 h-3" />
            {formatNumber(model.downloads)}
          </span>
          <span className="flex items-center gap-1 w-14 justify-end">
            <Heart className="w-3 h-3" />
            {formatNumber(model.likes)}
          </span>
        </div>
      </div>

      {(capabilities.length > 0 || hasSpecs) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hasSpecs ? (
            <div className="flex items-center gap-5 rounded bg-black/40 border border-surface/40 pr-3 py-1.5">
              {model.params !== null && (
                <Stat label="Params" value={formatParamCount(model.params)} icon={CountIcon} />
              )}
              {model.totalSize !== null && (
                <Stat label="Size" value={formatSize(model.totalSize)} icon={SizeIcon} />
              )}
            </div>
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {capabilities.map((cap) => (
              <span key={cap.key} className={`badge ${cap.badgeClass} gap-1`}>
                <cap.icon className="w-2.5 h-2.5" />
                {cap.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
