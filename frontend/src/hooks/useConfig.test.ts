import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import { useConfig } from "./useConfig";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useConfig", () => {
  it("loads content, hash, status, and history on mount", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: "ok", timestamp: 1 });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.content).toBe("models: {}\n");
    expect(result.current.hash).toBe("abc");
    expect(result.current.status).toEqual({ status: "ok", timestamp: 1 });
  });

  it("save() applies successfully and records the ok outcome", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "applyConfig").mockResolvedValue({ status: "ok", logs: null });

    const { result } = renderHook(() => useConfig());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setContent("models: {a: {cmd: llama-server}}\n"));
    await act(async () => {
      await result.current.save();
    });

    expect(api.applyConfig).toHaveBeenCalledWith("models: {a: {cmd: llama-server}}\n", "abc");
    expect(result.current.applyResult.kind).toBe("ok");
  });

  it("save() surfaces a conflict without touching editor content", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "applyConfig").mockRejectedValue(
      new api.ConfigConflictError("models: {other: 1}\n", "newhash"),
    );

    const { result } = renderHook(() => useConfig());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setContent("models: {mine: 1}\n"));
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.conflict).toEqual({
      diskContent: "models: {other: 1}\n",
      diskHash: "newhash",
    });
    expect(result.current.content).toBe("models: {mine: 1}\n"); // unsaved edits preserved
  });

  it("resolveConflictLoadLatest replaces content with disk content and clears the conflict", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "applyConfig").mockRejectedValue(
      new api.ConfigConflictError("models: {other: 1}\n", "newhash"),
    );

    const { result } = renderHook(() => useConfig());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setContent("models: {mine: 1}\n"));
    await act(async () => {
      await result.current.save();
    });

    act(() => result.current.resolveConflictLoadLatest());

    expect(result.current.content).toBe("models: {other: 1}\n");
    expect(result.current.hash).toBe("newhash");
    expect(result.current.conflict).toBeNull();
  });
});
