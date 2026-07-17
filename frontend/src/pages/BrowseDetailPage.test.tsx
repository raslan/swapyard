import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { BrowseDetailPage } from "./BrowseDetailPage";

afterEach(() => vi.restoreAllMocks());

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/browse/*" element={<BrowseDetailPage />} />
        <Route path="/manage" element={<div>Manage Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BrowseDetailPage", () => {
  it("renders the README on the overview tab by default", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "# Hello world",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf" }],
    });
    // BrowseDetailPage always calls useDownloads() (regardless of active tab), which
    // fires a real listActiveDownloads() fetch on mount. Without this mock, jsdom's fetch
    // throws on the relative "/api/downloads" URL, producing an unhandled rejection that
    // fails the run even though both assertions pass.
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);

    renderAt("/browse/org/model");

    await waitFor(() => expect(screen.getByText("Hello world")).toBeInTheDocument());
  });

  it("shows files on the files tab and starts a download", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf" }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    const startSpy = vi.spyOn(api, "startDownload").mockResolvedValue({ id: "d1" });
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const user = userEvent.setup();
    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText("model.Q4.gguf")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => expect(startSpy).toHaveBeenCalledWith("org/model", "model.Q4.gguf"));
    await waitFor(() => expect(screen.getByText("Manage Screen")).toBeInTheDocument());
  });
});
