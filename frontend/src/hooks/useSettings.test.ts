import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useSettings } from "./useSettings";

afterEach(() => vi.restoreAllMocks());

describe("useSettings", () => {
  it("loads the current hardware profile on mount", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 24 },
    });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.hardware).toEqual({
      kind: "unified",
      gpus: [],
      systemRamGb: 24,
    });
  });

  it("save sends the given hardware profile and updates state", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 32 },
    });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ kind: "unified", gpus: [], systemRamGb: 32 });
    });

    expect(api.updateSettings).toHaveBeenCalledWith({
      kind: "unified",
      gpus: [],
      systemRamGb: 32,
    });
    expect(result.current.settings.hardware).toEqual({
      kind: "unified",
      gpus: [],
      systemRamGb: 32,
    });
  });
});
