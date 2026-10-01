import { expect, test } from "@playwright/test";

test("Spell Creator saves, filters, previews, attaches animations, and publishes one canonical record", async ({ page }) => {
  await page.goto("/tests/browser-pages/spell-creator-self-test.html");
  await page.locator('[data-spell-field="name"]').fill("Frost Chain");
  await page.locator('[data-spell-field="level"]').selectOption("2");
  await page.locator('[data-spell-field="school"]').selectOption("Evocation");
  await page.locator('[data-spell-field="classes"]').fill("Wizard, Sorcerer");
  await page.locator('[data-spell-field="damageType"]').selectOption("Cold");
  await page.locator('[data-spell-field="damageDice"]').fill("4d6");
  await page.locator('[data-spell-field="description"]').fill("Chains one target in supernatural frost.");
  await page.locator('[data-spell-field="concentration"]').check();
  await page.getByRole("button", { name: "Attach / Edit Animations" }).click();
  await expect(page.locator("[data-spell-status]")).toContainText("Animation sequence attached");
  await expect(page.locator("[data-spell-animation-summary]")).toHaveText("cast → impact");
  await expect(page.locator("[data-spell-preview]")).toContainText("Frost Chain");
  await expect(page.locator("[data-spell-preview]")).toContainText("4d6 · Cold");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator("[data-spell-library]")).toContainText("Frost Chain");

  await page.locator('[data-spell-filter="className"]').selectOption("Wizard");
  await page.locator('[data-spell-filter="damageType"]').selectOption("Cold");
  await expect(page.locator("[data-spell-library]")).toContainText("Frost Chain");
  await page.locator('[data-spell-filter="level"]').selectOption("3");
  await expect(page.locator("[data-spell-library]")).toContainText("No personal spells match");
  await page.locator('[data-spell-filter="level"]').selectOption("");

  await page.getByRole("button", { name: "Preview Animation" }).click();
  expect(await page.evaluate(() => window.__animationPreviews)).toBe(1);
  await page.getByRole("button", { name: "Publish to Workshop" }).click();
  const published = await page.evaluate(() => window.__published);
  expect(published.assetType).toBe("spell");
  expect(published.sourceScope).toBe("user:user-1");
  expect(published.content.classes).toEqual(["Wizard", "Sorcerer"]);
  expect(published.content.animations.impact.animationId).toBe("frost-impact");
  await page.getByRole("button", { name: "Add to Character" }).click();
  await expect(page.locator("[data-spell-status]")).toHaveText("Spell queued.");
  expect((await page.evaluate(() => window.__characterSpell)).id).toBe("spell-1");
});

test("Spell Creator duplicates independently and fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/spell-creator-self-test.html");
  await page.locator('[data-spell-field="name"]').fill("Moon Ward");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator('[data-spell-field="name"]')).toHaveValue("Moon Ward Copy");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  expect(await page.evaluate(() => window.spellRecords().map((spell) => spell.id))).toHaveLength(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
