import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useDownloads } from "./useDownloads";

afterEach(() => vi.restoreAllMocks());

describe("useDownloads", () => {
  it("reattaches to active downloads on mount", async () => {
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([
      {
        id: "d1",
        repoId: "org/model",
        filename: "model.gguf",
        total: 100,
        downloaded: 40,
        rate: 1024,
        isXet: false,
        status: "downloading",
        error: null,
      },
    ]);
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const { result } = renderHook(() => useDownloads());

    await waitFor(() => expect(result.current.downloads).toHaveLength(1));
    expect(api.subscribeToDownload).toHaveBeenCalledWith("d1", expect.any(Function), expect.any(Function));
  });

  it("start() begins a download and subscribes to it", async () => {
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "startDownload").mockResolvedValue({ id: "d2" });
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const { result } = renderHook(() => useDownloads());
    await waitFor(() => expect(api.listActiveDownloads).toHaveBeenCalled());

    await act(async () => {
      await result.current.start("org/model", "model.gguf");
    });

    expect(api.startDownload).toHaveBeenCalledWith("org/model", "model.gguf", false);
    expect(api.subscribeToDownload).toHaveBeenCalledWith("d2", expect.any(Function), expect.any(Function));
  });

  it("cancel() calls the API", async () => {
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    const cancelSpy = vi.spyOn(api, "cancelDownload").mockResolvedValue(undefined);

    const { result } = renderHook(() => useDownloads());
    await waitFor(() => expect(api.listActiveDownloads).toHaveBeenCalled());

    await act(async () => {
      await result.current.cancel("d1");
    });

    expect(cancelSpy).toHaveBeenCalledWith("d1");
  });

  const errored = {
    id: "d3",
    repoId: "org/model",
    filename: "model.gguf",
    total: 0,
    downloaded: 0,
    rate: 0,
    isXet: false,
    status: "error" as const,
    error: "Permission denied",
  };

  it("dismiss() clears the record server-side and drops it locally", async () => {
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([errored]);
    const cancelSpy = vi.spyOn(api, "cancelDownload").mockResolvedValue(undefined);
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const { result } = renderHook(() => useDownloads());
    await waitFor(() => expect(result.current.downloads).toHaveLength(1));

    await act(async () => {
      await result.current.dismiss("d3");
    });

    expect(cancelSpy).toHaveBeenCalledWith("d3");
    expect(result.current.downloads).toHaveLength(0);
  });

  it("dismiss() still clears locally when the record is already gone (404)", async () => {
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([errored]);
    vi.spyOn(api, "cancelDownload").mockRejectedValue(new Error("404"));
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const { result } = renderHook(() => useDownloads());
    await waitFor(() => expect(result.current.downloads).toHaveLength(1));

    await act(async () => {
      await result.current.dismiss("d3");
    });

    expect(result.current.downloads).toHaveLength(0);
  });

  it("retry() dismisses the failed record then restarts the same download", async () => {
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([errored]);
    const cancelSpy = vi.spyOn(api, "cancelDownload").mockResolvedValue(undefined);
    const startSpy = vi.spyOn(api, "startDownload").mockResolvedValue({ id: "d4" });
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const { result } = renderHook(() => useDownloads());
    await waitFor(() => expect(result.current.downloads).toHaveLength(1));

    await act(async () => {
      await result.current.retry(errored);
    });

    expect(cancelSpy).toHaveBeenCalledWith("d3");
    expect(startSpy).toHaveBeenCalledWith("org/model", "model.gguf", false);
  });
});
