import { expect, test } from "@playwright/test";

async function openBattleMap(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto("?smokeTest=1&release=battle-map-ui-20261015", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", {
    timeout: 30000
  });
  await page.evaluate(async () => {
    localStorage.removeItem("homebrewGodCombatActionBarDisplay");
    const release = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await release.openScreen("battle");
    release.setDmRole(true);
    release.setMovementTestTokens([{
      id: "hero", name: "Mira", type: "player", x: 32, y: 44,
      currentHp: 18, maxHp: 24, armorClass: 16,
      movementSpeed: 30, mapMode: "single", sizeCategory: "medium"
    }]);
  });
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 }
]) {
  test(`map-first layout stays usable at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await openBattleMap(page, viewport);
    const surface = page.locator("#battleMapSurface");
    const box = await surface.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 2);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height * .85);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.locator("#floorManagementDrawer")).toHaveAttribute("aria-hidden", "true");

    const centerTarget = await page.evaluate(() => {
      const node = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return node?.id || node?.className || node?.tagName || "";
    });
    expect(String(centerTarget)).not.toContain("battleTopBar");
    await page.screenshot({
      path: testInfo.outputPath(`battle-map-${viewport.width}x${viewport.height}-closed.png`),
      fullPage: false
    });
  });
}

test("map tools, drawing, initiative and Battle Manager remain accessible", async ({ page }, testInfo) => {
  await openBattleMap(page, { width: 1600, height: 900 });

  await page.locator("#rulerToggleButton").click();
  await expect(page.locator("#rulerToggleButton")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#drawingToggleButton").click();
  await expect(page.locator("#drawingToggleButton")).toHaveAttribute("title", "Toggle map drawing tools");

  await page.locator("#battleInitiativePanel summary").click();
  await expect(page.locator("#battleInitiativePanel")).toHaveAttribute("open", "");
  await page.screenshot({ path: testInfo.outputPath("battle-map-initiative-open.png") });
  await page.keyboard.press("Escape");

  await page.locator("#battleManagerBar > summary").click();
  await expect(page.locator("#battleManagerBar")).toHaveAttribute("open", "");
  const managerBox = await page.locator("#battleManagerInner").boundingBox();
  expect(managerBox.x).toBeGreaterThanOrEqual(0);
  expect(managerBox.x + managerBox.width).toBeLessThanOrEqual(1601);
  expect(managerBox.y + managerBox.height).toBeLessThanOrEqual(901);
});

test("floor drawer keeps management actions available without moving the map", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("tests/browser-pages/multi-floor-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();

  await expect(page.locator("[data-floor-jump] option")).toHaveCount(3);
  await page.locator("[data-floor-manage-toggle]").click();
  await expect(page.locator("[data-floor-drawer]")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("[data-floor-connections]")).toContainText("Main Stairs");
  await page.locator("[data-floor-drawer]").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
  const drawerBox = await page.locator("[data-floor-drawer]").boundingBox();
  expect(drawerBox.x).toBeGreaterThanOrEqual(0);
  expect(drawerBox.x + drawerBox.width).toBeLessThanOrEqual(1601);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("battle-map-floor-drawer.png") });

  await page.locator('[data-floor-action="edit-connection"]').click();
  const editor = page.locator(".hg-floor-connection-editor");
  await expect(editor).toBeVisible();
  await expect(editor.locator('[name="name"]')).toHaveValue("Main Stairs");
  await editor.locator('[name="name"]').fill("Main Stairwell");
  await editor.locator('[data-connection-save]').click();
  await expect.poll(() => page.evaluate(() => window.fixture.connectionSaves.length)).toBe(1);

  const activeRow = page.locator(".hg-floor-row.is-active");
  await activeRow.locator(".hg-floor-row-menu > summary").click();
  await activeRow.locator('[data-floor-action="up"]').click();
  await expect.poll(() => page.evaluate(() => window.fixture.floorSaves.length)).toBe(1);

  await page.keyboard.press("Escape");
  await expect(page.locator("[data-floor-drawer]")).toHaveAttribute("aria-hidden", "true");
});

test("selected-token hotbar captures expanded and compact visual states", async ({ page }, testInfo) => {
  await openBattleMap(page, { width: 1600, height: 900 });
  await page.locator('.hg-token[data-token-id="hero"]').click();
  const bar = page.locator("#combatActionBar");
  await expect(bar).toBeVisible();
  await expect(bar.locator("[data-action-tabs]")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("battle-map-hotbar-expanded.png") });

  await bar.locator("[data-action-bar-collapse]").click();
  await expect(bar).toHaveClass(/is-compact/);
  await expect(bar.locator("[data-action-actor]")).toContainText("Mira");
  await page.screenshot({ path: testInfo.outputPath("battle-map-hotbar-compact.png") });
});
