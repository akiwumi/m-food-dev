import { test, expect } from "@playwright/test";

// Smoke coverage of the core happy paths, driven through the dev test-state hooks.
// These would have caught most of the recent saved-recipes regressions.

test("welcome screen loads for a first-time visitor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Let's eat/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /I already have an account/i })).toBeVisible();
});

test("home check-in produces recipe picks", async ({ page }) => {
  await page.goto("/?testState=home");
  await expect(page.getByRole("heading", { name: /How does dinner feel tonight/i })).toBeVisible();
  // Pick a meal type (required to enable "Choose") and run the check-in.
  await page.locator(".meal-category-pills button", { hasText: "Dinner" }).click();
  await page.getByRole("button", { name: /^Choose/ }).click();
  await expect(page.locator(".pick-card").first()).toBeVisible({ timeout: 15_000 });
});

test("opening a pick shows the recipe detail", async ({ page }) => {
  await page.goto("/?testState=home");
  await page.locator(".meal-category-pills button", { hasText: "Dinner" }).click();
  await page.getByRole("button", { name: /^Choose/ }).click();
  const firstPick = page.locator(".pick-card").first();
  await expect(firstPick).toBeVisible({ timeout: 15_000 });
  const title = await firstPick.locator("h2").innerText();
  await firstPick.getByRole("button", { name: /View recipe/i }).click();
  // Detail screen renders the recipe with a guided-cooking CTA.
  await expect(page.locator(".detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open guided cooking/i })).toBeVisible();
});

test("saving a pick persists it to the Saved tab", async ({ page }) => {
  await page.goto("/?testState=home");
  await page.locator(".meal-category-pills button", { hasText: "Dinner" }).click();
  await page.getByRole("button", { name: /^Choose/ }).click();
  const firstPick = page.locator(".pick-card").first();
  await expect(firstPick).toBeVisible({ timeout: 15_000 });
  const title = (await firstPick.locator("h2").innerText()).trim();
  await firstPick.getByRole("button", { name: /Save recipe/i }).click();
  // Go to the Saved tab via the bottom nav; the saved recipe should be there.
  await page.locator(".bottom-nav button", { hasText: "Saved" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("quick-start activation flow renders", async ({ page }) => {
  await page.goto("/?testState=quick-start");
  await expect(page.getByRole("heading", { name: /Tell me how dinner feels/i })).toBeVisible();
});
