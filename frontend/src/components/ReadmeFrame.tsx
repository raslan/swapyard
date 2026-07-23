import { Loader2 } from "lucide-react";
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
  // The iframe stays 0-height (and so looks like an empty page, not "loading") until
  // its own onLoad fires - a separate delay from the README data having already
  // arrived, since the browser still has to parse/lay out the injected HTML.
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="flex items-center gap-2 py-10 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        sandbox={SANDBOX}
        title="README"
        className="w-full border-0"
        style={{ height: loaded ? height : 0 }}
        onLoad={() => {
          const doc = iframeRef.current?.contentDocument;
          if (doc) setHeight(doc.documentElement.scrollHeight);
          setLoaded(true);
        }}
      />
    </>
  );
}
