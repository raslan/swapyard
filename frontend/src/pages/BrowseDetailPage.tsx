import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import remarkGfm from "remark-gfm";

import { FileRow } from "@/components/FileRow";
import { useDownloads } from "@/hooks/useDownloads";
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
  const { start } = useDownloads();
  const navigate = useNavigate();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (loading) return <div className="p-10 text-text-muted">Loading...</div>;
  if (error || !detail) return <div className="p-10 text-text-muted">Failed to load model.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-10 pt-6">
        <h1 className="font-display text-2xl font-bold text-text-primary">{detail.repoId}</h1>
        <p className="text-sm text-text-muted font-mono">
          {detail.author} · {formatNumber(detail.downloads)} downloads · {detail.likes} likes
        </p>
      </div>

      <div className="px-10 border-b border-surface/40 flex gap-8 mt-4">
        <button
          className={`tab-btn px-1 py-3.5 text-sm ${tab === "overview" ? "active" : ""}`}
          onClick={() => setSearchParams({ tab: "overview" })}
        >
          Overview
        </button>
        <button
          className={`tab-btn px-1 py-3.5 text-sm ${tab === "files" ? "active" : ""}`}
          onClick={() => setSearchParams({ tab: "files" })}
        >
          Files
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {tab === "overview" && (
          <div className="markdown-body max-w-3xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.readme}</ReactMarkdown>
          </div>
        )}
        {tab === "files" && (
          <div className="space-y-2">
            {downloadError && (
              <p className="text-sm text-red-400" role="alert">
                {downloadError}
              </p>
            )}
            {detail.files.map((file) => (
              <FileRow
                key={file.name}
                file={file}
                onDownload={async () => {
                  try {
                    setDownloadError(null);
                    await start(repoId, file.name);
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
