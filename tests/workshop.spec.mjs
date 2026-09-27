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
  await page.getByRole("button", { name: "Friends / Group" }).click();
  await expect(page.getByText("Friends / Group sharing is ready")).toBeVisible();

  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 760 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
