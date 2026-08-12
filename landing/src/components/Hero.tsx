import { content } from "../content";
import { ComposeBlock } from "./ComposeBlock";
import { FitBar } from "./FitBar";

export function Hero() {
  return (
    <section className="relative py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-[520px] w-[520px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand-glow) 0%, transparent 70%)",
        }}
      />
      <h1 className="relative max-w-3xl font-display text-5xl font-semibold tracking-tight text-text-primary sm:text-6xl md:text-7xl">
        Find, download, and configure{" "}
        <span className="text-brand">GGUF models</span> for llama-swap.
      </h1>
      <p className="relative mt-6 max-w-xl text-lg text-text-secondary">
        Swapyard edits{" "}
        <a
          href={content.llamaSwap}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-primary underline decoration-text-muted underline-offset-4 transition-colors hover:text-brand hover:decoration-brand"
        >
          llama-swap
        </a>
        's{" "}
        <code className="rounded-sm bg-card px-1.5 py-0.5 font-mono text-base text-text-primary">
          config.yaml
        </code>{" "}
        for you. It does not replace llama-swap itself.
      </p>
      <div className="relative mt-10 flex flex-col gap-6 sm:flex-row sm:items-start">
        <a
          href={content.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 font-mono text-sm font-medium text-void shadow-[0_0_32px_-4px_var(--color-brand-glow)] transition-transform hover:scale-[1.02] hover:opacity-90"
        >
          View on GitHub
        </a>
        <ComposeBlock code={content.compose} />
      </div>
      <p className="relative mt-16 font-mono text-xs tracking-wide text-text-muted">
        scroll to see how it fits your GPU
      </p>
      <FitBar />
    </section>
  );
}
