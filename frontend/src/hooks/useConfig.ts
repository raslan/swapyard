import { useCallback, useEffect, useState } from "react";

import {
  ConfigConflictError,
  ConfigValidationError,
  applyConfig,
  getConfig,
  getConfigHistory,
  getConfigStatus,
} from "@/lib/api";
import type { ConfigRevision, ConfigStatus } from "@/types/config";

type ApplyResult =
  | { kind: "idle" }
  | { kind: "ok"; logs: string | null }
  | { kind: "unverified"; logs: string | null }
  | { kind: "failed"; logs: string | null };

export function useConfig() {
  const [content, setContent] = useState("");
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConfigStatus>({ status: null, timestamp: null });
  const [history, setHistory] = useState<ConfigRevision[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyResult>({ kind: "idle" });
  const [conflict, setConflict] = useState<{ diskContent: string; diskHash: string } | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const refetchHistory = useCallback(async () => {
    setHistory(await getConfigHistory());
  }, []);

  useEffect(() => {
    (async () => {
      const [configData, statusData] = await Promise.all([getConfig(), getConfigStatus()]);
      setContent(configData.content);
      setHash(configData.hash);
      setStatus(statusData);
      await refetchHistory();
      setLoading(false);
    })();
  }, [refetchHistory]);

  const save = useCallback(async () => {
    setValidationError(null);
    try {
      const result = await applyConfig(content, hash);
      const kind = result.status === "ok" ? "ok" : result.status === "unverified" ? "unverified" : "failed";
      setApplyResult({ kind, logs: result.logs });
      setStatus({ status: result.status, timestamp: Date.now() / 1000 });
      await refetchHistory();
      if (kind !== "failed") {
        setHash(hash); // content already matches what was just written
      }
    } catch (e) {
      if (e instanceof ConfigConflictError) {
        setConflict({ diskContent: e.diskContent, diskHash: e.diskHash });
        return;
      }
      if (e instanceof ConfigValidationError) {
        setValidationError(e.message);
        return;
      }
      throw e;
    }
  }, [content, hash, refetchHistory]);

  const resolveConflictLoadLatest = useCallback(() => {
    if (!conflict) return;
    setContent(conflict.diskContent);
    setHash(conflict.diskHash);
    setConflict(null);
  }, [conflict]);

  const resolveConflictKeepMine = useCallback(async () => {
    if (!conflict) return;
    setHash(conflict.diskHash);
    setConflict(null);
    await save();
  }, [conflict, save]);

  const loadRevisionIntoEditor = useCallback((revision: ConfigRevision) => {
    setContent(revision.content);
  }, []);

  return {
    content,
    hash,
    loading,
    status,
    history,
    applyResult,
    conflict,
    validationError,
    setContent,
    save,
    resolveConflictKeepMine,
    resolveConflictLoadLatest,
    loadRevisionIntoEditor,
    refetchHistory,
  };
}
