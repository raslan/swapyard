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
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex-shrink-0" />
          {!collapsed && <span className="font-display font-bold text-lg text-text-primary">Swapyard</span>}
        </button>
      </div>

      <nav className="flex-1 py-2 px-3 space-y-1">
        <NavLink
          to="/browse"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          {!collapsed && <span>Browse</span>}
        </NavLink>
        <NavLink
          to="/manage"
          className={({ isActive }) =>
            `sidebar-item flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium ${isActive ? "active text-text-primary" : "text-text-muted"}`
          }
        >
          {!collapsed && <span>Manage</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
