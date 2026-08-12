import { content } from "../content";
import { SectionLabel } from "./SectionLabel";

export function ManageSection() {
  return (
    <section className="border-t border-edge py-16">
      <SectionLabel>{content.manage.label}</SectionLabel>
      <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
        {content.manage.title}
      </h2>
      <p className="mt-4 max-w-xl text-base text-text-secondary">{content.manage.body}</p>
    </section>
  );
}
