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
  await expect(page.getByRole("dialog")).toContainText("when you are hit");
  await page.getByRole("button", { name: "DM confirmed trigger" }).click();
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

test("cancelling reaction trigger confirmation never confirms or animates a cast", async ({ page }) => {
  await openCastingFixture(page);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spellId: "shield", characterId: "release-test-character", slotOptions: [{ kind: "normal", level: 1, sourceId: "", remaining: 1 }] }));
  await page.locator("#confirmSpellCastButton").click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("body")).not.toHaveAttribute("data-test-cast-confirmed", "1");
  await expect(page.locator("#confirmSpellCastButton")).toBeEnabled();
});

async function addCastingTarget(page) {
  await page.evaluate(() => {
    const target = document.querySelector('[data-token-id="casting-rules-caster"]').cloneNode(true);
    target.dataset.tokenId = "moving-target"; target.dataset.tokenName = "Moving target";
    target.dataset.linkedCharacterId = ""; target.dataset.tokenElevation = "0";
    target.style.left = "300px";
    document.getElementById("tokenLayer").append(target);
  });
}
async function lockCastingTarget(page) {
  const rect = await page.locator('[data-token-id="moving-target"]').boundingBox();
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
}
test("a creature moving out of a locked target blocks confirmation without spending or animating", async ({ page }) => {
  await openCastingFixture(page); await addCastingTarget(page);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spellId: "fire-bolt" }));
  await lockCastingTarget(page);
  await expect(page.locator("#confirmSpellCastButton")).toBeEnabled();
  await page.locator('[data-token-id="moving-target"]').evaluate((target) => { target.style.left = "900px"; });
  await page.locator("#confirmSpellCastButton").click();
  await expect(page.locator("#confirmSpellCastButton")).toBeDisabled();
  await expect(page.locator("#spellCastingInstructions")).toContainText("may have moved");
  await expect(page.locator("body")).toHaveAttribute("data-test-cast-confirmed", "0");
});
test("confirmation rechecks the caster's position and the target's actual elevation", async ({ page }) => {
  await openCastingFixture(page); await addCastingTarget(page);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spell: { id: "short-ray", name: "Short ray", level: 1, range: "30 feet", castingTime: "1 action", known: true } }));
  await lockCastingTarget(page);
  await expect(page.locator("#confirmSpellCastButton")).toBeEnabled();
  await page.locator('[data-token-id="casting-rules-caster"]').evaluate((target) => { target.style.left = "1000px"; });
  await page.locator("#confirmSpellCastButton").click();
  await expect(page.locator("#confirmSpellCastButton")).toBeDisabled();
  const state = await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState());
  expect(state.target.distanceFeet).toBeGreaterThan(30);
  await page.locator("#cancelSpellCastButton").click();
  await page.locator('[data-token-id="casting-rules-caster"]').evaluate((target) => { target.style.left = "120px"; });
  await page.locator('[data-token-id="moving-target"]').evaluate((target) => { target.dataset.tokenElevation = "100"; });
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spell: { id: "short-ray", name: "Short ray", level: 1, range: "30 feet", castingTime: "1 action", known: true } }));
  await lockCastingTarget(page);
  const elevated = await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState());
  expect(elevated.target.endElevationFeet).toBe(100);
  await expect(page.locator("#confirmSpellCastButton")).toBeDisabled();
});

test("object-only spells select map objects and never substitute creatures", async ({ page }) => {
  await openCastingFixture(page); await addCastingTarget(page);
  await page.evaluate(() => {
    const object = document.createElement("button");
    object.className = "hg-map-object"; object.dataset.objectId = "chest"; object.title = "Chest";
    Object.assign(object.style, { position: "absolute", left: "300px", top: "120px", width: "64px", height: "64px" });
    document.getElementById("tokenLayer").append(object);
  });
  await page.evaluate(async () => {
    const { createSpellTargetingData } = await import("/data/spellTargeting.js");
    const targeting = structuredClone(createSpellTargetingData({ range: "60 feet" })); targeting.target.type = "object";
    await window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spell: { id: "object-ray", name: "Object ray", level: 1, range: "60 feet", castingTime: "1 action", targeting, known: true } });
  });
  await lockCastingTarget(page);
  await expect(page.locator("#confirmSpellCastButton")).toBeEnabled();
  const state = await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState());
  expect(state.target.affectedTokens.map((target) => target.id)).toEqual(["object:chest"]);
  expect(state.target.affectedTokens[0].type).toBe("object");
});

test("a locked area point stays attached to map coordinates after zoom and pan", async ({ page }) => {
  await openCastingFixture(page);
  await page.route("https://example.test/zoom-map.svg", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#445566"/></svg>' }));
  await page.evaluate(() => { const image = document.getElementById("battleMapImage"); image.src = "https://example.test/zoom-map.svg"; image.style.display = "block"; });
  await expect(page.locator("#battleMapImage")).toBeVisible();
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spellId: "fireball" }));
  const initialImage = await page.locator("#battleMapImage").boundingBox();
  await page.mouse.click(initialImage.x + initialImage.width * .4, initialImage.y + initialImage.height * .4);
  const before = await page.evaluate(() => {
    const state = window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState();
    const rect = document.querySelector(".hg-map-template-layer").getBoundingClientRect();
    return { x: state.target.geometry.anchor.x / rect.width, y: state.target.geometry.anchor.y / rect.height };
  });
  await page.locator("#zoomInButton").evaluate((button) => button.click());
  await page.locator("#battleMapSurface").evaluate((surface) => { surface.scrollLeft = 100; surface.scrollTop = 50; surface.dispatchEvent(new Event("scroll")); });
  const after = await page.evaluate(() => {
    const state = window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState();
    const rect = document.querySelector(".hg-map-template-layer").getBoundingClientRect();
    return { x: state.target.geometry.anchor.x / rect.width, y: state.target.geometry.anchor.y / rect.height, radius: state.target.geometry.sizeFeet };
  });
  expect(after.x).toBeCloseTo(before.x, 3); expect(after.y).toBeCloseTo(before.y, 3); expect(after.radius).toBe(20);
});
