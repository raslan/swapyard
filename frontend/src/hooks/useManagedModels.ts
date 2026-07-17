import { useCallback, useEffect, useState } from "react";

import { deleteManagedModel, listManagedModels } from "@/lib/api";
import type { ManagedModel } from "@/types/model";

export function useManagedModels() {
  const [models, setModels] = useState<ManagedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"size" | "name">("size");

  const refetch = useCallback(async (sortBy: "size" | "name") => {
    setLoading(true);
    const results = await listManagedModels(sortBy);
    setModels(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refetch(sort);
    });
  }, [sort, refetch]);

  const remove = useCallback(
    async (repoId: string) => {
      await deleteManagedModel(repoId);
      await refetch(sort);
    },
    [refetch, sort],
  );

  return { models, loading, sort, setSort, remove };
}
