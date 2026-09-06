import { expect, test } from "@playwright/test";

test("current token drag previews, confirms, cancels, accumulates, and resets next round", async ({ page }) => {
  await page.goto(
    "?smokeTest=1&release=movement-system-20260905",
    { waitUntil: "domcontentloaded" }
  );
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText(
    "SMOKE TEST PASS",
    { timeout: 30000 }
  );

  await page.evaluate(async () => {
    const release = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await release.openScreen("battle");
    release.setDmRole(true);
    release.setInitiativeTestState({});
    release.setMovementTestTokens([
      {
        id: "hero", name: "Perren", type: "player", ownerUid: "player-1",
        x: 20, y: 50, movementSpeed: 30, mapMode: "single", sizeCategory: "medium"
      },
      {
        id: "goblin", name: "Goblin", type: "enemy",
        x: 70, y: 50, movementSpeed: 25, mapMode: "single", sizeCategory: "medium"
      }
    ]);
    await release.addInitiativeCombatantForTest({
      tokenId: "hero", name: "Perren", tokenType: "player",
      totalInitiative: 20, baseSpeed: 30, ownerUid: "player-1"
    });
    await release.addInitiativeCombatantForTest({
      tokenId: "goblin", name: "Goblin", tokenType: "enemy",
      totalInitiative: 10, baseSpeed: 25
    });
    await release.startInitiativeForTest();
  });

  const panel = page.locator("#battleInitiativePanel");
  await panel.locator("summary").click();
  const movement = panel.locator("[data-movement-panel]");
  await expect(movement).toBeVisible();
  await expect(movement.locator("[data-movement-name]")).toHaveText("Perren");
  await expect(movement.locator("[data-movement-remaining]")).toContainText("30 ft / 30 ft");

  async function dragHeroBy(deltaX) {
    const token = page.locator('.hg-token[data-token-id="hero"]');
    const box = await token.boundingBox();
    expect(box).toBeTruthy();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + deltaX, y, { steps: 6 });
    await page.mouse.up();
  }

  await dragHeroBy(128);
  await expect(movement.locator("[data-movement-proposed]")).toContainText("10 ft");
  await expect(movement.locator("[data-movement-after]")).toContainText("20 ft");
  await expect(page.locator(".hg-movement-preview-layer")).toBeVisible();
  await movement.locator('[data-movement-action="confirm"]').click();
  await expect(movement.locator("[data-movement-remaining]")).toContainText("20 ft / 30 ft");
  const firstPosition = await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getMovementTestState().lastConfirmedPosition
  ));

  await dragHeroBy(64);
  await expect(movement.locator("[data-movement-proposed]")).toContainText("5 ft");
  await movement.locator('[data-movement-action="cancel"]').click();
  await expect(movement.locator("[data-movement-remaining]")).toContainText("20 ft / 30 ft");
  expect(await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getMovementTestState().lastConfirmedPosition
  ))).toEqual(firstPosition);

  await dragHeroBy(102);
  await expect(movement.locator("[data-movement-proposed]")).toContainText("8 ft");
  await movement.locator('[data-movement-action="confirm"]').click();
  await expect(movement.locator("[data-movement-remaining]")).toContainText("12 ft / 30 ft");

  await panel.locator('[data-initiative-action="next"]').click();
  await expect(movement.locator("[data-movement-name]")).toHaveText("Goblin");
  await expect(movement.locator("[data-movement-remaining]")).toContainText("25 ft / 25 ft");
  await panel.locator('[data-initiative-action="next"]').click();
  await expect(panel.locator("[data-initiative-round]")).toHaveText("Round 2");
  await expect(movement.locator("[data-movement-name]")).toHaveText("Perren");
  await expect(movement.locator("[data-movement-remaining]")).toContainText("30 ft / 30 ft");
});

test("over-budget preview disables confirm and exposes DM Force Move", async ({ page }) => {
  await page.goto("?smokeTest=1&release=movement-system-20260905");
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", {
    timeout: 30000
  });
  await page.evaluate(async () => {
    const release = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await release.openScreen("battle");
    release.setDmRole(true);
    release.setInitiativeTestState({});
    release.setMovementTestTokens([{
      id: "hero", name: "Hero", type: "player", ownerUid: "owner",
      x: 20, y: 50, movementSpeed: 5, mapMode: "single"
    }]);
    await release.addInitiativeCombatantForTest({
      tokenId: "hero", name: "Hero", totalInitiative: 20,
      baseSpeed: 5, ownerUid: "owner"
    });
    await release.startInitiativeForTest();
  });
  const panel = page.locator("#battleInitiativePanel");
  await panel.locator("summary").click();
  const token = page.locator('.hg-token[data-token-id="hero"]');
  const box = await token.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 128, box.y + box.height / 2);
  await page.mouse.up();
  const movement = panel.locator("[data-movement-panel]");
  await expect(movement.locator("[data-movement-overage]")).toContainText("5 ft over");
  await expect(movement.locator('[data-movement-action="confirm"]')).toBeDisabled();
  await expect(movement.locator('[data-movement-action="force"]')).toBeVisible();
  await movement.locator('[data-movement-action="force"]').click();
  await expect(movement.locator("[data-movement-remaining]")).toContainText("0 ft / 5 ft");
  expect(await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getMovementTestState().lastMoveForced
  ))).toBe(true);
});
