import { content } from "../content";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { QuantRack } from "./scenes/QuantRack";

export function ManageSection() {
  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)" }}
      >
        <SectionCanvas cameraPosition={[0, 0, 10]} fov={45} className="h-full w-full">
          <QuantRack />
        </SectionCanvas>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 md:pl-16">
        <SectionLabel>{content.manage.label}</SectionLabel>
        <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {content.manage.title}
        </h2>
        <p className="mt-5 max-w-xl text-lg text-text-secondary">{content.manage.body}</p>
      </div>
    </section>
  );
}
