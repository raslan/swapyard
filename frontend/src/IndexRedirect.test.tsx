import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";

import { IndexRedirect } from "./IndexRedirect";

afterEach(() => vi.restoreAllMocks());

function renderIndex() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/settings" element={<div>Settings Screen</div>} />
        <Route path="/browse" element={<div>Browse Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("IndexRedirect", () => {
  it("redirects to settings on first ever open (not yet onboarded)", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({ hardware: null, llamaSwapUrl: null, onboarded: false });

    renderIndex();

    expect(await screen.findByText("Settings Screen")).toBeInTheDocument();
  });

  it("redirects to browse once already onboarded", async () => {
    vi.spyOn(api, "getSettings").mockResolvedValue({
      hardware: { kind: "unified", gpus: [], systemRamGb: 32 },
      llamaSwapUrl: null,
      onboarded: true,
    });

    renderIndex();

    expect(await screen.findByText("Browse Screen")).toBeInTheDocument();
  });
});
