import { useCallback, useEffect, useState } from "react";

import { getSettings, updateSettings } from "@/lib/api";
import type { Settings } from "@/types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ vramBudgetGb: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (vramBudgetGb: number) => {
    const updated = await updateSettings(vramBudgetGb);
    setSettings(updated);
  }, []);

  return { settings, loading, save };
}
