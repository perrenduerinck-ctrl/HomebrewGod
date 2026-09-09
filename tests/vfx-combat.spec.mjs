import { test, expect } from "@playwright/test";

async function openCombatTest(page) {
  await page.goto("?smokeTest=1&vfxTest=1");
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(async () => {
    const api = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await api.openScreen("battle"); api.setDmRole(true); api.setInitiativeTestState({});
    api.setMovementTestTokens([
      { id: "hero", name: "Sword tester", type: "player", ownerUid: "player-1", x: 25, y: 50,
        movementSpeed: 30, mapMode: "single", sizeCategory: "medium" },
      { id: "target", name: "Slash target", type: "enemy", x: 60, y: 50,
        movementSpeed: 30, mapMode: "single", sizeCategory: "medium" }
    ]);
  });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; });
  await page.locator("#battleVfxModeSelect").selectOption("full");
  const controls = page.locator("#combatVfxTestControl");
  await controls.locator("[data-combat-toggle]").click();
  await expect(controls.locator("[data-combat-attacker] option")).toHaveCount(3);
  return controls;
}

test("sword test uses production tokens, supports replay and overlap, and leaves movement and map controls usable", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const controls = await openCombatTest(page);
  const hero = page.locator('.hg-token[data-token-id="hero"]');
  const openTools = () => page.locator("#battleToolsMenu").evaluate(el => { el.open = true; });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = false; });
  await hero.click({ force: true });
  await openTools();
  await expect(controls.locator("[data-combat-status]")).toContainText("Attacker: Sword tester");
  await controls.locator("[data-combat-target]").selectOption("target");
  await controls.locator("[data-combat-debug]").check();
  const before = await page.locator(".hg-token").evaluateAll(nodes => nodes.map(n => n.style.cssText));
  const attack = controls.locator("[data-combat-play]");
  await attack.click();
  expect(errors).toEqual([]);
  const effect = page.locator(".hg-vfx-combat-sprite").first();
  await expect(effect).toBeVisible();
  await expect(controls.locator("[data-combat-status]")).toContainText("1.20 seconds");
  const geometry = await effect.evaluate(node => {
    const tokens = [...document.querySelectorAll(".hg-token")].map(n => n.querySelector(".hg-token-fallback").getBoundingClientRect());
    const overlay = node.parentElement.getBoundingClientRect();
    return { x: parseFloat(node.style.left), y: parseFloat(node.style.top),
      expectedX: tokens.reduce((sum, r) => sum + r.left + r.width / 2, 0) / 2 - overlay.left,
      expectedY: tokens.reduce((sum, r) => sum + r.top + r.height / 2, 0) / 2 - overlay.top,
      layer: node.parentElement.dataset.effectLayerContainer,
      pointer: getComputedStyle(node).pointerEvents, angle: node.style.getPropertyValue("--hg-vfx-rotation"),
      blend: getComputedStyle(node).mixBlendMode };
  });
  expect(geometry.x).toBeCloseTo(geometry.expectedX, 1); expect(geometry.y).toBeCloseTo(geometry.expectedY, 1);
  expect(geometry).toMatchObject({ layer: "airborne", pointer: "none", angle: "0deg", blend: "normal" });
  await page.waitForTimeout(450);
  await page.screenshot({ path: testInfo.outputPath("sword-slash-on-map.png"), fullPage: true });
  await expect(page.locator(".hg-vfx-combat-sprite")).toHaveCount(0);
  expect(await page.locator(".hg-token").evaluateAll(nodes => nodes.map(n => n.style.cssText))).toEqual(before);
  for (const fps of ["18", "24", "36"]) {
    await openTools();
    await controls.locator("[data-combat-fps]").selectOption(fps);
    await attack.click(); await expect(effect).toBeVisible();
    await expect(controls.locator("[data-combat-status]")).toContainText(`${fps} FPS`);
    await expect(page.locator(".hg-vfx-combat-sprite")).toHaveCount(0);
  }
  await openTools();
  await attack.evaluate(button => { button.click(); button.click(); });
  await expect(page.locator(".hg-vfx-combat-sprite")).toHaveCount(2);
  await openTools();
  await controls.locator("[data-combat-clear]").click();
  await expect(page.locator(".hg-vfx-combat-sprite")).toHaveCount(0);
  // The same map can still play an existing spell sprite.
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.playVfxTest({ type: "frost-impact-sprite", duration: 400 }));
  await expect(page.locator('[data-effect-type="frost-impact-sprite"]')).toBeVisible();
  await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  await page.evaluate(async () => {
    const api = window.__HOMEBREW_GOD_RELEASE_TEST__;
    await api.addInitiativeCombatantForTest({ tokenId: "hero", name: "Sword tester", tokenType: "player", totalInitiative: 20, baseSpeed: 30, ownerUid: "player-1" });
    await api.startInitiativeForTest();
  });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = false; });
  const box = await hero.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 64, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getMovementTestState().pendingMovement?.distanceFeet || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.cancelMovementForTest());
  await openTools();
  await page.locator("#battleVfxModeSelect").selectOption("off"); await attack.click();
  await expect(controls.locator("[data-combat-status]")).toContainText("Effects are off");
  await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("combat decode failure and cancelled loads stay empty; sheet keeps alpha and directional flips", async ({ page }) => {
  await page.goto("/output/vfx/priority-seven/index.html");
  await page.addStyleTag({ url: "/assets/styles/app.css" });
  const result = await page.evaluate(async () => {
    const { createCombatEffectSystem, COMBAT_ANIMATIONS } = await import("/vfx/combatEffects.js");
    const { createBattleMapEffectEngine } = await import("/vfx/effectEngine.js");
    const surface = document.createElement("div"); surface.style.cssText = "position:relative;width:600px;height:400px"; document.body.append(surface);
    const engine = createBattleMapEffectEngine({ surface }); engine.connect();
    const errors = []; const player = createCombatEffectSystem({ engine, onError: message => errors.push(message) });
    await player.preload();
    const image = new Image(); image.src = COMBAT_ANIMATIONS["melee.swordSlash"].src; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
    const rgba = ctx.getImageData(0, 0, image.width, image.height).data;
    let transparent = 0, opaqueBlack = 0;
    for (let i = 0; i < rgba.length; i += 4) { if (rgba[i+3] === 0) transparent++; if (rgba[i+3] === 255 && Math.max(rgba[i],rgba[i+1],rgba[i+2]) < 20) opaqueBlack++; }
    await player.playCombatEffect("swordSlash", { x: 300, y: 250 }, { x: 300, y: 100 }, { flipX: true, scale: 2 });
    const effect = surface.querySelector(".hg-vfx-combat-sprite");
    const rotated = { angle: effect.style.getPropertyValue("--hg-vfx-rotation"), flip: effect.querySelector(".hg-vfx-sprite").style.transform, scale: effect.style.getPropertyValue("--hg-vfx-scale") };
    player.clear();
    let finish;
    const delayed = createCombatEffectSystem({ engine, assetCache: { preload: () => new Promise(resolve => { finish = resolve; }), getDimensions: () => ({ width: 1254, height: 1254 }), clear() {} } });
    const pending = delayed.playCombatEffect("swordSlash"); delayed.destroy(); finish(true); const cancelled = await pending;
    const failed = createCombatEffectSystem({ engine, onError: message => errors.push(message), assetCache: { preload: async () => false, clear() {} } });
    const missing = await failed.playCombatEffect("swordSlash"); failed.destroy();
    const remaining = { effects: surface.querySelectorAll(".hg-map-vfx-effect").length, count: engine.getState().activeCount };
    player.destroy(); engine.destroy(); surface.remove();
    return { transparent, opaqueBlack, rotated, cancelled: cancelled.reason, missing: missing.reason, remaining, errors };
  });
  expect(result.transparent).toBeGreaterThan(0); expect(result.opaqueBlack).toBe(0);
  expect(result.rotated).toMatchObject({ angle: "-90deg", scale: "2" });
  expect(result.rotated.flip).toContain("scale(-1, 1)");
  expect(result.cancelled).toBe("cancelled"); expect(result.missing).toBe("sprite-unavailable");
  expect(result.remaining.effects).toBe(0); expect(result.remaining.count).toBe(0);
  expect(result.errors).toHaveLength(1);
});
