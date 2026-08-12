import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnchorIcon } from "./AnchorIcon";
import { content } from "../content";
import { useReducedMotion } from "../hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function FitBar() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  const recommendedGb =
    content.quants.find((q) => q.label === content.recommendedQuant)?.gb ?? 0;

  const capacityPercent = (gb: number) =>
    Math.min(100, (gb / content.vramCapacityGb) * 100);

  useEffect(() => {
    const section = sectionRef.current;
    const bar = barRef.current;
    const anchor = anchorRef.current;
    const fill = fillRef.current;
    if (!section || !bar || !anchor || !fill) return;

    if (reducedMotion) {
      gsap.set(badgeRefs.current, { x: 0, opacity: 1 });
      gsap.set(anchor, { opacity: 1, scale: 1 });
      gsap.set(fill, { width: `${capacityPercent(recommendedGb)}%` });
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=1200",
          pin: true,
          scrub: 1,
        },
      });

      content.quants.forEach((quant, index) => {
        const badge = badgeRefs.current[index];
        if (!badge) return;

        timeline.fromTo(
          badge,
          { x: 240, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
          index * 0.4,
        );

        if (!quant.fits) {
          timeline.to(
            badge,
            { x: -12, duration: 0.08, repeat: 3, yoyo: true, ease: "power1.inOut" },
            index * 0.4 + 0.5,
          );
          timeline.to(
            badge,
            { x: 240, opacity: 0, duration: 0.4, ease: "power2.in" },
            index * 0.4 + 0.85,
          );
        }

        if (quant.label === content.recommendedQuant) {
          timeline.fromTo(
            anchor,
            { opacity: 0, scale: 0.6 },
            { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
            index * 0.4 + 0.55,
          );
          timeline.fromTo(
            fill,
            { width: "0%" },
            {
              width: `${capacityPercent(recommendedGb)}%`,
              duration: 0.4,
              ease: "back.out(2)",
            },
            index * 0.4 + 0.55,
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion, recommendedGb]);

  return (
    <div ref={sectionRef} className="flex min-h-[60vh] flex-col justify-center gap-12">
      <div ref={barRef} className="relative h-4 w-full rounded-sm bg-edge">
        <div
          className="absolute inset-y-0 left-0 rounded-sm bg-brand-dim"
          style={{ width: "100%" }}
        />
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 rounded-sm bg-brand shadow-[0_0_24px_-2px_var(--color-brand-glow)]"
          style={{ width: `${capacityPercent(recommendedGb)}%` }}
        />
        <span className="absolute -top-8 right-0 font-mono text-sm font-medium text-text-secondary">
          {content.vramCapacityGb} GB VRAM
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {content.quants.map((quant, index) => (
          <div
            key={quant.label}
            ref={(el) => {
              badgeRefs.current[index] = el;
            }}
            className={
              quant.fits
                ? "flex items-center gap-3 rounded-md border border-brand/40 bg-brand-dim px-4 py-3 font-mono text-lg font-medium text-text-primary"
                : "flex items-center gap-3 rounded-md border border-edge px-4 py-3 font-mono text-lg font-medium text-text-muted line-through"
            }
          >
            <span>{quant.label}</span>
            <span>{quant.gb} GB</span>
            {!quant.fits && <span className="sr-only">does not fit</span>}
            {quant.label === content.recommendedQuant && (
              <span
                ref={anchorRef}
                className="flex items-center gap-1.5 text-sm font-medium text-brand opacity-0"
              >
                <AnchorIcon className="h-5 w-5" />
                Recommended
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
