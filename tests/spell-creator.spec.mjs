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
  const animationButton = page.getByRole("button", { name: "Attach / Edit Animations" });
  await animationButton.evaluate((button) => button.scrollIntoView({ block: "center" }));
  await animationButton.click();
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
  await page.locator(".hg-overflow-menu > summary").click();
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
  await page.locator(".hg-overflow-menu > summary").click();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator('[data-spell-field="name"]')).toHaveValue("Moon Ward Copy");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  expect(await page.evaluate(() => window.spellRecords().map((spell) => spell.id))).toHaveLength(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("Spell Creator basic edits preserve hidden advanced mechanics", async ({ page }) => {
  await page.goto("/tests/browser-pages/spell-creator-self-test.html");
  await page.evaluate(async () => {
    await window.creator.openSpell({
      id: "advanced-spell",
      name: "Gravity Snare",
      level: 3,
      school: "Transmutation",
      castingTime: "1 action",
      range: "90 ft.",
      duration: "Concentration, up to 1 minute",
      components: "V, S, M",
      material: "a lodestone worth 50 gp",
      materialCostGp: 50,
      materialConsumed: false,
      concentration: true,
      classes: ["Wizard"],
      damage: [{ dice: "3d8", damageType: "Force", atSlotLevel: { 4: "4d8" } }],
      healing: [{ dice: "1d4 + MOD", atSlotLevel: { 4: "2d4 + MOD" } }],
      scaling: { atCharacterLevel: { 5: "4d8" } },
      effects: [{ type: "condition", condition: "restrained" }],
      targeting: {
        targetType: "point",
        range: { type: "distance", distanceFeet: 90 },
        area: { shape: "sphere", sizeFeet: 20 },
        duration: { type: "timed", value: 1, unit: "minute", concentration: true }
      },
      animations: { impact: { animationId: "gravity-impact" } },
      sourceWorkshopAssetId: "publication-1",
      sourceLibrarySpellId: "source-spell"
    });
  });
  await page.locator('[data-spell-field="name"]').fill("Gravity Snare Revised");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  const saved = await page.evaluate(() => window.spellRecords().find((spell) => spell.id === "advanced-spell"));
  expect(saved.name).toBe("Gravity Snare Revised");
  expect(saved.targeting.area).toEqual({ shape: "sphere", sizeFeet: 20 });
  expect(saved.damage[0].atSlotLevel).toEqual({ 4: "4d8" });
  expect(saved.healing[0].atSlotLevel).toEqual({ 4: "2d4 + MOD" });
  expect(saved.scaling.atCharacterLevel).toEqual({ 5: "4d8" });
  expect(saved.effects).toEqual([{ type: "condition", condition: "restrained" }]);
  expect(saved.materialCostGp).toBe(50);
  expect(saved.animations.impact.animationId).toBe("gravity-impact");
  expect(saved.sourceWorkshopAssetId).toBe("publication-1");
  expect(saved.sourceLibrarySpellId).toBe("source-spell");
});
