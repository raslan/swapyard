import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useManagedModels } from "./useManagedModels";

afterEach(() => vi.restoreAllMocks());

describe("useManagedModels", () => {
  it("loads models sorted by size by default", async () => {
    const spy = vi.spyOn(api, "listManagedModels").mockResolvedValue([
      {
        repoId: "org/model",
        sizeOnDisk: 100,
        nbFiles: 1,
        lastModified: 1,
        ggufFiles: [],
        configEntries: [],
      },
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

    expect(deleteSpy).toHaveBeenCalledWith("org/model", false);
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it("remove() forwards removeConfigEntries through to delete", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    const deleteSpy = vi.spyOn(api, "deleteManagedModel").mockResolvedValue(undefined);

    const { result } = renderHook(() => useManagedModels());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("org/model", true);
    });

    expect(deleteSpy).toHaveBeenCalledWith("org/model", true);
  });

  it("ignores a stale refetch that resolves after a newer one (out-of-order race)", async () => {
    // Reproduces the real bug: ManagePage calls refetch() from three independent
    // places (mount, remove(), and its own download-complete effect) with no
    // sequencing. If an older call's response arrives after a newer call's, it must
    // not clobber the newer, correct state.
    let resolveFirst!: (v: never[]) => void;
    let resolveSecond!: (v: never[]) => void;
    const first = new Promise<never[]>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<never[]>((resolve) => {
      resolveSecond = resolve;
    });
    const listSpy = vi
      .spyOn(api, "listManagedModels")
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);

    const { result } = renderHook(() => useManagedModels());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let refetchFirstDone = false;
    let refetchSecondDone = false;
    act(() => {
      result.current.refetch("size").then(() => {
        refetchFirstDone = true;
      });
    });
    act(() => {
      result.current.refetch("size").then(() => {
        refetchSecondDone = true;
      });
    });

    const newResult = [
      {
        repoId: "org/new-model",
        sizeOnDisk: 1,
        nbFiles: 1,
        lastModified: 1,
        ggufFiles: [],
        configEntries: [],
      },
    ];
    const staleResult = [
      {
        repoId: "org/stale-model",
        sizeOnDisk: 1,
        nbFiles: 1,
        lastModified: 1,
        ggufFiles: [],
        configEntries: [],
      },
    ];

    // The second (newer) call resolves first with the correct data...
    await act(async () => {
      resolveSecond(newResult as never[]);
      await waitFor(() => expect(refetchSecondDone).toBe(true));
    });
    expect(result.current.models[0]?.repoId).toBe("org/new-model");

    // ...then the first (older, stale) call resolves late. Its result must be discarded.
    await act(async () => {
      resolveFirst(staleResult as never[]);
      await waitFor(() => expect(refetchFirstDone).toBe(true));
    });
    expect(result.current.models[0]?.repoId).toBe("org/new-model");
    expect(listSpy).toHaveBeenCalledTimes(3);
  });
});
