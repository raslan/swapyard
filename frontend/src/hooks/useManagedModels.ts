import { useCallback, useEffect, useRef, useState } from "react";

import { deleteManagedModel, deleteManagedModelFile, listManagedModels } from "@/lib/api";
import type { ManagedModel } from "@/types/model";

export function useManagedModels() {
  const [models, setModels] = useState<ManagedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"size" | "name">("size");

  // refetch() is called from three independent, unsynchronized places (mount,
  // remove(), and ManagePage's own download-complete effect). Their listManagedModels()
  // calls can resolve out of order (e.g. a refetch started before a delete resolving
  // after the delete's own refetch), and an unguarded setModels() would let the older
  // call's stale result clobber the newer one's correct state. This generation counter
  // makes every refetch() ignore its own result unless it's still the most recent call.
  const requestId = useRef(0);

  const refetch = useCallback(async (sortBy: "size" | "name") => {
    const id = ++requestId.current;
    setLoading(true);
    const results = await listManagedModels(sortBy);
    if (id !== requestId.current) return;
    setModels(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refetch(sort);
    });
  }, [sort, refetch]);

  const remove = useCallback(
    async (repoId: string, removeConfigEntries = false) => {
      await deleteManagedModel(repoId, removeConfigEntries);
      await refetch(sort);
    },
    [refetch, sort],
  );

  const removeFile = useCallback(
    async (repoId: string, filename: string) => {
      await deleteManagedModelFile(repoId, filename);
      await refetch(sort);
    },
    [refetch, sort],
  );

  return { models, loading, sort, setSort, remove, removeFile, refetch };
}
