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
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });

    render(<SettingsPage />);

    await screen.findByLabelText(/vram/i);
    await userEvent.click(screen.getByRole("button", { name: /add gpu/i }));

    expect(screen.getAllByLabelText(/vram/i)).toHaveLength(2);
  });

  it("switching to unified memory hides GPU rows and shows one shared-pool input", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("radio", { name: /unified memory/i }));

    expect(screen.queryByRole("button", { name: /add gpu/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/unified memory.*gb|shared pool/i)).toBeInTheDocument();
  });

  it("loads an existing GPU profile with its saved values", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "gpus", gpus: [{ name: null, vramGb: 16 }], systemRamGb: 32 },
      llamaSwapUrl: null,
      onboarded: true,
    });

    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByLabelText(/vram/i)).toHaveValue(16));
    expect(screen.getByLabelText(/system ram/i)).toHaveValue(32);
  });

  it("loads an existing unified memory profile with unified mode selected", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 24 },
      llamaSwapUrl: null,
      onboarded: true,
    });

    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /unified memory/i })).toBeChecked(),
    );
    expect(screen.getByLabelText(/unified memory.*gb|shared pool/i)).toHaveValue(24);
  });

  it("saving a GPU profile calls save with the entered values", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "gpus", gpus: [{ name: null, vramGb: 24 }], systemRamGb: 64 },
      llamaSwapUrl: null,
      onboarded: true,
    });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.type(screen.getByLabelText(/vram/i), "24");
    await userEvent.type(screen.getByLabelText(/system ram/i), "64");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        {
          kind: "gpus",
          gpus: [{ name: null, vramGb: 24 }],
          systemRamGb: 64,
        },
        null,
      ),
    );
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
  });

  it("saving a unified memory profile calls save with an empty GPU list", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 32 },
      llamaSwapUrl: null,
      onboarded: true,
    });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("radio", { name: /unified memory/i }));
    await userEvent.type(screen.getByLabelText(/unified memory.*gb|shared pool/i), "32");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        {
          kind: "unified",
          gpus: [],
          systemRamGb: 32,
        },
        null,
      ),
    );
  });

  it("saving includes the entered llama-swap URL, and loads a saved one", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: null,
      llamaSwapUrl: "http://llama-swap:8080",
      onboarded: true,
    });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "gpus", gpus: [{ name: null, vramGb: 24 }], systemRamGb: null },
      llamaSwapUrl: "http://llama-swap:9090",
      onboarded: true,
    });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    expect(screen.getByLabelText(/llama-swap url/i)).toHaveValue("http://llama-swap:8080");

    await userEvent.clear(screen.getByLabelText(/llama-swap url/i));
    await userEvent.type(screen.getByLabelText(/llama-swap url/i), "http://llama-swap:9090");
    await userEvent.type(screen.getByLabelText(/vram/i), "24");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(expect.anything(), "http://llama-swap:9090"),
    );
  });

  it("picking a known GPU model from the combobox fills its VRAM automatically", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
    const updateSpy = vi.spyOn(api, "updateSettings").mockResolvedValue({
      hardware: { kind: "gpus", gpus: [{ name: "NVIDIA GeForce RTX 4090", vramGb: 24 }], systemRamGb: null },
      llamaSwapUrl: null,
      onboarded: true,
    });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("combobox", { name: /gpu 1 model/i }));
    await userEvent.type(screen.getByPlaceholderText(/search gpu model/i), "4090");
    await userEvent.click(await screen.findByText("NVIDIA GeForce RTX 4090"));

    expect(screen.getByRole("combobox", { name: /gpu 1 model/i })).toHaveTextContent(
      "NVIDIA GeForce RTX 4090",
    );
    expect(screen.getByLabelText(/vram/i)).toHaveValue(24);

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          gpus: [{ name: "NVIDIA GeForce RTX 4090", vramGb: 24 }],
        }),
        null,
      ),
    );
  });

  it("typing an unlisted GPU name falls back to manual VRAM entry", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("combobox", { name: /gpu 1 model/i }));
    await userEvent.type(screen.getByPlaceholderText(/search gpu model/i), "My Homemade GPU");
    await userEvent.click(await screen.findByText(/use "my homemade gpu"/i));

    expect(screen.getByRole("combobox", { name: /gpu 1 model/i })).toHaveTextContent(
      "My Homemade GPU",
    );
    // Falls back to the manual VRAM input - not auto-filled for an unknown model.
    expect(screen.getByLabelText(/vram/i)).toHaveValue(null);
  });

  it("removes a GPU row when its delete button is clicked", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });

    render(<SettingsPage />);
    await screen.findByLabelText(/vram/i);

    await userEvent.click(screen.getByRole("button", { name: /add gpu/i }));
    expect(screen.getAllByLabelText(/vram/i)).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /remove gpu/i })[0]);
    expect(screen.getAllByLabelText(/vram/i)).toHaveLength(1);
  });

  it("shows error message for a GPU with zero VRAM and does not call updateSettings", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
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
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
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
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });
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
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });

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
