import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function Gutter() {
  const fillRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const updateFill = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      if (fillRef.current) {
        fillRef.current.style.height = `${Math.min(1, Math.max(0, progress)) * 100}%`;
      }
    };

    updateFill();
    window.addEventListener("scroll", updateFill, { passive: true });
    window.addEventListener("resize", updateFill);
    return () => {
      window.removeEventListener("scroll", updateFill);
      window.removeEventListener("resize", updateFill);
    };
  }, [reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-6 top-0 z-10 hidden h-full w-px bg-edge md:block"
    >
      <div
        ref={fillRef}
        className="w-full bg-brand transition-[height]"
        style={{ height: reducedMotion ? "100%" : "0%" }}
      />
    </div>
  );
}
