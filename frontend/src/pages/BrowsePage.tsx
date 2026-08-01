import { ArrowUpDown, Search, SearchX, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { DiscoverTabs } from "@/components/DiscoverTabs";
import { ModelCard } from "@/components/ModelCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiscoverSections } from "@/hooks/useDiscoverSections";
import { useModelSearch } from "@/hooks/useModelSearch";
import { MODEL_SORT_OPTIONS, sortModels, type ModelSortKey } from "@/lib/modelSort";

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const setQuery = (q: string) => {
    const next = new URLSearchParams(searchParams);
    if (q.trim() === "") next.delete("q");
    else next.set("q", q);
    setSearchParams(next, { replace: true });
  };

  const [category, setCategory] = useState("trending");
  const { results, loading, error } = useModelSearch(query);
  const discover = useDiscoverSections();
  const navigate = useNavigate();
  const [sort, setSort] = useState<ModelSortKey>("downloads");
  const showDiscover = query.trim() === "";

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-10 pb-2">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">Browse Models</h1>
        <p className="text-sm text-text-secondary">
          Search Hugging Face for GGUF models ready to download.
        </p>
      </div>

      <div className="px-10 pb-7 flex items-center gap-3">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Search models..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input pl-10"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as ModelSortKey)}>
          <SelectTrigger className="w-48 gap-2 border-surface/40">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-10 flex-1 overflow-y-auto pb-8">
        {showDiscover ? (
          <DiscoverView
            sections={discover.sections}
            loading={discover.loading}
            error={discover.error}
            sort={sort}
            category={category}
            onCategoryChange={setCategory}
            onSelect={(repoId) => navigate(`/browse/${repoId}`)}
          />
        ) : (
          <SearchResults
            results={results}
            loading={loading}
            error={error}
            sort={sort}
            onSelect={(repoId) => navigate(`/browse/${repoId}`)}
          />
        )}
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="shimmer-bg h-[86px] rounded-lg" />
      ))}
    </div>
  );
}

function DiscoverView({
  sections,
  loading,
  error,
  sort,
  category,
  onCategoryChange,
  onSelect,
}: {
  sections: ReturnType<typeof useDiscoverSections>["sections"];
  loading: boolean;
  error: boolean;
  sort: ModelSortKey;
  category: string;
  onCategoryChange: (key: string) => void;
  onSelect: (repoId: string) => void;
}) {
  if (loading) return <CardGridSkeleton />;

  if (error || !sections) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <WifiOff className="w-8 h-8 text-text-muted" />
        <p className="text-sm text-text-secondary">
          Could not reach Hugging Face. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <DiscoverTabs
      sections={sections}
      sort={sort}
      activeKey={category}
      onActiveKeyChange={onCategoryChange}
      onSelect={onSelect}
    />
  );
}

function SearchResults({
  results,
  loading,
  error,
  sort,
  onSelect,
}: {
  results: ReturnType<typeof useModelSearch>["results"];
  loading: boolean;
  error: boolean;
  sort: ModelSortKey;
  onSelect: (repoId: string) => void;
}) {
  if (loading) return <CardGridSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <WifiOff className="w-8 h-8 text-text-muted" />
        <p className="text-sm text-text-secondary">
          Could not reach Hugging Face. Please try again later.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <SearchX className="w-8 h-8 text-text-muted" />
        <p className="text-sm text-text-secondary">No models found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <AnimatePresence>
        {sortModels(results, sort).map((model) => (
          <motion.div
            key={model.repoId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <ModelCard model={model} onClick={() => onSelect(model.repoId)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
