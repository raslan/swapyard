import type {
  ApplyConfigResult,
  ConfigData,
  ConfigRevision,
  ConfigStatus,
  LlamaServerFlag,
} from "@/types/config";
import type { DownloadState } from "@/types/download";
import type { ManagedModel, ModelDetail, ModelSummary } from "@/types/model";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = init === undefined ? await fetch(url) : await fetch(url, init);
  if (!resp.ok) {
    throw new Error(`Request to ${url} failed with ${resp.status}`);
  }
  return resp.status === 204 || typeof resp.json !== "function" ? (undefined as T) : ((await resp.json()) as T);
}

export async function searchModels(query: string): Promise<ModelSummary[]> {
  const raw = await request<
    { repo_id: string; author: string; downloads: number; likes: number; tags: string[] }[]
  >(`/api/browse/search?q=${encodeURIComponent(query)}`);
  return raw.map((m) => ({
    repoId: m.repo_id,
    author: m.author,
    downloads: m.downloads,
    likes: m.likes,
    tags: m.tags,
  }));
}

export async function getModelDetail(repoId: string): Promise<ModelDetail> {
  const raw = await request<{
    repo_id: string;
    author: string;
    downloads: number;
    likes: number;
    readme: string;
    files: { name: string; size: number; category: "gguf" | "mmproj" | "other"; is_xet: boolean }[];
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
    }[]
  >(`/api/manage/models?sort=${sort}`);
  return raw.map((m) => ({
    repoId: m.repo_id,
    sizeOnDisk: m.size_on_disk,
    nbFiles: m.nb_files,
    lastModified: m.last_modified,
    ggufFiles: m.gguf_files,
  }));
}

export async function deleteManagedModel(repoId: string): Promise<void> {
  await request<void>(`/api/manage/models/${repoId}`, { method: "DELETE" });
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
