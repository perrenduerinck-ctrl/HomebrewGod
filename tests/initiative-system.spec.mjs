import { expect, test } from "@playwright/test";

test("initiative panel controls a full round, time, token highlight, and lighting", async ({ page }) => {
  await page.goto(
    "?smokeTest=1&release=initiative-time-20260905",
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
    release.setCampaignTimeTestState({
      worldTime: 18 * 3600,
      timeMode: "exploration"
    });
    release.setInitiativeTestState({});
    await release.addInitiativeCombatantForTest({
      tokenId: "goblin",
      name: "Goblin",
      tokenType: "enemy",
      initiativeRoll: 18,
      initiativeBonus: 3,
      totalInitiative: 21,
      dexterity: 16
    });
    await release.addInitiativeCombatantForTest({
      tokenId: "hero",
      name: "Perren",
      tokenType: "player",
      initiativeRoll: 16,
      initiativeBonus: 2,
      totalInitiative: 18,
      dexterity: 14,
      ownerUid: "player-1"
    });

    const tokenLayer = document.querySelector("#tokenLayer");
    for (const tokenId of ["goblin", "hero"]) {
      const token = document.createElement("div");
      token.className = "hg-token";
      token.dataset.tokenId = tokenId;
      tokenLayer.appendChild(token);
    }
    document.dispatchEvent(new CustomEvent("homebrewgod:tokens-rendered"));
    await release.startInitiativeForTest();
  });

  const panel = page.locator("#battleInitiativePanel");
  await panel.locator("summary").click();
  await expect(panel).toHaveJSProperty("open", true);
  await expect(panel.locator("[data-initiative-round]")).toHaveText("Round 1");
  await expect(panel.locator("[data-initiative-current]")).toContainText("Goblin");
  await expect(panel.locator(".initiativeCombatant.is-current")).toContainText("Goblin");
  await expect(page.locator('.hg-token[data-token-id="goblin"]')).toHaveClass(/hg-token-current-turn/);

  const startTime = await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getCampaignTimeTestState().worldTime
  ));
  await panel.locator('[data-initiative-action="next"]').click();
  await expect(panel.locator("[data-initiative-current]")).toContainText("Perren");
  expect(await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getCampaignTimeTestState().worldTime
  ))).toBe(startTime);

  await panel.locator('[data-initiative-action="next"]').click();
  await expect(panel.locator("[data-initiative-round]")).toHaveText("Round 2");
  expect(await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getCampaignTimeTestState().worldTime
  ))).toBe(startTime + 6);
  await panel.locator('[data-initiative-action="previous"]').click();
  await expect(panel.locator("[data-initiative-round]")).toHaveText("Round 1");
  await expect(panel.locator("[data-initiative-current]")).toContainText("Perren");
  expect(await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getCampaignTimeTestState().worldTime
  ))).toBe(startTime);
  await panel.locator('[data-initiative-action="next"]').click();
  await expect(panel.locator("[data-initiative-round]")).toHaveText("Round 2");
  expect(await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getCampaignTimeTestState().worldTime
  ))).toBe(startTime + 6);
  await expect(page.locator(
    "#battleCampaignTimePanel [data-time-complete-round]"
  )).toBeHidden();
  await expect(page.locator('.hg-token[data-token-id="goblin"]')).toHaveClass(/hg-token-current-turn/);

  const lighting = await page.evaluate(() => {
    const layer = document.querySelector(".hg-map-lighting-layer");
    return {
      state: window.__HOMEBREW_GOD_RELEASE_TEST__.getMapLightingTestState(),
      pointerEvents: getComputedStyle(layer).pointerEvents,
      zIndex: getComputedStyle(layer).zIndex,
      transition: getComputedStyle(layer).transitionDuration
    };
  });
  expect(lighting.state.phase).toBe("DUSK");
  expect(lighting.pointerEvents).toBe("none");
  expect(Number(lighting.zIndex)).toBeLessThan(100);
  expect(lighting.transition).toContain("1.5s");

  await page.evaluate(() => {
    window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(false);
  });
  await expect(panel.locator("[data-initiative-dm-controls]")).toBeHidden();
  const playerMutation = await page.evaluate(async () => {
    try {
      await window.__HOMEBREW_GOD_RELEASE_TEST__
        .addInitiativeCombatantForTest({
          tokenId: "blocked",
          name: "Blocked",
          totalInitiative: 1
        });
      return "allowed";
    } catch (error) {
      return error.code || error.message;
    }
  });
  expect(playerMutation).toBe("initiative/permission-denied");
});
