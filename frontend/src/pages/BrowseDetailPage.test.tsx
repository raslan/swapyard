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
        <Route path="/browse" element={<div>Browse Screen</div>} />
        <Route path="/browse/*" element={<BrowseDetailPage />} />
        <Route path="/manage" element={<div>Manage Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BrowseDetailPage", () => {
  it("renders the README in a sandboxed iframe on the overview tab by default", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "# Hello world",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    // BrowseDetailPage always calls useDownloads() (regardless of active tab), which
    // fires a real listActiveDownloads() fetch on mount, and useManagedModels() fires a real
    // listManagedModels() fetch on mount (used to detect already-downloaded quants). Without
    // these mocks, jsdom's fetch throws on the relative URLs, producing unhandled rejections
    // that fail the run even though both assertions pass.
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    const { container } = renderAt("/browse/org/model");

    // The README goes into an iframe's srcDoc, not the light DOM (see ReadmeFrame /
    // lib/readme.tsx) - jsdom doesn't reliably navigate srcdoc iframes, but the srcDoc
    // *attribute* is just a plain string and always readable, so assert on that.
    await waitFor(() => {
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute("srcdoc")).toContain("Hello world");
    });
  });

  it("renders raw HTML embedded in the README (e.g. a centered div wrapper)", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: '<div align="center">\n\n**Bold in a div**\n\n</div>',
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    const { container } = renderAt("/browse/org/model");

    // The raw <div> should be rendered as a real element (not literal "<div..." tag text),
    // and the markdown inside it should be processed (bold -> <strong>), not left as
    // "**Bold...**".
    await waitFor(() => {
      const srcDoc = container.querySelector("iframe")?.getAttribute("srcdoc") ?? "";
      expect(srcDoc).toContain('<div align="center">');
      expect(srcDoc).toContain("<strong>Bold in a div</strong>");
    });
  });

  it("never grants the README iframe script execution (allow-scripts)", async () => {
    // Root of the safety model: this render is intentionally unsanitized (see
    // lib/readme.tsx) because HF READMEs commonly rely on raw style="" attrs and <style>
    // blocks that a content-stripping sanitizer can't preserve without breaking layout.
    // Safety instead comes entirely from the sandbox attribute lacking "allow-scripts",
    // which makes every script-execution path (real <script>, on*= handlers, javascript:
    // hrefs) inert no matter what's in the markup. If this regresses, the README render
    // is no longer safe.
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme:
        '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)" alt="pwned">\n\n<a href="javascript:alert(1)">click me</a>',
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    const { container } = renderAt("/browse/org/model");

    await waitFor(() => {
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      const sandbox = iframe?.getAttribute("sandbox") ?? "";
      expect(sandbox.split(/\s+/)).not.toContain("allow-scripts");
    });
  });

  it("opens README links in a new tab (target=_blank, rel=noopener noreferrer)", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "[a link](https://example.com)",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    const { container } = renderAt("/browse/org/model");

    await waitFor(() => {
      const srcDoc = container.querySelector("iframe")?.getAttribute("srcdoc") ?? "";
      expect(srcDoc).toContain('target="_blank"');
      expect(srcDoc).toContain('rel="noopener noreferrer"');
    });
  });

  it("shows a Downloaded state instead of a Download button for an already-downloaded quant", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [
        { name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false },
        { name: "model.Q8.gguf", size: 2000, category: "gguf", isXet: false },
      ],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([
      {
        repoId: "org/model",
        sizeOnDisk: 1000,
        nbFiles: 1,
        lastModified: 1,
        ggufFiles: ["model.Q4.gguf"],
        configEntries: [],
      },
    ]);

    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText("Downloaded")).toBeInTheDocument());
    // The already-downloaded file has no Download button; the other quant still does.
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /download/i })).toHaveLength(1);
  });

  it("labels an Xet-backed file as a fast transfer with coarse progress", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: true }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText("fast transfer")).toBeInTheDocument());
  });

  it("shows files on the files tab and starts a download", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);
    const startSpy = vi.spyOn(api, "startDownload").mockResolvedValue({ id: "d1" });
    vi.spyOn(api, "subscribeToDownload").mockReturnValue(() => {});

    const user = userEvent.setup();
    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText("model.Q4.gguf")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => expect(startSpy).toHaveBeenCalledWith("org/model", "model.Q4.gguf", false));
    await waitFor(() => expect(screen.getByText("Manage Screen")).toBeInTheDocument());
  });

  it("navigates back to Browse when the back button is clicked", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "# Hello world",
      files: [{ name: "model.Q4.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    const user = userEvent.setup();
    renderAt("/browse/org/model");

    await waitFor(() => expect(screen.getByRole("button", { name: /back to browse/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /back to browse/i }));

    await waitFor(() => expect(screen.getByText("Browse Screen")).toBeInTheDocument());
  });

  it("sums all GPU VRAM when computing which quants fit", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "model-Q4_K_M.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: { kind: "gpus", gpus: [{ name: null, vramGb: 12 }, { name: null, vramGb: 12 }], systemRamGb: null } });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([
      {
        quant: "model-Q4_K_M.gguf",
        files: ["model-Q4_K_M.gguf"],
        weightBytes: 1000,
      },
    ]);

    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText(/fits your gpu/i)).toBeInTheDocument());
    expect(screen.getByText("model-Q4_K_M.gguf")).toBeInTheDocument();
  });

  it("uses systemRamGb as the pool size for unified memory", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "model-Q4_K_M.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: { kind: "unified", gpus: [], systemRamGb: 16 } });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([
      {
        quant: "model-Q4_K_M.gguf",
        files: ["model-Q4_K_M.gguf"],
        weightBytes: 1000,
      },
    ]);

    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText(/fits your gpu/i)).toBeInTheDocument());
    expect(screen.getByText("model-Q4_K_M.gguf")).toBeInTheDocument();
  });

  it("prompts to configure Settings when no VRAM budget is set yet", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "model-Q4_K_M.gguf", size: 1000, category: "gguf", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([
      {
        quant: "model-Q4_K_M.gguf",
        files: ["model-Q4_K_M.gguf"],
        weightBytes: 1000,
      },
    ]);

    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText(/set your vram in settings/i)).toBeInTheDocument());
    expect(screen.queryByText(/fits your gpu/i)).not.toBeInTheDocument();
  });

  it("renders files with no VRAM estimate ungrouped, unaffected by the feature", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 1,
      likes: 0,
      readme: "readme",
      files: [{ name: "mmproj-model-f16.gguf", size: 1000, category: "mmproj", isXet: false }],
    });
    vi.spyOn(api, "listActiveDownloads").mockResolvedValue([]);
    vi.spyOn(api, "listManagedModels").mockResolvedValue([]);
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null });
    vi.spyOn(api, "getVramEstimate").mockResolvedValue([]);

    renderAt("/browse/org/model?tab=files");

    await waitFor(() => expect(screen.getByText("mmproj-model-f16.gguf")).toBeInTheDocument());
    expect(screen.queryByText(/set your vram in settings/i)).not.toBeInTheDocument();
  });
});
