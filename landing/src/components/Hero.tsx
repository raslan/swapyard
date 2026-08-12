import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { AnchorBackdrop } from "./AnchorBackdrop";
import { DataField } from "./DataField";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.15 })
        .fromTo(
          titleRef.current,
          { y: 24, opacity: 0, filter: "blur(6px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" },
        )
        .fromTo(
          lineRefs.current,
          { y: 36, opacity: 0, filter: "blur(6px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out", stagger: 0.12 },
          "-=0.35",
        );
    });
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section className="relative flex h-[100svh] min-h-[640px] items-center overflow-hidden border-b border-edge/70">
      <DataField className="absolute inset-0 h-full w-full" />
      <AnchorBackdrop />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/40" />

      <div className="relative mx-auto w-full max-w-5xl px-6 md:pl-16">
        <h1
          ref={titleRef}
          className="max-w-2xl font-display text-[clamp(2rem,4.4vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-text-primary"
        >
          Swapyard is a self-hosted UI for finding, downloading, and configuring GGUF models
          with llama-swap.
        </h1>

        <h2 className="mt-10 max-w-xl border-l-2 border-brand/50 pl-6 font-mono text-2xl font-medium leading-tight sm:text-3xl">
          <span
            ref={(el) => {
              lineRefs.current[0] = el;
            }}
            className="block text-text-secondary"
          >
            Ollama hides too much.
          </span>
          <span
            ref={(el) => {
              lineRefs.current[1] = el;
            }}
            className="mt-1 block text-text-secondary"
          >
            llama.cpp shows too little.
          </span>
          <span
            ref={(el) => {
              lineRefs.current[2] = el;
            }}
            className="mt-2 block text-brand [text-shadow:0_0_60px_var(--color-brand-glow)]"
          >
            So I built the missing middle.
          </span>
        </h2>
      </div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-text-muted">
        <span className="font-mono text-xs tracking-wide">scroll</span>
        <span className="h-8 w-px animate-pulse bg-text-muted" />
      </div>
    </section>
  );
}
