export function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-text-muted" />
      <span className="text-[9px] uppercase tracking-wider text-text-muted font-medium">{label}</span>
      <span className="font-mono text-[11px] text-text-secondary">{value}</span>
    </span>
  );
}

// Distinct small glyphs for spec-strip stats so counts/sizes read at a glance
// without leaning on other icons' (Download/Heart/etc) meaning a second time.
export function CountIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="2.25" fill="currentColor" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 2.2" />
    </svg>
  );
}

export function SizeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 6.5H13.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
