import { content } from "../content";
import { SectionLabel } from "./SectionLabel";

export function ManageSection() {
  return (
    <section className="border-t border-edge py-16">
      <SectionLabel>{content.manage.label}</SectionLabel>
      <h2 className="max-w-xl font-display text-2xl font-medium text-text-primary">
        {content.manage.title}
      </h2>
      <p className="mt-4 max-w-xl text-text-secondary">{content.manage.body}</p>
    </section>
  );
}
