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
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
  await expect(page.locator(".pick-card").first()).toBeVisible({ timeout: 15_000 });
});

test("opening a pick shows the recipe detail", async ({ page }) => {
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

test("notifications are readable and managed inside the panel", async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date("2026-07-15T10:00:00.000Z").toISOString();
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `notice-${index}`,
      kind: index % 2 ? "email" : "push",
      subject: index === 0 ? "New reply from Sofia" : `Recipe reminder ${index}`,
      body: index === 0
        ? "Sofia replied to your shared recipe. Open the thread when you are ready."
        : "Your saved dinner plan is ready to review.",
      createdAt: now,
      status: "sent",
      read: false,
      tag: index === 0 ? "message" : "reminder",
    }));
    localStorage.setItem("moodfood-inbox", JSON.stringify(items));
  });

  await page.goto("/?testState=home");
  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(page.locator(".moody-panel header").getByText("Notifications")).toBeVisible();
  await expect(page.getByText("New reply from Sofia")).toBeVisible();
  await expect(page.getByText("Sofia replied to your shared recipe")).toBeVisible();

  await expect.poll(() => page.locator(".notif-card").first().evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(80);
  await expect.poll(() => page.locator(".notif-list").evaluate(element => {
    const list = element.getBoundingClientRect();
    const panel = element.closest(".moody-panel")!.getBoundingClientRect();
    return list.bottom <= panel.bottom + 1 && list.top >= panel.top;
  })).toBe(true);
  await expect.poll(() => page.locator(".notif-list").evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);

  await expect(page.getByText("Delete")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear notification: New reply from Sofia" }).click();
  await expect(page.getByText("New reply from Sofia")).toHaveCount(0);
});

test("quick-start activation flow renders", async ({ page }) => {
  await page.goto("/?testState=quick-start");
  await expect(page.getByRole("heading", { name: /Tell me how dinner feels/i })).toBeVisible();
});

test("community post composer accepts touch input", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "iOS-specific keyboard focus regression");
  await page.goto("/?testState=home");
  await page.getByRole("button", { name: "Community" }).click();
  await page.getByRole("button", { name: "Post" }).click();

  const composer = page.getByRole("textbox", { name: /Share a cook, recipe, or tip/i });
  await composer.tap();
  await expect(composer).toBeFocused();
  await composer.pressSequentially("Dinner turned out beautifully");
  await expect(composer).toHaveValue("Dinner turned out beautifully");

  // WKWebView needs focus to happen inside the touch gesture to reliably show
  // the software keyboard. Keep that timing guarantee separate from hit testing.
  await composer.blur();
  await composer.dispatchEvent("touchstart", {
    touches: [{ clientX: 40, clientY: 40 }],
    changedTouches: [{ clientX: 40, clientY: 40 }],
  });
  await expect(composer).toBeFocused();
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
