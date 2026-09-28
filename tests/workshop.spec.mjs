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
  await page.getByRole("button", { name: "Friends / Group" }).click();
  await expect(page.getByText("No Friends / Group assets are available.")).toBeVisible();

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
  await page.getByLabel("Recently Used").check();
  await expect(page.locator(".workshop-card")).toHaveCount(1);

  await page.getByLabel("Recently Used").uncheck();
  await page.getByLabel("Content Type").selectOption("");
  await page.getByRole("button", { name: "My Library", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(2);
  await page.getByRole("button", { name: "My Creations", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(40);
  await page.getByRole("button", { name: "Room", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(40);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Collections", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Undead Dungeon" })).toBeVisible();
  await page.getByRole("button", { name: "Browse Collection" }).click();
  await expect(page.locator(".workshop-card")).toHaveCount(2);
});
