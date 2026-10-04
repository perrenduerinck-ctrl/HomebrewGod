import { expect, test } from "@playwright/test";

test("Summon Creator saves, publishes, and prepares a reusable preset", async ({ page }) => {
  await page.goto("/tests/browser-pages/summon-creator-self-test.html");
  await page.locator('[data-summon-creator-field="name"]').fill("Conjure Forest Wolves");
  await page.locator("[data-summon-creator-source]").selectOption("monster:wolf");
  await page.locator('[data-summon-creator-field="count"]').fill("4");
  await page.locator('[data-summon-creator-field="placementMode"]').selectOption("around-target");
  await page.locator('[data-summon-creator-field="durationMode"]').selectOption("turns");
  await page.locator('[data-summon-creator-field="durationValue"]').fill("3");
  await expect(page.locator("[data-summon-creator-preview]")).toContainText("Conjure Forest Wolves");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator("[data-summon-creator-status]")).toHaveText("Summon preset saved to My Library.");
  const saved = await page.evaluate(() => window.summonRecords()[0]);
  expect(saved.sourceLibraryId).toBe("monster:wolf");
  expect(saved.count).toBe(4);
  await page.getByRole("button", { name: "Publish to Workshop" }).click();
  expect((await page.evaluate(() => window.__published)).assetType).toBe("summon");
  await page.getByRole("button", { name: "Use in Spell / Ability" }).click();
  await expect(page.locator("[data-summon-creator-status]")).toHaveText("Summon preset prepared.");
  expect((await page.evaluate(() => window.__used)).automation.sourceId).toBe("wolf");
});

test("Summon Creator duplicates independently and fits mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/summon-creator-self-test.html");
  await page.locator('[data-summon-creator-field="name"]').fill("Dryad Ally");
  await page.locator("[data-summon-creator-source]").selectOption("npc:dryad");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator('[data-summon-creator-field="name"]')).toHaveValue("Dryad Ally Copy");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  expect(await page.evaluate(() => window.summonRecords().length)).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
