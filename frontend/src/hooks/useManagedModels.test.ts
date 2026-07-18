import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useManagedModels } from "./useManagedModels";

afterEach(() => vi.restoreAllMocks());

describe("useManagedModels", () => {
  it("loads models sorted by size by default", async () => {
    const spy = vi.spyOn(api, "listManagedModels").mockResolvedValue([
      { repoId: "org/model", sizeOnDisk: 100, nbFiles: 1, lastModified: 1, ggufFiles: [] },
    ]);

    const { result } = renderHook(() => useManagedModels());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenCalledWith("size");
    expect(result.current.models).toHaveLength(1);
  });

  it("re-fetches when sort changes", async () => {
    const spy = vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    const { result } = renderHook(() => useManagedModels());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSort("name"));

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith("name"));
  });

  it("remove() calls delete then refetches", async () => {
    const listSpy = vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    const deleteSpy = vi.spyOn(api, "deleteManagedModel").mockResolvedValue(undefined);

    const { result } = renderHook(() => useManagedModels());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("org/model");
    });

    expect(deleteSpy).toHaveBeenCalledWith("org/model");
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});
