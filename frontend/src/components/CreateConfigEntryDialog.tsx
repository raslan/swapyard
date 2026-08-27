import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createConfigEntry, getConfigFlags, getModelDetail } from "@/lib/api";
import { parseAllowedValues } from "@/lib/cmdFlagProvider";
import { formatQuantLabel } from "@/lib/format";
import type { LlamaServerFlag } from "@/types/config";
import type { ManagedModel } from "@/types/model";

// Used only if GET /api/config/flags hasn't been generated in this environment (missing
// llama_server_flags.json) - see backend/app/services/model_entry.py's cache_type_options,
// whose real data this dropdown is normally sourced from instead of this hardcoded copy.
const FALLBACK_CACHE_TYPES = ["f32", "f16", "bf16", "q8_0", "q4_0", "q4_1", "iq4_nl", "q5_0", "q5_1"];
const DEFAULT_CACHE_TYPE = "q8_0";
// Shown as the slider's ceiling when the model's real trained context length couldn't be
// read from Hugging Face (context_length missing from its GGUF metadata) - a generic,
// reasonably-modern ceiling rather than leaving the slider unusable.
const FALLBACK_MAX_CONTEXT = 131072;
// "Final Answer:" is the literal convention from the s1 paper's "budget forcing"
// technique (Muennighoff et al.) that --reasoning-budget-message implements - not
// a made-up phrase. This exact value is a real, working production message.
const DEFAULT_REASONING_BUDGET_MESSAGE = "Final Answer:\\nBased on my analysis above, ";

type SamplerFields = {
  temperature: string;
  topP: string;
  topK: string;
  minP: string;
  presencePenalty: string;
  repetitionPenalty: string;
};

const EMPTY_SAMPLER_FIELDS: SamplerFields = {
  temperature: "",
  topP: "",
  topK: "",
  minP: "",
  presencePenalty: "",
  repetitionPenalty: "",
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-text-muted cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function SamplerField({
  id,
  label,
  tooltip,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  tooltip: string;
  value: string;
  step: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-xs text-text-secondary">
          {label}
        </label>
        <InfoTooltip text={tooltip} />
      </div>
      <Input
        id={id}
        type="number"
        step={step}
        placeholder="not set"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs"
      />
    </div>
  );
}

export function CreateConfigEntryDialog({ model }: { model: ManagedModel }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modelId, setModelId] = useState(() => model.repoId.split("/").pop() ?? model.repoId);
  const [selectedFile, setSelectedFile] = useState(model.ggufFiles[0] ?? "");
  const [createError, setCreateError] = useState<string | null>(null);
  // mmproj files are sorted; pin the first so llama-server loads exactly the
  // projector that was downloaded, not whatever find_best_mmproj guesses.
  const mmprojToPin = model.mmprojFiles[0] ?? undefined;

  const [flags, setFlags] = useState<LlamaServerFlag[]>([]);
  const [maxContext, setMaxContext] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [useContextOverride, setUseContextOverride] = useState(false);
  const [contextSize, setContextSize] = useState(FALLBACK_MAX_CONTEXT);
  const [cacheType, setCacheType] = useState(DEFAULT_CACHE_TYPE);

  const [recommendedOptions, setRecommendedOptions] = useState<
    { label: string; params: Record<string, number> }[] | null
  >(null);
  const [appliedRecommendation, setAppliedRecommendation] = useState("");
  const [sampler, setSampler] = useState<SamplerFields>(EMPTY_SAMPLER_FIELDS);

  const [reasoning, setReasoning] = useState<"auto" | "on" | "off">("auto");
  const [reasoningBudget, setReasoningBudget] = useState("");
  const [reasoningBudgetMessage, setReasoningBudgetMessage] = useState(DEFAULT_REASONING_BUDGET_MESSAGE);

  const ctxFlag = flags.find((f) => f.flag === "--ctx-size" || f.aliases.includes("-c"));
  const cacheFlag = flags.find((f) => f.flag === "--cache-type-k" || f.aliases.includes("-ctk"));
  const cacheTypeOptions = cacheFlag ? parseAllowedValues(cacheFlag.description) : [];
  const cacheTypeChoices = cacheTypeOptions.length > 0 ? cacheTypeOptions : FALLBACK_CACHE_TYPES;
  const effectiveMaxContext = maxContext ?? FALLBACK_MAX_CONTEXT;
  const tempFlag = flags.find((f) => f.flag === "--temp");
  const topPFlag = flags.find((f) => f.flag === "--top-p");
  const topKFlag = flags.find((f) => f.flag === "--top-k");
  const minPFlag = flags.find((f) => f.flag === "--min-p");
  const presencePenaltyFlag = flags.find((f) => f.flag === "--presence-penalty");
  const repeatPenaltyFlag = flags.find((f) => f.flag === "--repeat-penalty");
  const reasoningFlag = flags.find((f) => f.flag === "--reasoning" || f.aliases.includes("-rea"));
  const reasoningBudgetFlag = flags.find((f) => f.flag === "--reasoning-budget");
  const reasoningBudgetMessageFlag = flags.find((f) => f.flag === "--reasoning-budget-message");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setModelId(model.repoId.split("/").pop() ?? model.repoId);
      setSelectedFile(model.ggufFiles[0] ?? "");
      setCreateError(null);
      setUseContextOverride(false);
      setCacheType(DEFAULT_CACHE_TYPE);
      setMaxContext(null);
      setContextSize(FALLBACK_MAX_CONTEXT);
      setRecommendedOptions(null);
      setAppliedRecommendation("");
      setSampler(EMPTY_SAMPLER_FIELDS);
      setReasoning("auto");
      setReasoningBudget("");
      setReasoningBudgetMessage(DEFAULT_REASONING_BUDGET_MESSAGE);

      getConfigFlags().then(setFlags).catch(() => setFlags([]));

      setDetailLoading(true);
      getModelDetail(model.repoId)
        .then((detail) => {
          setMaxContext(detail.contextLength);
          setContextSize(detail.contextLength ?? FALLBACK_MAX_CONTEXT);
          setRecommendedOptions(detail.recommendedSamplerParams);
        })
        .catch(() => {
          setMaxContext(null);
          setRecommendedOptions(null);
        })
        .finally(() => setDetailLoading(false));
    }
  };

  const applyRecommended = (label: string) => {
    const option = recommendedOptions?.find((o) => o.label === label);
    if (!option) return;
    setAppliedRecommendation(label);
    const params = option.params;
    setSampler((prev) => ({
      temperature: params.temperature != null ? String(params.temperature) : prev.temperature,
      topP: params.top_p != null ? String(params.top_p) : prev.topP,
      topK: params.top_k != null ? String(params.top_k) : prev.topK,
      minP: params.min_p != null ? String(params.min_p) : prev.minP,
      presencePenalty:
        params.presence_penalty != null ? String(params.presence_penalty) : prev.presencePenalty,
      repetitionPenalty:
        params.repetition_penalty != null ? String(params.repetition_penalty) : prev.repetitionPenalty,
    }));
  };

  const handleCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const samplerParams: Record<string, number> = {};
      if (sampler.temperature !== "") samplerParams.temperature = Number(sampler.temperature);
      if (sampler.topP !== "") samplerParams.top_p = Number(sampler.topP);
      if (sampler.topK !== "") samplerParams.top_k = Number(sampler.topK);
      if (sampler.minP !== "") samplerParams.min_p = Number(sampler.minP);
      if (sampler.presencePenalty !== "") samplerParams.presence_penalty = Number(sampler.presencePenalty);
      if (sampler.repetitionPenalty !== "") {
        samplerParams.repetition_penalty = Number(sampler.repetitionPenalty);
      }

      const result = await createConfigEntry(model.repoId, selectedFile, modelId, {
        contextSize: useContextOverride ? contextSize : undefined,
        cacheType,
        samplerParams,
        reasoning: reasoning === "auto" ? undefined : reasoning,
        reasoningBudget: reasoningBudget !== "" ? Number(reasoningBudget) : undefined,
        reasoningBudgetMessage: reasoningBudget !== "" ? reasoningBudgetMessage : undefined,
        mmprojFilename: mmprojToPin,
      });
      if (result.status === "ok") toast.success("Config entry created and verified healthy.");
      else if (result.status === "unverified")
        toast.warning(
          "Config entry created — couldn't verify (no reachable llama-swap URL configured).",
        );
      else
        toast.error(
          `Config entry created but apply failed: ${result.logs ?? "llama-swap did not become healthy in time"}`,
        );
      setOpen(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create config entry.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="w-4 h-4" />
          Create config entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create config entry</DialogTitle>
          <DialogDescription>
            Adds a minimal entry to config.yaml for{" "}
            <span className="font-mono">{model.repoId}</span>, relying on llama-swap's{" "}
            <span className="font-mono">--fit</span> for sizing.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={`model-id-${model.repoId}`} className="text-sm font-medium">
                Model ID
              </label>
              <Input
                id={`model-id-${model.repoId}`}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
            </div>
            {model.ggufFiles.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">GGUF file</label>
                <Select value={selectedFile} onValueChange={setSelectedFile}>
                  <SelectTrigger aria-label="GGUF file">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {model.ggufFiles.map((file) => (
                      <SelectItem key={file} value={file}>
                        {formatQuantLabel(file)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {mmprojToPin && (
              <p className="text-xs text-text-muted">
                Vision projector <span className="font-mono">{mmprojToPin}</span> will be pinned
                via <span className="font-mono">--mmproj-url</span> so llama-server loads this exact
                file instead of guessing.
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={useContextOverride}
                    onCheckedChange={(v) => setUseContextOverride(v === true)}
                  />
                  Set context window
                </label>
                <InfoTooltip
                  text={
                    ctxFlag?.description ??
                    "Size of the prompt context (-c / --ctx-size). Left unset, llama-server's --fit picks a safe value from available device memory at launch."
                  }
                />
              </div>
              {useContextOverride && (
                <div className="flex items-center gap-3 pl-6">
                  <Slider
                    className="flex-1"
                    min={256}
                    max={effectiveMaxContext}
                    step={256}
                    value={[Math.min(contextSize, effectiveMaxContext)]}
                    onValueChange={([v]) => setContextSize(v)}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={contextSize}
                    onChange={(e) => setContextSize(Number(e.target.value) || 0)}
                    className="w-28 font-mono text-xs"
                  />
                </div>
              )}
              {useContextOverride && (
                <p className="text-xs text-text-muted pl-6">
                  {detailLoading
                    ? "Looking up the model's trained context length…"
                    : maxContext != null
                      ? `Slider maxes out at this model's trained context length (${maxContext.toLocaleString()} tokens).`
                      : "Couldn't read this model's trained context length from Hugging Face — slider uses a generic ceiling; type any value manually."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium">KV cache quantization</label>
                <InfoTooltip
                  text={
                    cacheFlag?.description ??
                    "KV cache data type for both K and V (-ctk/-ctv). Lower precision trades a small amount of quality for meaningfully more usable context in the same VRAM."
                  }
                />
              </div>
              <Select value={cacheType} onValueChange={setCacheType}>
                <SelectTrigger aria-label="KV cache quantization">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cacheTypeChoices.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Sampler parameters</label>
              </div>
              {!detailLoading && !recommendedOptions && (
                <p className="text-xs text-text-muted">
                  No recommended sampler settings found for this model — leave blank to use
                  llama-server's own defaults, or set values manually.
                </p>
              )}
              {recommendedOptions && recommendedOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Fill from a recommended preset</label>
                  <Select value={appliedRecommendation} onValueChange={applyRecommended}>
                    <SelectTrigger aria-label="Fill from a recommended preset">
                      <SelectValue placeholder="Choose a preset…" />
                    </SelectTrigger>
                    <SelectContent>
                      {recommendedOptions.map((option) => (
                        <SelectItem key={option.label} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <SamplerField
                  id={`temperature-${model.repoId}`}
                  label="Temperature"
                  step="0.01"
                  value={sampler.temperature}
                  onChange={(v) => setSampler((p) => ({ ...p, temperature: v }))}
                  tooltip={
                    tempFlag?.description ??
                    "Sampling temperature. Higher values increase randomness; near 0 approaches greedy (most-likely-token) decoding."
                  }
                />
                <SamplerField
                  id={`top-p-${model.repoId}`}
                  label="Top P"
                  step="0.01"
                  value={sampler.topP}
                  onChange={(v) => setSampler((p) => ({ ...p, topP: v }))}
                  tooltip={
                    topPFlag?.description ??
                    "Nucleus sampling: only consider tokens whose cumulative probability reaches this threshold."
                  }
                />
                <SamplerField
                  id={`top-k-${model.repoId}`}
                  label="Top K"
                  step="1"
                  value={sampler.topK}
                  onChange={(v) => setSampler((p) => ({ ...p, topK: v }))}
                  tooltip={
                    topKFlag?.description ?? "Only consider the K most likely next tokens at each step."
                  }
                />
                <SamplerField
                  id={`min-p-${model.repoId}`}
                  label="Min P"
                  step="0.01"
                  value={sampler.minP}
                  onChange={(v) => setSampler((p) => ({ ...p, minP: v }))}
                  tooltip={
                    minPFlag?.description ??
                    "Minimum probability (relative to the most likely token) for a token to be considered at all."
                  }
                />
                <SamplerField
                  id={`presence-penalty-${model.repoId}`}
                  label="Presence penalty"
                  step="0.01"
                  value={sampler.presencePenalty}
                  onChange={(v) => setSampler((p) => ({ ...p, presencePenalty: v }))}
                  tooltip={
                    presencePenaltyFlag?.description ??
                    "Flat penalty applied to any token that has appeared at all so far, encouraging new topics. 0 = no penalty."
                  }
                />
                <SamplerField
                  id={`repetition-penalty-${model.repoId}`}
                  label="Repetition penalty"
                  step="0.01"
                  value={sampler.repetitionPenalty}
                  onChange={(v) => setSampler((p) => ({ ...p, repetitionPenalty: v }))}
                  tooltip={
                    repeatPenaltyFlag?.description ??
                    "Penalizes tokens that already appeared recently, to reduce repetitive/looping output. 1.0 = no penalty."
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reasoning</label>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-text-secondary">Thinking mode</label>
                  <InfoTooltip
                    text={
                      reasoningFlag?.description ??
                      "Force reasoning/thinking on or off (-rea/--reasoning). Auto detects from the model's chat template."
                    }
                  />
                </div>
                <Select value={reasoning} onValueChange={(v) => setReasoning(v as typeof reasoning)}>
                  <SelectTrigger aria-label="Thinking mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (default)</SelectItem>
                    <SelectItem value="on">On</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label htmlFor={`reasoning-budget-${model.repoId}`} className="text-xs text-text-secondary">
                    Reasoning budget (tokens)
                  </label>
                  <InfoTooltip
                    text={
                      reasoningBudgetFlag?.description ??
                      "Token budget for thinking before it's cut off. Left unset, thinking is unrestricted."
                    }
                  />
                </div>
                <Input
                  id={`reasoning-budget-${model.repoId}`}
                  type="number"
                  min={0}
                  placeholder="unrestricted"
                  value={reasoningBudget}
                  onChange={(e) => setReasoningBudget(e.target.value)}
                  className="w-40 font-mono text-xs"
                />
              </div>
              {reasoningBudget !== "" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={`reasoning-budget-message-${model.repoId}`}
                      className="text-xs text-text-secondary"
                    >
                      Budget message
                    </label>
                    <InfoTooltip
                      text={
                        reasoningBudgetMessageFlag?.description ??
                        "Message injected before the end-of-thinking tag once the reasoning budget is exhausted."
                      }
                    />
                  </div>
                  <Input
                    id={`reasoning-budget-message-${model.repoId}`}
                    value={reasoningBudgetMessage}
                    onChange={(e) => setReasoningBudgetMessage(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {createError && <p className="text-sm text-danger">{createError}</p>}

        <DialogFooter>
          <Button onClick={handleCreate} disabled={creating || !modelId.trim() || !selectedFile}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
