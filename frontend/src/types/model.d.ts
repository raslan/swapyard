export interface ModelSummary {
  repoId: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
}

export interface ModelFile {
  name: string;
  size: number;
  category: "gguf" | "mmproj" | "other";
}

export interface ModelDetail {
  repoId: string;
  author: string;
  downloads: number;
  likes: number;
  readme: string;
  files: ModelFile[];
}

export interface ManagedModel {
  repoId: string;
  sizeOnDisk: number;
  nbFiles: number;
  lastModified: number;
  ggufFiles: string[];
}
