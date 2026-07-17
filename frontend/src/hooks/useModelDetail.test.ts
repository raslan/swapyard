import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useModelDetail } from "./useModelDetail";

afterEach(() => vi.restoreAllMocks());

describe("useModelDetail", () => {
  it("loads detail for the given repo id", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "# Hi",
      files: [],
    });

    const { result } = renderHook(() => useModelDetail("org/model"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detail?.readme).toBe("# Hi");
  });

  it("sets error on failure", async () => {
    vi.spyOn(api, "getModelDetail").mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useModelDetail("org/missing"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
