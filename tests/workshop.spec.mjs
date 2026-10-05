import { test, expect } from "@playwright/test";

test("Workshop browses incrementally and remains usable on laptop and mobile widths", async ({ page }) => {
  await page.goto("/tests/browser-pages/workshop-self-test.html");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("heading", { name: "Homebrew Workshop" })).toBeVisible();
  await expect(page.locator(".workshop-card")).toHaveCount(40);
  await expect(page.getByRole("button", { name: "Load More" })).toBeVisible();
  await page.getByLabel("Search").fill("Vampire");
  await page.waitForTimeout(300);
  await expect(page.locator(".workshop-card")).toHaveCount(6);
  await page.getByLabel("Content Type").selectOption("monster");
  await expect(page.locator(".workshop-card")).toHaveCount(3);
  await page.locator("[data-workshop-tag]").fill("boss, undead");
  await expect(page.locator(".workshop-card")).toHaveCount(3);
  await page.locator('[data-workshop-specific-filter="cr"]').fill("7");
  await expect(page.locator(".workshop-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Friends / Group — Coming Soon" })).toBeDisabled();

  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 760 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test("Workshop unifies library scopes, favorites, recent use, collections and type previews", async ({ page }) => {
  await page.goto("/tests/browser-pages/workshop-self-test.html");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");

  await page.getByLabel("Content Type").selectOption("monster");
  await page.locator(".workshop-card").first().getByRole("button", { name: "Preview" }).click();
  await expect(page.locator('[data-workshop-preview-kind="monster"]')).toBeVisible();
  await page.locator("[data-workshop-preview-close]").click();

  await page.getByLabel("Content Type").selectOption("animation");
  await page.locator(".workshop-card").first().getByRole("button", { name: "Preview" }).click();
  await expect(page.locator('[data-workshop-preview-kind="animation"]')).toBeVisible();
  await page.locator("[data-workshop-preview-close]").click();
  await page.getByRole("checkbox", { name: "Recently Used" }).check();
  await expect(page.locator(".workshop-card")).toHaveCount(1);

  await page.getByRole("checkbox", { name: "Recently Used" }).uncheck();
  await page.getByLabel("Content Type").selectOption("");
  await page.getByRole("button", { name: "My Library", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(9);
  await page.getByLabel("Campaign").selectOption("campaigns");
  await expect(page.locator(".workshop-card")).toHaveCount(5);
  await page.getByLabel("Campaign").selectOption("personal");
  await expect(page.locator(".workshop-card")).toHaveCount(4);
  await page.getByLabel("Campaign").selectOption("current");
  await expect(page.locator(".workshop-card")).toHaveCount(4);
  await page.getByLabel("Campaign").selectOption("room:ROOM-2");
  await expect(page.locator(".workshop-card")).toHaveCount(1);
  const crossCampaign = page.locator(".workshop-card").filter({ hasText: "Native Monster 1" });
  await expect(crossCampaign).toContainText("Campaign: Campaign Two");
  await crossCampaign.getByRole("button", { name: "Copy to Current Room" }).click();
  await expect.poll(() => page.evaluate(() => window.lastQuickAction?.actionId)).toBe("copy-to-current-room");
  await page.getByLabel("Campaign").selectOption("");
  await page.getByLabel("Content Type").selectOption("monster");
  await expect(page.locator(".workshop-card")).toHaveCount(3);
  await page.getByLabel("Content Type").selectOption("animation");
  await expect(page.locator(".workshop-card")).toHaveCount(4);
  await page.getByLabel("Content Type").selectOption("map");
  await expect(page.locator(".workshop-card")).toHaveCount(2);
  await page.getByLabel("Content Type").selectOption("");
  await page.getByRole("button", { name: "My Creations", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Room", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(40);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Collections", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Undead Dungeon" })).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(4);
  const unavailable = page.locator(".workshop-card").filter({ hasText: "Unavailable asset" });
  await expect(unavailable).toContainText("Unavailable");
  await unavailable.getByRole("button", { name: "Remove from Collection" }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(3);
  await page.getByLabel("Content Type").selectOption("monster");
  await page.getByLabel("Search").fill("Native Monster");
  await page.waitForTimeout(300);
  await expect(page.locator(".workshop-card")).toHaveCount(1);
});

test("collections create, rename, mix native types, allow multiple membership, and delete without deleting assets", async ({ page }) => {
  await page.goto("/tests/browser-pages/workshop-self-test.html");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Collections", exact: true }).click();
  await page.getByRole("button", { name: "+ New Collection", exact: true }).click();
  const collectionDialog = page.locator("[data-workshop-collection-dialog]");
  await collectionDialog.getByLabel("Collection Name").fill("Boss Monsters");
  await collectionDialog.getByLabel("Description").fill("Major campaign threats");
  await collectionDialog.getByLabel("Visibility").selectOption("ROOM");
  await collectionDialog.getByRole("button", { name: "Save Collection", exact: true }).click();
  const bossCard = page.locator(".workshop-collection").filter({ hasText: "Boss Monsters" });
  await expect(bossCard).toContainText("Major campaign threats");
  await bossCard.getByRole("button", { name: "Rename", exact: true }).click();
  await collectionDialog.getByLabel("Collection Name").fill("Campaign Bosses");
  await collectionDialog.getByLabel("Description").fill("Renamed collection");
  await collectionDialog.getByRole("button", { name: "Save Collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Campaign Bosses" })).toBeVisible();

  await page.getByRole("button", { name: "My Library", exact: true }).click();
  for (const name of ["Native Monster 1", "Native Animation 1", "Native Map 1"]) {
    const card = page.locator(".workshop-card").filter({ hasText: name });
    await card.getByRole("button", { name: "Add to Collections", exact: true }).click();
    await page.getByLabel("Campaign Bosses", { exact: true }).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
  const stored = await page.evaluate(() => window.workshopCollections());
  const campaign = stored.find((entry) => entry.name === "Campaign Bosses");
  expect(new Set(campaign.entries)).toEqual(new Set(["monster:monster_0", "animation:animation_0", "map:map_0"]));
  expect(stored.find((entry) => entry.name === "Undead Dungeon").assetIds).toContain("monster:monster_0");

  await page.getByRole("button", { name: "Collections", exact: true }).click();
  const campaignCard = page.locator(".workshop-collection").filter({ hasText: "Campaign Bosses" });
  await campaignCard.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(3);
  await page.locator(".workshop-card").filter({ hasText: "Native Monster 1" }).getByRole("button", { name: "Remove from Collection" }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(2);
  const afterCampaignRemoval = await page.evaluate(() => window.workshopCollections());
  expect(afterCampaignRemoval.find((entry) => entry.name === "Undead Dungeon").assetIds).toContain("monster:monster_0");

  await page.getByRole("button", { name: "My Library", exact: true }).click();
  await page.locator(".workshop-card").filter({ hasText: "Native Monster 1" }).getByRole("button", { name: "Add to Collections", exact: true }).click();
  await page.getByLabel("Undead Dungeon", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const afterLegacyRemoval = await page.evaluate(() => window.workshopCollections());
  expect(afterLegacyRemoval.find((entry) => entry.name === "Undead Dungeon").assetIds).not.toContain("monster:monster_0");

  await page.getByRole("button", { name: "Collections", exact: true }).click();
  await page.locator(".workshop-collection").filter({ hasText: "Campaign Bosses" }).getByRole("button", { name: "Delete", exact: true }).click();
  await page.locator(".hg-confirm-dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Campaign Bosses" })).toHaveCount(0);
  await page.getByRole("button", { name: "My Library", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(9);
});
