export interface ModelSummary {
  repoId: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipelineTag: string | null;
  lastModified: number | null;
  gated: boolean;
  params: number | null;
  totalSize: number | null;
}

export interface DiscoverSections {
  trending: ModelSummary[];
  embeddings: ModelSummary[];
  vision: ModelSummary[];
  agentic: ModelSummary[];
}

export interface ModelFile {
  name: string;
  size: number;
  category: "gguf" | "mmproj" | "other";
  isXet: boolean;
}

export interface ModelDetail {
  repoId: string;
  author: string;
  downloads: number;
  likes: number;
  readme: string;
  files: ModelFile[];
  contextLength: number | null;
  recommendedSamplerParams: { label: string; params: Record<string, number> }[] | null;
}

export interface ManagedModel {
  repoId: string;
  sizeOnDisk: number;
  nbFiles: number;
  lastModified: number;
  ggufFiles: string[];
  mmprojFiles: string[];
  fileSizes: Record<string, number>;
  configEntries: string[];
}
