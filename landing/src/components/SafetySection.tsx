import { content } from "../content";
import { SectionLabel } from "./SectionLabel";

export function SafetySection() {
  return (
    <section className="border-t border-edge py-16">
      <SectionLabel>{content.safety.label}</SectionLabel>
      <h2 className="max-w-xl font-display text-2xl font-medium text-text-primary">
        {content.safety.title}
      </h2>
      <p className="mt-4 max-w-xl text-text-secondary">{content.safety.body}</p>
    </section>
  );
}
