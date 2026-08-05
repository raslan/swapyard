import { AlertCircle, ArrowLeft, FileText, List, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { FileRow } from "@/components/FileRow";
import { QuantGroup } from "@/components/QuantGroup";
import { ReadmeFrame } from "@/components/ReadmeFrame";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDownloads } from "@/hooks/useDownloads";
import { useManagedModels } from "@/hooks/useManagedModels";
import { useModelDetail } from "@/hooks/useModelDetail";
import { useSettings } from "@/hooks/useSettings";
import { useVramEstimate } from "@/hooks/useVramEstimate";
import { formatNumber, formatSize } from "@/lib/format";
import type { ModelFile } from "@/types/model";
import type { HardwareProfile } from "@/types/settings";

// Approximation: for multi-GPU setups this sums total VRAM as the fit
// budget, same approximation-with-a-cushion spirit as FIT_CUSHION below —
// real multi-GPU layer-split efficiency varies, this is a ballpark.
function totalVramBytes(hardware: HardwareProfile | null): number | null {
  if (hardware === null) return null;
  if (hardware.kind === "gpus") {
    if (hardware.gpus.length === 0) return null;
    return hardware.gpus.reduce((sum, g) => sum + g.vramGb, 0) * 1_000_000_000;
  }
  return hardware.systemRamGb != null ? hardware.systemRamGb * 1_000_000_000 : null;
}

export function BrowseDetailPage() {
  // HF repo ids are "owner/name" (e.g. "TheBloke/Llama-2-7B-GGUF"), i.e. they contain a
  // literal "/". A named param segment (`:repoId`) can never match that - react-router
  // params never span a "/". The route is registered as a wildcard (`browse/*`) instead,
  // so the full remainder of the path is read from the "*" param.
  const params = useParams();
  const repoId = params["*"] ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "files" ? "files" : "overview";
  const { detail, loading, error } = useModelDetail(repoId);
  const { start, downloads } = useDownloads();
  const { models: managedModels } = useManagedModels();
  const { estimate } = useVramEstimate(repoId);
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mmprojChoices, setMmprojChoices] = useState<ModelFile[] | null>(null);
  const [selectedMmproj, setSelectedMmproj] = useState<string | null>(null);

  const managedModel = managedModels.find((m) => m.repoId === repoId);
  const downloadedFiles = new Set([
    ...(managedModel?.ggufFiles ?? []),
    ...(managedModel?.mmprojFiles ?? []),
  ]);
  const downloadingFiles = new Set(
    downloads.filter((d) => d.repoId === repoId && d.status === "downloading").map((d) => d.filename),
  );

  const fileStatus = (file: ModelFile): "none" | "downloading" | "downloaded" =>
    downloadedFiles.has(file.name) ? "downloaded" : downloadingFiles.has(file.name) ? "downloading" : "none";

  const mmprojFiles = detail?.files.filter((f) => f.category === "mmproj") ?? [];

  const startFile = async (file: ModelFile) => {
    await start(repoId, file.name, file.isXet);
  };

  const handleDownload = async (file: ModelFile) => {
    try {
      setDownloadError(null);
      await startFile(file);

      // Vision models need their mmproj alongside the weights - llama-server's
      // `-hf` auto-fetches it on load if missing, but that means the model's
      // first load silently re-triggers a download instead of just mmap'ing
      // straight to inference. Only one mmproj is ever needed (independent of
      // which weight quant was picked), so bundle it in here instead.
      const missingMmproj = mmprojFiles.filter((f) => fileStatus(f) === "none");
      if (file.category === "gguf" && missingMmproj.length === 1) {
        await startFile(missingMmproj[0]);
      } else if (file.category === "gguf" && missingMmproj.length > 1) {
        setSelectedMmproj(missingMmproj[0].name);
        setMmprojChoices(missingMmproj);
        return;
      }
      navigate("/manage", { state: { fromRepoId: repoId } });
    } catch (err) {
      console.error("Failed to start download", err);
      setDownloadError("Failed to start download. Please try again.");
    }
  };

  const resolveMmprojChoice = async (fileName: string | null) => {
    try {
      const chosen = fileName ? mmprojChoices?.find((f) => f.name === fileName) : undefined;
      if (chosen) await startFile(chosen);
      setMmprojChoices(null);
      navigate("/manage", { state: { fromRepoId: repoId } });
    } catch (err) {
      console.error("Failed to start download", err);
      setDownloadError("Failed to start download. Please try again.");
      setMmprojChoices(null);
    }
  };

  // Fit is computed client-side against the settings budget (rather than
  // server-side) so changing the budget never needs a re-fetch. Weight size
  // only - a flat 25% cushion accounts for context/runtime overhead without
  // trying to model it precisely (see HISTORY.md). Every quant that fits is
  // badged; the largest of those is additionally marked "Recommended".
  const FIT_CUSHION = 1.25;
  const budgetBytes = totalVramBytes(settings.hardware);
  const fittingQuants = budgetBytes != null ? estimate.filter((g) => g.weightBytes * FIT_CUSHION <= budgetBytes) : [];
  const recommendedQuant = fittingQuants.sort((a, b) => b.weightBytes - a.weightBytes)[0];

  const groupedNames = new Set(estimate.flatMap((g) => g.files));
  const ungroupedFiles = (detail?.files.filter((f) => !groupedNames.has(f.name)) ?? [])
    .slice()
    .sort((a, b) => a.size - b.size);
  const sortedEstimate = estimate.slice().sort((a, b) => a.weightBytes - b.weightBytes);

  // Prefer real back-navigation so the previous /browse entry's search query and
  // scroll position come back intact. location.key === "default" means this page
  // was loaded directly (no prior entry to go back to, e.g. a shared link) - only
  // then fall back to a fixed destination.
  const goBack = () => {
    if (location.key === "default") navigate("/browse");
    else navigate(-1);
  };

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 gap-2 text-text-muted hover:text-text-primary"
      onClick={goBack}
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
          <div className="max-w-5xl">
            <ReadmeFrame markdown={detail.readme} />
          </div>
        )}
        {tab === "files" && (
          <div className="space-y-4">
            {downloadError && (
              <p className="text-sm text-red-400 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {downloadError}
              </p>
            )}
            {estimate.length > 0 && settings.hardware == null && (
              <p className="text-xs text-text-muted">
                <Link to="/settings" className="text-brand underline underline-offset-2 hover:text-brand/80">
                  Set your VRAM in Settings
                </Link>{" "}
                to see fit recommendations.
              </p>
            )}
            {sortedEstimate.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Quantizations
                </h3>
                <div className="space-y-4">
                  {sortedEstimate.map((group) => (
                    <QuantGroup
                      key={group.quant}
                      files={group.files
                        .map((name) => detail.files.find((f) => f.name === name))
                        .filter((f): f is ModelFile => f !== undefined)}
                      fits={fittingQuants.some((g) => g.quant === group.quant)}
                      recommended={recommendedQuant?.quant === group.quant}
                      fileStatus={fileStatus}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </div>
            )}
            {ungroupedFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Other files
                </h3>
                <div className="space-y-2">
                  {ungroupedFiles.map((file) => (
                    <FileRow
                      key={file.name}
                      file={file}
                      status={fileStatus(file)}
                      onDownload={() => handleDownload(file)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={mmprojChoices !== null} onOpenChange={(open) => !open && resolveMmprojChoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Which mmproj file?</DialogTitle>
            <DialogDescription>
              This repo has multiple vision projector files. Only one is needed — pick one to
              download alongside the weights, or skip.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedMmproj ?? undefined} onValueChange={setSelectedMmproj}>
            {mmprojChoices?.map((f) => (
              <label
                key={f.name}
                htmlFor={`mmproj-${f.name}`}
                className="flex items-center gap-3 rounded-lg border border-surface/40 bg-abyss p-3 cursor-pointer"
              >
                <RadioGroupItem value={f.name} id={`mmproj-${f.name}`} />
                <div className="min-w-0">
                  <Label htmlFor={`mmproj-${f.name}`} className="font-mono text-xs truncate block cursor-pointer">
                    {f.name}
                  </Label>
                  <p className="text-xs text-text-muted mt-0.5">{formatSize(f.size)}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => resolveMmprojChoice(null)}>
              Skip
            </Button>
            <Button onClick={() => resolveMmprojChoice(selectedMmproj)}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
