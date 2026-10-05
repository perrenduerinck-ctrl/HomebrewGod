import { expect, test } from "@playwright/test";

test("Magic Item Creator saves native Library records and publishes their mechanics", async ({ page }) => {
  await page.goto("/tests/browser-pages/magic-item-creator-self-test.html");
  await page.locator('[data-item-field="name"]').fill("Cinder Blade");
  await page.locator('[data-item-field="itemType"]').selectOption("weapon");
  await page.locator('[data-item-field="rarity"]').selectOption("rare");
  await page.locator('[data-item-field="requiresAttunement"]').check();
  await page.locator('[data-item-field="attunementRequirements"]').fill("By a fighter");
  await page.locator('[data-item-field="maximumCharges"]').fill("5");
  await page.locator('[data-item-field="currentCharges"]').fill("4");
  await page.locator('[data-item-field="description"]').fill("A blade lit by banked embers.");
  await page.locator('[data-item-field="tags"]').fill("fire, sword");
  await page.locator("[data-item-image-upload]").setInputFiles({ name: "cinder.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  await expect(page.locator('[data-item-field="imageUrl"]')).toHaveValue("https://example.com/uploaded-item.png");
  await page.getByRole("button", { name: "+ Add Effect" }).click();
  await page.locator('[data-effect-field="name"]').fill("Cinder Strike");
  await page.locator('[data-effect-field="description"]').fill("Deals extra fire damage.");
  await expect(page.locator("[data-item-preview]")).toContainText("Cinder Blade");
  await expect(page.locator("[data-item-preview]")).toContainText("Cinder Strike");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await expect(page.locator("[data-item-library]")).toContainText("Cinder Blade");
  await page.locator(".hg-overflow-menu > summary").click();
  await page.getByRole("button", { name: "Publish to Workshop" }).click();
  const published = await page.evaluate(() => window.__published);
  expect(published.assetType).toBe("magic-item");
  expect(published.sourceScope).toBe("user:user-1");
  expect(published.content.itemType).toBe("weapon");
  expect(published.content.effects[0].name).toBe("Cinder Strike");
  expect(published.content.charges).toEqual({ maximum: 5, current: 4, recharge: "" });
});

test("Magic Item Creator duplicates independently and fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/magic-item-creator-self-test.html");
  await page.locator('[data-item-field="name"]').fill("Moon Shield");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  await page.locator(".hg-overflow-menu > summary").click();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.locator('[data-item-field="name"]')).toHaveValue("Moon Shield Copy");
  await page.getByRole("button", { name: "Save to My Library" }).click();
  expect(await page.evaluate(() => window.magicItemRecords().map((item) => item.id))).toHaveLength(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
