import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { SettingsPage } from "./SettingsPage";

afterEach(() => vi.restoreAllMocks());

describe("SettingsPage", () => {
  it("shows the saved VRAM budget once loaded", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: 24 });

    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByLabelText(/usable vram/i)).toHaveValue(24));
  });

  it("saves a new budget when Save is clicked", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: null });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({ vramBudgetGb: 12 });
    const user = userEvent.setup();

    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByLabelText(/usable vram/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/usable vram/i), "12");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith(12));
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
  });
});
