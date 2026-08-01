import { useCallback, useEffect, useState } from "react";

import { getSettings, updateSettings } from "@/lib/api";
import type { HardwareProfile, Settings } from "@/types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ hardware: null, llamaSwapUrl: null, onboarded: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (hardware: HardwareProfile | null, llamaSwapUrl: string | null) => {
    const updated = await updateSettings(hardware, llamaSwapUrl);
    setSettings(updated);
  }, []);

  return { settings, loading, save };
}
