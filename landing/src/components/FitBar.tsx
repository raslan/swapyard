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
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const bar = barRef.current;
    const anchor = anchorRef.current;
    if (!section || !bar || !anchor) return;

    if (reducedMotion) {
      gsap.set(badgeRefs.current, { x: 0, opacity: 1 });
      gsap.set(anchor, { opacity: 1, scale: 1 });
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
          timeline.to(
            anchor,
            { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
            index * 0.4 + 0.55,
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const capacityPercent = (gb: number) =>
    Math.min(100, (gb / content.vramCapacityGb) * 100);

  return (
    <div ref={sectionRef} className="flex min-h-[70vh] flex-col justify-center gap-10">
      <div ref={barRef} className="relative h-3 w-full rounded-sm bg-edge">
        <div
          className="absolute inset-y-0 left-0 rounded-sm bg-brand-dim"
          style={{ width: "100%" }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-sm bg-brand"
          style={{ width: `${capacityPercent(content.vramCapacityGb)}%` }}
        />
        <span className="absolute -top-6 right-0 font-mono text-xs text-text-muted">
          {content.vramCapacityGb} GB VRAM
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {content.quants.map((quant, index) => (
          <div
            key={quant.label}
            ref={(el) => {
              badgeRefs.current[index] = el;
            }}
            className={
              quant.fits
                ? "flex items-center gap-2 rounded-md border border-brand/40 bg-brand-dim px-3 py-2 font-mono text-sm text-text-primary"
                : "flex items-center gap-2 rounded-md border border-edge px-3 py-2 font-mono text-sm text-text-muted line-through"
            }
          >
            <span>{quant.label}</span>
            <span>{quant.gb} GB</span>
            {quant.label === content.recommendedQuant && (
              <span ref={anchorRef} className="flex items-center gap-1 text-brand opacity-0">
                <AnchorIcon className="h-4 w-4" />
                Recommended
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
