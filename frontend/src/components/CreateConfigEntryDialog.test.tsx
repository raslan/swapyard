import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import * as api from "@/lib/api";
import type { ManagedModel } from "@/types/model";

import { CreateConfigEntryDialog } from "./CreateConfigEntryDialog";

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  // Fetched on dialog open (flags for tooltips/KV-cache-dropdown, model detail for the
  // context-length slider max and sampler recommendations) - without mocks jsdom's fetch
  // throws on the relative URLs, same pattern as BrowseDetailPage.test.tsx.
  vi.spyOn(api, "getConfigFlags").mockResolvedValue([]);
  vi.spyOn(api, "getModelDetail").mockResolvedValue({
    repoId: "org/model",
    author: "org",
    downloads: 0,
    likes: 0,
    readme: "",
    files: [],
    contextLength: null,
    recommendedSamplerParams: null,
  });
});

const baseModel: ManagedModel = {
  repoId: "org/model",
  sizeOnDisk: 1000,
  nbFiles: 1,
  lastModified: 0,
  ggufFiles: ["org-model.Q4_K_M.gguf"],
  mmprojFiles: [],
  configEntries: [],
};

function renderDialog(model: ManagedModel) {
  return render(
    <TooltipProvider>
      <CreateConfigEntryDialog model={model} />
    </TooltipProvider>,
  );
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: /create config entry/i }));
}

async function openAdvancedTab() {
  await userEvent.click(screen.getByRole("tab", { name: /advanced/i }));
}

describe("CreateConfigEntryDialog", () => {
  it("submitting the dialog calls createConfigEntry with the chosen file and model id", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    const modelIdInput = screen.getByLabelText(/model id/i);
    await userEvent.clear(modelIdInput);
    await userEvent.type(modelIdInput, "my-model");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(baseModel.repoId, "model-Q4_K_M.gguf", "my-model", {
      contextSize: undefined,
      cacheType: "q8_0",
      samplerParams: {},
      reasoning: undefined,
      reasoningBudget: undefined,
      reasoningBudgetMessage: undefined,
    });
  });

  it("defaults the model id to the last path segment of the repo id", async () => {
    renderDialog({ ...baseModel, repoId: "org/cool-model" });

    await openDialog();

    expect(screen.getByLabelText(/model id/i)).toHaveValue("cool-model");
  });

  it("shows a file picker when the model has multiple gguf files, and submits the chosen one", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf", "model-Q8_0.gguf"] });

    await openDialog();
    await userEvent.click(screen.getByRole("combobox", { name: /gguf file/i }));
    await userEvent.click(screen.getByRole("option", { name: /Q8_0/i }));
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q8_0.gguf",
      expect.any(String),
      expect.any(Object),
    );
  });

  it("shows the context slider and lets the user set an explicit context size", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await userEvent.click(screen.getByRole("checkbox", { name: /set context window/i }));
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q4_K_M.gguf",
      expect.any(String),
      expect.objectContaining({ contextSize: expect.any(Number) }),
    );
  });

  it("lets the user pick a different KV cache quantization", async () => {
    vi.spyOn(api, "getConfigFlags").mockResolvedValue([
      {
        flag: "--cache-type-k",
        aliases: ["-ctk"],
        description: "KV cache data type for K allowed values: f16, q8_0 (default: f16)",
        default: "f16",
      },
    ]);
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await userEvent.click(screen.getByRole("combobox", { name: /kv cache quantization/i }));
    await userEvent.click(await screen.findByRole("option", { name: "f16" }));
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q4_K_M.gguf",
      expect.any(String),
      expect.objectContaining({ cacheType: "f16" }),
    );
  });

  it("does not show the preset dropdown when the model has no recommended sampler params", async () => {
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await openAdvancedTab();

    expect(
      screen.queryByRole("combobox", { name: /fill from a recommended preset/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no recommended sampler settings found/i)).toBeInTheDocument();
  });

  it("one-click fills sampler fields from a single recommendation, sent on submit", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 0,
      likes: 0,
      readme: "",
      files: [],
      contextLength: null,
      recommendedSamplerParams: [
        {
          label: "Model's published defaults",
          params: { temperature: 0.7, top_p: 0.8, top_k: 20, repetition_penalty: 1.1 },
        },
      ],
    });
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await openAdvancedTab();

    // Nothing is set automatically just because a recommendation exists - only
    // picking it from the dropdown fills the fields.
    expect(screen.getByLabelText(/temperature/i)).toHaveValue(null);

    await userEvent.click(
      await screen.findByRole("combobox", { name: /fill from a recommended preset/i }),
    );
    await userEvent.click(screen.getByRole("option", { name: "Model's published defaults" }));

    expect(screen.getByLabelText(/temperature/i)).toHaveValue(0.7);
    expect(screen.getByLabelText(/^top p/i)).toHaveValue(0.8);
    expect(screen.getByLabelText(/^top k/i)).toHaveValue(20);
    expect(screen.getByLabelText(/repetition penalty/i)).toHaveValue(1.1);

    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q4_K_M.gguf",
      expect.any(String),
      expect.objectContaining({
        samplerParams: { temperature: 0.7, top_p: 0.8, top_k: 20, repetition_penalty: 1.1 },
      }),
    );
  });

  it("surfaces multiple candidate recommendations (e.g. thinking/non-thinking modes) in one dropdown", async () => {
    vi.spyOn(api, "getModelDetail").mockResolvedValue({
      repoId: "org/model",
      author: "org",
      downloads: 0,
      likes: 0,
      readme: "",
      files: [],
      contextLength: null,
      recommendedSamplerParams: [
        { label: "Non-thinking mode for text tasks", params: { temperature: 1.0, top_p: 1.0 } },
        { label: "Thinking mode for text tasks", params: { temperature: 0.6, top_p: 0.95 } },
      ],
    });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await openAdvancedTab();
    await userEvent.click(
      await screen.findByRole("combobox", { name: /fill from a recommended preset/i }),
    );

    expect(screen.getByRole("option", { name: "Non-thinking mode for text tasks" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "Thinking mode for text tasks" }));

    expect(screen.getByLabelText(/temperature/i)).toHaveValue(0.6);
    expect(screen.getByLabelText(/^top p/i)).toHaveValue(0.95);
  });

  it("includes min_p and presence_penalty in sampler params when set", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await openAdvancedTab();
    await userEvent.type(screen.getByLabelText(/^min p/i), "0.05");
    await userEvent.type(screen.getByLabelText(/presence penalty/i), "1.5");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q4_K_M.gguf",
      expect.any(String),
      expect.objectContaining({ samplerParams: { min_p: 0.05, presence_penalty: 1.5 } }),
    );
  });

  it("omits reasoning flags by default", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q4_K_M.gguf",
      expect.any(String),
      expect.objectContaining({
        reasoning: undefined,
        reasoningBudget: undefined,
        reasoningBudgetMessage: undefined,
      }),
    );
  });

  it("sends reasoning on/off and budget/message when set", async () => {
    const createSpy = vi
      .spyOn(api, "createConfigEntry")
      .mockResolvedValue({ status: "unverified", logs: null });
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await openAdvancedTab();
    await userEvent.click(screen.getByRole("combobox", { name: /thinking mode/i }));
    await userEvent.click(screen.getByRole("option", { name: "On" }));
    await userEvent.type(screen.getByLabelText(/reasoning budget/i), "2048");
    const messageInput = screen.getByLabelText(/budget message/i);
    await userEvent.clear(messageInput);
    await userEvent.type(messageInput, "Final Answer:");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(createSpy).toHaveBeenCalledWith(
      baseModel.repoId,
      "model-Q4_K_M.gguf",
      expect.any(String),
      expect.objectContaining({
        reasoning: "on",
        reasoningBudget: 2048,
        reasoningBudgetMessage: "Final Answer:",
      }),
    );
  });

  it("does not show the budget message field until a budget is set", async () => {
    renderDialog({ ...baseModel, ggufFiles: ["model-Q4_K_M.gguf"] });

    await openDialog();
    await openAdvancedTab();

    expect(screen.queryByLabelText(/budget message/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/reasoning budget/i), "100");

    expect(screen.getByLabelText(/budget message/i)).toBeInTheDocument();
  });
});
