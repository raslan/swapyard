import { useCallback, useEffect, useRef, useState } from "react";

import {
  cancelDownload as apiCancelDownload,
  listActiveDownloads,
  startDownload as apiStartDownload,
  subscribeToDownload,
} from "@/lib/api";
import type { DownloadState } from "@/types/download";

export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadState[]>([]);
  const unsubscribers = useRef<Map<string, () => void>>(new Map());

  const upsert = useCallback((state: DownloadState) => {
    setDownloads((prev) => {
      const others = prev.filter((d) => d.id !== state.id);
      return [state, ...others];
    });
  }, []);

  const attach = useCallback(
    (id: string) => {
      if (unsubscribers.current.has(id)) return;
      const unsubscribe = subscribeToDownload(
        id,
        (state) => upsert(state),
        (state) => {
          upsert(state);
          unsubscribers.current.get(id)?.();
          unsubscribers.current.delete(id);
        },
      );
      unsubscribers.current.set(id, unsubscribe);
    },
    [upsert],
  );

  useEffect(() => {
    listActiveDownloads().then((active) => {
      setDownloads(active);
      for (const d of active) {
        if (d.status === "downloading") attach(d.id);
      }
    });

    return () => {
      for (const unsubscribe of unsubscribers.current.values()) unsubscribe();
      unsubscribers.current.clear();
    };
  }, [attach]);

  const start = useCallback(
    async (repoId: string, filename: string) => {
      const { id } = await apiStartDownload(repoId, filename);
      attach(id);
    },
    [attach],
  );

  const cancel = useCallback(async (id: string) => {
    await apiCancelDownload(id);
  }, []);

  return { downloads, start, cancel };
}
