export type DownloadStatus = "downloading" | "complete" | "cancelled" | "error";

export interface DownloadState {
  id: string;
  repoId: string;
  filename: string;
  total: number;
  downloaded: number;
  rate: number;
  isXet: boolean;
  status: DownloadStatus;
  error: string | null;
}
