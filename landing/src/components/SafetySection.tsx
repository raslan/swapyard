import { content } from "../content";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { FitGauge } from "./scenes/FitGauge";

export function SafetySection() {
  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)" }}
      >
        <SectionCanvas cameraPosition={[0, 0, 9]} fov={45} className="h-full w-full">
          <FitGauge />
        </SectionCanvas>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 md:pl-16">
        <SectionLabel>{content.safety.label}</SectionLabel>
        <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {content.safety.title}
        </h2>
        <p className="mt-5 max-w-xl text-lg text-text-secondary">{content.safety.body}</p>
      </div>
    </section>
  );
}
