import { expect, test } from "@playwright/test";

test("Encounter Creator saves stable references, positions, initiative, publishes, and loads", async ({ page }) => {
  await page.goto("/tests/browser-pages/encounter-creator-self-test.html");
  await page.locator('[data-encounter-field="name"]').fill("Ambush at Glass Harbor");
  await page.locator("[data-encounter-map-select]").selectOption("map:docks");
  await page.locator("[data-encounter-combatant-select]").selectOption("monster:wight");
  await page.getByRole("button", { name: "+ Add Combatant" }).click();
  await page.locator('[data-combatant-field="x"]').fill("25");
  await page.locator('[data-combatant-field="y"]').fill("40");
  await page.locator('[data-combatant-field="elevation"]').fill("5");
  await page.locator('[data-combatant-field="initiativePreset"]').fill("17");
  await expect(page.locator("[data-encounter-preview]")).toContainText("Ambush at Glass Harbor");
  await expect(page.locator("[data-encounter-preview]")).toContainText("Wight");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  const saved = await page.evaluate(() => window.encounterRecords()[0]);
  expect(saved.mapRef.libraryId).toBe("map:docks");
  expect(saved.combatants[0].libraryId).toBe("monster:wight");
  expect(saved.combatants[0].initiativePreset).toBe(17);
  await page.locator(".hg-overflow-menu > summary").click();
  await page.getByRole("button", { name: "Publish to Workshop" }).click();
  expect((await page.evaluate(() => window.__published)).assetType).toBe("encounter");
  await page.getByRole("button", { name: "Load Encounter" }).click();
  await expect(page.locator("[data-encounter-status]")).toHaveText("Encounter loaded.");
  expect((await page.evaluate(() => window.__loaded)).combatants).toHaveLength(1);
});

test("Encounter Creator captures current setup, duplicates independently, and fits mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/encounter-creator-self-test.html");
  await page.locator('[data-encounter-field="name"]').fill("Captured Battle");
  await page.getByRole("button", { name: "Capture Current Battle" }).click();
  await expect(page.locator("[data-encounter-preview]")).toContainText("Wight");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await page.locator(".hg-overflow-menu > summary").click();
  await page.locator('[data-encounter-action="duplicate"]').click();
  await expect(page.locator('[data-encounter-field="name"]')).toHaveValue("Captured Battle Copy");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  expect(await page.evaluate(() => window.encounterRecords().length)).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
