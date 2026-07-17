import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

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

  it("lists downloaded models and deletes on click", async () => {
    vi.spyOn(api, "listManagedModels").mockResolvedValue([
      { repoId: "org/model", sizeOnDisk: 1024, nbFiles: 2, lastModified: 1 },
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

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("org/model"));
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
});
