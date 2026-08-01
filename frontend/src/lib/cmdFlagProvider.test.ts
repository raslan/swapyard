import { describe, expect, it } from "vitest";

import { isInsideCmdBlock, parseAllowedValues } from "./cmdFlagProvider";

describe("parseAllowedValues", () => {
  it("extracts the comma-separated list from an enum-valued flag's description", () => {
    const description =
      "KV cache data type for K allowed values: f32, f16, bf16, q8_0, q4_0, q4_1, iq4_nl, q5_0, q5_1 (default: f16)";
    expect(parseAllowedValues(description)).toEqual([
      "f32", "f16", "bf16", "q8_0", "q4_0", "q4_1", "iq4_nl", "q5_0", "q5_1",
    ]);
  });

  it("returns an empty array for a non-enum flag", () => {
    expect(parseAllowedValues("number of tokens to predict (default: -1)")).toEqual([]);
  });
});

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
