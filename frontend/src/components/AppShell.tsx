import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-orb" />
        <div className="ambient-orb" />
        <div className="ambient-orb" />
      </div>
      <div className="grid-pattern" />
      <div className="noise-overlay" />
      <div className="flex h-screen bg-void text-text-primary font-body">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </>
  );
}
