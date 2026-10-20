import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("tests/browser-pages/fog-of-war-self-test.html");
  await page.waitForFunction(() => Boolean(window.fixture));
});

test("DM enables fog and saves reveal, hide, and reset operations", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().enabled)).toBe(true);
  await expect(page.locator(".hg-fog-layer")).toHaveClass(/is-enabled/);

  await page.locator('[data-fog-tool="rectangle"]').click();
  const overlay = page.locator(".hg-fog-layer");
  const box = await overlay.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 280, box.y + 180);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.fixture.operations.filter(
    (entry) => entry.type === "set" && entry.path.includes("fogOperations")
  ).length)).toBe(1);
  let saved = await page.evaluate(() => window.fixture.operations.findLast(
    (entry) => entry.type === "set" && entry.path.includes("fogOperations")
  ).payload);
  expect(saved.tool).toBe("rectangle");
  expect(saved.mode).toBe("reveal");

  await page.locator('[data-fog-mode="hide"]').click();
  await page.locator('[data-fog-tool="circle"]').click();
  await page.mouse.move(box.x + 320, box.y + 130);
  await page.mouse.down();
  await page.mouse.move(box.x + 440, box.y + 250);
  await page.mouse.up();
  saved = await page.evaluate(() => window.fixture.operations.findLast(
    (entry) => entry.type === "set" && entry.path.includes("fogOperations")
  ).payload);
  expect(saved.tool).toBe("circle");
  expect(saved.mode).toBe("hide");

  await page.evaluate(() => window.fixture.setConfirmation(false));
  await page.locator("[data-fog-hide-all]").click();
  expect(await page.evaluate(() => window.fixture.fog.getState().revision)).toBe(1);
  await page.evaluate(() => window.fixture.setConfirmation(true));
  await page.locator("[data-fog-reveal-all]").click();
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().baseState)).toBe("revealed");
  expect(await page.evaluate(() => window.fixture.fog.getState().revision)).toBe(2);
  expect(await page.evaluate(() => window.fixture.fog.getState().operationCount)).toBe(0);
});

test("fog is independent per floor and restores from saved snapshots", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await page.locator('[data-fog-tool="rectangle"]').click();
  const box = await page.locator(".hg-fog-layer").boundingBox();
  await page.mouse.move(box.x + 100, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 160);
  await page.mouse.up();
  expect(await page.evaluate(() => window.fixture.fog.getState().operationCount)).toBe(1);

  await page.evaluate(() => window.fixture.reconnect());
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().enabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().operationCount)).toBe(1);

  await page.evaluate(() => window.fixture.setMapId("floor-two"));
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().mapId)).toBe("floor-two");
  expect(await page.evaluate(() => window.fixture.fog.getState().enabled)).toBe(false);
  expect(await page.evaluate(() => window.fixture.fog.getState().operationCount)).toBe(0);

  await page.evaluate(() => window.fixture.setMapId("floor-three"));
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().mapId)).toBe("floor-three");
  expect(await page.evaluate(() => window.fixture.fog.getState().enabled)).toBe(false);
  expect(await page.evaluate(() => window.fixture.fog.getState().operationCount)).toBe(0);

  await page.evaluate(() => window.fixture.setMapId("floor-one"));
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().enabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().operationCount)).toBe(1);
});

test("players receive fog live but cannot open editing controls", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await page.evaluate(() => window.fixture.setRole(false));
  await expect(page.locator("#fogOfWarToggleButton")).toBeHidden();
  await expect(page.locator(".hg-fog-toolbar")).toBeHidden();
  await expect(page.locator(".hg-fog-layer")).toHaveClass(/is-enabled/);
  expect(await page.evaluate(() => window.fixture.fog.getState().isDm)).toBe(false);

  const settingsPath = await page.evaluate(() => [...window.fixture.documents.keys()].find(
    (path) => path.endsWith("/fogSettings/floor-one")
  ));
  await page.evaluate((path) => {
    const existing = window.fixture.documents.get(path);
    window.fixture.documents.set(path, { ...existing, enabled: false, updatedAtMillis: 99 });
    window.fixture.emitSnapshots();
  }, settingsPath);
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().enabled)).toBe(false);
});

test("fog stays aligned through zoom and editing does not block token controls", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await page.evaluate(() => window.fixture.setZoom(1.5));
  const imageBox = await page.locator("#mapImage").boundingBox();
  const fogBox = await page.locator(".hg-fog-layer").boundingBox();
  expect(Math.abs(imageBox.x - fogBox.x)).toBeLessThan(1);
  expect(Math.abs(imageBox.y - fogBox.y)).toBeLessThan(1);
  expect(Math.abs(imageBox.width - fogBox.width)).toBeLessThan(1);
  expect(Math.abs(imageBox.height - fogBox.height)).toBeLessThan(1);

  await page.locator("#token").click();
  expect(await page.evaluate(() => window.fixture.getTokenClicks())).toBe(1);
});

test("failed fog saves remain retryable", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await page.locator('[data-fog-tool="brush"]').click();
  await page.evaluate(() => window.fixture.failNextWrite());
  const box = await page.locator(".hg-fog-layer").boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 160, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().failedCount)).toBe(1);
  await expect(page.locator("[data-fog-retry]")).toBeVisible();
  await page.locator("[data-fog-retry]").click();
  await expect.poll(() => page.evaluate(() => window.fixture.fog.getState().failedCount)).toBe(0);
});

test("automatic vision reveals, remembers exploration, and saves sight-blocking walls", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().currentPolygonCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().exploredCellCount)).toBeGreaterThan(0);
  const firstExplored = await page.evaluate(() => window.fixture.vision.getState().exploredCellCount);
  await expect(page.locator(".hg-fog-memory-fill")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.fixture.operations.some(
    (entry) => entry.type === "set" && entry.path.includes("visionExploration")
  ))).toBe(true);

  await page.evaluate(() => window.fixture.setTokens([{
    id: "hero", type: "player", ownerUid: "dm-1", x: 75, y: 50, floorId: "floor-one",
    vision: { distance: 30, darkvision: 0, brightLight: 0, dimLight: 0 }
  }]));
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().exploredCellCount)).toBeGreaterThan(firstExplored);

  await page.locator("#visionToolsToggleButton").click();
  await page.locator("[data-vision-wall-mode]").click();
  const overlay = page.locator(".hg-vision-wall-layer");
  const box = await overlay.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height - 30);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().wallCount)).toBe(1);
  expect(await page.evaluate(() => window.fixture.operations.some(
    (entry) => entry.type === "set" && entry.path.includes("visionWalls")
  ))).toBe(true);
});

test("vision and exploration stay separate by floor and player", async ({ page }) => {
  await page.locator("#fogOfWarToggleButton").click();
  await page.locator("[data-fog-enabled]").check();
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().currentPolygonCount)).toBe(1);

  await page.evaluate(() => window.fixture.setMapId("floor-two"));
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().mapId)).toBe("floor-two");
  expect(await page.evaluate(() => window.fixture.vision.getState().currentPolygonCount)).toBe(0);
  expect(await page.evaluate(() => window.fixture.vision.getState().exploredCellCount)).toBe(0);

  await page.evaluate(() => {
    window.fixture.setRole(false);
    window.fixture.setMapId("floor-one");
  });
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().currentPolygonCount)).toBe(0);
  await page.evaluate(() => window.fixture.setTokens([{
    id: "player-hero", type: "player", ownerUid: "player-1", x: 25, y: 50, floorId: "floor-one",
    vision: { distance: 20, darkvision: 60, brightLight: 0, dimLight: 0 }
  }]));
  await expect.poll(() => page.evaluate(() => window.fixture.vision.getState().currentPolygonCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.fixture.operations.some(
    (entry) => entry.type === "set"
      && entry.path.includes("visionExploration")
      && entry.payload.ownerUid === "player-1"
  ))).toBe(true);
  await expect(page.locator("#visionToolsToggleButton")).toBeHidden();
});
