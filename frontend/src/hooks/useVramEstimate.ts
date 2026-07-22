import { useEffect, useState } from "react";

import { getVramEstimate } from "@/lib/api";
import type { QuantEstimate } from "@/types/vram";

export function useVramEstimate(repoId: string) {
  const [estimate, setEstimate] = useState<QuantEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      getVramEstimate(repoId)
        .then((data) => {
          if (!cancelled) setEstimate(data);
        })
        .catch(() => {
          if (!cancelled) setEstimate([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { estimate, loading };
}
