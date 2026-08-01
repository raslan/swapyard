import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import type { ModelSummary } from "@/types/model";

import { BrowsePage } from "./BrowsePage";

afterEach(() => vi.restoreAllMocks());

const emptyDiscover = { trending: [], embeddings: [], vision: [], agentic: [] };

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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderBrowsePage(initialEntries = ["/browse"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <BrowsePage />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

describe("BrowsePage", () => {
  it("shows discover sections by default", async () => {
    vi.spyOn(api, "getDiscoverSections").mockResolvedValue({
      ...emptyDiscover,
      trending: [model({ repoId: "org/llama-gguf", downloads: 1000, likes: 10 })],
    });

    renderBrowsePage();

    expect(await screen.findByText("llama-gguf")).toBeInTheDocument();
    expect(screen.getByText("Trending")).toBeInTheDocument();
  });

  it("only renders tabs for categories that have models", async () => {
    vi.spyOn(api, "getDiscoverSections").mockResolvedValue({
      ...emptyDiscover,
      vision: [model({ repoId: "org/vision-gguf", downloads: 5, likes: 1, pipelineTag: "image-text-to-text" })],
    });

    renderBrowsePage();

    await screen.findByText("vision-gguf");
    expect(screen.queryByText("Trending")).not.toBeInTheDocument();
    expect(screen.getByText("Vision & multimodal")).toBeInTheDocument();
  });

  it("switches category when a different tab is clicked (kept as local state, not in the URL)", async () => {
    vi.spyOn(api, "getDiscoverSections").mockResolvedValue({
      ...emptyDiscover,
      trending: [model({ repoId: "org/chat-model" })],
      vision: [model({ repoId: "org/vision-model", pipelineTag: "image-text-to-text" })],
    });
    const user = userEvent.setup();

    renderBrowsePage();

    await screen.findByText("chat-model");
    expect(screen.queryByText("vision-model")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /vision & multimodal/i }));

    expect(await screen.findByText("vision-model")).toBeInTheDocument();
    expect(screen.queryByText("chat-model")).not.toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).not.toContain("category");
  });

  it("switches to search results once a query is typed, and updates the URL", async () => {
    vi.spyOn(api, "getDiscoverSections").mockResolvedValue(emptyDiscover);
    const spy = vi.spyOn(api, "searchModels").mockResolvedValue([]);
    const user = userEvent.setup();

    renderBrowsePage();

    await user.type(screen.getByPlaceholderText(/search models/i), "phi");
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith("phi"), { timeout: 1000 });
    await waitFor(() => expect(screen.getByText(/no models found/i)).toBeInTheDocument());
    expect(screen.getByTestId("location").textContent).toContain("q=phi");
  });

  it("reads the initial search query from the URL", async () => {
    vi.spyOn(api, "getDiscoverSections").mockResolvedValue(emptyDiscover);
    const spy = vi.spyOn(api, "searchModels").mockResolvedValue([]);

    renderBrowsePage(["/browse?q=phi"]);

    expect(screen.getByPlaceholderText(/search models/i)).toHaveValue("phi");
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith("phi"), { timeout: 1000 });
  });
});
