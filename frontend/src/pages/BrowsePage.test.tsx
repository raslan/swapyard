import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { BrowsePage } from "./BrowsePage";

afterEach(() => vi.restoreAllMocks());

describe("BrowsePage", () => {
  it("shows results after loading", async () => {
    vi.spyOn(api, "searchModels").mockResolvedValue([
      { repoId: "org/llama-gguf", author: "org", downloads: 1000, likes: 10, tags: ["gguf"] },
    ]);

    render(
      <MemoryRouter>
        <BrowsePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("org/llama-gguf")).toBeInTheDocument());
  });

  it("shows an empty state when there are no results", async () => {
    vi.spyOn(api, "searchModels").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <BrowsePage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/no models found/i)).toBeInTheDocument());
  });

  it("searches as the user types", async () => {
    const spy = vi.spyOn(api, "searchModels").mockResolvedValue([]);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <BrowsePage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText(/search models/i), "phi");
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith("phi"), { timeout: 1000 });
  });
});
