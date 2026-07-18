import { expect, test } from "@playwright/test";

test("search, view files, download, then cancel", async ({ page }) => {
  await page.route("**/api/browse/search*", (route) =>
    route.fulfill({
      json: [
        { repo_id: "org/llama-gguf", author: "org", downloads: 500, likes: 10, tags: ["gguf"] },
      ],
    }),
  );
  await page.route("**/api/browse/models/org/llama-gguf", (route) =>
    route.fulfill({
      json: {
        repo_id: "org/llama-gguf",
        author: "org",
        downloads: 500,
        likes: 10,
        readme: "# Llama GGUF",
        files: [{ name: "model.Q4_K_M.gguf", size: 4_000_000_000, category: "gguf" }],
      },
    }),
  );
  // useDownloads() is a plain hook with local state, not shared context: ManagePage
  // mounts its own instance and re-fetches active downloads via GET on mount rather
  // than inheriting BrowseDetailPage's in-memory state. The mock must reflect that
  // "d1" is active after the POST, or ManagePage never learns about it.
  let downloadStarted = false;
  await page.route("**/api/downloads", (route) => {
    if (route.request().method() === "POST") {
      downloadStarted = true;
      return route.fulfill({ status: 202, json: { id: "d1" } });
    }
    return route.fulfill({
      json: downloadStarted
        ? [
            {
              id: "d1",
              repo_id: "org/llama-gguf",
              filename: "model.Q4_K_M.gguf",
              total: 100,
              downloaded: 50,
              status: "downloading",
              error: null,
            },
          ]
        : [],
    });
  });
  await page.route("**/api/downloads/d1/events", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: progress\ndata: {"id":"d1","repo_id":"org/llama-gguf","filename":"model.Q4_K_M.gguf","total":100,"downloaded":50,"status":"downloading","error":null}\n\n`,
    }),
  );
  await page.route("**/api/downloads/d1", (route) => {
    if (route.request().method() === "DELETE") return route.fulfill({ status: 204 });
    return route.continue();
  });
  await page.route("**/api/manage/models*", (route) => route.fulfill({ json: [] }));

  await page.goto("/browse");
  await page.getByPlaceholder("Search models...").fill("llama");
  await page.getByText("org/llama-gguf").click();

  await expect(page).toHaveURL(/\/browse\/org\/llama-gguf/);
  await page.getByRole("button", { name: "Files" }).click();
  await expect(page.getByText("model.Q4_K_M.gguf")).toBeVisible();

  await page.getByRole("button", { name: "Download" }).click();
  await expect(page).toHaveURL(/\/manage/);

  await page.getByRole("button", { name: "Cancel" }).click();
});
