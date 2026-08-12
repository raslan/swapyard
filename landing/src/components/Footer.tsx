import { content } from "../content";

export function Footer() {
  return (
    <footer className="border-t border-edge px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-text-secondary">{content.footer.body}</p>
        <div className="flex items-center gap-4 font-mono text-sm text-text-secondary">
          <a
            href={content.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-brand"
          >
            GitHub
          </a>
          <span>{content.footer.license}</span>
        </div>
      </div>
    </footer>
  );
}
