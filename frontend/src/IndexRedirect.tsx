import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getSettings } from "@/lib/api";

// "First ever open" is tracked server-side (Settings.onboarded, persisted in
// data/settings.json) rather than in the browser, so it's consistent across
// devices/reinstalls and survives clearing site data.
export function IndexRedirect() {
  const [target, setTarget] = useState<"/settings" | "/browse" | null>(null);

  useEffect(() => {
    getSettings().then((s) => setTarget(s.onboarded ? "/browse" : "/settings"));
  }, []);

  if (target === null) return null;
  return <Navigate to={target} replace />;
}
