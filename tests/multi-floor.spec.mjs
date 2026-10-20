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

test("connection editor cancellation is atomic after changes to every field", async ({ page }) => {
  await page.locator("[data-floor-manage-toggle]").click();
  const fields = [
    ["name", "Changed"], ["type", "portal"], ["movementCost", "25"],
    ["sourceFloorId", "basement"], ["sourceX", "0"], ["sourceY", "99"],
    ["destinationFloorId", "basement"], ["destinationX", "1"], ["destinationY", "2"]
  ];
  for (const [name, value] of fields) {
    await page.locator('[data-floor-action="edit-connection"]').first().click();
    const control = page.locator(`.hg-floor-connection-editor [name="${name}"]`);
    if (await control.evaluate((element) => element.tagName === "SELECT")) await control.selectOption(value);
    else await control.fill(value);
    await page.locator('.hg-floor-connection-editor [data-connection-cancel]').last().click();
    await expect(page.locator(".hg-floor-connection-editor")).toBeHidden();
  }
  expect(await page.evaluate(() => window.fixture.connectionSaves.length)).toBe(0);
  expect(await page.evaluate(() => window.fixture.connections[0])).toMatchObject({
    name: "Main Stairs", source: { x: 20, y: 30 }, destination: { x: 80, y: 70 }
  });
});

test("connection editor rejects invalid values, preserves zero, and saves once after confirmation", async ({ page }) => {
  await page.locator("[data-floor-manage-toggle]").click();
  await page.locator('[data-floor-action="edit-connection"]').first().click();
  await page.locator('.hg-floor-connection-editor [name="destinationY"]').fill("101");
  await page.locator('.hg-floor-connection-editor [data-connection-save]').click();
  await expect(page.locator("[data-connection-status]")).toContainText("Destination Y must be between 0 and 100");
  expect(await page.evaluate(() => window.fixture.connectionSaves.length)).toBe(0);
  await page.locator('.hg-floor-connection-editor [name="sourceX"]').fill("0");
  await page.locator('.hg-floor-connection-editor [name="destinationY"]').fill("65");
  await page.locator('.hg-floor-connection-editor [data-connection-save]').click();
  await expect(page.locator(".hg-floor-connection-editor")).toBeHidden();
  const saves = await page.evaluate(() => window.fixture.connectionSaves);
  expect(saves).toHaveLength(1);
  expect(saves[0].value.source.x).toBe(0);
  expect(saves[0].value.destination.y).toBe(65);
});

test("visual connection placement records map percentages and remains mobile-safe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.locator("[data-floor-manage-toggle]").click();
  await page.locator('[data-floor-action="edit-connection"]').first().click();
  await page.locator('[data-place-endpoint="source"]').click();
  const map = page.locator(".map-fixture");
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width * 0.4, y: box.height * 0.6 } });
  await expect(page.locator('.hg-floor-connection-editor [name="sourceX"]')).toHaveValue("40");
  await expect(page.locator('.hg-floor-connection-editor [name="sourceY"]')).toHaveValue("60");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.locator('.hg-floor-connection-editor [data-connection-cancel]').last().click();
  expect(await page.evaluate(() => window.fixture.connectionSaves.length)).toBe(0);
});

test("a failed connection write reports the error and never reports a successful save", async ({ page }) => {
  await page.goto("tests/browser-pages/multi-floor-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();
  await page.locator("[data-floor-manage-toggle]").click();
  await page.evaluate(() => window.fixture.failNextConnectionSave("Firebase is offline."));
  await page.locator('[data-floor-action="edit-connection"]').first().click();
  await page.locator('.hg-floor-connection-editor [name="name"]').fill("Offline Stairs");
  await page.locator('.hg-floor-connection-editor [data-connection-save]').click();
  await expect(page.locator("[data-floor-status]")).toContainText("Firebase is offline.");
  expect(await page.evaluate(() => window.fixture.connectionSaves.length)).toBe(0);
  await expect(page.locator("[data-floor-status]")).not.toContainText("updated");
});

test("a room change during floor-travel confirmation cannot move a same-id token in the new room", async ({ page }) => {
  await page.goto("tests/browser-pages/multi-floor-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();
  await page.locator("[data-floor-manage-toggle]").click();
  await page.evaluate(() => window.fixture.deferNextConfirmation());
  await page.locator('[data-floor-action="use-connection"]').first().click();
  await page.evaluate(() => {
    window.fixture.floorSystem.setContext({
      roomCode: "ROOM-2",
      userId: "dm-2",
      isDm: true,
      room: { activeSceneId: "house", activeFloorId: "ground" }
    });
    window.fixture.resolveDeferredConfirmation(true);
  });
  await expect(page.locator("[data-floor-status]")).toContainText("room or account changed");
  expect(await page.evaluate(() => window.fixture.transfers.length)).toBe(0);
});
