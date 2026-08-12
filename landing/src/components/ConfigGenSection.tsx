import { content } from "../content";
import { FeatureVideo } from "./FeatureVideo";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { BlueprintKnot } from "./scenes/BlueprintKnot";

export function ConfigGenSection() {
  const { label, title, body, video, caption } = content.configGen;

  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{ maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)" }}
      >
        <SectionCanvas cameraPosition={[0, 0, 9]} fov={45} className="h-full w-full">
          <BlueprintKnot />
        </SectionCanvas>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 md:pl-16">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {title}
        </h2>
        <p className="mt-5 max-w-xl text-lg text-text-secondary">{body}</p>
      </div>
      <div className="relative mx-auto mt-14 max-w-5xl px-4 md:pl-16 sm:px-6">
        <FeatureVideo src={video} caption={caption} />
      </div>
    </section>
  );
}
