import { test, expect } from "@playwright/test";

async function mockLiveRecipeProvider(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.__MOODFOOD_TEST_LIVE_RECIPES__ = [{
      id: "spoonacular-e2e-1",
      title: "Live Lemon Herb Chicken",
      image: "https://img.spoonacular.com/recipes/716429-636x393.jpg",
      time: 30,
      difficulty: "Easy",
      calories: 420,
      moods: ["Tired"],
      reason: "A current Spoonacular dinner matched to this check-in.",
      ingredients: ["2 chicken breasts", "1 lemon", "2 tbsp olive oil", "fresh herbs"],
      steps: [
        { text: "Heat the oven to 200C and season the chicken with salt, pepper, lemon, and herbs." },
        { text: "Roast for 22 minutes until cooked through, then rest for 5 minutes before serving." },
      ],
      cuisine: "Mediterranean",
      mealTypes: ["main course", "dinner"],
      diets: [],
      allergens: [],
      equipment: [],
      status: "published",
      provider: "Spoonacular",
      sourceUrl: "https://spoonacular.com/recipes/live-lemon-herb-chicken-1",
    }];
  });
}

// Smoke coverage of the core happy paths, driven through the dev test-state hooks.
// These would have caught most of the recent saved-recipes regressions.

test("welcome screen loads for a first-time visitor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Let's eat/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /I already have an account/i })).toBeVisible();
});

test("home check-in produces recipe picks", async ({ page }) => {
  await mockLiveRecipeProvider(page);
  await page.goto("/?testState=home");
  await expect(page.getByRole("heading", { name: /How does dinner feel tonight/i })).toBeVisible();
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
  await expect(page.locator(".pick-card").first()).toBeVisible({ timeout: 15_000 });
});

test("opening a pick shows the recipe detail", async ({ page }) => {
  await mockLiveRecipeProvider(page);
  await page.goto("/?testState=home");
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
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
  await mockLiveRecipeProvider(page);
  await page.goto("/?testState=home");
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
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

test("community post composer accepts touch input", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iOS-specific keyboard focus regression");
  await page.goto("/?testState=home");
  await page.getByRole("button", { name: "Community" }).click();
  await page.getByRole("button", { name: "Post", exact: true }).click();

  const composer = page.getByRole("textbox", { name: "Post message" });
  // Focus must be established by the same user gesture that opens the
  // composer; WKWebView otherwise refuses to show the software keyboard.
  await expect(composer).toBeFocused();
  await composer.pressSequentially("Dinner turned out beautifully");
  await expect(composer).toHaveValue("Dinner turned out beautifully");
});

test("community publishing, replies, and trending recipes work on WebKit", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iPhone community journey");
  await page.goto("/?testState=home");
  await page.getByRole("button", { name: "Community" }).click();

  await page.getByRole("button", { name: "Post", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Post message" });
  await expect(composer).toBeFocused();
  await composer.fill("WebKit community dinner test");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status")).toContainText("Post published");

  const published = page.locator(".community-feed-item", { hasText: "WebKit community dinner test" });
  await expect(published).toBeVisible();
  await published.locator(".community-feed-open").click();
  const detail = page.getByRole("dialog", { name: "Community post detail" });
  await expect(detail).toBeVisible();
  await detail.getByRole("textbox", { name: /Reply as/i }).fill("Looks delicious");
  await detail.getByRole("button", { name: "Send reply" }).click();
  await expect(detail.getByText("Looks delicious")).toBeVisible();
  await detail.getByRole("button", { name: "Back to community" }).click();

  const cards = page.locator(".community-trending-card");
  const first = cards.first();
  const dismissedTitle = (await first.locator(".community-trending-open b").innerText()).trim();
  await first.getByRole("button", { name: /Not interested in/i }).click();
  await first.getByRole("button", { name: "Not interested", exact: true }).click();
  await expect(page.locator(".community-trending-open b", { hasText: dismissedTitle })).toHaveCount(0);

  await cards.first().locator(".community-trending-open").click();
  await expect(page.locator(".detail")).toBeVisible();
  await expect(page.getByRole("button", { name: /Open guided cooking/i })).toBeVisible();
});

test("first-run choices respond to touch", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iPhone touch-flow coverage");
  await page.goto("/");

  await page.getByRole("button", { name: "Let's eat" }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Pick your meal" }).tap();

  const stressed = page.getByRole("button", { name: "Stressed", exact: true });
  await stressed.tap();
  await expect(stressed).toHaveClass(/active/);

  const thirtyMinutes = page.getByRole("button", { name: "30", exact: true });
  await thirtyMinutes.tap();
  await expect(thirtyMinutes).toHaveClass(/active/);

  await page.getByRole("combobox", { name: "Diet" }).selectOption("Vegetarian");
  await page.getByRole("textbox", { name: "Allergies" }).fill("peanuts");
  await page.getByRole("button", { name: "Choose" }).tap();

  await expect(page.getByText("DINNER IS HANDLED")).toBeVisible();
  await expect(page.getByText("Safety checked")).toBeVisible();
});

test("pulling down does not reload the app", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iPhone pull-gesture coverage");
  await page.addInitScript(() => {
    const count = Number(sessionStorage.getItem("moodfood-test-loads") || "0");
    sessionStorage.setItem("moodfood-test-loads", String(count + 1));
  });
  await page.goto("/?testState=home");
  await expect(page.getByRole("heading", { name: /How does dinner feel tonight/i })).toBeVisible();

  const dispatchTouch = (type: "touchstart" | "touchmove" | "touchend", y: number) => page.evaluate(({ type, y }) => {
    const touch = { identifier: 1, target: document.body, clientX: 180, clientY: y };
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [touch] });
    Object.defineProperty(event, "changedTouches", { value: [touch] });
    document.dispatchEvent(event);
  }, { type, y });

  await dispatchTouch("touchstart", 20);
  await dispatchTouch("touchmove", 150);
  await dispatchTouch("touchend", 150);
  await page.waitForTimeout(500);

  await expect(page.getByRole("heading", { name: /How does dinner feel tonight/i })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => sessionStorage.getItem("moodfood-test-loads"))).toBe("1");
});

test("profile onboarding remains tappable through account setup", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iPhone onboarding-flow coverage");
  await page.goto("/?testState=onboarding");

  const stressedMood = page.getByRole("button", { name: /Stressed My mind is full/i });
  await stressedMood.tap();
  await expect(stressedMood).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /^Continue/ }).tap();
  await expect(page.getByRole("heading", { name: /How do you usually eat/i })).toBeVisible();

  const dietAnswer = page.getByRole("button", { name: "Vegetarian", exact: true });
  await dietAnswer.tap();
  await expect(dietAnswer).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Back", exact: true }).tap();
  await expect(stressedMood).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Continue/ }).tap();

  for (let step = 0; step < 60; step += 1) {
    if (await page.getByRole("heading", { name: /Nice to meet you/i }).isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: /^(Continue|Review profile)/ }).tap();
  }

  await expect(page.getByRole("heading", { name: /Nice to meet you/i })).toBeVisible();
  const sheet = page.locator(".onboarding-sheet");
  await sheet.evaluate(element => element.scrollTo(0, element.scrollHeight));
  await expect.poll(() => sheet.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Back", exact: true }).tap();
  await expect(page.getByRole("heading", { name: /Nice to meet you/i })).not.toBeVisible();
  await expect.poll(() => sheet.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Review profile" }).tap();
  await expect(page.getByRole("heading", { name: /Nice to meet you/i })).toBeVisible();
  await page.getByRole("button", { name: /^Continue/ }).tap();
  await expect(page.getByText("DINNER IS HANDLED")).toBeVisible();
  await page.getByRole("button", { name: /Save this profile/i }).tap();
  await expect(page.getByRole("heading", { name: "Save your profile." })).toBeVisible();

  await page.getByLabel("Name").fill("iPhone Test Cook");
  await page.getByLabel("Email address").fill("iphone-test@gmail.com");
  const password = page.getByLabel("Password");
  await password.tap();
  await expect(password).toBeFocused();
  await password.fill("onboarding-test-password");
  await page.getByRole("button", { name: /Create account/i }).tap();
  await expect(page.getByRole("heading", { name: /Welcome aboard, iPhone Test Cook/i })).toBeVisible();
});

test("onboarding remains usable in a short iPhone viewport", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iPhone compact-height coverage");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/?testState=onboarding");

  const sheet = page.locator(".onboarding-sheet");
  await expect(sheet).toBeVisible();
  await expect.poll(() => sheet.evaluate(element => element.clientHeight)).toBeGreaterThan(160);
  await expect(page.getByRole("button", { name: /^Continue/ })).toBeInViewport();
});

test("desktop onboarding remains scrollable", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "desktop layout coverage");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?testState=onboarding");

  await expect(page.locator(".desktop-onboarding")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator(".desktop-ob-footer")).toBeVisible();
});
