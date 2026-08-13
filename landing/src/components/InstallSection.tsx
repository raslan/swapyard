import { content } from "../content";
import { SectionCanvas } from "./SectionCanvas";
import { SectionLabel } from "./SectionLabel";
import { InstallCrate } from "./scenes/InstallCrate";

export function InstallSection() {
  return (
    <section className="relative overflow-hidden border-t border-edge/70 py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)" }}
      >
        <SectionCanvas cameraPosition={[0, 0, 9]} fov={45} className="h-full w-full">
          <InstallCrate />
        </SectionCanvas>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 md:pl-16">
        <SectionLabel>{content.install.label}</SectionLabel>
        <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {content.install.title}
        </h2>
        <p className="mt-5 max-w-xl text-lg text-text-secondary">{content.install.body}</p>
        <a
          href={content.github}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex shrink-0 items-center justify-center rounded-md bg-brand px-7 py-3.5 font-mono text-sm font-medium text-void shadow-[0_0_44px_-4px_var(--color-brand-glow)] transition-transform hover:scale-[1.02] hover:opacity-90"
        >
          View on GitHub
        </a>
      </div>
    </section>
  );
}
