import { FeatureVideo } from "./FeatureVideo";
import { SectionLabel } from "./SectionLabel";

type FeatureSectionProps = {
  label: string;
  title: string;
  body: string;
  video: string;
  caption: string;
  reverse?: boolean;
};

export function FeatureSection({
  label,
  title,
  body,
  video,
  caption,
  reverse = false,
}: FeatureSectionProps) {
  return (
    <section className="grid gap-8 py-16 md:grid-cols-2 md:items-center md:gap-12">
      <div className={reverse ? "md:order-2" : undefined}>
        <SectionLabel>{label}</SectionLabel>
        <h2 className="font-display text-2xl font-medium text-text-primary">{title}</h2>
        <p className="mt-4 text-text-secondary">{body}</p>
      </div>
      <div className={reverse ? "md:order-1" : undefined}>
        <FeatureVideo src={video} caption={caption} />
      </div>
    </section>
  );
}
