import { expect, test } from "@playwright/test";

test("100-token updates retain unchanged DOM and stay within the battle-map budget", async ({ page }) => {
  await page.goto("?smokeTest=1&view=battle&battleGameFeelTest=1&release=stage7-performance", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", {
    timeout: 30000
  });

  const result = await page.evaluate(async () => {
    const api = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await api.openScreen("battle");
    await api.setBattleGameFeelTestContext("STAGE-7-PERF");
    const tokens = Array.from({ length: 100 }, (_, index) => ({
      id: `scale-token-${index}`,
      name: `Scale Token ${index}`,
      type: index % 4 === 0 ? "enemy" : "player",
      ownerUid: "test-owner",
      x: 5 + (index % 10) * 9,
      y: 5 + Math.floor(index / 10) * 9,
      currentHp: 20,
      maxHp: 20,
      armorClass: 15,
      sizeCategory: "medium",
      mapMode: "single",
      display: {
        name: true,
        hpBar: true,
        hpText: true,
        ac: true,
        conditions: true,
        initiative: true
      }
    }));

    const initialStartedAt = performance.now();
    api.setMovementTestTokens(tokens);
    const initialMs = performance.now() - initialStartedAt;
    const before = new Map([...document.querySelectorAll("#tokenLayer .hg-token")].map(
      (element) => [element.dataset.tokenId, element]
    ));

    api.setMovementTestTokens(tokens);
    const unchangedReused = [...document.querySelectorAll("#tokenLayer .hg-token")].every(
      (element) => before.get(element.dataset.tokenId) === element
    );

    const changed = tokens.map((token, index) => (
      index === 42 ? { ...token, x: token.x + 1, currentHp: 17 } : token
    ));
    const updateStartedAt = performance.now();
    api.setMovementTestTokens(changed);
    const updateMs = performance.now() - updateStartedAt;
    const after = [...document.querySelectorAll("#tokenLayer .hg-token")];
    const retained = after.filter((element) => before.get(element.dataset.tokenId) === element).length;
    const effects = tokens.flatMap((token) => Array.from({ length: 5 }, (_, effectIndex) => ({
      id: `scale-effect-${token.id}-${effectIndex}`,
      roomCode: "STAGE-7-PERF",
      definitionId: "poisoned",
      name: `Scale Effect ${effectIndex}`,
      type: "condition",
      icon: "◆",
      sourceId: "scale-token-0",
      targetTokenId: token.id,
      createdByUid: "test-owner",
      duration: { mode: "permanent" },
      animation: {},
      createdAtMillis: effectIndex + 1,
      updatedAtMillis: effectIndex + 1
    })));
    const effectsStartedAt = performance.now();
    api.setGameplayEffectsForTest(effects);
    const effectsMs = performance.now() - effectsStartedAt;
    return {
      count: after.length,
      initialMs,
      updateMs,
      effectsMs,
      effectBadgeCount: document.querySelectorAll("#tokenLayer .hg-token-effect-badge").length,
      unchangedReused,
      retained,
      state: api.getBattleMapPerformanceState()
    };
  });

  expect(result.count).toBe(100);
  expect(result.unchangedReused).toBe(true);
  expect(result.retained).toBe(99);
  expect(result.state.tokens.mounted).toBe(100);
  expect(result.state.tokens.replaced).toBeGreaterThanOrEqual(1);
  expect(result.effectBadgeCount).toBe(400);
  expect(result.initialMs).toBeLessThan(1500);
  expect(result.updateMs).toBeLessThan(300);
  expect(result.effectsMs).toBeLessThan(1500);
});
