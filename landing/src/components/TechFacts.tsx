import { content } from "../content";
import { SectionLabel } from "./SectionLabel";

export function TechFacts() {
  return (
    <section className="border-t border-edge py-16">
      <SectionLabel>{content.facts.label}</SectionLabel>
      <ul className="grid gap-4 sm:grid-cols-2">
        {content.facts.items.map((item) => (
          <li
            key={item}
            className="rounded-md border border-edge bg-card px-4 py-3 font-mono text-sm text-text-secondary"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
