import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useSettings } from "./useSettings";

afterEach(() => vi.restoreAllMocks());

describe("useSettings", () => {
  it("loads the current hardware profile and llama-swap URL on mount", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 24 },
      llamaSwapUrl: "http://llama-swap:8080",
      onboarded: true,
    });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.hardware).toEqual({
      kind: "unified",
      gpus: [],
      systemRamGb: 24,
    });
    expect(result.current.settings.llamaSwapUrl).toBe("http://llama-swap:8080");
  });

  it("save sends the given hardware profile and llama-swap URL and updates state", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
    vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 32 },
      llamaSwapUrl: "http://llama-swap:8080",
      onboarded: true,
    });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ kind: "unified", gpus: [], systemRamGb: 32 }, "http://llama-swap:8080");
    });

    expect(api.updateSettings).toHaveBeenCalledWith(
      { kind: "unified", gpus: [], systemRamGb: 32 },
      "http://llama-swap:8080",
    );
    expect(result.current.settings.hardware).toEqual({
      kind: "unified",
      gpus: [],
      systemRamGb: 32,
    });
    expect(result.current.settings.llamaSwapUrl).toBe("http://llama-swap:8080");
  });
});
