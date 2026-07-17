// frontend/src/lib/api.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteManagedModel, listManagedModels, searchModels, startDownload } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchModels", () => {
  it("fetches and camel-cases results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ repo_id: "org/model", author: "org", downloads: 5, likes: 1, tags: ["gguf"] }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchModels("llama");

    expect(fetchMock).toHaveBeenCalledWith("/api/browse/search?q=llama");
    expect(results).toEqual([
      { repoId: "org/model", author: "org", downloads: 5, likes: 1, tags: ["gguf"] },
    ]);
  });
});

describe("listManagedModels", () => {
  it("fetches with sort param and camel-cases results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { repo_id: "org/model", size_on_disk: 100, nb_files: 2, last_modified: 123 },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await listManagedModels("size");

    expect(fetchMock).toHaveBeenCalledWith("/api/manage/models?sort=size");
    expect(results[0].repoId).toBe("org/model");
    expect(results[0].sizeOnDisk).toBe(100);
  });
});

describe("deleteManagedModel", () => {
  it("sends a DELETE request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await deleteManagedModel("org/model");

    expect(fetchMock).toHaveBeenCalledWith("/api/manage/models/org/model", { method: "DELETE" });
  });
});

describe("startDownload", () => {
  it("posts repo and filename", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "abc" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await startDownload("org/model", "model.gguf");

    expect(fetchMock).toHaveBeenCalledWith("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: "org/model", filename: "model.gguf" }),
    });
    expect(result).toEqual({ id: "abc" });
  });
});
