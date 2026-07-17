import { useEffect, useState } from "react";

import { searchModels } from "@/lib/api";
import type { ModelSummary } from "@/types/model";

export function useModelSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError(false);
        searchModels(query)
          .then((results) => {
            if (!cancelled) setResults(results);
          })
          .catch(() => {
            if (!cancelled) setError(true);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      },
      query === "" ? 0 : 300,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading, error, query, setQuery };
}
