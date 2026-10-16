import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("tests/browser-pages/multi-floor-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();
});

test("floor selector switches maps without moving tokens and broadcasts the DM view", async ({ page }) => {
  await expect(page.locator("[data-floor-list] .hg-floor-row")).toHaveCount(3);
  await expect(page.locator("[data-floor-active]")).toContainText("Ground Floor");
  const tokenBefore = await page.evaluate(() => ({
    floorId: window.fixture.floorSystem.getState().floorId,
    token: { id: "hero", floorId: "ground", x: 20, y: 30 }
  }));
  await page.locator('[data-floor-jump]').selectOption("second");
  await expect(page.locator("[data-floor-active]")).toContainText("Second Floor");
  const result = await page.evaluate(() => ({
    state: window.fixture.floorSystem.getState(),
    broadcasts: window.fixture.broadcasts
  }));
  expect(result.state.floorId).toBe("second");
  expect(result.state.mapScopeId).toBe("scene:house:floor:second");
  expect(result.broadcasts.at(-1)).toEqual({ sceneId: "house", floorId: "second" });
  expect(tokenBefore.token).toEqual({ id: "hero", floorId: "ground", x: 20, y: 30 });
});

test("compact navigation switches three floors and the drawer closes with Escape", async ({ page }) => {
  await expect(page.locator("[data-floor-drawer]")).toHaveAttribute("aria-hidden", "true");
  await page.locator('[data-floor-jump]').selectOption("basement");
  await expect(page.locator("[data-floor-active]")).toContainText("Basement");
  await page.locator('[data-floor-action="previous-floor"]').click();
  await expect(page.locator("[data-floor-active]")).toContainText("Ground Floor");
  await page.locator('[data-floor-action="previous-floor"]').click();
  await expect(page.locator("[data-floor-active]")).toContainText("Second Floor");

  await page.locator("[data-floor-manage-toggle]").click();
  await expect(page.locator("[data-floor-drawer]")).toHaveAttribute("aria-hidden", "false");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-floor-drawer]")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-floor-manage-toggle]")).toBeFocused();
});

test("connection action targets the destination and the mobile panel does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.locator("[data-floor-manage-toggle]").click();
  await page.locator('[data-floor-action="use-connection"]').first().click();
  await expect.poll(() => page.evaluate(() => window.fixture.transfers.length)).toBe(1);
  expect(await page.evaluate(() => window.fixture.transfers[0])).toEqual({
    floorId: "second",
    connectionId: "stairs"
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("player Follow DM state gates manual floor navigation without exposing DM controls", async ({ page }) => {
  await page.goto("tests/browser-pages/multi-floor-self-test.html?role=player");
  await page.locator("body[data-ready='true']").waitFor();
  await expect(page.locator("[data-floor-jump]")).toBeDisabled();
  await page.locator("[data-floor-manage-toggle]").click();
  await expect(page.locator("[data-floor-dm-controls]")).toBeHidden();
  await page.locator("[data-floor-follow]").uncheck();
  await expect(page.locator("[data-floor-jump]")).toBeEnabled();
  await page.locator("[data-floor-jump]").selectOption("second");
  await expect(page.locator("[data-floor-active]")).toContainText("Second Floor");
  expect(await page.evaluate(() => window.fixture.broadcasts.length)).toBe(0);
});

test("legacy single-map rooms keep a compact disabled selector", async ({ page }) => {
  await page.goto("tests/browser-pages/multi-floor-self-test.html?legacy=1");
  await page.locator("body[data-ready='true']").waitFor();
  await expect(page.locator("[data-floor-jump]")).toBeDisabled();
  await expect(page.locator("[data-floor-jump]")).toContainText("Legacy single map");
  await expect(page.locator("[data-floor-list] .hg-floor-row")).toHaveCount(0);
});
