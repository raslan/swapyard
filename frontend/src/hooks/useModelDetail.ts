import { useEffect, useState } from "react";

import { getModelDetail } from "@/lib/api";
import type { ModelDetail } from "@/types/model";

export function useModelDetail(repoId: string) {
  const [detail, setDetail] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(false);
      getModelDetail(repoId)
        .then((d) => {
          if (!cancelled) setDetail(d);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { detail, loading, error };
}
