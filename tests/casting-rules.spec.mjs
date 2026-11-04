import { expect, test } from "@playwright/test";

async function openCastingFixture(page) {
  await page.goto("?smokeTest=1&release=casting-rules-20261103", {
    waitUntil: "domcontentloaded"
  });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(async () => {
    await window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle");
    const layer = document.getElementById("tokenLayer");
    const token = document.createElement("div");
    token.className = "hg-token hg-token-player";
    token.dataset.tokenId = "casting-rules-caster";
    token.dataset.tokenName = "Rule Tester";
    token.dataset.tokenType = "player";
    token.dataset.linkedCharacterId = "release-test-character";
    Object.assign(token.style, {
      position: "absolute",
      left: "120px",
      top: "120px",
      width: "64px",
      height: "64px"
    });
    layer.appendChild(token);
  });
}

test("Self reaction spells lock to the caster and confirm without a fake map target", async ({ page }) => {
  await openCastingFixture(page);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({
    spellId: "shield",
    characterId: "release-test-character",
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      label: "Level 1 slot (1 remaining)",
      remaining: 1
    }]
  }));

  await expect(page.locator("#spellCastingPanel")).toBeVisible();
  await expect(page.locator(".hg-map-template-layer")).toHaveAttribute(
    "data-template-phase",
    "confirmed"
  );
  await expect(page.locator("#confirmSpellCastButton")).toBeEnabled();
  await page.locator("#confirmSpellCastButton").click();
  await expect(page.locator("body")).toHaveAttribute("data-test-cast-confirmed", "1");
  await expect(page.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
});

test("Touch spells expose a five-foot target workflow", async ({ page }) => {
  await openCastingFixture(page);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({
    spellId: "cure-wounds",
    characterId: "release-test-character",
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      label: "Level 1 slot (1 remaining)",
      remaining: 1
    }]
  }));
  const state = await page.evaluate(() => (
    window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState()
  ));
  expect(state.instruction.rangeFeet).toBe(5);
  expect(state.instruction.singleTarget).toBe(true);
  await expect(page.locator("#spellCastingResolution")).toContainText("Healing: 1d8 + MOD");
});
