export function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="aurora-blob absolute -left-48 -top-48 h-[620px] w-[620px] rounded-full blur-[130px]"
        style={{ background: "var(--color-brand-glow)", animationName: "aurora-drift-1" }}
      />
      <div
        className="aurora-blob absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full blur-[130px]"
        style={{ background: "var(--color-info-glow)", animationName: "aurora-drift-2" }}
      />
      <div
        className="aurora-blob absolute -bottom-40 left-1/3 h-[560px] w-[560px] rounded-full blur-[140px]"
        style={{ background: "var(--color-accent2-glow)", animationName: "aurora-drift-3" }}
      />
    </div>
  );
}
