type SectionLabelProps = {
  children: string;
};

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="mb-4 font-mono text-base font-medium tracking-wide text-brand sm:text-lg" aria-hidden="true">
      {children}
    </p>
  );
}
