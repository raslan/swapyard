import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import type { DownloadState } from "@/types/download";

import { ManagePage } from "./ManagePage";

afterEach(() => vi.restoreAllMocks());

describe("ManagePage", () => {
  it("shows an empty state when nothing is downloaded", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/no models downloaded/i)).toBeInTheDocument());
  });

  it("opens a confirmation dialog on delete click, without deleting immediately", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([
      { repoId: "org/model", sizeOnDisk: 1024, nbFiles: 2, lastModified: 1, ggufFiles: [] },
    ]);
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    const deleteSpy = vi.spyOn(api, "deleteManagedModel").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("org/model")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/delete this model/i)).toBeInTheDocument();
    expect(deleteSpy).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("org/model"));
  });

  it("does not delete when the confirmation dialog is cancelled", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([
      { repoId: "org/model", sizeOnDisk: 1024, nbFiles: 2, lastModified: 1, ggufFiles: [] },
    ]);
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    const deleteSpy = vi.spyOn(api, "deleteManagedModel").mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("org/model")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("renders a quant badge for each downloaded gguf file", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([
      {
        repoId: "org/model",
        sizeOnDisk: 1024,
        nbFiles: 2,
        lastModified: 1,
        ggufFiles: ["org-model.Q4_K_M.gguf", "org-model.Q8_0.gguf"],
      },
    ]);
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("org/model")).toBeInTheDocument());
    expect(screen.getByText("Q4_K_M")).toBeInTheDocument();
    expect(screen.getByText("Q8_0")).toBeInTheDocument();
  });

  it("shows an in-progress download with a cancel button", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([
      {
        id: "d1",
        repoId: "org/model",
        filename: "model.gguf",
        total: 100,
        downloaded: 40,
        status: "downloading",
        error: null,
      },
    ]);
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    render(
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("model.gguf")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("adds the model to the list once its download completes, without a manual refresh", async () => {
    const listModelsSpy = vi
      .spyOn(api, "listManagedModels")
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { repoId: "org/model", sizeOnDisk: 1024, nbFiles: 1, lastModified: 1, ggufFiles: [] },
      ]);
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([
      {
        id: "d1",
        repoId: "org/model",
        filename: "model.gguf",
        total: 100,
        downloaded: 40,
        status: "downloading",
        error: null,
      },
    ]);

    let onDone: ((state: DownloadState) => void) | undefined;
    vi.spyOn(api, "subscribeToDownload").mockImplementation((_id, _onUpdate, done) => {
      onDone = done;
      return () => {};
    });

    render(
      <MemoryRouter>
        <ManagePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("model.gguf")).toBeInTheDocument());
    expect(listModelsSpy).toHaveBeenCalledTimes(1);

    // Simulate the SSE "done" event that fires when the download finishes.
    act(() => {
      onDone?.({
        id: "d1",
        repoId: "org/model",
        filename: "model.gguf",
        total: 100,
        downloaded: 100,
        status: "complete",
        error: null,
      });
    });

    await waitFor(() => expect(listModelsSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("org/model")).toBeInTheDocument());
    expect(screen.queryByText("model.gguf")).not.toBeInTheDocument();
  });
});
