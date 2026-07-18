import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

import type { Element, Root } from "hast";

// HF READMEs routinely embed raw HTML (centered wrappers, flex badge rows, even full
// custom-styled cards via a <style> block) that a content-stripping sanitizer like
// rehype-sanitize can't preserve without also breaking the layout it produces - real repro:
// unsloth/Llama-3.1-8B-Instruct-GGUF (style="display:flex" stripped) and
// zerofata/G4-MeroMero-31B (a <style> block + custom classes, entirely dropped since neither
// <style> nor arbitrary class values are in rehype-sanitize's default schema).
//
// So this output is intentionally UNSANITIZED - safety instead comes from where it's
// rendered: ReadmeFrame puts this string into a sandboxed <iframe> with no "allow-scripts",
// which makes every script-execution path (real <script> tags, inline on*= handlers,
// javascript: URLs) inert regardless of what's in the markup. Never inject this HTML
// anywhere that isn't sandboxed that way.
function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "a") {
        node.properties = { ...node.properties, target: "_blank", rel: ["noopener", "noreferrer"] };
      }
    });
  };
}

const MARKDOWN_BODY_CSS = `
  body {
    margin: 0;
    padding: 24px;
    background: #050505;
    color: #9898b0;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.75;
  }
  h1, h2, h3 {
    color: #e8e8f0;
    font-family: 'Geist Sans', sans-serif;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 1.6em; }
  h2 { font-size: 1.3em; border-bottom: 1px solid #1e1e30; padding-bottom: 0.3em; }
  h3 { font-size: 1.1em; }
  p { margin-bottom: 1em; }
  code {
    background: #0e0e18;
    padding: 2px 7px;
    border-radius: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    color: #22d3ee;
    border: 1px solid #1e1e30;
  }
  pre {
    background: #08080f;
    border: 1px solid #1e1e30;
    border-radius: 10px;
    padding: 18px;
    overflow-x: auto;
    margin-bottom: 1em;
  }
  pre code { background: none; padding: 0; color: #e8e8f0; border: none; }
  ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
  li { margin-bottom: 0.25em; }
  a { color: #22d3ee; text-decoration: none; }
  a:hover { text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
  th, td { border: 1px solid #1e1e30; padding: 8px 12px; text-align: left; }
  th { background: #0e0e18; color: #e8e8f0; font-weight: 600; }
  blockquote { border-left: 3px solid #8b5cf6; padding-left: 1em; color: #787890; margin-bottom: 1em; }
  hr { border: none; border-top: 1px solid #1e1e30; margin: 1.5em 0; }
  img { max-width: 100%; border-radius: 8px; }
`;

export function renderReadmeHtml(markdown: string): string {
  const body = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeExternalLinks]}>
      {markdown}
    </ReactMarkdown>,
  );

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  @font-face {
    font-family: 'Geist Sans';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/fonts/geist-sans/Geist-Bold.woff2') format('woff2');
  }
  ${MARKDOWN_BODY_CSS}
</style>
</head>
<body>${body}</body>
</html>`;
}
