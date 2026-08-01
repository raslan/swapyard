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
  html {
    overflow: hidden;
  }
  body {
    margin: 0;
    padding: 24px;
    background: #050505;
    color: #9099a3;
    font-family: 'Geist', sans-serif;
    font-size: 14px;
    line-height: 1.75;
    overflow: hidden;
    overflow-wrap: break-word;
  }
  h1, h2, h3 {
    color: #e6e1cf;
    font-family: 'Geist', sans-serif;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 1.6em; }
  h2 { font-size: 1.3em; border-bottom: 1px solid #141414; padding-bottom: 0.3em; }
  h3 { font-size: 1.1em; }
  p { margin-bottom: 1em; }
  code {
    background: #030303;
    padding: 2px 7px;
    border-radius: 5px;
    font-family: 'Geist Mono', monospace;
    font-size: 0.85em;
    color: #e6e1cf;
    border: 1px solid #141414;
  }
  pre {
    background: #000000;
    border: 1px solid #141414;
    border-radius: 10px;
    padding: 18px;
    overflow-x: auto;
    margin-bottom: 1em;
  }
  pre code { background: none; padding: 0; color: #e6e1cf; border: none; }
  ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
  li { margin-bottom: 0.25em; }
  a { color: #34d399; text-decoration: underline; text-underline-offset: 2px; }
  a:hover { text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
  th, td { border: 1px solid #141414; padding: 8px 12px; text-align: left; word-break: break-word; }
  th { background: #030303; color: #e6e1cf; font-weight: 600; }
  blockquote { border-left: 3px solid #d2a6ff; padding-left: 1em; color: #787890; margin-bottom: 1em; }
  hr { border: none; border-top: 1px solid #141414; margin: 1.5em 0; }
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
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  ${MARKDOWN_BODY_CSS}
</style>
</head>
<body>${body}</body>
</html>`;
}
