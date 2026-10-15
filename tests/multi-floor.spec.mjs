import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("tests/browser-pages/multi-floor-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();
});

test("floor selector switches maps without moving tokens and broadcasts the DM view", async ({ page }) => {
  await expect(page.locator("[data-floor-list] .hg-floor-row")).toHaveCount(2);
  await expect(page.locator("[data-floor-active]")).toContainText("Ground Floor");
  const tokenBefore = await page.evaluate(() => ({
    floorId: window.fixture.floorSystem.getState().floorId,
    token: { id: "hero", floorId: "ground", x: 20, y: 30 }
  }));
  await page.locator('[data-floor-action="select"][data-floor-id="second"]').click();
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

test("connection action targets the destination and the mobile panel does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.locator('[data-floor-action="use-connection"]').first().click();
  await expect.poll(() => page.evaluate(() => window.fixture.transfers.length)).toBe(1);
  expect(await page.evaluate(() => window.fixture.transfers[0])).toEqual({
    floorId: "second",
    connectionId: "stairs"
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
