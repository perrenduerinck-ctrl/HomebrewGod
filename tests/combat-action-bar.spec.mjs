import { expect, test } from "@playwright/test";

async function openCombatMap(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto("?smokeTest=1&release=combat-action-bar-20261010", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", {
    timeout: 30000
  });
  await page.evaluate(async () => {
    const release = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await release.openScreen("battle");
    release.setDmRole(true);
    release.setMovementTestTokens([
      {
        id: "hero", name: "Mira", type: "player", x: 25, y: 50,
        currentHp: 18, maxHp: 24, armorClass: 16,
        movementSpeed: 30, mapMode: "single", sizeCategory: "medium"
      },
      {
        id: "goblin", name: "Goblin", type: "enemy", x: 70, y: 50,
        currentHp: 7, maxHp: 7, armorClass: 15,
        movementSpeed: 30, mapMode: "single", sizeCategory: "small"
      }
    ]);
  });
}

test("token selection opens, updates and safely clears the Combat Action Bar", async ({ page }) => {
  await openCombatMap(page, { width: 1600, height: 900 });
  const bar = page.locator("#combatActionBar");
  await expect(bar).toBeHidden();

  await page.locator('.hg-token[data-token-id="hero"]').click();
  await expect(bar).toBeVisible();
  await expect(bar.locator("[data-action-actor]")).toContainText("Mira");
  await expect(bar.locator("[data-action-list]")).toContainText("Move");
  await expect(page.locator('.hg-token[data-token-id="hero"]')).toHaveAttribute("aria-pressed", "true");

  await page.locator('.hg-token[data-token-id="goblin"]').focus();
  await page.keyboard.press("Enter");
  await expect(bar.locator("[data-action-actor]")).toContainText("Goblin");

  await page.evaluate(() => {
    window.__HOMEBREW_GOD_RELEASE_TEST__.setMovementTestTokens([{
      id: "hero", name: "Mira", type: "player", x: 25, y: 50,
      movementSpeed: 30, mapMode: "single", sizeCategory: "medium"
    }]);
  });
  await expect(bar).toBeHidden();
});

test("Combat Action Bar collapses, hides, reopens and remembers the local preference", async ({ page }) => {
  await openCombatMap(page, { width: 1600, height: 900 });
  await page.locator('.hg-token[data-token-id="hero"]').click();
  const bar = page.locator("#combatActionBar");

  await bar.locator("[data-action-bar-collapse]").click();
  await expect(bar).toHaveClass(/is-compact/);
  await expect(bar.locator("[data-action-bar-collapse]")).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => localStorage.getItem("homebrewGodCombatActionBarDisplay"))).toBe("compact");

  await bar.locator("[data-action-bar-hide]").click();
  await expect(bar).toBeHidden();
  await expect(page.locator(".hg-action-bar-reopen")).toBeVisible();
  await page.locator(".hg-action-bar-reopen").click();
  await expect(bar).toBeVisible();
  await expect(bar).toHaveClass(/is-compact/);

  await bar.locator("[data-action-bar-collapse]").click();
  await expect(bar).not.toHaveClass(/is-compact/);
  await expect(bar.locator("[data-action-tabs]")).toBeVisible();
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 }
]) {
  test(`Combat Action Bar stays inside ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openCombatMap(page, viewport);
    await page.locator('.hg-token[data-token-id="hero"]').click();
    const box = await page.locator("#combatActionBar").boundingBox();
    expect(box).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test("Room Dashboard Battle Map uses the current tab", async ({ page }) => {
  await page.goto("?smokeTest=1&release=combat-navigation-20261010", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", {
    timeout: 30000
  });
  const opened = await page.evaluate(() => {
    let calls = 0;
    window.open = () => { calls += 1; };
    return window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("room").then(() => calls);
  });
  expect(opened).toBe(0);
  await page.locator("#openBattleMapButton").click();
  await expect(page.locator("#battleMapScreen")).toBeVisible();
  expect(await page.evaluate(() => window.location.search.includes("view=battle") || !window.location.search.includes("room="))).toBe(true);
});

