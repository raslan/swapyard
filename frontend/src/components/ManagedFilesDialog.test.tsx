import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ManagedModel } from "@/types/model";

import { ManagedFilesDialog } from "./ManagedFilesDialog";

const model: ManagedModel = {
  repoId: "org/vision-GGUF",
  sizeOnDisk: 1000,
  nbFiles: 5,
  lastModified: 0,
  ggufFiles: ["vision-Q4_K_M.gguf", "vision-Q8_0.gguf"],
  mmprojFiles: ["mmproj-vision-bf16.gguf"],
  configEntries: [],
};

function renderDialog(onDeleteFile = vi.fn()) {
  render(
    <ManagedFilesDialog model={model} onDeleteFile={onDeleteFile}>
      <button type="button">Files</button>
    </ManagedFilesDialog>,
  );
  return onDeleteFile;
}

describe("ManagedFilesDialog", () => {
  it("lists every weight and projector file with its kind", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Files" }));

    expect(screen.getByText("vision-Q4_K_M.gguf")).toBeInTheDocument();
    expect(screen.getByText("vision-Q8_0.gguf")).toBeInTheDocument();
    expect(screen.getByText("mmproj-vision-bf16.gguf")).toBeInTheDocument();
    expect(screen.getAllByText("weights")).toHaveLength(2);
    expect(screen.getByText("mmproj")).toBeInTheDocument();
  });

  it("deletes a single file after confirming", async () => {
    const onDeleteFile = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Files" }));

    await userEvent.click(screen.getByRole("button", { name: /delete mmproj-vision-bf16\.gguf/i }));
    expect(await screen.findByText(/delete this file/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(onDeleteFile).toHaveBeenCalledWith("mmproj-vision-bf16.gguf");
    expect(onDeleteFile).toHaveBeenCalledTimes(1);
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const onDeleteFile = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Files" }));

    await userEvent.click(screen.getByRole("button", { name: /delete vision-Q8_0\.gguf/i }));
    await userEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(onDeleteFile).not.toHaveBeenCalled();
  });
});
