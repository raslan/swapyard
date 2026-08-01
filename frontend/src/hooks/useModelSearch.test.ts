import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useModelSearch } from "./useModelSearch";

afterEach(() => vi.restoreAllMocks());

describe("useModelSearch", () => {
  it("does not search when the query is empty", async () => {
    const spy = vi.spyOn(api, "searchModels").mockResolvedValue([]);

    const { result } = renderHook(() => useModelSearch(""));

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("searches once given a non-empty query", async () => {
    vi.spyOn(api, "searchModels").mockResolvedValue([
      {
        repoId: "org/model",
        author: "org",
        downloads: 1,
        likes: 0,
        tags: [],
        pipelineTag: null,
        lastModified: null,
        gated: false,
        params: null,
        totalSize: null,
      },
    ]);

    const { result, rerender } = renderHook(({ query }) => useModelSearch(query), {
      initialProps: { query: "" },
    });
    rerender({ query: "llama" });

    await waitFor(() => expect(result.current.results).toHaveLength(1), { timeout: 1000 });
  });

  it("masks stale results once the query goes back to empty", async () => {
    vi.spyOn(api, "searchModels").mockResolvedValue([
      {
        repoId: "org/model",
        author: "org",
        downloads: 1,
        likes: 0,
        tags: [],
        pipelineTag: null,
        lastModified: null,
        gated: false,
        params: null,
        totalSize: null,
      },
    ]);

    const { result, rerender } = renderHook(({ query }) => useModelSearch(query), {
      initialProps: { query: "llama" },
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1), { timeout: 1000 });

    rerender({ query: "" });
    expect(result.current.results).toEqual([]);
  });

  it("debounces query changes before searching again", async () => {
    const spy = vi.spyOn(api, "searchModels").mockResolvedValue([]);
    vi.useFakeTimers();

    const { rerender } = renderHook(({ query }) => useModelSearch(query), {
      initialProps: { query: "" },
    });

    await act(async () => {
      rerender({ query: "llama" });
    });
    expect(spy).not.toHaveBeenCalled();

    await act(async () => {
      rerender({ query: "llama3" });
    });
    // Still within the debounce window from the first keystroke - not searched yet.
    expect(spy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith("llama3");

    vi.useRealTimers();
  });
});
