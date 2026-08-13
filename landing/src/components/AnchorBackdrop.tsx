export function AnchorBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="0.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute -right-[18%] top-[8%] h-[130%] w-auto opacity-[0.16] sm:-right-[10%] md:right-[4%]"
      style={{ filter: "drop-shadow(0 0 60px var(--color-brand-glow))" }}
    >
      <path d="M12 6v16" />
      <path d="m19 13 2-1a9 9 0 0 1-18 0l2 1" />
      <path d="M9 11h6" />
      <circle cx="12" cy="4" r="2" />
    </svg>
  );
}
