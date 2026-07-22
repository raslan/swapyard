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

  it("shows error message for invalid input (zero or negative) and does not call updateSettings", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: null });
    const updateSpy = vi.spyOn(api, "updateSettings");
    const user = userEvent.setup();

    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByLabelText(/usable vram/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/usable vram/i), "0");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/enter a vram amount greater than 0/i)).toBeInTheDocument(),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("shows error message for negative input and does not call updateSettings", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: null });
    const updateSpy = vi.spyOn(api, "updateSettings");
    const user = userEvent.setup();

    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByLabelText(/usable vram/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/usable vram/i), "-5");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/enter a vram amount greater than 0/i)).toBeInTheDocument(),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("shows error message when save fails", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: null });
    vi.spyOn(api, "updateSettings").mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByLabelText(/usable vram/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/usable vram/i), "12");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument(),
    );
  });

  it("clears error message when user edits the input", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ vramBudgetGb: null });
    vi.spyOn(api, "updateSettings").mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByLabelText(/usable vram/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/usable vram/i), "0");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/enter a vram amount greater than 0/i)).toBeInTheDocument(),
    );

    await user.clear(screen.getByLabelText(/usable vram/i));
    await user.type(screen.getByLabelText(/usable vram/i), "12");

    expect(screen.queryByText(/enter a vram amount greater than 0/i)).not.toBeInTheDocument();
  });
});
