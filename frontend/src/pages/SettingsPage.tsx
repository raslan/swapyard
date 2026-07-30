import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import type { GpuDevice, HardwareProfile } from "@/types/settings";

function emptyGpu(): GpuDevice {
  return { name: null, vramGb: 0 };
}

export function SettingsPage() {
  const { settings, loading, save } = useSettings();

  return loading ? (
    <div className="p-10 text-text-secondary">Loading settings...</div>
  ) : (
    <SettingsForm hardware={settings.hardware} save={save} />
  );
}

function SettingsForm({
  hardware,
  save,
}: {
  hardware: HardwareProfile | null;
  save: (hardware: HardwareProfile) => Promise<void>;
}) {
  const initial = hardware ?? { kind: "gpus" as const, gpus: [emptyGpu()], systemRamGb: null };

  const [kind, setKind] = useState<"gpus" | "unified">(initial.kind);
  const [gpus, setGpus] = useState<GpuDevice[]>(initial.gpus.length > 0 ? initial.gpus : [emptyGpu()]);
  const [systemRamGb, setSystemRamGb] = useState<string>(initial.systemRamGb?.toString() ?? "");
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
      await save(profile);
      setSaved(true);
    } catch {
      setError("Failed to save settings. Please try again.");
    }
  };

  return (
    <div className="p-10 max-w-md">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">
        <span className="text-gradient-animate">Settings</span>
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Declare your hardware to see fit recommendations and create config entries with safe defaults.
      </p>

      <fieldset className="mb-4">
        <legend className="text-sm font-medium text-text-primary mb-2">Hardware type</legend>
        <label className="flex items-center gap-2 text-sm text-text-secondary mb-1.5">
          <input
            type="radio"
            name="hardware-kind"
            checked={kind === "gpus"}
            onChange={() => {
              setKind("gpus");
              clearFeedback();
            }}
          />
          One or more GPUs
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="radio"
            name="hardware-kind"
            checked={kind === "unified"}
            onChange={() => {
              setKind("unified");
              clearFeedback();
            }}
          />
          Unified memory (APU / iGPU / Apple Silicon)
        </label>
      </fieldset>

      {kind === "gpus" && (
        <div className="mb-4">
          {gpus.map((gpu, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <label className="sr-only" htmlFor={`gpu-vram-${i}`}>
                GPU {i + 1} VRAM (GB)
              </label>
              <input
                id={`gpu-vram-${i}`}
                type="number"
                min="0"
                step="0.5"
                aria-label={`GPU ${i + 1} VRAM (GB)`}
                className="w-full rounded-lg border border-surface/40 bg-abyss px-3 py-2 text-sm text-text-primary"
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
          <Button variant="ghost" size="sm" onClick={() => setGpus([...gpus, emptyGpu()])}>
            <Plus className="w-4 h-4" />
            Add GPU
          </Button>
        </div>
      )}

      <label
        className="text-sm font-medium text-text-primary block mb-2"
        htmlFor={kind === "unified" ? "unified-ram" : "system-ram"}
      >
        {kind === "unified" ? "Unified memory / shared pool (GB)" : "System RAM (GB)"}
      </label>
      <input
        id={kind === "unified" ? "unified-ram" : "system-ram"}
        aria-label={kind === "unified" ? "Unified memory (GB)" : "System RAM (GB)"}
        type="number"
        min="0"
        step="0.5"
        className="w-full rounded-lg border border-surface/40 bg-abyss px-3 py-2 text-sm text-text-primary mb-4"
        value={systemRamGb}
        onChange={(e) => {
          setSystemRamGb(e.target.value);
          clearFeedback();
        }}
      />

      <Button onClick={handleSave}>Save</Button>
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-2 mt-3" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-success mt-3">Saved.</p>}
    </div>
  );
}
