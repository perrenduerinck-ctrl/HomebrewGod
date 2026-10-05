import { expect, test } from "@playwright/test";

async function createNpc(page, name, { knowledge = "" } = {}) {
  await page.locator('[data-npc-field="name"]').fill(name);
  if (knowledge) {
    await page.getByRole("button", { name: "+ Add Knowledge" }).click();
    await page.locator('[data-knowledge-field="title"]').last().fill(knowledge);
  }
  await page.getByRole("button", { name: "Save to My Library" }).click();
}

test("NPC network creates, edits, reloads, and deletes explicit relationships", async ({ page }) => {
  await page.goto("/tests/browser-pages/npc-creator-self-test.html");
  await createNpc(page, "Captain Elara", { knowledge: "Secret Route" });
  await page.getByRole("button", { name: "New NPC" }).click();
  await createNpc(page, "Mira Vale");
  await page.getByRole("button", { name: "Relationship Network" }).click();
  await expect(page.locator("[data-network-canvas]")).toBeVisible();
  await page.locator('[data-relationship-field="sourceNpcId"]').selectOption({ label: "Captain Elara" });
  await page.locator('[data-relationship-field="targetNpcId"]').selectOption({ label: "Mira Vale" });
  await page.locator('[data-relationship-field="relationshipType"]').selectOption("Ally");
  await page.locator('[data-relationship-field="direction"]').selectOption("mutual");
  await page.getByRole("button", { name: "Save Relationship" }).click();
  await expect(page.locator("[data-network-scene]")).toContainText("Ally");
  expect((await page.evaluate(() => window.relationshipRecords()))[0].direction).toBe("mutual");
  expect((await page.evaluate(() => window.npcRecords())).every((npc) => npc.relationshipIds.length === 1)).toBe(true);

  await page.getByRole("button", { name: "Refresh Network" }).click();
  await page.locator("[data-network-edge-id]").click();
  await page.locator('[data-relationship-field="relationshipType"]').selectOption("Rival");
  await page.getByRole("button", { name: "Save Relationship" }).click();
  await expect(page.locator("[data-network-scene]")).toContainText("Rival");

  await page.getByRole("button", { name: "Delete" }).last().click();
  await page.getByRole("dialog", { name: "Delete relationship" })
    .getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("[data-network-scene]")).not.toContainText("Rival");
  expect(await page.evaluate(() => window.relationshipRecords().length)).toBe(0);
  expect((await page.evaluate(() => window.npcRecords())).every((npc) => npc.relationshipIds.length === 0)).toBe(true);
});

test("knowledge sharing is explicit, timestamped, searchable, and mobile-safe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/npc-creator-self-test.html");
  await createNpc(page, "Captain Elara", { knowledge: "Secret Route" });
  await page.getByRole("button", { name: "New NPC" }).click();
  await createNpc(page, "Mira Vale");
  await page.getByRole("button", { name: "Relationship Network" }).click();
  await page.locator('[data-share-field="sourceNpcId"]').selectOption({ label: "Captain Elara" });
  await page.locator('[data-share-field="knowledgeId"]').selectOption({ label: "Secret Route" });
  await page.locator('[data-share-field="targetNpcId"]').selectOption({ label: "Mira Vale" });
  await page.getByRole("button", { name: "Share Knowledge" }).click();
  const shared = await page.evaluate(() => window.npcRecords().find((npc) => npc.name === "Captain Elara").knowledge[0]);
  expect(shared.knownByNpcIds).toHaveLength(2);
  expect(shared.sharedAtWorldTime).toBe(86400);
  await page.locator('[data-network-filter="search"]').fill("Mira");
  await expect(page.locator("[data-network-card-list]")).toContainText("Mira Vale");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
