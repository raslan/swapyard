import { describe, expect, it } from "vitest";

import { formatNumber, formatSize, formatSpeed } from "./format";

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
