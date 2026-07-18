import { AlertCircle, ArrowLeft, FileText, List, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { FileRow } from "@/components/FileRow";
import { ReadmeFrame } from "@/components/ReadmeFrame";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/hooks/useDownloads";
import { useManagedModels } from "@/hooks/useManagedModels";
import { useModelDetail } from "@/hooks/useModelDetail";
import { formatNumber } from "@/lib/format";

export function BrowseDetailPage() {
  // HF repo ids are "owner/name" (e.g. "TheBloke/Llama-2-7B-GGUF"), i.e. they contain a
  // literal "/". A named param segment (`:repoId`) can never match that — react-router
  // params never span a "/". The route is registered as a wildcard (`browse/*`) instead,
  // so the full remainder of the path is read from the "*" param.
  const params = useParams();
  const repoId = params["*"] ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "files" ? "files" : "overview";
  const { detail, loading, error } = useModelDetail(repoId);
  const { start, downloads } = useDownloads();
  const { models: managedModels } = useManagedModels();
  const navigate = useNavigate();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadedFiles = new Set(
    managedModels.find((m) => m.repoId === repoId)?.ggufFiles ?? [],
  );
  const downloadingFiles = new Set(
    downloads.filter((d) => d.repoId === repoId && d.status === "downloading").map((d) => d.filename),
  );

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 gap-2 text-text-muted hover:text-text-primary"
      onClick={() => navigate("/browse")}
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Browse
    </Button>
  );

  if (loading)
    return (
      <div className="p-10">
        {backButton}
        <div className="flex items-center gap-2 mt-4 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  if (error || !detail)
    return (
      <div className="p-10">
        {backButton}
        <div className="flex items-center gap-2 mt-4 text-text-muted">
          <AlertCircle className="w-4 h-4" />
          Failed to load model.
        </div>
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-6">
        {backButton}
        <h1 className="font-display text-2xl font-bold text-text-primary mt-3">
          {detail.repoId}
        </h1>
        <p className="text-sm text-text-muted font-mono">
          {detail.author} · {formatNumber(detail.downloads)} downloads · {detail.likes} likes
        </p>
      </div>

      <div className="px-10 border-b border-surface/40 flex gap-8 mt-4">
        <button
          className={`tab-btn px-1 py-3.5 text-sm inline-flex items-center gap-1.5 ${tab === "overview" ? "active" : ""}`}
          onClick={() => setSearchParams({ tab: "overview" })}
        >
          <FileText className="w-3.5 h-3.5" />
          Overview
        </button>
        <button
          className={`tab-btn px-1 py-3.5 text-sm inline-flex items-center gap-1.5 ${tab === "files" ? "active" : ""}`}
          onClick={() => setSearchParams({ tab: "files" })}
        >
          <List className="w-3.5 h-3.5" />
          Files
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {tab === "overview" && (
          <div className="max-w-3xl">
            <ReadmeFrame markdown={detail.readme} />
          </div>
        )}
        {tab === "files" && (
          <div className="space-y-2">
            {downloadError && (
              <p className="text-sm text-red-400 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {downloadError}
              </p>
            )}
            {detail.files.map((file) => (
              <FileRow
                key={file.name}
                file={file}
                status={
                  downloadedFiles.has(file.name)
                    ? "downloaded"
                    : downloadingFiles.has(file.name)
                      ? "downloading"
                      : "none"
                }
                onDownload={async () => {
                  try {
                    setDownloadError(null);
                    await start(repoId, file.name, file.isXet);
                    navigate("/manage");
                  } catch (err) {
                    console.error("Failed to start download", err);
                    setDownloadError("Failed to start download. Please try again.");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
