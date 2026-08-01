import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ModelSummary } from "@/types/model";

import { ModelCard } from "./ModelCard";

function model(overrides: Partial<ModelSummary> & Pick<ModelSummary, "repoId">): ModelSummary {
  return {
    author: "org",
    downloads: 0,
    likes: 0,
    tags: ["gguf"],
    pipelineTag: null,
    lastModified: null,
    gated: false,
    params: null,
    totalSize: null,
    ...overrides,
  };
}

describe("ModelCard", () => {
  it("splits repo id into a model name title and an author byline", () => {
    render(<ModelCard model={model({ repoId: "bartowski/Qwen3.5-0.8B-GGUF" })} onClick={vi.fn()} />);

    expect(screen.getByText("Qwen3.5-0.8B-GGUF")).toBeInTheDocument();
    expect(screen.getByText("bartowski")).toBeInTheDocument();
  });

  it("shows a Vision capability badge for image-text-to-text models", () => {
    render(
      <ModelCard
        model={model({ repoId: "org/vlm", pipelineTag: "image-text-to-text" })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Vision")).toBeInTheDocument();
  });

  it("shows Tools and Reasoning capability badges from real HF tags", () => {
    render(
      <ModelCard
        model={model({ repoId: "org/agent", tags: ["gguf", "tool-calling", "reasoning"] })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
  });

  it("shows no capability badges for a plain chat model", () => {
    render(<ModelCard model={model({ repoId: "org/chat" })} onClick={vi.fn()} />);

    expect(screen.queryByText("Vision")).not.toBeInTheDocument();
    expect(screen.queryByText("Tools")).not.toBeInTheDocument();
    expect(screen.queryByText("Reasoning")).not.toBeInTheDocument();
    expect(screen.queryByText("Code")).not.toBeInTheDocument();
  });

  it("shows the spec strip with params, size, and updated when present", () => {
    render(
      <ModelCard
        model={model({
          repoId: "org/model",
          params: 8_953_803_264,
          totalSize: 17_920_696_512,
          lastModified: Date.now() / 1000 - 3600,
        })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Params")).toBeInTheDocument();
    expect(screen.getByText("9.0B")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByTitle("Last updated")).toHaveTextContent("1h ago");
  });
});
