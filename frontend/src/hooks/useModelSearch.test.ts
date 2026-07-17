import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useModelSearch } from "./useModelSearch";

afterEach(() => vi.restoreAllMocks());

describe("useModelSearch", () => {
  it("loads results on mount", async () => {
    vi.spyOn(api, "searchModels").mockResolvedValue([
      { repoId: "org/model", author: "org", downloads: 1, likes: 0, tags: [] },
    ]);

    const { result } = renderHook(() => useModelSearch());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toHaveLength(1);
  });

  it("debounces query changes before searching again", async () => {
    const spy = vi.spyOn(api, "searchModels").mockResolvedValue([]);
    vi.useFakeTimers();

    const { result } = renderHook(() => useModelSearch());
    // Mount's query="" effect schedules its fetch via setTimeout(fn, 0). Fake
    // timers were installed before render, so that 0ms timer is captured by
    // the fake queue and will NOT fire on its own — it must be advanced
    // explicitly (and while it's still pending, before setQuery's effect
    // cleanup clears it out from under us). Use the async variant so the
    // microtask chain (searchModels().then/.finally) is flushed within act,
    // avoiding "not wrapped in act(...)" warnings.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      result.current.setQuery("llama");
    });

    expect(spy).toHaveBeenCalledTimes(1); // only the initial mount call so far
    // Note: plain `waitFor` polls via a real setInterval, which is itself
    // captured by fake timers here and never ticks on its own — it would
    // hang until the test timeout. The searchModels() call happens
    // synchronously inside the timer callback, so advancing time already
    // guarantees the call has happened; no polling wait is needed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith("llama");

    vi.useRealTimers();
  });
});
