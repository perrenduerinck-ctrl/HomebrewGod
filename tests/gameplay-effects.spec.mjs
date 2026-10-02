import { expect, test } from "@playwright/test";

test("DM applies, inspects, and removes a built-in gameplay condition", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/tests/browser-pages/gameplay-effects-self-test.html");
  await page.locator('[data-effect-field="definitionId"]').selectOption("poisoned");
  await expect(page.locator('[data-effect-field="name"]')).toHaveValue("Poisoned");
  await page.locator('[data-effect-field="targetTokenId"]').selectOption("target");
  await page.locator('[data-effect-field="sourceId"]').selectOption("caster");
  await page.locator('[data-effect-field="durationMode"]').selectOption("rounds");
  await page.locator('[data-effect-field="durationValue"]').fill("2");
  await page.getByRole("button", { name: "Apply Effect" }).click();
  await expect(page.locator(".hg-gameplay-effect-card")).toContainText("Poisoned");
  await expect(page.locator(".hg-gameplay-effect-card")).toContainText("Ogre · 2 rounds");
  expect(await page.evaluate(() => window.effectTest.runtime.getSnapshot()[0].duration.expiresAtTurnCounter)).toBe(12);
  expect((await page.evaluate(() => window.effectTest.effectiveTarget())).attackRoll).toBe("disadvantage");
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator("[data-gameplay-effect-list]")).toContainText("No active gameplay effects");
  expect(pageErrors).toEqual([]);
});

test("custom modifiers work, members are read-only, and mobile does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser-pages/gameplay-effects-self-test.html");
  await page.locator('[data-effect-field="name"]').fill("Shielded");
  await page.locator('[data-effect-field="type"]').selectOption("buff");
  await page.locator('[data-effect-field="targetTokenId"]').selectOption("target");
  await page.getByText("Custom modifiers and animation IDs").click();
  await page.locator('[data-effect-modifier="kind"]').selectOption("ac");
  await page.locator('[data-effect-modifier="mode"]').selectOption("bonus");
  await page.locator('[data-effect-modifier="value"]').fill("3");
  await page.getByRole("button", { name: "Add modifier" }).click();
  await page.getByRole("button", { name: "Apply Effect" }).click();
  expect((await page.evaluate(() => window.effectTest.effectiveTarget())).ac).toBe(15);
  await page.evaluate(() => window.effectTest.setDm(false));
  await expect(page.getByRole("button", { name: "Apply Effect" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove" })).toBeDisabled();
  await expect(page.locator("[data-effect-status]")).toContainText("Only the DM");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
