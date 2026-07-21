import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import { ConfigPage } from "./ConfigPage";

vi.mock("@/lib/monacoWorkers", () => ({
  setupMonacoEnvironment: vi.fn(),
  configureYamlSchema: vi.fn(),
}));

vi.mock("@/lib/monacoThemes", () => ({
  SWAPYARD_THEME_ID: "swapyard-dark",
  THEME_OPTIONS: [{ id: "swapyard-dark", label: "Swapyard" }],
  registerMonacoThemes: vi.fn(),
}));

vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="mock-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  DiffEditor: () => <div data-testid="mock-diff-editor" />,
  useMonaco: () => null,
}));

describe("ConfigPage", () => {
  it("loads and displays the current config content", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "getConfigSchema").mockResolvedValue({ title: "llama-swap configuration" });

    render(<ConfigPage />);

    await waitFor(() => expect(screen.getByTestId("mock-editor")).toHaveValue("models: {}\n"));
  });

  it("shows a confirm dialog before applying, and applies on confirm", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "getConfigSchema").mockResolvedValue({ title: "llama-swap configuration" });
    vi.spyOn(api, "applyConfig").mockResolvedValue({ status: "unverified", logs: null });

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByTestId("mock-editor")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /save & apply/i }));
    expect(screen.getByText(/restart llama-swap/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(api.applyConfig).toHaveBeenCalled());
  });
});
