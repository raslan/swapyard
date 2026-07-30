// frontend/src/lib/api.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConfigConflictError,
  ConfigValidationError,
  applyConfig,
  deleteManagedModel,
  getConfig,
  getConfigFlags,
  getConfigHistory,
  getConfigSchema,
  getConfigStatus,
  getSettings,
  getVramEstimate,
  listManagedModels,
  searchModels,
  startDownload,
  updateSettings,
} from "./api";

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
      body: JSON.stringify({ repo_id: "org/model", filename: "model.gguf", is_xet: false }),
    });
    expect(result).toEqual({ id: "abc" });
  });

  it("passes is_xet through when the file is Xet-backed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "abc" }) });
    vi.stubGlobal("fetch", fetchMock);

    await startDownload("org/model", "model.gguf", true);

    expect(fetchMock).toHaveBeenCalledWith("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: "org/model", filename: "model.gguf", is_xet: true }),
    });
  });
});

describe("getConfig", () => {
  it("fetches content and hash", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ content: "models: {}\n", hash: "abc" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getConfig();

    expect(fetchMock).toHaveBeenCalledWith("/api/config");
    expect(result).toEqual({ content: "models: {}\n", hash: "abc" });
  });
});

describe("getConfigSchema", () => {
  it("fetches the raw schema object", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ title: "x" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getConfigSchema();

    expect(fetchMock).toHaveBeenCalledWith("/api/config/schema");
    expect(result).toEqual({ title: "x" });
  });
});

describe("getConfigStatus", () => {
  it("fetches status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: "ok", timestamp: 123 }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getConfigStatus();

    expect(fetchMock).toHaveBeenCalledWith("/api/config/status");
    expect(result).toEqual({ status: "ok", timestamp: 123 });
  });
});

describe("getConfigHistory", () => {
  it("fetches the revision list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ sha: "abc", timestamp: 1, status: "ok", content: "models: {}\n" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getConfigHistory();

    expect(fetchMock).toHaveBeenCalledWith("/api/config/history");
    expect(result).toEqual([{ sha: "abc", timestamp: 1, status: "ok", content: "models: {}\n" }]);
  });
});

describe("applyConfig", () => {
  it("posts content and base_hash, returns the result on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "unverified", logs: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await applyConfig("models: {}\n", "abc");

    expect(fetchMock).toHaveBeenCalledWith("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "models: {}\n", base_hash: "abc" }),
    });
    expect(result).toEqual({ status: "unverified", logs: null });
  });

  it("throws ConfigConflictError with disk content on 409", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ current_content: "models: {}\n", current_hash: "xyz" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(applyConfig("models: {a: 1}\n", "stale")).rejects.toBeInstanceOf(
      ConfigConflictError,
    );
  });

  it("throws ConfigValidationError with the error message on 422", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: { code: "invalid_config", message: "models: is required" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(applyConfig("bad: yaml\n", "abc")).rejects.toThrow(ConfigValidationError);
  });
});

describe("getConfigFlags", () => {
  it("fetches the flags list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ flag: "--ngl", aliases: ["-ngl"], description: "layers", default: "0" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getConfigFlags();

    expect(fetchMock).toHaveBeenCalledWith("/api/config/flags");
    expect(result).toEqual([{ flag: "--ngl", aliases: ["-ngl"], description: "layers", default: "0" }]);
  });
});

describe("getSettings", () => {
  it("getSettings maps a GPU hardware profile from snake_case", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hardware: {
          kind: "gpus",
          gpus: [{ name: "GPU 0", vram_gb: 24 }],
          system_ram_gb: 64,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const settings = await getSettings();

    expect(settings.hardware).toEqual({
      kind: "gpus",
      gpus: [{ name: "GPU 0", vramGb: 24 }],
      systemRamGb: 64,
    });
  });

  it("getSettings maps null hardware", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hardware: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const settings = await getSettings();

    expect(settings.hardware).toBeNull();
  });
});

describe("updateSettings", () => {
  it("updateSettings sends camelCase hardware as snake_case body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hardware: { kind: "unified", gpus: [], system_ram_gb: 32 },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await updateSettings({ kind: "unified", gpus: [], systemRamGb: 32 });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body).toEqual({
      hardware: { kind: "unified", gpus: [], system_ram_gb: 32 },
    });
  });
});

describe("getVramEstimate", () => {
  it("fetches and camel-cases the quant groups", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        groups: [
          {
            quant: "model-Q4_K_M.gguf",
            files: ["model-Q4_K_M.gguf"],
            weight_bytes: 4_000_000_000,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getVramEstimate("org/model");

    expect(fetchMock).toHaveBeenCalledWith("/api/browse/org/model/vram-estimate");
    expect(result).toEqual([
      {
        quant: "model-Q4_K_M.gguf",
        files: ["model-Q4_K_M.gguf"],
        weightBytes: 4_000_000_000,
      },
    ]);
  });
});
