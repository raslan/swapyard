import { content } from "../content";
import { SectionLabel } from "./SectionLabel";

export function SafetySection() {
  return (
    <section className="border-t border-edge py-16">
      <SectionLabel>{content.safety.label}</SectionLabel>
      <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
        {content.safety.title}
      </h2>
      <p className="mt-4 max-w-xl text-base text-text-secondary">{content.safety.body}</p>
    </section>
  );
}
