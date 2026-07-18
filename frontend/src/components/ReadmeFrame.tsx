import { useRef, useState } from "react";

import { renderReadmeHtml } from "@/lib/readme";

// No "allow-scripts" - this is the actual security boundary for the unsanitized HTML
// built in lib/readme.tsx. "allow-same-origin" only grants DOM access back to the parent
// (for the auto-height measurement below) and is safe here specifically because there's
// no script execution capability to combine it with. "allow-popups" lets README links
// (forced to target="_blank" in lib/readme.tsx) actually open instead of doing nothing.
const SANDBOX = "allow-same-origin allow-popups";

export function ReadmeFrame({ markdown }: { markdown: string }) {
  const html = renderReadmeHtml(markdown);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      sandbox={SANDBOX}
      title="README"
      className="w-full border-0"
      style={{ height }}
      onLoad={() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc) setHeight(doc.documentElement.scrollHeight);
      }}
    />
  );
}
