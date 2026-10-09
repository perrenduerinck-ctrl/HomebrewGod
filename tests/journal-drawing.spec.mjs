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

test("journal serializes edits made during a delayed save", async ({ page }) => {
  await page.evaluate(() => window.fixture.delayNextWrite());
  await page.locator("[data-journal-new]").click();
  await expect(page.locator("[data-journal-editor]")).toBeVisible();
  await page.locator("[data-journal-title]").fill("Newest title wins");
  await page.locator("[data-journal-content]").fill("This was typed while the first save was waiting.");
  await page.evaluate(() => window.fixture.releaseWrite());

  await expect.poll(() => page.evaluate(() => window.fixture.journal.getState().dirty)).toBe(false);
  const saves = await page.evaluate(() => window.fixture.operations.filter((entry) => entry.type === "set"));
  expect(saves.at(-1).payload.title).toBe("Newest title wins");
  expect(saves.at(-1).payload.contentHtml).toContain("first save was waiting");
  expect(saves.at(-1).payload.revision).toBe(2);
});

test("journal preserves a local draft when a conflicting snapshot arrives", async ({ page }) => {
  await page.evaluate(() => window.fixture.emitJournal("dm", [{
    id: "conflict-note",
    roomCode: "ROOM-1",
    ownerUid: "dm-1",
    ownerName: "DM",
    title: "Remote title",
    category: "Lore",
    visibility: "dm",
    contentHtml: "<p>Remote version one</p>",
    searchText: "remote title lore remote version one",
    revision: 1,
    createdAtMillis: 10,
    updatedAtMillis: 10
  }]));
  await page.locator('[data-journal-key="dm/conflict-note"]').click();
  await page.locator("[data-journal-title]").fill("Unsaved local title");

  await page.evaluate(() => window.fixture.emitJournal("dm", [{
    id: "conflict-note",
    roomCode: "ROOM-1",
    ownerUid: "dm-1",
    ownerName: "DM",
    title: "Other tab title",
    category: "Lore",
    visibility: "dm",
    contentHtml: "<p>Remote version two</p>",
    searchText: "other tab title lore remote version two",
    revision: 2,
    createdAtMillis: 10,
    updatedAtMillis: 20
  }]));

  await expect(page.locator("[data-journal-title]")).toHaveValue("Unsaved local title");
  await page.evaluate(() => window.fixture.journal.saveCurrent({ immediate: true }));
  await expect(page.locator("[data-journal-status]")).toHaveAttribute("data-state", "conflict");
  await expect(page.locator("[data-journal-retry]")).toBeVisible();
  await expect(page.locator("[data-journal-retry]")).toHaveText("Save draft as copy");
  await expect(page.locator("[data-journal-title]")).toHaveValue("Unsaved local title");
  await page.locator("[data-journal-retry]").click();
  await expect(page.locator("[data-journal-title]")).toHaveValue("Unsaved local title (Conflict Copy)");
  const conflictCopy = await page.evaluate(() => window.fixture.operations.filter(
    (entry) => entry.type === "set" && entry.payload?.title === "Unsaved local title (Conflict Copy)"
  ).at(-1));
  expect(conflictCopy.payload.contentHtml).toContain("Remote version one");
});

test("journal saves before switching notes and duplicates the current draft", async ({ page }) => {
  await page.evaluate(() => window.fixture.emitJournal("dm", [
    {
      id: "note-a", roomCode: "ROOM-1", ownerUid: "dm-1", ownerName: "DM",
      title: "Note A", category: "Lore", visibility: "dm", contentHtml: "<p>A</p>",
      searchText: "note a lore a", revision: 1, createdAtMillis: 10, updatedAtMillis: 10
    },
    {
      id: "note-b", roomCode: "ROOM-1", ownerUid: "dm-1", ownerName: "DM",
      title: "Note B", category: "Lore", visibility: "dm", contentHtml: "<p>B</p>",
      searchText: "note b lore b", revision: 1, createdAtMillis: 11, updatedAtMillis: 11
    }
  ]));
  await page.locator('[data-journal-key="dm/note-a"]').click();
  await page.locator("[data-journal-content]").fill("Latest A draft");
  await page.locator('[data-journal-key="dm/note-b"]').click();
  await expect(page.locator("[data-journal-title]")).toHaveValue("Note B");
  const savedA = await page.evaluate(() => window.fixture.operations.findLast(
    (entry) => entry.type === "set" && entry.path.endsWith("/dmJournal/note-a")
  ));
  expect(savedA.payload.contentHtml).toContain("Latest A draft");

  await page.locator("[data-journal-content]").fill("Latest B draft");
  await page.locator("[data-journal-duplicate]").click();
  await expect(page.locator("[data-journal-title]")).toHaveValue("Note B (Copy)");
  const copySave = await page.evaluate(() => window.fixture.operations.filter(
    (entry) => entry.type === "set" && entry.payload?.title === "Note B (Copy)"
  ).at(-1));
  expect(copySave.payload.contentHtml).toContain("Latest B draft");
});

test("journal recovers a room-scoped draft and ignores a late save completion", async ({ page }) => {
  await page.evaluate(() => window.fixture.delayNextWrite());
  await page.locator("[data-journal-new]").click();
  await page.locator("[data-journal-title]").fill("Recovered room draft");
  await page.evaluate(() => window.fixture.journal.setContext({
    roomCode: "ROOM-2", userId: "dm-1", userName: "DM", isDm: true
  }));
  await page.evaluate(() => window.fixture.releaseWrite());
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.fixture.journal.getState().roomCode)).toBe("ROOM-2");

  await page.evaluate(() => window.fixture.journal.setContext({
    roomCode: "ROOM-1", userId: "dm-1", userName: "DM", isDm: true
  }));
  await expect(page.locator("[data-journal-list]")).toContainText("Recovered room draft");
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
