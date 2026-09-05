import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import { ConnectPage } from "@/pages/ConnectPage";

vi.mock("@/lib/api");

const HARNESSES = [
  { id: "opencode", name: "opencode", configPath: "~/.config/opencode/opencode.json", format: "json" as const, docsUrl: "https://opencode.ai", icon: null },
  { id: "kilo", name: "Kilo Code", configPath: "kilo.jsonc", format: "jsonc" as const, docsUrl: "https://kilocode.ai", icon: null },
];

function detailFor(id: string) {
  return {
    id,
    name: id,
    configPath: HARNESSES.find((h) => h.id === id)!.configPath,
    format: "json" as const,
    docsUrl: "https://example.com",
    icon: null,
    steps: [{ title: "Step one", body: "Do the thing.", code: null }],
    config: `{"harness":"${id}"}`,
    baseUrlSource: "placeholder" as const,
  };
}

describe("ConnectPage", () => {
  beforeEach(() => {
    vi.mocked(api.getHarnesses).mockResolvedValue(HARNESSES);
    vi.mocked(api.getHarness).mockImplementation((id: string) => Promise.resolve(detailFor(id)));
  });

  it("renders the harness rail and the first harness's steps", async () => {
    render(<ConnectPage />);
    expect(await screen.findByTestId("harness-rail-item-opencode")).toBeInTheDocument();
    expect(screen.getByTestId("harness-rail-item-kilo")).toBeInTheDocument();
    expect(await screen.findByText("Step one")).toBeInTheDocument();
    expect(api.getHarness).toHaveBeenCalledWith("opencode");
  });

  it("refetches and re-renders when switching harnesses", async () => {
    render(<ConnectPage />);
    await screen.findByText("Step one");

    await userEvent.click(screen.getByTestId("harness-rail-item-kilo"));

    await waitFor(() => expect(api.getHarness).toHaveBeenCalledWith("kilo"));
  });
});
