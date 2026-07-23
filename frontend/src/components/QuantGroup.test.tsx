import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuantGroup } from "./QuantGroup";

const estimate = {
  quant: "model-Q4_K_M.gguf",
  files: ["model-Q4_K_M.gguf"],
  weightBytes: 4_000_000_000,
};

const files = [{ name: "model-Q4_K_M.gguf", size: 4_000_000_000, category: "gguf" as const, isXet: false }];

describe("QuantGroup", () => {
  it("shows the quant label and weight size", () => {
    render(
      <QuantGroup estimate={estimate} files={files} fits={false} fileStatus={() => "none"} onDownload={vi.fn()} />,
    );

    expect(screen.getByText("Q4_K_M", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("3.7 GB")).toBeInTheDocument();
  });

  it("shows a Fits your GPU badge when fits is true, and hides it otherwise", () => {
    const { rerender } = render(
      <QuantGroup estimate={estimate} files={files} fits={true} fileStatus={() => "none"} onDownload={vi.fn()} />,
    );
    expect(screen.getByText(/fits your gpu/i)).toBeInTheDocument();

    rerender(
      <QuantGroup estimate={estimate} files={files} fits={false} fileStatus={() => "none"} onDownload={vi.fn()} />,
    );
    expect(screen.queryByText(/fits your gpu/i)).not.toBeInTheDocument();
  });

  it("renders a FileRow per file and forwards downloads", async () => {
    const onDownload = vi.fn();
    render(
      <QuantGroup estimate={estimate} files={files} fits={false} fileStatus={() => "none"} onDownload={onDownload} />,
    );

    screen.getByRole("button", { name: /download/i }).click();

    expect(onDownload).toHaveBeenCalledWith(files[0]);
  });
});
