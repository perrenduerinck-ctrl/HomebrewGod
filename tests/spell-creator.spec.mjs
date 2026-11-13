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
      targeting: (await import("/data/spellTargeting.js")).createSpellTargetingData({ range: "90 ft.", duration: "Concentration, up to 1 minute", concentration: true, areaOfEffect: { type: "sphere", size: 20 } }),
      animations: { impact: { animationId: "gravity-impact" } },
      sourceWorkshopAssetId: "publication-1",
      sourceLibrarySpellId: "source-spell"
    });
  });
  await page.locator('[data-spell-field="name"]').fill("Gravity Snare Revised");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  const saved = await page.evaluate(() => window.spellRecords().find((spell) => spell.id === "advanced-spell"));
  expect(saved.name).toBe("Gravity Snare Revised");
  expect(saved.targeting.area).toEqual({ shape: "sphere", radius: 20 });
  expect(saved.damage[0].atSlotLevel).toEqual({ 4: "4d8" });
  expect(saved.healing[0].atSlotLevel).toEqual({ 4: "2d4 + MOD" });
  expect(saved.scaling.atCharacterLevel).toEqual({ 5: "4d8" });
  expect(saved.effects).toEqual([{ type: "condition", condition: "restrained" }]);
  expect(saved.materialCostGp).toBe(50);
  expect(saved.animations.impact.animationId).toBe("gravity-impact");
  expect(saved.sourceWorkshopAssetId).toBe("publication-1");
  expect(saved.sourceLibrarySpellId).toBe("source-spell");
});

test("Spell Creator advanced controls survive save, reopen, basic edits, and deletion", async ({ page }) => {
  await page.goto("/tests/browser-pages/spell-creator-self-test.html");
  await page.locator('[data-spell-field="name"]').fill("Restoring Sphere");
  await page.locator('[data-spell-field="level"]').selectOption("2");
  await page.locator('[data-spell-field="components"]').fill("V, S, M");
  await page.getByText("Advanced mechanics", { exact: true }).click();
  await page.locator('[data-spell-field="healingDice"]').fill("2d8 + MOD");
  await page.locator('[data-spell-field="materialCostGp"]').fill("50");
  await page.locator('[data-spell-field="materialConsumed"]').check();
  await page.locator('[data-spell-field="targetType"]').selectOption("point");
  await page.locator('[data-spell-field="areaShape"]').selectOption("sphere");
  await page.locator('[data-spell-field="areaSize"]').fill("15");
  await page.locator('[data-spell-field="condition"]').selectOption("restrained");
  await page.locator('[data-spell-scale="3"]').fill("4d6");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator('[data-spell-status]')).toContainText("saved to My Library");
  await page.getByRole("button", { name: "New Spell", exact: true }).click();
  await page.locator('[data-library-spell-id="spell-1"]').click();
  await expect(page.locator('[data-spell-field="healingDice"]')).toHaveValue("2d8 + MOD");
  await expect(page.locator('[data-spell-field="areaSize"]')).toHaveValue("15");
  await page.locator('[data-spell-field="name"]').fill("Restoring Sphere Revised");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator('[data-spell-status]')).toContainText("saved to My Library");
  const saved = await page.evaluate(() => window.spellRecords()[0]);
  expect(saved.healing[0].dice).toBe("2d8 + MOD");
  expect(saved.targeting.area).toEqual({ shape: "sphere", radius: 15 });
  expect(saved.materialCostGp).toBe(50);
  expect(saved.materialConsumed).toBe(true);
  expect(saved.scaling.atSlotLevel[3]).toBe("4d6");
  expect(saved.effects[0].condition).toBe("restrained");
  await page.locator(".hg-overflow-menu > summary").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator('[data-spell-status]')).toHaveText("Spell deleted.");
  expect(await page.evaluate(() => window.spellRecords())).toHaveLength(0);
});

test("Spell Creator edits multiple damage/healing components and keeps untouched mechanics", async ({ page }) => {
  await page.goto("/tests/browser-pages/spell-creator-self-test.html");
  await page.evaluate(() => window.creator.openSpell({ id: "components", name: "Twofold", level: 1, range: "60 feet", castingTime: "1 action", damage: [{ dice: "1d6", damageType: "Fire" }, { dice: "1d4", damageType: "Cold", atSlotLevel: { 3: "3d4" }, customMetadata: "keep-me" }], healing: [{ dice: "1d4" }, { dice: "2", atSlotLevel: { 2: "3" } }] }));
  await page.getByText("Advanced mechanics", { exact: true }).click();
  const extra = page.locator('[data-spell-component="damage:0"]');
  await extra.locator('[data-component-dice]').fill("2d4");
  await extra.getByText("Slot scaling", { exact: true }).click();
  await extra.locator('[data-component-scaling="atSlotLevel:3"]').fill("4d4");
  await page.getByRole("button", { name: "Add damage component", exact: true }).click();
  await page.locator('[data-spell-component="damage:1"] [data-component-dice]').fill("3d6");
  await page.locator('[data-spell-component="healing:0"] [data-component-dice]').fill("4");
  await page.getByText("Damage by character level", { exact: true }).click();
  await page.locator('[data-spell-character-scale="5"]').fill("2d6");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator('[data-spell-status]')).toContainText("saved to My Library");
  const saved = await page.evaluate(() => window.spellRecords()[0]);
  expect(saved.damage).toHaveLength(3);
  expect(saved.damage[1]).toMatchObject({ dice: "2d4", atSlotLevel: { 3: "4d4" }, customMetadata: "keep-me" });
  expect(saved.damage[0].atCharacterLevel[5]).toBe("2d6");
  expect(saved.healing[1]).toMatchObject({ dice: "4", atSlotLevel: { 2: "3" } });
  await page.getByRole("button", { name: "New Spell", exact: true }).click();
  await page.locator('[data-library-spell-id="components"]').click();
  await expect(page.locator('[data-spell-component="damage:1"] [data-component-dice]')).toHaveValue("3d6");
});

test("spell browsing filters concentration, rituals, secondary damage types and stable sort order", async ({ page }) => {
  await page.goto("/tests/browser-pages/spell-creator-self-test.html");
  await page.evaluate(async () => {
    for (const spell of [
      { id: "z", name: "Zebra", level: 1, concentration: true, ritual: false, damage: [{ dice: "1d6", damageType: "Fire" }, { dice: "1d4", damageType: "Cold" }] },
      { id: "a", name: "Amber", level: 2, ritual: true }
    ]) { await window.creator.openSpell(spell); await window.creator.save(); }
  });
  await page.locator('[data-spell-filter="sort"]').selectOption("name");
  await expect(page.locator('[data-library-spell-id] strong')).toHaveText(["Amber", "Zebra"]);
  await page.locator('[data-spell-filter="sort"]').selectOption("level");
  await expect(page.locator('[data-library-spell-id] strong')).toHaveText(["Zebra", "Amber"]);
  await page.locator('[data-spell-filter="concentration"]').selectOption("true");
  await expect(page.locator('[data-library-spell-id] strong')).toHaveText(["Zebra"]);
  await page.locator('[data-spell-filter="damageType"]').selectOption("Cold");
  await expect(page.locator('[data-library-spell-id] strong')).toHaveText(["Zebra"]);
  await page.locator('[data-spell-filter="damageType"]').selectOption("");
  await page.locator('[data-spell-filter="concentration"]').selectOption("");
  await page.locator('[data-spell-filter="ritual"]').selectOption("true");
  await expect(page.locator('[data-library-spell-id] strong')).toHaveText(["Amber"]);
});
