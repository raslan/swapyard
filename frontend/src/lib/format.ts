export function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatNumber(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec < 1024) return "0 MB/s";
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatEta(remainingBytes: number, bytesPerSec: number): string {
  if (!bytesPerSec || remainingBytes <= 0) return "";
  const seconds = Math.round(remainingBytes / bytesPerSec);
  if (seconds < 60) return `${seconds}s left`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s left`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m left`;
}

export function formatQuantLabel(filename: string): string {
  const stem = filename.replace(/\.gguf$/, "");
  const lastDot = stem.lastIndexOf(".");
  const lastDash = stem.lastIndexOf("-");
  const lastSeparator = Math.max(lastDot, lastDash);
  return lastSeparator === -1 ? stem : stem.slice(lastSeparator + 1);
}
