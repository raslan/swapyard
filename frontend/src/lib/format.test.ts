import { describe, expect, it } from "vitest";

import {
  formatEta,
  formatNumber,
  formatParamCount,
  formatQuantLabel,
  formatRelativeTime,
  formatSize,
  formatSpeed,
} from "./format";

describe("formatSize", () => {
  it("formats bytes", () => {
    expect(formatSize(0)).toBe("—");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(5 * 1024 * 1024 * 1024)).toBe("5.0 GB");
  });
});

describe("formatNumber", () => {
  it("abbreviates large numbers", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(950)).toBe("950");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

describe("formatSpeed", () => {
  it("formats bytes per second as MB/s", () => {
    expect(formatSpeed(0)).toBe("0 MB/s");
    expect(formatSpeed(2 * 1024 * 1024)).toBe("2.0 MB/s");
  });
});

describe("formatEta", () => {
  it("formats seconds, minutes, and hours remaining", () => {
    expect(formatEta(100, 10)).toBe("10s left");
    expect(formatEta(600, 10)).toBe("1m 0s left");
    expect(formatEta(3660, 1)).toBe("1h 1m left");
  });

  it("returns empty string when rate or remaining bytes is zero", () => {
    expect(formatEta(100, 0)).toBe("");
    expect(formatEta(0, 10)).toBe("");
  });
});

describe("formatParamCount", () => {
  it("formats billions and millions of params", () => {
    expect(formatParamCount(8_953_803_264)).toBe("9.0B");
    expect(formatParamCount(500_000_000)).toBe("500M");
    expect(formatParamCount(999)).toBe("999");
  });
});

describe("formatRelativeTime", () => {
  it("formats recent, day-scale, and month-scale timestamps", () => {
    const now = Date.now() / 1000;
    expect(formatRelativeTime(now - 60)).toBe("just now");
    expect(formatRelativeTime(now - 3600 * 5)).toBe("5h ago");
    expect(formatRelativeTime(now - 3600 * 24 * 3)).toBe("3d ago");
    expect(formatRelativeTime(now - 3600 * 24 * 60)).toBe("2mo ago");
    expect(formatRelativeTime(now - 3600 * 24 * 400)).toBe("1y ago");
  });
});

describe("formatQuantLabel", () => {
  it("extracts the quant designator after the last dot before .gguf", () => {
    expect(formatQuantLabel("Meta-Llama-3-8B-Instruct.Q4_K_M.gguf")).toBe("Q4_K_M");
  });

  it("falls back to the full stem when there is no dot", () => {
    expect(formatQuantLabel("model.gguf")).toBe("model");
  });

  it("takes only the last segment when there are multiple dots", () => {
    expect(formatQuantLabel("org.repo.name.v1.IQ4_XS.gguf")).toBe("IQ4_XS");
  });

  it("returns an empty string for empty input", () => {
    expect(formatQuantLabel("")).toBe("");
  });
});
