import type {
  ApplyConfigResult,
  ConfigData,
  ConfigRevision,
  ConfigStatus,
  LlamaServerFlag,
} from "@/types/config";
import type { DownloadState } from "@/types/download";
import type { DiscoverSections, ManagedModel, ModelDetail, ModelSummary } from "@/types/model";
import type { HardwareProfile, Settings } from "@/types/settings";
import type { QuantEstimate } from "@/types/vram";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = init === undefined ? await fetch(url) : await fetch(url, init);
  if (!resp.ok) {
    throw new Error(`Request to ${url} failed with ${resp.status}`);
  }
  return resp.status === 204 || typeof resp.json !== "function" ? (undefined as T) : ((await resp.json()) as T);
}

type ModelSummaryRaw = {
  repo_id: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag: string | null;
  last_modified: number | null;
  gated: boolean;
  params: number | null;
  total_size: number | null;
};

function toModelSummary(m: ModelSummaryRaw): ModelSummary {
  return {
    repoId: m.repo_id,
    author: m.author,
    downloads: m.downloads,
    likes: m.likes,
    tags: m.tags,
    pipelineTag: m.pipeline_tag,
    lastModified: m.last_modified,
    gated: m.gated,
    params: m.params,
    totalSize: m.total_size,
  };
}

export async function searchModels(query: string): Promise<ModelSummary[]> {
  const raw = await request<ModelSummaryRaw[]>(`/api/browse/search?q=${encodeURIComponent(query)}`);
  return raw.map(toModelSummary);
}

export async function getDiscoverSections(): Promise<DiscoverSections> {
  const raw = await request<{
    trending: ModelSummaryRaw[];
    embeddings: ModelSummaryRaw[];
    vision: ModelSummaryRaw[];
    agentic: ModelSummaryRaw[];
  }>("/api/browse/discover");
  return {
    trending: raw.trending.map(toModelSummary),
    embeddings: raw.embeddings.map(toModelSummary),
    vision: raw.vision.map(toModelSummary),
    agentic: raw.agentic.map(toModelSummary),
  };
}

export async function getModelDetail(repoId: string): Promise<ModelDetail> {
  const raw = await request<{
    repo_id: string;
    author: string;
    downloads: number;
    likes: number;
    readme: string;
    files: { name: string; size: number; category: "gguf" | "mmproj" | "other"; is_xet: boolean }[];
    context_length: number | null;
    recommended_sampler_params: { label: string; params: Record<string, number> }[] | null;
  }>(`/api/browse/models/${repoId}`);
  return {
    repoId: raw.repo_id,
    author: raw.author,
    downloads: raw.downloads,
    likes: raw.likes,
    readme: raw.readme,
    files: raw.files.map((f) => ({
      name: f.name,
      size: f.size,
      category: f.category,
      isXet: f.is_xet,
    })),
    contextLength: raw.context_length,
    recommendedSamplerParams: raw.recommended_sampler_params,
  };
}

export async function listManagedModels(sort: "size" | "name"): Promise<ManagedModel[]> {
  const raw = await request<
    {
      repo_id: string;
      size_on_disk: number;
      nb_files: number;
      last_modified: number;
      gguf_files: string[];
      mmproj_files: string[];
      file_sizes: Record<string, number>;
      config_entries: string[];
    }[]
  >(`/api/manage/models?sort=${sort}`);
  return raw.map((m) => ({
    repoId: m.repo_id,
    sizeOnDisk: m.size_on_disk,
    nbFiles: m.nb_files,
    lastModified: m.last_modified,
    ggufFiles: m.gguf_files,
    mmprojFiles: m.mmproj_files,
    fileSizes: m.file_sizes ?? {},
    configEntries: m.config_entries,
  }));
}

export async function deleteManagedModel(repoId: string, removeConfigEntries = false): Promise<void> {
  const query = removeConfigEntries ? "?remove_config_entries=true" : "";
  await request<void>(`/api/manage/models/${repoId}${query}`, { method: "DELETE" });
}

export async function deleteManagedModelFile(repoId: string, filename: string): Promise<void> {
  await request<void>(`/api/manage/models/${repoId}/files/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
}

export async function startDownload(
  repoId: string,
  filename: string,
  isXet = false,
): Promise<{ id: string }> {
  return request<{ id: string }>("/api/downloads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_id: repoId, filename, is_xet: isXet }),
  });
}

function toDownloadState(raw: {
  id: string;
  repo_id: string;
  filename: string;
  total: number;
  downloaded: number;
  rate: number;
  is_xet: boolean;
  status: DownloadState["status"];
  error: string | null;
}): DownloadState {
  return {
    id: raw.id,
    repoId: raw.repo_id,
    filename: raw.filename,
    isXet: raw.is_xet,
    total: raw.total,
    downloaded: raw.downloaded,
    rate: raw.rate,
    status: raw.status,
    error: raw.error,
  };
}

export async function listActiveDownloads(): Promise<DownloadState[]> {
  const raw = await request<Parameters<typeof toDownloadState>[0][]>("/api/downloads");
  return raw.map(toDownloadState);
}

export async function cancelDownload(id: string): Promise<void> {
  await request<void>(`/api/downloads/${id}`, { method: "DELETE" });
}

export function subscribeToDownload(
  id: string,
  onUpdate: (state: DownloadState) => void,
  onDone: (state: DownloadState) => void,
): () => void {
  const source = new EventSource(`/api/downloads/${id}/events`);

  source.addEventListener("progress", (event) => {
    onUpdate(toDownloadState(JSON.parse((event as MessageEvent).data)));
  });
  source.addEventListener("done", (event) => {
    onDone(toDownloadState(JSON.parse((event as MessageEvent).data)));
    source.close();
  });

  return () => source.close();
}

export class ConfigConflictError extends Error {
  diskContent: string;
  diskHash: string;

  constructor(diskContent: string, diskHash: string) {
    super("config changed on disk since it was loaded");
    this.diskContent = diskContent;
    this.diskHash = diskHash;
  }
}

export class ConfigValidationError extends Error {}

export async function getConfig(): Promise<ConfigData> {
  return request<ConfigData>("/api/config");
}

export async function getConfigSchema(): Promise<object> {
  return request<object>("/api/config/schema");
}

export async function getConfigStatus(): Promise<ConfigStatus> {
  return request<ConfigStatus>("/api/config/status");
}

export async function getConfigHistory(): Promise<ConfigRevision[]> {
  return request<ConfigRevision[]>("/api/config/history");
}

export async function getConfigFlags(): Promise<LlamaServerFlag[]> {
  return request<LlamaServerFlag[]>("/api/config/flags");
}

export interface NormalizeReportItem {
  model_id: string;
  changes: string[];
  skipped: string | null;
}

export async function normalizeConfig(): Promise<{
  content: string;
  report: NormalizeReportItem[];
}> {
  return request("/api/config/normalize", { method: "POST" });
}

export async function applyConfig(content: string, baseHash: string): Promise<ApplyConfigResult> {
  const resp = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, base_hash: baseHash }),
  });

  if (resp.status === 409) {
    const body = await resp.json();
    throw new ConfigConflictError(body.current_content, body.current_hash);
  }
  if (resp.status === 422) {
    const body = await resp.json();
    throw new ConfigValidationError(body.error.message);
  }
  if (!resp.ok) {
    throw new Error(`Request to /api/config failed with ${resp.status}`);
  }
  return (await resp.json()) as ApplyConfigResult;
}

export async function createConfigEntry(
  repoId: string,
  filename: string,
  modelId: string,
  options?: {
    contextSize?: number;
    cacheType?: string;
    samplerParams?: Record<string, number>;
    reasoning?: "on" | "off";
    reasoningBudget?: number;
    reasoningBudgetMessage?: string;
    mmprojFilename?: string;
  },
): Promise<ApplyConfigResult> {
  const resp = await fetch("/api/config/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_id: repoId,
      filename,
      model_id: modelId,
      context_size: options?.contextSize ?? null,
      cache_type: options?.cacheType ?? null,
      sampler_params:
        options?.samplerParams && Object.keys(options.samplerParams).length > 0
          ? options.samplerParams
          : null,
      reasoning: options?.reasoning ?? null,
      reasoning_budget: options?.reasoningBudget ?? null,
      reasoning_budget_message: options?.reasoningBudgetMessage ?? null,
      mmproj_filename: options?.mmprojFilename ?? null,
    }),
  });

  if (resp.status === 409) {
    const body = await resp.json();
    if (body && typeof body.current_content === "string" && typeof body.current_hash === "string") {
      throw new ConfigConflictError(body.current_content, body.current_hash);
    }
    throw new Error(body?.error?.message ?? `Request to /api/config/models failed with 409`);
  }
  if (resp.status === 422) {
    const body = await resp.json();
    throw new ConfigValidationError(body.error.message);
  }
  if (!resp.ok) {
    throw new Error(`Request to /api/config/models failed with ${resp.status}`);
  }
  return (await resp.json()) as ApplyConfigResult;
}

function toHardware(raw: {
  kind: "gpus" | "unified";
  gpus: { name: string | null; vram_gb: number }[];
  system_ram_gb: number | null;
} | null): HardwareProfile | null {
  if (raw === null) return null;
  return {
    kind: raw.kind,
    gpus: raw.gpus.map((g) => ({ name: g.name, vramGb: g.vram_gb })),
    systemRamGb: raw.system_ram_gb,
  };
}

function toHardwareRaw(hardware: HardwareProfile | null) {
  if (hardware === null) return null;
  return {
    kind: hardware.kind,
    gpus: hardware.gpus.map((g) => ({ name: g.name, vram_gb: g.vramGb })),
    system_ram_gb: hardware.systemRamGb,
  };
}

type SettingsRaw = {
  hardware: Parameters<typeof toHardware>[0];
  llama_swap_url: string | null;
  onboarded: boolean;
};

export async function getSettings(): Promise<Settings> {
  const raw = await request<SettingsRaw>("/api/settings");
  return { hardware: toHardware(raw.hardware), llamaSwapUrl: raw.llama_swap_url, onboarded: raw.onboarded };
}

export async function updateSettings(
  hardware: HardwareProfile | null,
  llamaSwapUrl: string | null,
): Promise<Settings> {
  const raw = await request<SettingsRaw>("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hardware: toHardwareRaw(hardware), llama_swap_url: llamaSwapUrl }),
  });
  return { hardware: toHardware(raw.hardware), llamaSwapUrl: raw.llama_swap_url, onboarded: raw.onboarded };
}

export async function getVramEstimate(repoId: string): Promise<QuantEstimate[]> {
  const raw = await request<{
    groups: { quant: string; files: string[]; weight_bytes: number }[];
  }>(`/api/browse/${repoId}/vram-estimate`);
  return raw.groups.map((g) => ({
    quant: g.quant,
    files: g.files,
    weightBytes: g.weight_bytes,
  }));
}
