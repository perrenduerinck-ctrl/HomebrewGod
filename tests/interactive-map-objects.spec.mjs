import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("tests/browser-pages/interactive-map-objects-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();
  await expect(page.locator('[data-object-id="door-1"]')).toBeVisible();
});

test("DM places, edits, duplicates, and deletes floor-scoped objects", async ({ page }) => {
  await page.locator("#mapObjectsToggleButton").click();
  await expect(page.locator(".hg-object-toolbar")).toBeVisible();
  await page.locator("[data-object-add-type]").selectOption("chest");
  await page.locator("[data-object-place]").click();
  await page.locator("#map").click({ position: { x: 700, y: 360 } });
  await expect(page.locator('[data-object-type="chest"]')).toHaveCount(1);
  await page.locator('[data-object-type="chest"]').click();
  await page.locator('[data-object-inspector] input[name="name"]').fill("Treasure Chest");
  await page.locator('[data-object-inspector] input[name="rotation"]').fill("45");
  await page.locator('[data-object-inspector]').locator('button[type="submit"]').click();
  await expect(page.locator('[data-object-status]')).toContainText("saved");
  await page.locator("[data-object-duplicate]").click();
  await expect(page.locator('[data-object-type="chest"]')).toHaveCount(2);
  await page.locator("[data-object-delete]").click();
  await expect(page.locator('[data-object-type="chest"]')).toHaveCount(1);
  await page.evaluate(() => window.fixture.setFloor("upper"));
  await expect(page.locator(".hg-map-object")).toHaveCount(0);
  await page.evaluate(() => window.fixture.setFloor("ground"));
  await expect(page.locator(".hg-map-object")).toHaveCount(2);
});

test("locked door acceptance flow syncs, persists, and remains player-safe", async ({ page }) => {
  await page.evaluate(() => window.fixture.setRole("player"));
  await expect(page.locator("#mapObjectsToggleButton")).toBeHidden();
  await page.locator('[data-object-id="door-1"]').click();
  expect(await page.evaluate(() => window.fixture.getObjects()[0].stateId)).toBe("closed");
  await page.evaluate(() => window.fixture.setRole("dm"));
  await page.locator("#mapObjectsToggleButton").click();
  await page.locator('[data-object-id="door-1"]').click();
  await page.locator('[data-object-inspector] input[name="locked"]').uncheck();
  await page.locator('[data-object-inspector]').locator('button[type="submit"]').click();
  await expect.poll(() => page.evaluate(() => window.fixture.getObjects()[0].locked)).toBe(false);
  await page.locator("[data-object-close]").click();
  await page.evaluate(() => window.fixture.setRole("player"));
  await page.locator('[data-object-id="door-1"]').click();
  await expect.poll(() => page.evaluate(() => window.fixture.getObjects()[0].stateId)).toBe("open");
  await page.evaluate(() => window.fixture.reconnect());
  await expect(page.locator('[data-object-id="door-1"]')).toHaveAttribute("data-object-state", "open");
  expect(await page.evaluate(() => window.fixture.writes.filter((entry) => entry.type === "interact").length)).toBe(1);
});

test("small screens keep the editor inside the visible viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.locator("#mapObjectsToggleButton").click();
  await expect(page.locator(".hg-object-toolbar")).toBeVisible();
  const box = await page.locator(".hg-object-toolbar").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  await expect(page.locator("body")).toHaveClass(/hg-editing-map-objects/);
});

test("one changed object does not rebuild the other 99 map objects", async ({ page }) => {
  const result = await page.evaluate(() => {
    const objects = Array.from({ length: 100 }, (_, index) => ({
      id: `scale-object-${index}`,
      roomCode: "ROOM-1",
      type: index % 2 ? "door" : "chest",
      name: `Scale Object ${index}`,
      sceneId: "keep",
      floorId: "ground",
      mapId: "scene:keep:floor:ground",
      transform: {
        x: 5 + (index % 10) * 9,
        y: 5 + Math.floor(index / 10) * 9,
        width: 4,
        height: 4,
        rotation: 0
      },
      stateId: index % 2 ? "closed" : "closed",
      allowPlayers: true,
      visibility: "shared",
      interactionDistanceFeet: 10,
      revision: 1,
      createdByUid: "dm-1",
      updatedByUid: "dm-1"
    }));
    const startedAt = performance.now();
    window.fixture.setObjects(objects);
    const initialMs = performance.now() - startedAt;
    const before = new Map([...document.querySelectorAll(".hg-map-object")].map(
      (element) => [element.dataset.objectId, element]
    ));
    window.fixture.setObjects(window.fixture.getObjects());
    const unchangedReused = [...document.querySelectorAll(".hg-map-object")].every(
      (element) => before.get(element.dataset.objectId) === element
    );
    const changed = window.fixture.getObjects().map((object, index) => (
      index === 42
        ? { ...object, transform: { ...object.transform, x: object.transform.x + 1 }, revision: 2 }
        : object
    ));
    const updateStartedAt = performance.now();
    window.fixture.setObjects(changed);
    const updateMs = performance.now() - updateStartedAt;
    const after = [...document.querySelectorAll(".hg-map-object")];
    const retained = after.filter((element) => before.get(element.dataset.objectId) === element).length;
    return {
      count: after.length,
      initialMs,
      updateMs,
      unchangedReused,
      retained,
      metrics: window.fixture.system.getRenderMetrics()
    };
  });

  expect(result.count).toBe(100);
  expect(result.unchangedReused).toBe(true);
  expect(result.retained).toBe(99);
  expect(result.metrics.replaced).toBeGreaterThanOrEqual(1);
  expect(result.initialMs).toBeLessThan(1000);
  expect(result.updateMs).toBeLessThan(250);
});
