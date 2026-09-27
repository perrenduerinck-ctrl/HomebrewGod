import { test, expect } from "@playwright/test";

test("deployed application shell opens Homebrew Workshop without losing room navigation", async ({ page }) => {
  await page.goto("?smokeTest=1&release=workshop", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  const state = await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("workshop"));
  expect(state.visible).toBe(true);
  await expect(page.getByRole("heading", { name: "Homebrew Workshop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse", exact: true })).toBeVisible();
  const navigation = await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setNavigationContext({ role: "player", roomOpen: true, screen: "workshop" }));
  expect(navigation.labels).toContain("Homebrew Workshop");
});
