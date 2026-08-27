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

    expect(screen.getByRole("button", { name: /save & apply/i })).toBeDisabled();

    await userEvent.type(screen.getByTestId("mock-editor"), "\n");
    expect(screen.getByRole("button", { name: /save & apply/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /save & apply/i }));
    expect(screen.getByText(/restart llama-swap/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(api.applyConfig).toHaveBeenCalled());
  });

  it("opens the revision history sheet from the History button", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([
      { sha: "aaa111", timestamp: 1721300000, status: "ok", content: "models: {a: 1}\n" },
    ]);
    vi.spyOn(api, "getConfigSchema").mockResolvedValue({ title: "llama-swap configuration" });

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByTestId("mock-editor")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /history/i }));

    expect(screen.getByText(/revision history/i)).toBeInTheDocument();
    expect(screen.getByText(/aaa111/)).toBeInTheDocument();
  });

  it("Normalize button rewrites the editor with the returned content", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({
      content: "models:\n  m:\n    cmd: llama-server -hf org/repo-GGUF:model-Q4_K_M\n",
      hash: "abc",
    });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "getConfigSchema").mockResolvedValue({ title: "llama-swap configuration" });
    const normalizeSpy = vi.spyOn(api, "normalizeConfig").mockResolvedValue({
      content: "models:\n  m:\n    cmd: llama-server -hf org/repo-GGUF --hf-file model-Q4_K_M.gguf\n",
      report: [{ model_id: "m", changes: ["pinned --hf-file model-Q4_K_M.gguf"], skipped: null }],
    });

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByTestId("mock-editor")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /normalize/i }));

    await waitFor(() => expect(normalizeSpy).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("mock-editor")).toHaveValue(
        "models:\n  m:\n    cmd: llama-server -hf org/repo-GGUF --hf-file model-Q4_K_M.gguf\n",
      ),
    );
    // editor now dirty -> Save & Apply enabled
    expect(screen.getByRole("button", { name: /save & apply/i })).toBeEnabled();
  });

  it("Normalize button is disabled once the editor is dirty", async () => {
    vi.spyOn(api, "getConfig").mockResolvedValue({ content: "models: {}\n", hash: "abc" });
    vi.spyOn(api, "getConfigStatus").mockResolvedValue({ status: null, timestamp: null });
    vi.spyOn(api, "getConfigHistory").mockResolvedValue([]);
    vi.spyOn(api, "getConfigSchema").mockResolvedValue({ title: "llama-swap configuration" });

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByTestId("mock-editor")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /normalize/i })).toBeEnabled();
    await userEvent.type(screen.getByTestId("mock-editor"), "\n");
    expect(screen.getByRole("button", { name: /normalize/i })).toBeDisabled();
  });
});
