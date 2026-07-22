import { Anchor, Compass, HardDrive, PanelLeftClose, Settings2, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { getConfigStatus } from "@/lib/api";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [configFailed, setConfigFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      getConfigStatus().then((s) => {
        if (!cancelled) setConfigFailed(s.status?.startsWith("failed") ?? false);
      });
    };
    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside
      data-testid="sidebar"
      className={`${collapsed ? "w-16" : "w-56"} bg-abyss/80 backdrop-blur-xl border-r border-surface/40 flex flex-col shrink-0 relative overflow-hidden transition-[width] duration-200`}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      <div className="absolute inset-0 pointer-events-none z-0 bg-linear-to-b from-cyan/5 via-transparent to-transparent" />
      <div className="px-5 py-5 border-b border-surface/40 relative z-10">
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 w-full"
        >
          <div className="w-8 h-8 rounded-lg bg-white shrink-0 flex items-center justify-center">
            <Anchor className="w-4 h-4 text-abyss" />
          </div>
          {!collapsed && (
            <>
              <span className="font-display font-bold text-lg tracking-tight bg-linear-to-r from-text-primary to-text-secondary bg-clip-text text-transparent flex-1 text-left">
                Swapyard
              </span>
              <PanelLeftClose data-testid="sidebar-collapse-icon" className="w-4 h-4 text-text-muted shrink-0" />
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 py-2 px-3 space-y-1 relative z-10">
        <NavLink
          to="/browse"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          <Compass className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Browse</span>}
        </NavLink>
        <NavLink
          to="/manage"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          <HardDrive className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Manage</span>}
        </NavLink>
        <NavLink
          to="/config"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          <Settings2 className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Config</span>}
          {configFailed && (
            <span
              data-testid="config-nav-badge"
              className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0"
            />
          )}
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
