import { content } from "../content";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { QuantRack } from "./scenes/QuantRack";

export function ManageSection() {
  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-16 md:pl-16">
        <div>
          <SectionLabel>{content.manage.label}</SectionLabel>
          <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
            {content.manage.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg text-text-secondary">{content.manage.body}</p>
        </div>
        <div className="relative h-[320px] md:h-[420px]">
          <SectionCanvas cameraPosition={[0, 0, 9]} fov={45} className="h-full w-full">
            <QuantRack />
          </SectionCanvas>
        </div>
      </div>
    </section>
  );
}
