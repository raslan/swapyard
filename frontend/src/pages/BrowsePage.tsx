import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";

import { ModelCard } from "@/components/ModelCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useModelSearch } from "@/hooks/useModelSearch";

export function BrowsePage() {
  const { results, loading, error, query, setQuery } = useModelSearch();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-10 pb-2">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">
          <span className="text-gradient-animate">Browse</span> Models
        </h1>
        <p className="text-sm text-text-secondary">Search Hugging Face for GGUF models ready to download.</p>
      </div>

      <div className="px-10 pb-7">
        <Input
          placeholder="Search models..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-lg search-input"
        />
      </div>

      <div className="px-10 flex-1 overflow-y-auto pb-8">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-text-secondary py-24 text-center">
            Could not reach Hugging Face. Please try again later.
          </p>
        )}

        {!loading && !error && results.length === 0 && (
          <p className="text-sm text-text-secondary py-24 text-center">No models found.</p>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {results.map((model) => (
                <motion.div
                  key={model.repoId}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ModelCard model={model} onClick={() => navigate(`/browse/${model.repoId}`)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
