import { Anchor, Compass, HardDrive, PanelLeftClose } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-testid="sidebar"
      className={`${collapsed ? "w-16" : "w-56"} bg-abyss/80 backdrop-blur-xl border-r border-surface/40 flex flex-col flex-shrink-0 transition-[width] duration-200`}
    >
      <div className="px-5 py-5 border-b border-surface/40">
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 w-full"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex-shrink-0 flex items-center justify-center">
            <Anchor className="w-4 h-4 text-abyss" />
          </div>
          {!collapsed && (
            <>
              <span className="font-display font-bold text-lg text-text-primary flex-1 text-left">Swapyard</span>
              <PanelLeftClose data-testid="sidebar-collapse-icon" className="w-4 h-4 text-text-muted flex-shrink-0" />
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 py-2 px-3 space-y-1">
        <NavLink
          to="/browse"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          <Compass className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Browse</span>}
        </NavLink>
        <NavLink
          to="/manage"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          <HardDrive className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Manage</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
