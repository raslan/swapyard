import { useEffect, useState } from "react";

import { searchModels } from "@/lib/api";
import type { ModelSummary } from "@/types/model";

export function useModelSearch(query: string) {
  const [results, setResults] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (query.trim() === "") return;

    let cancelled = false;
    const timer = setTimeout(() => {
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
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Derived rather than reset via setState in the effect above (which would fire
  // synchronously on every keystroke back to empty and trip the
  // react-hooks/set-state-in-effect rule) - stale `results` from a prior query just
  // get masked here once the query is empty again.
  const isEmpty = query.trim() === "";
  return {
    results: isEmpty ? [] : results,
    loading: isEmpty ? false : loading,
    error: isEmpty ? false : error,
  };
}
