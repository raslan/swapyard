import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useVramEstimate } from "./useVramEstimate";

afterEach(() => vi.restoreAllMocks());

describe("useVramEstimate", () => {
  it("loads the estimate groups for a repo", async () => {
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([
      {
        quant: "model-Q4_K_M.gguf",
        files: ["model-Q4_K_M.gguf"],
        weightBytes: 100,
        contextLength: 4096,
        kvCacheMaxBytes: 10,
        kvCacheHalfBytes: 5,
      },
    ]);

    const { result } = renderHook(() => useVramEstimate("org/model"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.estimate).toHaveLength(1);
    expect(api.getVramEstimate).toHaveBeenCalledWith("org/model");
  });

  it("degrades to an empty estimate list if the fetch fails", async () => {
    vi.spyOn(api, "getVramEstimate").mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useVramEstimate("org/model"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.estimate).toEqual([]);
  });
});
