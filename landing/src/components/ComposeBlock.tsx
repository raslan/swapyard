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
  return <span className="text-text-secondary">{value}</span>;
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
  return (
    <pre className="overflow-x-auto rounded-lg border border-edge bg-card px-5 py-4 font-mono text-xs leading-relaxed text-text-secondary shadow-[0_0_40px_-12px_var(--color-brand-glow)] sm:text-sm">
      <code>{code.split("\n").map((line, index) => highlightLine(line, index))}</code>
    </pre>
  );
}
