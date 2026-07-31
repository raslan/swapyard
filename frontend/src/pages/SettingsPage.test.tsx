import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { SettingsPage } from "./SettingsPage";

afterEach(() => vi.restoreAllMocks());

describe("SettingsPage", () => {
  it("shows the loading state before settings resolve", async () => {
    vi.spyOn(api, "getSettings").mockReturnValue(new Promise(() => {}));

    render(<SettingsPage />);

    expect(screen.getByText(/loading settings/i)).toBeInTheDocument();
  });

  it("defaults to GPU mode with one empty row, and can add a second GPU row", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });

    render(<SettingsPage />);

    await screen.findByLabelText(/vram/i);
    await userEvent.click(screen.getByRole("button", { name: /add gpu/i }));

    expect(screen.getAllByLabelText(/vram/i)).toHaveLength(2);
  });

  it("switching to unified memory hides GPU rows and shows one shared-pool input", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("radio", { name: /unified memory/i }));

    expect(screen.queryByRole("button", { name: /add gpu/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/unified memory.*gb|shared pool/i)).toBeInTheDocument();
  });

  it("loads an existing GPU profile with its saved values", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "gpus", gpus: [{ name: null, vramGb: 16 }], systemRamGb: 32 },
    });

    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByLabelText(/vram/i)).toHaveValue(16));
    expect(screen.getByLabelText(/system ram/i)).toHaveValue(32);
  });

  it("loads an existing unified memory profile with unified mode selected", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 24 },
    });

    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /unified memory/i })).toBeChecked(),
    );
    expect(screen.getByLabelText(/unified memory.*gb|shared pool/i)).toHaveValue(24);
  });

  it("saving a GPU profile calls save with the entered values", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "gpus", gpus: [{ name: null, vramGb: 24 }], systemRamGb: 64 },
    });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.type(screen.getByLabelText(/vram/i), "24");
    await userEvent.type(screen.getByLabelText(/system ram/i), "64");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({
        kind: "gpus",
        gpus: [{ name: null, vramGb: 24 }],
        systemRamGb: 64,
      }),
    );
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
  });

  it("saving a unified memory profile calls save with an empty GPU list", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 32 },
    });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("radio", { name: /unified memory/i }));
    await userEvent.type(screen.getByLabelText(/unified memory.*gb|shared pool/i), "32");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({
        kind: "unified",
        gpus: [],
        systemRamGb: 32,
      }),
    );
  });

  it("removes a GPU row when its delete button is clicked", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("button", { name: /add gpu/i }));
    expect(screen.getAllByLabelText(/vram/i)).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /remove gpu/i })[0]);
    expect(screen.getAllByLabelText(/vram/i)).toHaveLength(1);
  });

  it("shows error message for a GPU with zero VRAM and does not call updateSettings", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    const updateSpy = vi.spyOn(api, "updateSettings");

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/vram amount greater than 0/i)).toBeInTheDocument(),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("shows error message when unified memory amount is missing", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    const updateSpy = vi.spyOn(api, "updateSettings");

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("radio", { name: /unified memory/i }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/enter your (system|unified) (ram|memory)/i)).toBeInTheDocument(),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("shows error message when save fails", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "updateSettings").mockRejectedValue(new Error("Network error"));

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.type(screen.getByLabelText(/vram/i), "12");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument(),
    );
  });

  it("clears error message when user edits the input", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText(/vram amount greater than 0/i)).toBeInTheDocument(),
    );

    await userEvent.type(screen.getByLabelText(/vram/i), "12");

    expect(screen.queryByText(/vram amount greater than 0/i)).not.toBeInTheDocument();
  });
});
