import { useEffect, useState } from "react";

import { getDiscoverSections } from "@/lib/api";
import type { DiscoverSections } from "@/types/model";

export function useDiscoverSections() {
  const [sections, setSections] = useState<DiscoverSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDiscoverSections()
      .then((result) => {
        if (!cancelled) setSections(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { sections, loading, error };
}
