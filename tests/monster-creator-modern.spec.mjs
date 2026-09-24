import { test, expect } from "@playwright/test";

const fixture = "/tests/browser-pages/monster-creator-self-test.html";
const section = (page, field) => page.locator(`[data-monster-entry-section="${field}"]`);

async function openFixture(page) {
  await page.goto(fixture);
  await expect(page.locator("#testResult")).toContainText("PASS");
  await page.evaluate(() => {
    const api = window.__MONSTER_CREATOR_MODERN_TEST__;
    api.setDm(true); api.reset();
  });
}

test("Monster Creator cards update the live stat block and preserve combat metadata", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.creator.loadMonsterIntoForm({
    name: "Clockwork Hydra",
    size: "Huge",
    type: "Construct",
    alignment: "Lawful neutral",
    ac: 19,
    hp: 210,
    speed: "40 ft.",
    cr: "13",
    abilities: { str: 22, dex: 12, con: 20, int: 8, wis: 14, cha: 10 },
    savingThrows: ["CON +10"], skills: ["Perception +7"],
    damageVulnerabilities: ["thunder"], damageResistances: ["fire"], damageImmunities: ["poison"],
    conditionImmunities: ["poisoned"], senses: ["darkvision 120 ft."],
    traits: "Immutable Form | Immune to transformations.",
    actions: [
      { id: "multi", name: "Multiattack", description: "Makes two Bite attacks.", sequence: [{ actionId: "bite", count: 2 }] },
      { id: "bite", name: "Bite", description: "Melee Weapon Attack." }
    ],
    bonusActions: "Overclock | Moves up to half speed.",
    reactions: "Deflect | Adds 4 AC.",
    legendaryActions: "Scan | Makes a Perception check.",
    lairActions: "Grinding Floor | The floor becomes difficult terrain.",
    actionAnimations: {
      multi: { animation: { family: "melee", stages: { impact: "slash" } }, sequence: [{ actionId: "bite", count: 2 }] },
      bite: { animation: { family: "melee", stages: { impact: "bite-impact" } } }
    }
  }, false));

  const preview = page.locator("[data-monster-stat-preview]");
  await expect(preview.locator("h3")).toHaveText("Clockwork Hydra");
  await expect(preview).toContainText("Huge Construct, Lawful neutral");
  await expect(preview).toContainText("22 (+6)");
  await expect(preview).toContainText("Damage Immunities poison");
  await expect(section(page, "traits").locator('[data-entry-field="name"]')).toHaveValue("Immutable Form");
  for (const heading of ["Traits", "Actions", "Bonus Actions", "Reactions", "Legendary Actions", "Lair Actions"])
    await expect(preview.getByRole("heading", { name: heading, exact: true })).toBeVisible();

  await page.locator("#monsterNameInput").fill("Clockwork Hydra Prime");
  await expect(preview.locator("h3")).toHaveText("Clockwork Hydra Prime");
  const actions = section(page, "actions");
  let cards = actions.locator("[data-entry-id]"); await expect(cards).toHaveCount(2);
  await cards.nth(1).locator('[data-entry-field="description"]').fill("Melee Weapon Attack. Deals piercing damage.");
  await expect(preview).toContainText("Deals piercing damage");

  await cards.nth(1).dragTo(cards.nth(0));
  cards = actions.locator("[data-entry-id]");
  await expect(cards.nth(0).locator('[data-entry-field="name"]')).toHaveValue("Bite");
  await cards.nth(0).getByRole("button", { name: "Duplicate" }).click(); await expect(cards).toHaveCount(3);
  await expect(cards.nth(1).locator('[data-entry-field="name"]')).toHaveValue("Bite Copy");
  await cards.nth(1).getByRole("button", { name: "Delete" }).click(); await expect(cards).toHaveCount(2);
  await cards.nth(0).getByRole("button", { name: "Collapse" }).click();
  await expect(cards.nth(0).locator(".monster-entry-card-body")).toBeHidden();

  const record = await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.creator.readMonsterForm());
  expect(record.actions.map(action => action.id)).toEqual(["bite", "multi"]);
  expect(record.actionAnimations.bite.animation.stages.impact).toBe("bite-impact");
  expect(record.actionAnimations.multi.sequence).toEqual([{ actionId: "bite", count: 2 }]);
});

test("Monster Creator cards save/reload, export, create tokens and fit laptop/mobile layouts", async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.creator.newMonster());
  await page.locator("#monsterNameInput").fill("Pass One Drake");
  const actions = section(page, "actions");
  await actions.getByRole("button", { name: "Add Action", exact: true }).click();
  const card = actions.locator("[data-entry-id]").first();
  await card.locator('[data-entry-field="name"]').fill("Tail Swipe");
  await card.locator('[data-entry-field="description"]').fill("The drake sweeps its tail.");
  const savedId = await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.creator.saveMonster());
  expect(savedId).toBeTruthy();
  const saved = await page.evaluate(id => {
    const api = window.__MONSTER_CREATOR_MODERN_TEST__;
    const record = api.storedMonsters.find(monster => monster.id === id);
    api.creator.loadMonsterIntoForm(record, true);
    return record;
  }, savedId);
  expect(saved.actions[0].name).toBe("Tail Swipe");
  await expect(actions.locator('[data-entry-field="name"]')).toHaveValue("Tail Swipe");

  const exported = await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.creator.getExportData());
  expect(exported.actions[0].description).toBe("The drake sweeps its tail.");
  const beforeTokens = await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.tokenRequests.length);
  await page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.creator.createMonsterToken());
  await expect.poll(() => page.evaluate(() => window.__MONSTER_CREATOR_MODERN_TEST__.tokenRequests.length)).toBe(beforeTokens + 1);
  const imported = await page.evaluate((monster) => (
    window.__MONSTER_CREATOR_MODERN_TEST__.creator.importMonsterData({ monster })
  ), exported);
  expect(imported.id).toBeUndefined();
  expect(imported.actions[0].name).toBe("Tail Swipe");
  await expect(actions.locator('[data-entry-field="name"]')).toHaveValue("Tail Swipe");

  await page.setViewportSize({ width: 1024, height: 780 });
  const laptop = await page.evaluate(() => {
    const editor = document.querySelector(".monster-editor-column").getBoundingClientRect();
    const preview = document.querySelector(".monster-preview-column").getBoundingClientRect();
    return { editorBottom: editor.bottom, previewTop: preview.top, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(laptop.previewTop).toBeGreaterThanOrEqual(laptop.editorBottom - 1); expect(laptop.overflow).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
