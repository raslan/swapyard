import { describe, expect, it } from "vitest";

import { sortModels } from "./modelSort";
import type { ModelSummary } from "@/types/model";

function model(overrides: Partial<ModelSummary> & Pick<ModelSummary, "repoId">): ModelSummary {
  return {
    author: "org",
    downloads: 0,
    likes: 0,
    tags: [],
    pipelineTag: null,
    lastModified: null,
    gated: false,
    params: null,
    totalSize: null,
    ...overrides,
  };
}

describe("sortModels", () => {
  it("sorts by downloads descending", () => {
    const models = [model({ repoId: "a", downloads: 10 }), model({ repoId: "b", downloads: 50 })];
    expect(sortModels(models, "downloads").map((m) => m.repoId)).toEqual(["b", "a"]);
  });

  it("sorts by likes descending", () => {
    const models = [model({ repoId: "a", likes: 5 }), model({ repoId: "b", likes: 20 })];
    expect(sortModels(models, "likes").map((m) => m.repoId)).toEqual(["b", "a"]);
  });

  it("sorts by lastModified descending, treating null as oldest", () => {
    const models = [
      model({ repoId: "a", lastModified: 100 }),
      model({ repoId: "b", lastModified: null }),
      model({ repoId: "c", lastModified: 200 }),
    ];
    expect(sortModels(models, "lastModified").map((m) => m.repoId)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input array", () => {
    const models = [model({ repoId: "a", downloads: 1 }), model({ repoId: "b", downloads: 2 })];
    const original = [...models];
    sortModels(models, "downloads");
    expect(models).toEqual(original);
  });
});
