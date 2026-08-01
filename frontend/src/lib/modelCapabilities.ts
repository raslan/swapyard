import { Brain, Code2, Eye, Layers, Wrench, type LucideIcon } from "lucide-react";

import type { ModelSummary } from "@/types/model";

export interface Capability {
  key: string;
  label: string;
  icon: LucideIcon;
  badgeClass: string;
}

const EMBEDDING_PIPELINE_TAGS = new Set(["feature-extraction", "sentence-similarity"]);
const VISION_PIPELINE_TAGS = new Set(["image-text-to-text", "visual-question-answering", "image-to-text"]);
const TOOL_TAGS = new Set(["tool-calling", "tool-use", "function-calling"]);
const REASONING_TAGS = new Set(["reasoning"]);
const CODE_TAGS = new Set(["agentic-coding", "agent", "code", "coding"]);

// Real per-model HF tags (verified live: tool-calling/tool-use/function-calling and
// reasoning both show up on real GGUF repos), not inferred - a model can have several
// at once (e.g. vision + tools), unlike the old single task-category icon which forced
// one bucket per card.
export function getCapabilities(model: Pick<ModelSummary, "pipelineTag" | "tags">): Capability[] {
  if (model.pipelineTag && EMBEDDING_PIPELINE_TAGS.has(model.pipelineTag)) {
    return [{ key: "embedding", label: "Embedding", icon: Layers, badgeClass: "badge-other" }];
  }

  const caps: Capability[] = [];
  if (model.pipelineTag && VISION_PIPELINE_TAGS.has(model.pipelineTag)) {
    caps.push({ key: "vision", label: "Vision", icon: Eye, badgeClass: "badge-info" });
  }
  if (model.tags.some((t) => TOOL_TAGS.has(t))) {
    caps.push({ key: "tools", label: "Tools", icon: Wrench, badgeClass: "badge-quant" });
  }
  if (model.tags.some((t) => REASONING_TAGS.has(t))) {
    caps.push({ key: "reasoning", label: "Reasoning", icon: Brain, badgeClass: "badge-other" });
  }
  if (model.tags.some((t) => CODE_TAGS.has(t))) {
    caps.push({ key: "code", label: "Code", icon: Code2, badgeClass: "badge-quant" });
  }
  return caps;
}

// rgba() forms of the @theme brand/info/accent2 tokens (index.css) - the card's
// all-around border glow needs a translucent color, set via an inline CSS custom
// property since Tailwind utilities can't vary by category per-instance. Embedding
// and vision get their own hue so those rows stay visually distinguishable even
// without the old single category icon; everything else shares the brand color.
export function getCardAccentGlow(caps: Capability[]): string {
  if (caps.some((c) => c.key === "embedding")) return "rgba(210, 166, 255, 0.14)";
  if (caps.some((c) => c.key === "vision")) return "rgba(89, 194, 255, 0.14)";
  return "rgba(52, 211, 153, 0.14)";
}
