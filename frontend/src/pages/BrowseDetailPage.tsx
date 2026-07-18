import { AlertCircle, ArrowLeft, FileText, List, Loader2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { FileRow } from "@/components/FileRow";
import { Button } from "@/components/ui/button";
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
          <div className="markdown-body max-w-3xl">
            {/*
              HF model card READMEs routinely embed raw HTML (centered `<div>` wrappers, badge
              `<img>` tags, custom layout) that remark-gfm does not render — rehype-raw parses
              that raw HTML into the tree. Since README content is untrusted third-party input,
              rehype-raw MUST be paired with rehype-sanitize (run after it, so it cleans the
              parsed tree) to strip dangerous content like <script> or onerror= handlers. The
              default sanitize schema (GitHub-flavored-markdown-compatible) already permits what
              real model cards need — div/img/a tags, align/width/height/alt/src/href — so no
              custom schema is used here; see BrowseDetailPage.test.tsx for the pinned behavior.
            */}
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
              {detail.readme}
            </ReactMarkdown>
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
