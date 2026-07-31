import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import type { ManagedModel } from "@/types/model";

import { ManageRow } from "./ManageRow";

afterEach(() => vi.restoreAllMocks());

const baseModel: ManagedModel = {
  repoId: "org/model",
  sizeOnDisk: 1000,
  nbFiles: 1,
  lastModified: 0,
  ggufFiles: ["org-model.Q4_K_M.gguf"],
  configEntries: [],
};

describe("ManageRow", () => {
  it("shows a Create config entry action when the model has no config entries", () => {
    render(<ManageRow model={{ ...baseModel, configEntries: [] }} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: /create config entry/i })).toBeInTheDocument();
  });

  it("does not show the action when the model already has config entries", () => {
    render(<ManageRow model={{ ...baseModel, configEntries: ["existing"] }} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /create config entry/i })).not.toBeInTheDocument();
  });

  it("submitting the dialog calls createConfigEntry with the chosen file and model id", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    render(
      <ManageRow
        model={{ ...baseModel, configEntries: [], ggufFiles: ["model-Q4_K_M.gguf"] }}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /create config entry/i }));
    const modelIdInput = screen.getByLabelText(/model id/i);
    await userEvent.clear(modelIdInput);
    await userEvent.type(modelIdInput, "my-model");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(baseModel.repoId, "model-Q4_K_M.gguf", "my-model");
  });

  it("defaults the model id to the last path segment of the repo id", async () => {
    render(
      <ManageRow
        model={{ ...baseModel, repoId: "org/cool-model", configEntries: [] }}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /create config entry/i }));

    expect(screen.getByLabelText(/model id/i)).toHaveValue("cool-model");
  });

  it("shows a file picker when the model has multiple gguf files, and submits the chosen one", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    render(
      <ManageRow
        model={{
          ...baseModel,
          configEntries: [],
          ggufFiles: ["model-Q4_K_M.gguf", "model-Q8_0.gguf"],
        }}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /create config entry/i }));
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: /Q8_0/i }));
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(baseModel.repoId, "model-Q8_0.gguf", expect.any(String));
  });
});
