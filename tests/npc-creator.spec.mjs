import { expect, test } from "@playwright/test";

test("NPC Creator saves, previews, filters, preserves knowledge and combat, publishes, and creates a token", async ({ page }) => {
  await page.goto("/tests/browser-pages/npc-creator-self-test.html");
  await page.locator('[data-npc-field="name"]').fill("Captain Elara");
  await page.locator('[data-npc-field="species"]').fill("Human");
  await page.locator('[data-npc-field="occupation"]').fill("Harbor Captain");
  await page.locator('[data-npc-field="description"]').fill("Keeps the harbor safe.");
  await page.locator('[data-npc-field="scope"]').selectOption("campaign");
  await page.locator('[data-npc-combat-panel] > summary').click();
  await page.locator('[data-npc-field="combatEnabled"]').check();
  await page.locator('[data-npc-field="ac"]').fill("15");
  await page.locator('[data-npc-field="hp"]').fill("44");
  await page.getByRole("button", { name: "+ Add Knowledge" }).click();
  await page.locator('[data-knowledge-field="title"]').fill("Secret Route");
  await page.locator('[data-knowledge-field="description"]').fill("Knows a safe passage.");
  await page.locator('[data-knowledge-field="secret"]').check();
  await page.locator('[data-npc-action="add-combat-action"]').scrollIntoViewIfNeeded();
  await page.locator('[data-npc-action="add-combat-action"]').click();
  await page.locator('[data-combat-field="name"]').fill("Saber");
  await page.locator('[data-combat-field="damage"]').fill("1d8 + 3 slashing");
  await expect(page.locator("[data-npc-preview]")).toContainText("Captain Elara");
  await expect(page.locator("[data-npc-preview]")).toContainText("Armor Class 15");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator("[data-npc-library]")).toContainText("Captain Elara");
  const saved = await page.evaluate(() => window.npcRecords()[0]);
  expect(saved.roomCode).toBe("SEA-1");
  expect(saved.knowledge[0].title).toBe("Secret Route");
  expect(saved.combat.actions[0].name).toBe("Saber");

  await page.locator('[data-npc-filter="occupation"]').fill("Harbor");
  await expect(page.locator("[data-npc-library]")).toContainText("Captain Elara");
  await page.locator('[data-npc-filter="occupation"]').fill("Wizard");
  await expect(page.locator("[data-npc-library]")).toContainText("No NPCs match");
  await page.locator('[data-npc-filter="occupation"]').fill("");

  await page.getByRole("button", { name: "Publish to Workshop" }).click();
  expect((await page.evaluate(() => window.__published)).assetType).toBe("npc");
  await page.getByRole("button", { name: "Create Token" }).click();
  await expect(page.locator("[data-npc-status]")).toHaveText("NPC token created.");
  expect((await page.evaluate(() => window.__token)).combat.hp).toBe(44);
});

test("NPC Creator duplicates independently and does not overflow a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/npc-creator-self-test.html");
  await page.locator('[data-npc-field="name"]').fill("Mira Vale");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator('[data-npc-field="name"]')).toHaveValue("Mira Vale Copy");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  expect(await page.evaluate(() => window.npcRecords().map((npc) => npc.id))).toHaveLength(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
