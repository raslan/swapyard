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
  const [savedContent, setSavedContent] = useState("");
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
      setSavedContent(configData.content);
      setHash(configData.hash);
      setStatus(statusData);
      await refetchHistory();
      setLoading(false);
    })();
  }, [refetchHistory]);

  const save = useCallback(async () => {
    if (content === savedContent) return;
    setValidationError(null);
    try {
      const result = await applyConfig(content, hash);
      const kind = result.status === "ok" ? "ok" : result.status === "unverified" ? "unverified" : "failed";
      setApplyResult({ kind, logs: result.logs });
      setStatus({ status: result.status, timestamp: Date.now() / 1000 });
      await refetchHistory();
      // A "failed" outcome still writes to disk (no auto-revert), so content
      // is saved either way - only the health verification failed. Refetch
      // rather than reuse the stale client-side hash: the server's hash of
      // what's now on disk is the only correct base_hash for the next apply.
      const fresh = await getConfig();
      setHash(fresh.hash);
      setSavedContent(fresh.content);
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
  }, [content, savedContent, hash, refetchHistory]);

  const resolveConflictLoadLatest = useCallback(() => {
    if (!conflict) return;
    setContent(conflict.diskContent);
    setSavedContent(conflict.diskContent);
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
    isDirty: content !== savedContent,
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
