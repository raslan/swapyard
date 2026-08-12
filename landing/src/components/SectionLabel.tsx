type SectionLabelProps = {
  children: string;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="mb-4 font-mono text-xs tracking-wide text-text-muted" aria-hidden="true">
      {children}
    </p>
  );
}
