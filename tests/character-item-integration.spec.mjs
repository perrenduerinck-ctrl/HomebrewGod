import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/browser-pages/character-item-integration-self-test.html?view=characterCreator&step=equipment");
  await expect(page.locator("body")).toHaveAttribute("data-test-status", "ready");
  await expect(page.getByRole("heading", { name: "My Magic Item Library" })).toBeVisible();
});

test("Library items add independently and reuse equip and attunement controls", async ({ page }) => {
  await expect(page.getByText("Ember Blade", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Add Independent Copy" }).click();

  const inventoryCard = page.locator(".hg-character-choice-card").filter({
    has: page.getByRole("button", { name: "Equip", exact: true })
  }).filter({ hasText: "Ember Blade" });
  await expect(inventoryCard).toHaveCount(1);
  await inventoryCard.getByRole("button", { name: "Equip", exact: true }).click();
  const equippedCard = page.locator(".hg-character-choice-card").filter({
    has: page.getByRole("button", { name: "Unequip", exact: true })
  }).filter({ hasText: "Ember Blade" });
  await expect(equippedCard).toHaveCount(1);
  await equippedCard.getByRole("button", { name: "Attune", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Attunement", exact: true })).toBeVisible();

  const state = await page.evaluate(() => {
    const harness = window.__CHARACTER_ITEM_INTEGRATION__;
    const copy = harness.creator.getDraft().equipment.items.find((entry) => entry.sourceLibraryItemId === "ember-blade");
    return { copy, libraryItem: harness.item };
  });
  expect(state.copy.id).not.toBe("ember-blade");
  expect(state.copy.equipped).toBe(true);
  expect(state.copy.attuned).toBe(true);
  expect(state.libraryItem.equipped).toBeUndefined();
  expect(state.libraryItem.attuned).toBeUndefined();
});

test("saved item transfer updates both characters and resets active states", async ({ page }) => {
  const transferCard = page.locator(".hg-character-choice-card").filter({ hasText: "Transfer Wand" });
  await transferCard.getByLabel("Transfer to character").selectOption("hero-b");
  await transferCard.getByRole("button", { name: "Transfer Item" }).click();
  await expect.poll(async () => {
    return page.evaluate(() => {
      const records = Object.fromEntries(window.__CHARACTER_ITEM_INTEGRATION__.records());
      return records["rooms/ROOM/characters/hero-b"].equipment.items.length;
    });
  }).toBe(1);

  const records = await page.evaluate(() => Object.fromEntries(window.__CHARACTER_ITEM_INTEGRATION__.records()));
  expect(records["rooms/ROOM/characters/hero-a"].equipment.items).toHaveLength(0);
  expect(records["rooms/ROOM/characters/hero-b"].equipment.items).toHaveLength(1);
  expect(records["rooms/ROOM/characters/hero-b"].equipment.items[0]).toMatchObject({
    name: "Transfer Wand",
    equipped: false,
    attuned: false,
    sourceLibraryItemId: "wand-library",
    transferredFromCharacterId: "hero-a",
    ownerCharacterId: "hero-b"
  });
  expect(records["rooms/ROOM/characters/hero-b"].equipment.notes).toBe("target notes");
});
