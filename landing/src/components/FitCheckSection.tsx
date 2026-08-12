import { content } from "../content";
import { FeatureVideo } from "./FeatureVideo";
import { FitBar } from "./FitBar";
import { SectionLabel } from "./SectionLabel";

export function FitCheckSection() {
  const { label, title, body, video, caption } = content.fitCheck;

  return (
    <section className="relative border-t border-edge/70 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center md:pl-16">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {title}
        </h2>
        <p className="mt-5 text-lg text-text-secondary">{body}</p>
      </div>

      <div className="mx-auto mt-4 max-w-5xl px-6 md:pl-16">
        <FitBar />
      </div>

      <div className="mx-auto mt-8 max-w-4xl px-4 md:pl-16 sm:px-6">
        <FeatureVideo src={video} caption={caption} />
      </div>
    </section>
  );
}
