import { content } from "../content";
import { FeatureVideo } from "./FeatureVideo";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { PacketStream } from "./scenes/PacketStream";

export function DownloadSection() {
  const { label, title, body, video, caption } = content.download;

  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{ maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)" }}
      >
        <SectionCanvas cameraPosition={[0, 0, 12]} fov={55} className="h-full w-full">
          <PacketStream />
        </SectionCanvas>
      </div>

      <div className="relative mx-auto max-w-2xl px-6 text-center md:pl-16">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {title}
        </h2>
        <p className="mt-5 text-lg text-text-secondary">{body}</p>
      </div>
      <div className="relative mx-auto mt-14 max-w-6xl px-4 md:pl-16 sm:px-6">
        <FeatureVideo src={video} caption={caption} />
      </div>
    </section>
  );
}
