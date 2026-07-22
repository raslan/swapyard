import { useEffect, useState } from "react";

import { getVramEstimate } from "@/lib/api";
import type { QuantEstimate } from "@/types/vram";

export function useVramEstimate(repoId: string) {
  const [estimate, setEstimate] = useState<QuantEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVramEstimate(repoId)
      .then(setEstimate)
      .catch(() => setEstimate([]))
      .finally(() => setLoading(false));
  }, [repoId]);

  return { estimate, loading };
}
