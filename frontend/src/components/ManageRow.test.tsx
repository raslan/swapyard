import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import * as api from "@/lib/api";
import type { ManagedModel } from "@/types/model";

import { ManageRow } from "./ManageRow";

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  // The create-entry dialog (CreateConfigEntryDialog) fetches these on open - without
  // mocks jsdom's fetch throws on the relative URLs, same pattern as BrowseDetailPage.test.tsx.
  vi.spyOn(api, "getConfigFlags").mockResolvedValue([]);
  vi.spyOn(api, "getModelDetail").mockResolvedValue({
    repoId: "org/model",
    author: "org",
    downloads: 0,
    likes: 0,
    readme: "",
    files: [],
    contextLength: null,
    recommendedSamplerParams: null,
  });
});

const baseModel: ManagedModel = {
  repoId: "org/model",
  sizeOnDisk: 1000,
  nbFiles: 1,
  lastModified: 0,
  ggufFiles: ["org-model.Q4_K_M.gguf"],
  configEntries: [],
};

function renderRow(model: ManagedModel, onDelete = vi.fn(), onDeleteFile = vi.fn()) {
  return render(
    <TooltipProvider>
      <ManageRow model={model} onDelete={onDelete} onDeleteFile={onDeleteFile} />
    </TooltipProvider>,
  );
}

describe("ManageRow", () => {
  it("shows a Create config entry action when the model has no config entries", () => {
    renderRow({ ...baseModel, configEntries: [] });
    expect(screen.getByRole("button", { name: /create config entry/i })).toBeInTheDocument();
  });

  it("does not show the action when the model already has config entries", () => {
    renderRow({ ...baseModel, configEntries: ["existing"] });
    expect(screen.queryByRole("button", { name: /create config entry/i })).not.toBeInTheDocument();
  });

  it("does not offer per-quant delete when there is only one quant", () => {
    renderRow({ ...baseModel, ggufFiles: ["org-model.Q4_K_M.gguf"] });
    expect(screen.queryByRole("button", { name: /delete org-model.Q4_K_M.gguf/i })).not.toBeInTheDocument();
  });

  it("deletes only the selected quant after confirming, when there are multiple", async () => {
    const onDeleteFile = vi.fn();
    const user = userEvent.setup();
    renderRow(
      { ...baseModel, ggufFiles: ["org-model.Q4_K_M.gguf", "org-model.Q8_0.gguf"] },
      vi.fn(),
      onDeleteFile,
    );

    await user.click(screen.getByRole("button", { name: /delete org-model.q4_k_m.gguf/i }));
    expect(await screen.findByText(/delete this quant/i)).toBeInTheDocument();
    expect(screen.getByText("org-model.Q4_K_M.gguf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(onDeleteFile).toHaveBeenCalledWith("org-model.Q4_K_M.gguf");
    expect(onDeleteFile).toHaveBeenCalledTimes(1);
  });

  it("does not delete when the per-quant confirmation is cancelled", async () => {
    const onDeleteFile = vi.fn();
    const user = userEvent.setup();
    renderRow(
      { ...baseModel, ggufFiles: ["org-model.Q4_K_M.gguf", "org-model.Q8_0.gguf"] },
      vi.fn(),
      onDeleteFile,
    );

    await user.click(screen.getByRole("button", { name: /delete org-model.q4_k_m.gguf/i }));
    await user.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(onDeleteFile).not.toHaveBeenCalled();
  });
});
