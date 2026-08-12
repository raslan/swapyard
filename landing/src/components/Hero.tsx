import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { content } from "../content";
import { AnchorBackdrop } from "./AnchorBackdrop";
import { DataField } from "./DataField";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
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
          paraRefs.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.12 },
          "-=0.35",
        );
    });
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section className="relative flex h-[100svh] min-h-[640px] items-center overflow-hidden border-b border-edge/70">
      <div className="relative mx-auto h-full w-full max-w-[1800px]">
        <DataField className="absolute inset-0 h-full w-full" />
        <AnchorBackdrop />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/40" />

        <div className="absolute inset-0 flex items-center px-6 md:pl-16">
          <div className="relative w-full">
            <h1
              ref={titleRef}
              className="max-w-2xl font-display text-[clamp(2rem,4.4vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-text-primary"
            >
              {content.hero.headline}
            </h1>

            <div className="mt-10 max-w-lg space-y-4 border-l-2 border-brand/50 pl-6">
              {content.hero.paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  ref={(el) => {
                    paraRefs.current[index] = el;
                  }}
                  className="text-lg leading-relaxed text-text-secondary"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-text-muted">
          <span className="font-mono text-xs tracking-wide">scroll</span>
          <span className="h-8 w-px animate-pulse bg-text-muted" />
        </div>
      </div>
    </section>
  );
}
