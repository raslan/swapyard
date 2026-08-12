import { content } from "../content";
import { FitBar } from "./FitBar";

export function Hero() {
  return (
    <section className="py-16">
      <h1 className="max-w-2xl font-display text-4xl font-medium leading-tight text-text-primary md:text-5xl">
        {content.hero.headline}
      </h1>
      <p className="mt-4 max-w-xl text-text-secondary">{content.hero.sub}</p>
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <a
          href={content.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 font-mono text-sm font-medium text-void transition-opacity hover:opacity-90"
        >
          View on GitHub
        </a>
        <pre className="overflow-x-auto rounded-md border border-edge bg-card px-4 py-3 font-mono text-xs text-text-secondary">
          <code>{content.compose}</code>
        </pre>
      </div>
      <FitBar />
    </section>
  );
}
