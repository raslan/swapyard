import { expect, test } from "@playwright/test";

test("view downloaded models, sort, and delete", async ({ page }) => {
  await page.route("**/api/downloads*", (route) => route.fulfill({ json: [] }));
  // A trailing single "*" in a Playwright URL glob does not cross path separators,
  // so it matches "/api/manage/models?sort=name" (query suffix) but not the
  // per-repo delete endpoint "/api/manage/models/org/model-a" (path suffix) —
  // verified empirically, that DELETE request was falling through to the real
  // dev server and 404ing. "**" (double-star) matches both suffix shapes.
  await page.route("**/api/manage/models**", (route) => {
    if (route.request().method() === "DELETE") return route.fulfill({ status: 204 });
    return route.fulfill({
      json: [
        { repo_id: "org/model-a", size_on_disk: 2_000_000_000, nb_files: 1, last_modified: 1 },
        { repo_id: "org/model-b", size_on_disk: 5_000_000_000, nb_files: 2, last_modified: 2 },
      ],
    });
  });

  await page.goto("/manage");
  await expect(page.getByText("org/model-a")).toBeVisible();
  await expect(page.getByText("org/model-b")).toBeVisible();

  await page.getByRole("button", { name: "Name" }).click();

  await page.getByRole("button", { name: "Delete" }).first().click();
});
