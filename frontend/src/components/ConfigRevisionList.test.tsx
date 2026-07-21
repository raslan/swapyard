import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfigRevisionList } from "./ConfigRevisionList";

vi.mock("@/lib/monacoWorkers", () => ({
  setupMonacoEnvironment: vi.fn(),
  configureYamlSchema: vi.fn(),
}));

vi.mock("@monaco-editor/react", () => ({
  Editor: () => <div data-testid="mock-editor" />,
  DiffEditor: () => <div data-testid="mock-diff-editor" />,
  useMonaco: () => null,
}));

const revisions = [
  { sha: "aaa111", timestamp: 1721300000, status: "ok", content: "models: {a: 1}\n" },
  { sha: "bbb222", timestamp: 1721200000, status: "failed: crash", content: "models: {a: 0}\n" },
];

describe("ConfigRevisionList", () => {
  it("renders one row per revision with its status", () => {
    render(
      <ConfigRevisionList revisions={revisions} currentContent="models: {a: 1}\n" onLoadIntoEditor={vi.fn()} />,
    );

    expect(screen.getByText(/ok/i)).toBeInTheDocument();
    expect(screen.getByText(/failed: crash/i)).toBeInTheDocument();
  });

  it("calls onLoadIntoEditor with the selected revision when its restore action is used", async () => {
    const onLoadIntoEditor = vi.fn();
    render(
      <ConfigRevisionList revisions={revisions} currentContent="models: {a: 1}\n" onLoadIntoEditor={onLoadIntoEditor} />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /load into editor/i })[1]);

    expect(onLoadIntoEditor).toHaveBeenCalledWith(revisions[1]);
  });

  it("opens a dialog with the diff when Preview diff is clicked", async () => {
    render(
      <ConfigRevisionList revisions={revisions} currentContent="models: {a: 1}\n" onLoadIntoEditor={vi.fn()} />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /preview diff/i })[1]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/diff against revision bbb222/i)).toBeInTheDocument();
  });
});
