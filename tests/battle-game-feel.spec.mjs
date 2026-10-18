import { expect, test } from "@playwright/test";

async function openSmokeBattle(page, viewport = { width: 1600, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto("?smokeTest=1&battleGameFeelTest=1&release=battle-game-feel-20261016", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
  await page.evaluate(async () => {
    const release = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await release.openScreen("battle");
    release.setDmRole(true);
    release.setMovementTestTokens([
      {
        id: "hero", name: "Mira", type: "player", x: 34, y: 42,
        ownerUid: "test-owner", linkedCharacterId: "character-1",
        currentHp: 18, maxHp: 24, armorClass: 16,
        movementSpeed: 30, mapMode: "single", sizeCategory: "medium"
      },
      {
        id: "goblin", name: "Goblin", type: "enemy", x: 62, y: 42,
        linkedMonsterId: "monster-1", currentHp: 7, maxHp: 7,
        armorClass: 15, mapMode: "single", sizeCategory: "small"
      },
      { id: "crate", name: "Crate", type: "object", x: 50, y: 62, mapMode: "single", sizeCategory: "medium" }
    ]);
    release.setBattleGameFeelTestContext("GAME-FEEL-TEST");
  });
}

test("hotbar uses icon-first buttons and retains expanded and compact controls", async ({ page }) => {
  await openSmokeBattle(page);
  await page.locator('.hg-token[data-token-id="hero"]').click();
  const bar = page.locator("#combatActionBar");
  await expect(bar).toBeVisible();
  await expect(bar.locator(".hg-action-icon").first()).toBeVisible();
  await expect(bar.locator(".hg-action-name").first()).not.toBeEmpty();
  await expect(bar.locator(".hg-action-button").first()).toHaveAttribute("data-action-state", /available|outside-turn|expended/);
  await expect(bar.locator(".hg-action-button").first()).toHaveAttribute("title", /Cost:/);
  await bar.locator("[data-action-bar-collapse]").click();
  await expect(bar).toHaveClass(/is-compact/);
});

test("right-click menu is bounded, permission-aware, keyboard closable and does not start drag", async ({ page }) => {
  await openSmokeBattle(page, { width: 1366, height: 768 });
  const token = page.locator('.hg-token[data-token-id="goblin"]');
  const before = await token.getAttribute("style");
  await token.click({ button: "right", position: { x: 10, y: 10 } });
  const menu = page.locator(".hg-token-context-menu");
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("Goblin");
  await expect(menu.locator('[data-token-menu-action="open-monster"]')).toBeVisible();
  await expect(menu.locator('[data-token-menu-action="adjust-hp"]')).toBeVisible();
  const box = await menu.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1367);
  expect(box.y + box.height).toBeLessThanOrEqual(769);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  expect(await token.getAttribute("style")).toBe(before);

  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(false));
  await page.locator('.hg-token[data-token-id="crate"]').click({ button: "right" });
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-token-menu-action="adjust-hp"]')).toHaveCount(0);
  await expect(menu.locator('[data-token-menu-action="spells"]')).toHaveCount(0);
  await page.locator("#battleMapSurface").click({ position: { x: 5, y: 5 } });
  await expect(menu).toBeHidden();
});

test("touch token options remain reachable on mobile without horizontal overflow", async ({ page }) => {
  await openSmokeBattle(page, { width: 390, height: 844 });
  const options = page.locator('.hg-token[data-token-id="hero"] .hg-token-options');
  await expect(options).toBeVisible();
  await options.click();
  const menu = page.locator(".hg-token-context-menu");
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("floor connection markers render saved coordinates and use the existing transition", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("tests/browser-pages/multi-floor-self-test.html?role=player");
  await page.locator("body[data-ready='true']").waitFor();
  const marker = page.locator('.hg-floor-marker[data-connection-id="stairs"]');
  await expect(marker).toBeVisible();
  await expect(marker).toHaveAttribute("style", /left: 20%; top: 30%/);
  await expect(marker).toHaveAttribute("title", /Second Floor/);
  await marker.click();
  await expect.poll(() => page.evaluate(() => window.fixture.transfers.length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.fixture.floorSystem.getState().floorId)).toBe("second");
  await expect(page.locator('.hg-floor-marker[data-connection-id="stairs"]')).toHaveAttribute("style", /left: 80%/);
});

test("combat feedback ignores unverified values, deduplicates confirmed outcomes and shows verified floating text", async ({ page }) => {
  await openSmokeBattle(page);
  await page.evaluate(() => {
    const release = window.__HOMEBREW_GOD_RELEASE_TEST__;
    release.dispatchCombatOutcomeForTest({ id: "unverified", type: "damage", amount: 99, tokenId: "goblin" });
    release.dispatchCombatOutcomeForTest({
      id: "verified-damage-1", verified: true, type: "damage", amount: 12,
      tokenId: "goblin", actorName: "Mira", targetName: "Goblin", round: 3
    });
    release.dispatchCombatOutcomeForTest({
      id: "verified-damage-1", verified: true, type: "damage", amount: 12,
      tokenId: "goblin", actorName: "Mira", targetName: "Goblin", round: 3
    });
  });
  const feedback = page.locator(".hg-combat-feedback");
  await expect(feedback).toBeVisible();
  await expect(feedback.locator("[data-combat-log-count]")).toHaveText("1");
  await feedback.locator("summary").click();
  await expect(feedback.locator("[data-combat-log-list]")).toContainText("12 damage");
  await expect(page.locator('.hg-token[data-token-id="goblin"] .hg-floating-combat-text')).toHaveText("−12");
});

