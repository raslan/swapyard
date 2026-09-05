import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import { ConnectGrid, ConnectGuide } from "@/pages/ConnectPage";

vi.mock("@/lib/api");

vi.mock("@/lib/monacoWorkers", () => ({
  setupMonacoEnvironment: vi.fn(),
  configureYamlSchema: vi.fn(),
}));

vi.mock("@/lib/monacoThemes", () => ({
  SWAPYARD_THEME_ID: "swapyard-dark",
  registerMonacoThemes: vi.fn(),
}));

vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value }: { value: string }) => <textarea data-testid="mock-editor" value={value} readOnly />,
  useMonaco: () => null,
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

const HARNESSES = [
  { id: "opencode", name: "opencode", configPath: "~/.config/opencode/opencode.json", format: "json" as const, docsUrl: "https://opencode.ai", icon: null },
  { id: "kilo", name: "Kilo Code", configPath: "kilo.jsonc", format: "jsonc" as const, docsUrl: "https://kilocode.ai", icon: null },
  { id: "pi", name: "Pi", configPath: "pi.yaml", format: "yaml" as const, docsUrl: "https://example.com", icon: null },
];

function detailFor(id: string) {
  return {
    id,
    name: id,
    configPath: HARNESSES.find((h) => h.id === id)?.configPath ?? "config.json",
    format: "json" as const,
    docsUrl: "https://example.com",
    icon: null,
    steps: [{ title: "Step one", body: "Do the thing.", code: null }],
    config: `{"harness":"${id}"}`,
    baseUrlSource: "placeholder" as const,
  };
}

describe("ConnectGrid", () => {
  beforeEach(() => {
    toastError.mockClear();
    vi.mocked(api.getHarnesses).mockResolvedValue(HARNESSES);
  });

  it("renders a card per harness, each linking to /connect/<id>", async () => {
    render(
      <MemoryRouter>
        <ConnectGrid />
      </MemoryRouter>,
    );

    expect(await screen.findByText("opencode")).toBeInTheDocument();
    expect(screen.getByText("Kilo Code")).toBeInTheDocument();
    expect(screen.getByText("Pi")).toBeInTheDocument();

    expect(screen.getByTestId("harness-card-opencode")).toHaveAttribute("href", "/connect/opencode");
    expect(screen.getByTestId("harness-card-kilo")).toHaveAttribute("href", "/connect/kilo");
  });

  it("leaves the loading state and shows a toast when getHarnesses rejects", async () => {
    vi.mocked(api.getHarnesses).mockRejectedValue(new Error("backend down"));
    render(
      <MemoryRouter>
        <ConnectGrid />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.queryByText("Loading harnesses...")).not.toBeInTheDocument(),
    );
    expect(toastError).toHaveBeenCalled();
  });
});

describe("ConnectGuide", () => {
  beforeEach(() => {
    toastError.mockClear();
    vi.mocked(api.getHarness).mockImplementation((id: string) => Promise.resolve(detailFor(id)));
  });

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/connect/:id" element={<ConnectGuide />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("fetches the harness, shows the first step and a back link", async () => {
    renderAt("/connect/opencode");

    expect(await screen.findByText("Step one")).toBeInTheDocument();
    expect(screen.getByText("Do the thing.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /all harnesses/i })).toHaveAttribute("href", "/connect");
    expect(api.getHarness).toHaveBeenCalledWith("opencode");
  });

  it("shows a not-found message when getHarness rejects, without hanging", async () => {
    vi.mocked(api.getHarness).mockRejectedValue(new Error("404"));
    renderAt("/connect/bogus");

    await waitFor(() => expect(screen.getByText("Harness not found.")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /all harnesses/i })).toHaveAttribute("href", "/connect");
  });
});
