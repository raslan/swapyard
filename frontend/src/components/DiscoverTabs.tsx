import { Code2, Eye, Layers, TrendingUp, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { ModelCard } from "@/components/ModelCard";
import { sortModels, type ModelSortKey } from "@/lib/modelSort";
import type { DiscoverSections, ModelSummary } from "@/types/model";

interface CategoryTab {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  models: ModelSummary[];
}

function buildTabs(sections: DiscoverSections): CategoryTab[] {
  return [
    {
      key: "trending",
      title: "Trending",
      description: "Most downloaded GGUF repos this month",
      icon: TrendingUp,
      models: sections.trending,
    },
    {
      key: "vision",
      title: "Vision & multimodal",
      description: "Models that take images as input",
      icon: Eye,
      models: sections.vision,
    },
    {
      key: "agentic",
      title: "Agentic & coding",
      description: "Tuned for tool use and code generation",
      icon: Code2,
      models: sections.agentic,
    },
    {
      key: "embeddings",
      title: "Embedding models",
      description: "For search and retrieval, not chat",
      icon: Layers,
      models: sections.embeddings,
    },
  ].filter((tab) => tab.models.length > 0);
}

export function DiscoverTabs({
  sections,
  sort,
  activeKey,
  onActiveKeyChange,
  onSelect,
}: {
  sections: DiscoverSections;
  sort: ModelSortKey;
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
  onSelect: (repoId: string) => void;
}) {
  const tabs = buildTabs(sections);
  if (tabs.length === 0) return null;

  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const models = sortModels(active.models, sort);

  return (
    <div>
      <div className="border-b border-surface/40 flex gap-6 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn px-1 py-3 text-sm inline-flex items-center gap-1.5 ${tab.key === active.key ? "active" : ""}`}
            onClick={() => onActiveKeyChange(tab.key)}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.title}
          </button>
        ))}
      </div>

      <p className="text-xs text-text-secondary mb-4">{active.description}</p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {models.map((model, i) => (
          <motion.div
            key={model.repoId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.02 }}
          >
            <ModelCard model={model} onClick={() => onSelect(model.repoId)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
