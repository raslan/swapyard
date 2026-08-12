import { content } from "../content";
import { FeatureVideo } from "./FeatureVideo";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { GitGraph } from "./scenes/GitGraph";

export function HistorySection() {
  const { label, title, body, video, caption } = content.history;

  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-16 md:pl-16">
        <div>
          <SectionLabel>{label}</SectionLabel>
          <h2 className="font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
            {title}
          </h2>
          <p className="mt-5 text-lg text-text-secondary">{body}</p>
        </div>
        <div className="relative h-[320px] md:h-[420px]">
          <SectionCanvas cameraPosition={[0, 0, 8]} fov={45} className="h-full w-full">
            <GitGraph />
          </SectionCanvas>
        </div>
      </div>
      <div className="mx-auto mt-14 max-w-5xl px-4 md:pl-16 sm:px-6">
        <FeatureVideo src={video} caption={caption} />
      </div>
    </section>
  );
}
