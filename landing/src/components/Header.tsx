import { AnchorIcon } from "./AnchorIcon";
import { content } from "../content";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-surface/90 backdrop-blur">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4"
      >
        <a href="#top" className="flex items-center gap-2 text-text-primary">
          <AnchorIcon className="h-5 w-5 text-brand" />
          <span className="font-display text-sm font-medium tracking-wide">Swapyard</span>
        </a>
        <a
          href={content.github}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-text-secondary transition-colors hover:text-brand"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
