import { useState } from "react";

function highlightValue(value: string) {
  const stringMatch = value.match(/^(\s*)("[^"]*")(.*)$/);
  if (stringMatch) {
    const [, lead, str, rest] = stringMatch;
    return (
      <>
        {lead}
        <span className="text-info">{str}</span>
        {rest}
      </>
    );
  }
  return <span className="text-text-primary">{value}</span>;
}

function highlightLine(line: string, key: number) {
  const keyMatch = line.match(/^(\s*)([\w.-]+)(:)(.*)$/);
  if (keyMatch) {
    const [, indent, keyName, colon, rest] = keyMatch;
    return (
      <div key={key}>
        {indent}
        <span className="text-brand">{keyName}</span>
        <span className="text-text-muted">{colon}</span>
        {highlightValue(rest)}
      </div>
    );
  }

  const listMatch = line.match(/^(\s*)(-)(\s+)(.*)$/);
  if (listMatch) {
    const [, indent, dash, space, rest] = listMatch;
    return (
      <div key={key}>
        {indent}
        <span className="text-accent2">{dash}</span>
        {space}
        {highlightValue(rest)}
      </div>
    );
  }

  return <div key={key}>{line}</div>;
}

type ComposeBlockProps = {
  code: string;
};

export function ComposeBlock({ code }: ComposeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-edge bg-card shadow-[0_0_50px_-10px_var(--color-brand-glow)]">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-info/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent2/70" />
          </div>
          <span className="font-mono text-xs text-text-muted">docker-compose.yml</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-sm border border-edge px-2.5 py-1 font-mono text-xs text-text-secondary transition-colors hover:border-brand/50 hover:text-brand"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-sm leading-relaxed text-text-secondary">
        <code>{code.split("\n").map((line, index) => highlightLine(line, index))}</code>
      </pre>
    </div>
  );
}
