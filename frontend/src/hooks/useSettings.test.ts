import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { useSettings } from "./useSettings";

afterEach(() => vi.restoreAllMocks());

describe("useSettings", () => {
  it("loads the current VRAM budget on mount", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: 24 });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.vramBudgetGb).toBe(24);
  });

  it("save() persists the new budget and updates state", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: null });
    vi.spyOn(api, "updateSettings").mockResolvedValue({ vramBudgetGb: 16 });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save(16);
    });

    expect(api.updateSettings).toHaveBeenCalledWith(16);
    expect(result.current.settings.vramBudgetGb).toBe(16);
  });
});
