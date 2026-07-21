import { describe, expect, it } from "vitest";

import { isInsideCmdBlock } from "./cmdFlagProvider";

describe("isInsideCmdBlock", () => {
  const content = [
    "models:",
    "  qwen:",
    "    proxy: http://127.0.0.1:8080",
    "    cmd: |",
    "      llama-server",
    "      --port 8080",
    "  other:",
    "    ttl: 600",
    "",
  ].join("\n");

  it("returns true for an offset inside the cmd block's content", () => {
    const offset = content.indexOf("--port");
    expect(isInsideCmdBlock(content, offset)).toBe(true);
  });

  it("returns false for an offset outside any cmd block", () => {
    const offset = content.indexOf("ttl: 600");
    expect(isInsideCmdBlock(content, offset)).toBe(false);
  });

  it("returns false for an offset on the cmd: key line itself", () => {
    const offset = content.indexOf("cmd: |");
    expect(isInsideCmdBlock(content, offset)).toBe(false);
  });
});
