import type { ModelSummary } from "@/types/model";

export type ModelSortKey = "lastModified" | "likes" | "downloads";

export const MODEL_SORT_OPTIONS: { value: ModelSortKey; label: string }[] = [
  { value: "downloads", label: "Most downloaded" },
  { value: "lastModified", label: "Last updated" },
  { value: "likes", label: "Most liked" },
];

export function sortModels(models: ModelSummary[], sort: ModelSortKey): ModelSummary[] {
  return [...models].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
}
