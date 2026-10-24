import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("tests/browser-pages/puzzle-environment-self-test.html");
  await page.locator("body[data-ready='true']").waitFor();
  await expect(page.locator('[data-object-id="lever-1"]')).toBeVisible();
});

async function buildLeverDoorPuzzle(page) {
  await page.locator("#mapPuzzlesToggleButton").click();
  await expect(page.locator(".hg-puzzle-toolbar")).toBeVisible();
  await page.locator('.hg-puzzle-toolbar [name="name"]').fill("Moon Vault");
  await page.locator("[data-puzzle-add-trigger]").click();
  await page.locator('[aria-label="Trigger 1 object"]').selectOption("lever-1");
  await page.locator('[aria-label="Trigger 1 state"]').selectOption("active");
  await page.locator("[data-puzzle-add-action]").click();
  await page.locator('[aria-label="Action 1 object"]').selectOption("door-1");
  await page.locator('[aria-label="Action 1 state"]').selectOption("open");
  await page.locator('[aria-label="Action 1 lock behavior"]').selectOption("unlock");
  await expect(page.locator("[data-puzzle-summary]")).toContainText("Moon Lever = Active");
  await expect(page.locator("[data-puzzle-summary]")).toContainText("Vault Door → Open + Unlock");
  await page.locator('[data-puzzle-form] button[type="submit"]').click();
  await expect(page.locator("[data-puzzle-status]")).toContainText("saved");
}

test("lever-to-door puzzle saves, triggers, synchronizes, and resets", async ({ page }) => {
  await buildLeverDoorPuzzle(page);
  await page.locator("[data-puzzle-close]").click();
  await page.locator('[data-object-id="lever-1"]').click();
  await page.evaluate(() => window.fixture.settle());
  await expect(page.locator('[data-object-id="door-1"]')).toHaveAttribute("data-object-state", "open");
  expect(await page.evaluate(() => window.fixture.getObjects().find((entry) => entry.id === "door-1").locked)).toBe(false);
  expect(await page.evaluate(() => window.fixture.getPuzzles()[0].runtime.status)).toBe("solved");
  expect(await page.evaluate(() => window.fixture.effects.some((entry) => entry.objectId === "door-1" && entry.animationId === "door-glow"))).toBe(true);

  await page.locator("#mapPuzzlesToggleButton").click();
  await page.locator("[data-puzzle-reset]").click();
  await page.evaluate(() => window.fixture.settle());
  await expect(page.locator('[data-object-id="door-1"]')).toHaveAttribute("data-object-state", "closed");
  expect(await page.evaluate(() => window.fixture.getObjects().find((entry) => entry.id === "door-1").locked)).toBe(true);
  expect(await page.evaluate(() => window.fixture.getObjects().find((entry) => entry.id === "lever-1").stateId)).toBe("inactive");
});

test("sequence editor exposes ordered inputs, multiple targets, and private progress", async ({ page }) => {
  await page.locator("#mapPuzzlesToggleButton").click();
  await page.locator('[name="triggerMode"]').selectOption("sequence");
  await page.locator("[data-puzzle-add-trigger]").click();
  await page.locator("[data-puzzle-add-trigger]").click();
  await page.locator('[aria-label="Trigger 2 object"]').selectOption("button-1");
  await page.locator("[data-puzzle-add-action]").click();
  await page.locator('[aria-label="Action 1 object"]').selectOption("door-1");
  await page.locator("[data-puzzle-add-action]").click();
  await page.locator('[aria-label="Action 2 object"]').selectOption("trap-1");
  await page.locator('[aria-label="Action 2 state"]').selectOption("disabled");
  await expect(page.locator("[data-puzzle-triggers] .hg-puzzle-link-row")).toHaveCount(2);
  await expect(page.locator("[data-puzzle-actions] .hg-puzzle-link-row")).toHaveCount(2);
  await expect(page.locator('[name="hiddenState"]')).toBeChecked();
  await expect(page.locator('[name="hiddenState"]')).toBeDisabled();
  await expect(page.locator("[data-puzzle-summary]")).toContainText("→");
});

test("players cannot open the editor and mobile layout stays in the viewport", async ({ page }) => {
  await page.evaluate(() => window.fixture.setRole("player"));
  await expect(page.locator("#mapPuzzlesToggleButton")).toBeHidden();
  await page.evaluate(() => window.fixture.setRole("dm"));
  await page.setViewportSize({ width: 390, height: 760 });
  await page.locator("#mapPuzzlesToggleButton").click();
  const box = await page.locator(".hg-puzzle-toolbar").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  expect(box.y + box.height).toBeLessThanOrEqual(761);
});
