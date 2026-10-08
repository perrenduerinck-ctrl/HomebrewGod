import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("tests/browser-pages/journal-drawing-self-test.html");
  await page.waitForFunction(() => Boolean(window.fixture));
});

test("journal creates, edits, auto-saves, sanitizes, and moves visibility", async ({ page }) => {
  await page.locator("[data-journal-new]").click();
  await expect(page.locator("[data-journal-editor]")).toBeVisible();
  await page.locator("[data-journal-title]").fill("Moon Temple");
  await page.locator("[data-journal-content]").evaluate((element) => {
    element.innerHTML = '<p onclick="bad()">Find the <strong>silver key</strong>.</p><script>bad()</script>';
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  });
  await page.waitForTimeout(850);

  const saved = await page.evaluate(() => window.fixture.operations.filter((entry) => entry.type === "set"));
  expect(saved.length).toBeGreaterThanOrEqual(2);
  const latestPayload = saved.at(-1).payload;
  expect(latestPayload.title).toBe("Moon Temple");
  expect(latestPayload.contentHtml).toContain("<strong>silver key</strong>");
  expect(latestPayload.contentHtml).not.toContain("onclick");
  expect(latestPayload.contentHtml).not.toContain("script");

  await page.locator("[data-journal-visibility]").selectOption("shared");
  await page.waitForTimeout(850);
  const batches = await page.evaluate(() => window.fixture.operations.filter((entry) => entry.type === "batch"));
  expect(batches.at(-1).entries.some((entry) => entry.path.includes("sharedJournal"))).toBe(true);
  expect(batches.at(-1).entries.some((entry) => entry.path.includes("dmJournal") && entry.type === "delete")).toBe(true);
});

test("mouse and touch each save one completed stroke, maps stay isolated", async ({ page }) => {
  await page.evaluate(() => window.fixture.drawing.open());
  const overlay = page.locator(".hg-map-drawing-layer");
  const box = await overlay.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + 80, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + 350, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => page.evaluate(() => (
    window.fixture.operations.filter((entry) => entry.type === "set" && entry.path.includes("sharedDrawings")).length
  ))).toBe(1);

  await overlay.evaluate((element, rect) => {
    Object.defineProperty(element, "setPointerCapture", { value: () => {}, configurable: true });
    Object.defineProperty(element, "releasePointerCapture", { value: () => {}, configurable: true });
    const start = new PointerEvent("pointerdown", {
      bubbles: true, pointerId: 12, pointerType: "touch", isPrimary: true,
      button: 0, clientX: rect.x + 300, clientY: rect.y + 260
    });
    const move = new PointerEvent("pointermove", {
      bubbles: true, pointerId: 12, pointerType: "touch", isPrimary: true,
      button: 0, clientX: rect.x + 420, clientY: rect.y + 350
    });
    const end = new PointerEvent("pointerup", {
      bubbles: true, pointerId: 12, pointerType: "touch", isPrimary: true,
      button: 0, clientX: rect.x + 420, clientY: rect.y + 350
    });
    element.dispatchEvent(start);
    element.dispatchEvent(move);
    element.dispatchEvent(end);
  }, box);
  await expect.poll(async () => page.evaluate(() => (
    window.fixture.operations.filter((entry) => entry.type === "set" && entry.path.includes("sharedDrawings")).length
  ))).toBe(2);

  expect(await page.evaluate(() => window.fixture.drawing.getState().sharedCount)).toBe(2);
  await page.evaluate(() => window.fixture.setMapId("map-two"));
  expect(await page.evaluate(() => window.fixture.drawing.getState().sharedCount)).toBe(0);
  expect(await page.evaluate(() => window.fixture.drawing.getState().mapId)).toBe("map-two");
});

test("draw mode preserves token controls and undo only deletes the local stroke", async ({ page }) => {
  const token = page.locator("#token");
  await token.click();
  expect(await page.evaluate(() => window.fixture.getTokenClicks())).toBe(1);

  await page.evaluate(() => window.fixture.drawing.open());
  await token.click();
  expect(await page.evaluate(() => window.fixture.getTokenClicks())).toBe(2);
  const overlay = page.locator(".hg-map-drawing-layer");
  const box = await overlay.boundingBox();
  await page.mouse.move(box.x + 120, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 350);
  await page.mouse.up();
  expect(await page.evaluate(() => window.fixture.getTokenClicks())).toBe(2);

  await page.locator("[data-drawing-undo]").click();
  await expect.poll(async () => page.evaluate(() => (
    window.fixture.operations.filter((entry) => entry.type === "delete" && entry.path.includes("sharedDrawings")).length
  ))).toBe(1);
  expect(await page.evaluate(() => window.fixture.drawing.getState().sharedCount)).toBe(0);

  await page.evaluate(() => window.fixture.drawing.setActive(false));
  await token.click();
  expect(await page.evaluate(() => window.fixture.getTokenClicks())).toBe(3);
});

test("journal and drawing controls remain usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.fixture.drawing.open());
  const toolbarBox = await page.locator(".hg-drawing-toolbar").boundingBox();
  const journalBox = await page.locator(".hg-journal").boundingBox();
  expect(toolbarBox.x).toBeGreaterThanOrEqual(0);
  expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(390);
  expect(journalBox.x).toBeGreaterThanOrEqual(0);
  expect(journalBox.x + journalBox.width).toBeLessThanOrEqual(390);
  await page.locator("[data-journal-new]").click();
  await expect(page.locator("[data-journal-content]")).toBeVisible();
});
