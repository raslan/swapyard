import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuantGroup } from "./QuantGroup";

const files = [{ name: "model-Q4_K_M.gguf", size: 4_000_000_000, category: "gguf" as const, isXet: false }];

describe("QuantGroup", () => {
  it("renders a FileRow per file and forwards downloads", () => {
    const onDownload = vi.fn();
    render(
      <QuantGroup
        files={files}
        fits={false}
        recommended={false}
        fileStatus={() => "none"}
        onDownload={onDownload}
      />,
    );

    screen.getByRole("button", { name: /download/i }).click();

    expect(onDownload).toHaveBeenCalledWith(files[0]);
  });

  it("shows Fits your GPU on every file when fits is true", () => {
    render(
      <QuantGroup files={files} fits={true} recommended={false} fileStatus={() => "none"} onDownload={vi.fn()} />,
    );

    expect(screen.getByText(/fits your gpu/i)).toBeInTheDocument();
    expect(screen.queryByText(/recommended/i)).not.toBeInTheDocument();
  });

  it("shows Recommended when recommended is true", () => {
    render(
      <QuantGroup files={files} fits={true} recommended={true} fileStatus={() => "none"} onDownload={vi.fn()} />,
    );

    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });
});
