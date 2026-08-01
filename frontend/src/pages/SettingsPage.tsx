import { AlertCircle, CheckCircle2, Cpu, HardDrive, Network, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { GpuModelCombobox } from "@/components/GpuModelCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/hooks/useSettings";
import type { GpuDevice, HardwareProfile } from "@/types/settings";
import { cn } from "@/lib/utils";

function emptyGpu(): GpuDevice {
  return { name: null, vramGb: 0 };
}

const HARDWARE_KINDS = [
  {
    value: "gpus" as const,
    icon: Cpu,
    title: "One or more GPUs",
    description: "Dedicated VRAM per device — desktop or workstation cards.",
  },
  {
    value: "unified" as const,
    icon: HardDrive,
    title: "Unified memory (APU / iGPU / Apple Silicon)",
    description: "One shared pool between CPU and GPU.",
  },
];

function SectionCard({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-surface/40 bg-dark/60 p-7 space-y-5", className)}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-abyss border border-edge flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { settings, loading, save } = useSettings();

  return loading ? (
    <div className="p-10 text-text-secondary">Loading settings...</div>
  ) : (
    <SettingsForm hardware={settings.hardware} llamaSwapUrl={settings.llamaSwapUrl} save={save} />
  );
}

function SettingsForm({
  hardware,
  llamaSwapUrl,
  save,
}: {
  hardware: HardwareProfile | null;
  llamaSwapUrl: string | null;
  save: (hardware: HardwareProfile, llamaSwapUrl: string | null) => Promise<void>;
}) {
  const initial = hardware ?? { kind: "gpus" as const, gpus: [emptyGpu()], systemRamGb: null };

  const [kind, setKind] = useState<"gpus" | "unified">(initial.kind);
  const [gpus, setGpus] = useState<GpuDevice[]>(initial.gpus.length > 0 ? initial.gpus : [emptyGpu()]);
  const [systemRamGb, setSystemRamGb] = useState<string>(initial.systemRamGb?.toString() ?? "");
  const [llamaSwapUrlInput, setLlamaSwapUrlInput] = useState<string>(llamaSwapUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearFeedback = () => {
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const ramValue = systemRamGb.trim() === "" ? null : Number.parseFloat(systemRamGb);
    if (ramValue !== null && (Number.isNaN(ramValue) || ramValue <= 0)) {
      setError(kind === "unified" ? "Unified memory must be greater than 0." : "System RAM must be greater than 0.");
      return;
    }

    let profile: HardwareProfile;
    if (kind === "gpus") {
      if (gpus.some((g) => !g.vramGb || g.vramGb <= 0)) {
        setError("Each GPU needs a VRAM amount greater than 0.");
        return;
      }
      profile = { kind: "gpus", gpus, systemRamGb: ramValue };
    } else {
      if (ramValue === null) {
        setError("Enter your system RAM (unified memory) amount.");
        return;
      }
      profile = { kind: "unified", gpus: [], systemRamGb: ramValue };
    }

    try {
      await save(profile, llamaSwapUrlInput.trim() === "" ? null : llamaSwapUrlInput.trim());
      setSaved(true);
    } catch {
      setError("Failed to save settings. Please try again.");
    }
  };

  return (
    <div className="p-10 max-w-4xl">
      <div className="flex items-center gap-4 mb-1.5">
        <div className="w-12 h-12 rounded-lg bg-dark border border-edge flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-6 h-6 text-brand" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      <p className="text-sm text-text-secondary mb-8">
        Declare your hardware to see fit recommendations and create config entries with safe defaults.
      </p>

      <div className="space-y-5">
        <SectionCard
          icon={Cpu}
          title="Hardware"
          description="Used for VRAM fit checks and safe context/offload defaults."
        >
          <RadioGroup
            value={kind}
            onValueChange={(v) => {
              setKind(v as "gpus" | "unified");
              clearFeedback();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {HARDWARE_KINDS.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  setKind(opt.value);
                  clearFeedback();
                }}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-5 cursor-pointer transition-colors",
                  kind === opt.value
                    ? "border-brand/50 bg-brand-dim"
                    : "border-surface/40 bg-abyss hover:border-edge",
                )}
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    kind === opt.value ? "bg-brand/15" : "bg-dark border border-edge",
                  )}
                >
                  <opt.icon className="w-5 h-5 text-brand" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value={opt.value}
                      id={`hardware-kind-${opt.value}`}
                      aria-label={opt.title}
                      className="shrink-0"
                    />
                    <span className="text-sm font-medium text-text-primary">{opt.title}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1.5">{opt.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {kind === "gpus" && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                {gpus.map((gpu, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-surface/40 bg-abyss p-2.5"
                  >
                    <span className="w-5 text-center text-xs font-mono text-text-muted shrink-0">
                      {i + 1}
                    </span>
                    <GpuModelCombobox
                      name={gpu.name}
                      ariaLabel={`GPU ${i + 1} model`}
                      onSelectKnown={(entry) => {
                        const next = [...gpus];
                        next[i] = { name: entry.name, vramGb: entry.vramGb };
                        setGpus(next);
                        clearFeedback();
                      }}
                      onCustomName={(customName) => {
                        const next = [...gpus];
                        next[i] = { ...gpu, name: customName || null };
                        setGpus(next);
                        clearFeedback();
                      }}
                    />
                    <Label className="sr-only" htmlFor={`gpu-vram-${i}`}>
                      GPU {i + 1} VRAM (GB)
                    </Label>
                    <Input
                      id={`gpu-vram-${i}`}
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="GB"
                      aria-label={`GPU ${i + 1} VRAM (GB)`}
                      className="w-24 shrink-0 text-center font-mono text-xs"
                      value={gpu.vramGb || ""}
                      onChange={(e) => {
                        const next = [...gpus];
                        next[i] = { ...gpu, vramGb: Number.parseFloat(e.target.value) || 0 };
                        setGpus(next);
                        clearFeedback();
                      }}
                    />
                    {gpus.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove GPU ${i + 1}`}
                        onClick={() => setGpus(gpus.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-surface/40"
                onClick={() => setGpus([...gpus, emptyGpu()])}
              >
                <Plus className="w-4 h-4" />
                Add GPU
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              className="text-sm font-medium text-text-primary"
              htmlFor={kind === "unified" ? "unified-ram" : "system-ram"}
            >
              {kind === "unified" ? "Unified memory / shared pool (GB)" : "System RAM (GB)"}
            </Label>
            <Input
              id={kind === "unified" ? "unified-ram" : "system-ram"}
              aria-label={kind === "unified" ? "Unified memory (GB)" : "System RAM (GB)"}
              type="number"
              min="0"
              step="0.5"
              className="max-w-sm"
              value={systemRamGb}
              onChange={(e) => {
                setSystemRamGb(e.target.value);
                clearFeedback();
              }}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={Network}
          title="llama-swap connection"
          description="Optional. Enables health-verification after each config apply."
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-text-primary" htmlFor="llama-swap-url">
              llama-swap URL
            </Label>
            <Input
              id="llama-swap-url"
              aria-label="llama-swap URL"
              type="text"
              placeholder="http://llama-swap:8080"
              className="max-w-md font-mono text-xs"
              value={llamaSwapUrlInput}
              onChange={(e) => {
                setLlamaSwapUrlInput(e.target.value);
                clearFeedback();
              }}
            />
            <p className="text-xs text-text-muted">Leave blank to skip health verification.</p>
          </div>
        </SectionCard>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <Button onClick={handleSave} size="lg">
          Save
        </Button>
        {error && (
          <p className="text-sm text-red-400 flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Saved.
          </p>
        )}
      </div>
    </div>
  );
}
