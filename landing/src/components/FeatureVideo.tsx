import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

type FeatureVideoProps = {
  src: string;
  caption: string;
};

export function FeatureVideo({ src, caption }: FeatureVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (reducedMotion) return;
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <figure
      ref={containerRef}
      className="overflow-hidden rounded-lg border border-edge bg-card transition-shadow hover:shadow-[0_0_32px_var(--color-brand-glow)]"
    >
      <div
        style={{
          clipPath: reducedMotion || inView ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
          opacity: reducedMotion || inView ? 1 : 0,
          transition: reducedMotion
            ? "opacity 300ms ease"
            : "clip-path 700ms ease, opacity 500ms ease",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reducedMotion}
          aria-hidden="true"
          className="block w-full aspect-[8/5]"
        />
        <figcaption className="border-t border-edge px-4 py-3 text-sm text-text-secondary">
          {caption}
        </figcaption>
      </div>
    </figure>
  );
}
