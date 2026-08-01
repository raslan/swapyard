import { AnimatePresence, motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";

import { Sidebar } from "./Sidebar";

export function AppShell() {
  const location = useLocation();

  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-orb" />
      </div>
      <div className="grid-pattern" />
      <div className="noise-overlay" />
      <div className="flex h-screen bg-void text-text-primary font-body">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Toaster />
    </>
  );
}
