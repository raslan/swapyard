import { AlertCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

export function SettingsPage() {
  const { settings, loading, save } = useSettings();
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="p-10 text-text-secondary">Loading settings...</div>;

  const value = draft ?? (settings.vramBudgetGb?.toString() ?? "");

  return (
    <div className="p-10 max-w-md">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1.5">
        <span className="text-gradient-animate">Settings</span>
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        Set your usable VRAM to see fit recommendations on model download pages.
      </p>
      <label className="text-sm font-medium text-text-primary block mb-2" htmlFor="vram-budget">
        Usable VRAM (GB)
      </label>
      <input
        id="vram-budget"
        type="number"
        min="0"
        step="0.5"
        className="w-full rounded-lg border border-surface/40 bg-abyss px-3 py-2 text-sm text-text-primary mb-4"
        value={value}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
          setError(null);
        }}
      />
      <Button
        onClick={async () => {
          const parsed = Number.parseFloat(value);
          if (Number.isNaN(parsed) || parsed <= 0) {
            setError("Enter a VRAM amount greater than 0.");
            return;
          }
          try {
            await save(parsed);
            setError(null);
            setSaved(true);
          } catch (err) {
            setError("Failed to save settings. Please try again.");
          }
        }}
      >
        Save
      </Button>
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
