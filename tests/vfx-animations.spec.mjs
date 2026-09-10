import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

const sheet = fileURLToPath(new URL("../assets/vfx/combat/melee/sword-slash-test.png", import.meta.url));
async function openLibrary(page) {
  await page.goto("?smokeTest=1&vfxTest=1");
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(async () => { const api = window.__HOMEBREW_GOD_RELEASE_TEST__; await api.openScreen("battle"); api.setDmRole(true); });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; });
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await page.locator("#animationLibraryButton").click();
  const dialog = page.locator("#animationLibraryDialog"); await expect(dialog).toBeVisible();
  return dialog;
}
const field = (dialog, name) => dialog.locator(`[data-animation-${name}]`);
const section = (dialog, key) => dialog.locator(`[data-section="${key}"]`);
async function expand(dialog, key) { const item = section(dialog, key); if (!await item.evaluate(el => el.open)) await item.locator("summary").first().click(); }
async function slider(dialog, key, value) { await field(dialog, key).evaluate((el, value) => { el.value = String(value); el.dispatchEvent(new Event("input", { bubbles: true })); }, value); }

test("users upload, preview, save, duplicate and hot-swap a spell using Animation IDs", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const dialog = await openLibrary(page);
  await field(dialog, "select").selectOption("healing_burst_01");
  await field(dialog, "play").click();
  await expect(dialog.locator('[data-animation-id="healing_burst_01"]')).toBeVisible();
  await expect(field(dialog, "preview-info")).toContainText("25 frames");
  await field(dialog, "stop").click(); await expect(dialog.locator(".hg-map-vfx-effect")).toHaveCount(0);
  await field(dialog, "select").selectOption("sword_slash_01");
  await field(dialog, "play").click(); await expect(dialog.locator('[data-animation-id="sword_slash_01"]')).toBeVisible();
  await field(dialog, "stop").click();
  await field(dialog, "custom").click();
  await field(dialog, "name").fill("My slash"); await field(dialog, "file").setInputFiles(sheet);
  await expect(field(dialog, "file-info")).toContainText("sword-slash-test.png");
  await field(dialog, "grid").selectOption("7"); await expect(field(dialog, "frames")).toHaveValue("49");
  await field(dialog, "grid").selectOption("custom");
  await field(dialog, "columns").fill("6"); await field(dialog, "rows").fill("6"); await field(dialog, "frames").fill("30");
  await field(dialog, "fps").fill("18"); await field(dialog, "scale").fill("1.2"); await field(dialog, "playback").selectOption("loop");
  await field(dialog, "draft-preview").click();
  await expect(dialog.locator('[data-animation-id="draft_preview"] .hg-vfx-sprite')).toBeVisible();
  await expect(field(dialog, "preview-info")).toContainText("Loops until Stop");
  await field(dialog, "preview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("animation-editor.png") });
  await dialog.getByRole("button", { name: "Save Animation", exact: true }).click();
  await expect(field(dialog, "status")).toContainText("saved for this session");
  const id = await field(dialog, "select").inputValue(); expect(id).toMatch(/^custom_/);
  await field(dialog, "action").selectOption("spell:fireball"); await field(dialog, "assign").click();
  await expect(field(dialog, "assigned")).toHaveText("Assigned: My slash");
  await field(dialog, "close").click();
  await page.locator("#battleVfxTestFireballButton").click();
  const effect = page.locator(`#battleMapSurface [data-animation-id="${id}"]`);
  await expect(effect.locator(".hg-vfx-sprite")).toBeVisible();
  await expect(page.locator('#battleMapSurface [data-effect-type="fireball-clip-sprite"]')).toHaveCount(0);
  await expect(effect).toHaveCount(0); // Assigned spell loops have a bounded 5-second lifetime.
  await page.locator("#animationLibraryButton").click();
  await field(dialog, "duplicate").click(); const copyId = await field(dialog, "select").inputValue(); expect(copyId).not.toBe(id);
  await field(dialog, "name").fill("My second slash"); await field(dialog, "fps").fill("36"); await field(dialog, "playback").selectOption("once");
  await dialog.getByRole("button", { name: "Save Animation", exact: true }).click();
  await expect(field(dialog, "status")).toContainText("saved for this session");
  await field(dialog, "assign").click(); await field(dialog, "close").click();
  await page.locator("#battleVfxTestFireballButton").click();
  await expect(page.locator(`#battleMapSurface [data-animation-id="${copyId}"] .hg-vfx-sprite`)).toBeVisible();
  await expect(page.locator(`#battleMapSurface [data-animation-id="${copyId}"]`)).toHaveCount(0);
  await page.locator("#animationLibraryButton").click(); await field(dialog, "reset").click(); await field(dialog, "close").click();
  await page.locator("#battleVfxTestFireballButton").click();
  await expect(page.locator('#battleMapSurface [data-effect-type="fireball-clip-sprite"]')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test("editor validation, replay, close cleanup and responsive layout remain usable", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const dialog = await openLibrary(page);
  await field(dialog, "search").fill("no-such-animation"); await field(dialog, "assign").click();
  await expect(field(dialog, "status")).toContainText("Choose an animation first");
  await field(dialog, "search").fill("");
  await field(dialog, "custom").click(); await field(dialog, "name").fill("Missing image");
  await field(dialog, "draft-preview").click(); await expect(field(dialog, "status")).toContainText("Choose a sprite sheet");
  await field(dialog, "file").setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not a png") });
  await expect(field(dialog, "file-info")).toContainText("broken.png");
  await field(dialog, "draft-preview").click(); await expect(field(dialog, "status")).toContainText("Unable to load");
  await expect(dialog.locator(".hg-map-vfx-effect")).toHaveCount(0);
  await field(dialog, "editor-cancel").click();
  await field(dialog, "select").selectOption("sword_slash_01");
  await field(dialog, "preview-fps").fill("0"); await field(dialog, "play").click();
  await expect(field(dialog, "status")).toContainText("FPS");
  await field(dialog, "preview-fps").fill("24");
  await field(dialog, "replay").click(); await field(dialog, "replay").click();
  await expect(dialog.locator(".hg-map-vfx-effect")).toHaveCount(1);
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
  await expect(dialog).not.toHaveAttribute("open", "");
  await expect(dialog.locator(".hg-map-vfx-effect")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; });
  await page.locator("#animationLibraryButton").click();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("shared renderer preserves full rectangular cells, pivots, flips and alpha", async ({ page }) => {
  await page.goto("/output/vfx/priority-seven/index.html");
  await page.addStyleTag({ url: "/assets/styles/app.css" });
  const result = await page.evaluate(async () => {
    const { createAnimationLibrary } = await import("/vfx/animationLibrary.js");
    const { createAnimationPlayer } = await import("/vfx/animationPlayer.js");
    const { createBattleMapEffectEngine } = await import("/vfx/effectEngine.js");
    const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 200;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "rgba(80,160,255,.5)"; ctx.fillRect(0,0,100,100);
    const library = createAnimationLibrary(); library.registerAnimation({ id: "rect", name: "Rect", sprite: canvas.toDataURL(),
      grid: { columns: 4, rows: 2 }, frameCount: 1, fps: 1, anchorX: 0, anchorY: 1, playback: "loop" });
    const surface = document.createElement("div"); surface.style.cssText = "position:relative;width:500px;height:400px"; document.body.append(surface);
    const engine = createBattleMapEffectEngine({ surface }); const player = createAnimationPlayer({ engine, library });
    const played = await player.playAnimation("rect", { x: 220, y: 180, rotation: 90, flipX: true });
    const node = surface.querySelector(".hg-vfx-sprite"), effect = node.parentElement;
    const snapshot = { ok: played.ok, width: parseFloat(node.style.width), height: parseFloat(node.style.height),
      transform: node.style.transform, pivot: node.style.transformOrigin, angle: effect.style.getPropertyValue("--hg-vfx-rotation"),
      blend: node.style.mixBlendMode, pointer: getComputedStyle(node).pointerEvents,
      backgroundPosition: node.style.backgroundPosition, backgroundSize: node.style.backgroundSize };
    surface.style.width = "1000px"; surface.style.height = "800px"; engine.refresh();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    snapshot.resized = { x: parseFloat(effect.style.left), y: parseFloat(effect.style.top) };
    player.destroy(); engine.destroy(); snapshot.remaining = surface.querySelectorAll(".hg-map-vfx-effect").length; surface.remove(); return snapshot;
  });
  expect(result).toMatchObject({ ok: true, width: 160, height: 80, angle: "90deg", blend: "normal", pointer: "none", remaining: 0 });
  expect(result.transform).toContain("translate(0%, -100%) scale(-1, 1)");
  expect(result.pivot).toBe("0% 100%"); expect(result.backgroundPosition).toBe("0px 0px");
  expect(result.backgroundSize).toBe("640px 160px");
  expect(result.resized).toEqual({ x: 440, y: 360 });
});

test("animation browser offers thumbnails, type and tag filters, favorites, recents and remixes", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", e => errors.push(e.message)); const dialog = await openLibrary(page);
  await expect(dialog.locator(".hg-animation-card")).toHaveCount(6);
  // Thumbnails outside the dialog viewport load only when brought into view.
  await dialog.locator(".hg-animation-card").last().scrollIntoViewIfNeeded();
  await expect.poll(() => dialog.locator("[data-thumbnail-id]").evaluateAll(nodes => nodes.filter(n => n.style.backgroundImage).length)).toBe(6);
  await field(dialog, "type").selectOption("Explosion"); await expect(dialog.locator(".hg-animation-card")).toHaveCount(1);
  await dialog.locator('[data-choose-animation="fireball_explosion_01"]').click();
  await dialog.getByRole("button", { name: "Favorite Fireball explosion", exact: true }).click();
  await dialog.locator(".hg-animation-filters summary").click(); await field(dialog, "favorites").check(); await field(dialog, "filter-tags").fill("fire");
  await expect(dialog.locator(".hg-animation-card")).toHaveCount(1); await field(dialog, "filter-tags").fill("ice"); await expect(dialog.locator(".hg-animation-card")).toHaveCount(0);
  await field(dialog, "filter-tags").fill(""); await field(dialog, "favorites").uncheck(); await field(dialog, "type").selectOption(""); await field(dialog, "recent").check();
  await expect(dialog.locator(".hg-animation-card")).toHaveCount(1); await expect(field(dialog, "select")).toHaveValue("fireball_explosion_01");
  await field(dialog, "recent").uncheck(); await dialog.locator(".hg-animation-filters summary").click();
  await dialog.evaluate(el => { el.scrollTop = 0; }); await page.screenshot({ path: testInfo.outputPath("animation-browser.png") });
  await field(dialog, "duplicate").click(); await expect(field(dialog, "name")).toHaveValue("Fireball explosion copy");
  await field(dialog, "name").fill("Blue fire remix"); await field(dialog, "tags").fill("fire, blue, custom sparkle");
  await dialog.getByRole("button", { name: "Save Animation", exact: true }).click(); await expect(field(dialog, "status")).toContainText("saved for this session");
  await field(dialog, "search").fill("custom sparkle"); await expect(dialog.locator(".hg-animation-card")).toHaveCount(1);
  await field(dialog, "search").fill(""); await field(dialog, "select").selectOption("fireball_explosion_01"); await field(dialog, "edit").click();
  await expect(field(dialog, "name")).toHaveValue("Fireball explosion"); expect(errors).toEqual([]);
});

test("advanced projectile settings survive Simple Mode save and the preview pauses without drifting", async ({ page }, testInfo) => {
  const errors = []; page.on("pageerror", e => errors.push(e.message)); const dialog = await openLibrary(page);
  await field(dialog, "select").selectOption("cold_burst_01"); await field(dialog, "duplicate").click();
  await expect(section(dialog, "direction")).not.toBeVisible();
  await field(dialog, "name").fill("Directional ice missile"); await field(dialog, "preset").selectOption("projectile"); await field(dialog, "apply-preset").click();
  await field(dialog, "advanced-mode").check(); await expect(section(dialog, "direction")).toBeVisible();
  await field(dialog, "frames").fill("12"); await field(dialog, "start").fill("6"); await expect(field(dialog, "end")).toHaveValue("17"); await field(dialog, "reverse").check();
  await field(dialog, "speed").fill("0.75"); await field(dialog, "travel-speed").fill("60"); await field(dialog, "arc").fill("45");
  await field(dialog, "lock").uncheck(); await field(dialog, "scale-x").fill("1.5"); await field(dialog, "scale-y").fill("0.5"); await field(dialog, "offset-x").fill("8");
  await dialog.getByRole("button", { name: "Bottom", exact: true }).click();
  await expand(dialog, "direction"); await field(dialog, "source-direction").selectOption("up"); await field(dialog, "rotation").fill("10"); await field(dialog, "flip-x").check();
  await expand(dialog, "visual"); await slider(dialog, "opacity", 70); await field(dialog, "tint-enabled").check(); await field(dialog, "tint").fill("#3355ff"); await slider(dialog, "tint-strength", 60);
  await field(dialog, "fade-in").fill("0.2"); await field(dialog, "fade-out").fill("0.25");
  await field(dialog, "background").selectOption("light"); await dialog.locator(".hg-animation-preview-tools summary").click();
  await field(dialog, "show-frame").check(); await field(dialog, "show-bounds").check(); await field(dialog, "show-pivot").check();
  await field(dialog, "draft-preview").click(); const effect = dialog.locator(".hg-vfx-animation-sprite"); await expect(effect).toHaveCount(1);
  await expect(effect.locator("feColorMatrix")).toHaveCount(1);
  const matrix = (await effect.locator("feColorMatrix").getAttribute("values")).split(" ").map(Number); expect(matrix.slice(-5)).toEqual([0, 0, 0, 1, 0]);
  await field(dialog, "pause").click(); await expect(field(dialog, "pause")).toHaveText("Resume");
  const before = await effect.evaluate(el => ({ frame: el.dataset.animationFrame, x: el.style.left, y: el.style.top }));
  await page.waitForTimeout(350); expect(await effect.evaluate(el => ({ frame: el.dataset.animationFrame, x: el.style.left, y: el.style.top }))).toEqual(before);
  await field(dialog, "pause").click(); await expect.poll(() => effect.evaluate(el => el.style.left)).not.toBe(before.x);
  await field(dialog, "pause").click(); await dialog.evaluate(el => { el.scrollTop = 0; }); await page.screenshot({ path: testInfo.outputPath("advanced-projectile.png") });
  await field(dialog, "advanced-mode").uncheck(); await dialog.getByRole("button", { name: "Save Animation", exact: true }).click();
  await expect(field(dialog, "status")).toContainText("saved for this session"); await field(dialog, "edit").click(); await field(dialog, "advanced-mode").check();
  await expand(dialog, "direction"); await expect(field(dialog, "source-direction")).toHaveValue("up"); await expect(field(dialog, "rotation")).toHaveValue("10"); await expect(field(dialog, "flip-x")).toBeChecked();
  await expand(dialog, "visual"); await expect(field(dialog, "tint")).toHaveValue("#3355ff"); await expect(field(dialog, "opacity")).toHaveValue("70");
  await expect(field(dialog, "scale-x")).toHaveValue("1.5"); await expect(field(dialog, "anchor-y")).toHaveValue("1"); await expect(field(dialog, "frames")).toHaveValue("12");
  await field(dialog, "close").click(); await expect(dialog.locator(".hg-map-vfx-effect")).toHaveCount(0); expect(errors).toEqual([]);
});

test("preview source attachments follow dragged tokens and beam stretching spans the endpoints", async ({ page }) => {
  const dialog = await openLibrary(page); await field(dialog, "select").selectOption("healing_burst_01"); await field(dialog, "duplicate").click();
  await field(dialog, "preset").selectOption("aura"); await field(dialog, "apply-preset").click(); await field(dialog, "draft-preview").click();
  const effect = dialog.locator(".hg-vfx-animation-sprite"); await expect(effect).toHaveCount(1);
  const before = await effect.evaluate(el => Number.parseFloat(el.style.left));
  const source = field(dialog, "source"); await source.focus(); await source.press("ArrowRight"); await source.press("ArrowRight");
  await expect.poll(() => effect.evaluate(el => Number.parseFloat(el.style.left))).toBeGreaterThan(before + 5);
  await field(dialog, "stop").click(); await field(dialog, "preset").selectOption("beam"); await field(dialog, "apply-preset").click(); await field(dialog, "draft-preview").click();
  await expect(effect).toHaveCount(1);
  const size = await dialog.evaluate(el => { const a = el.querySelector("[data-animation-source]").getBoundingClientRect(), b = el.querySelector("[data-animation-target]").getBoundingClientRect(); const sprite = el.querySelector(".hg-vfx-animation-sprite .hg-vfx-sprite").getBoundingClientRect(); return { distance: Math.abs(b.left - a.left), width: sprite.width, height: sprite.height }; });
  expect(size.width).toBeCloseTo(size.distance, 0); expect(size.height).toBeCloseTo(24, 0);
  await field(dialog, "stop").click(); await expect(effect).toHaveCount(0);
});

test("sprite inspection warns on opaque and fractional cells without blocking a valid upload", async ({ page }) => {
  const dialog = await openLibrary(page); await field(dialog, "custom").click(); await field(dialog, "name").fill("Opaque test marker");
  const data = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 101; c.height = 99; const ctx = c.getContext("2d"); ctx.fillStyle = "#225588"; ctx.fillRect(0, 0, 101, 99); return c.toDataURL().split(",")[1]; });
  await field(dialog, "file").setInputFiles({ name: "opaque.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") });
  await expect(field(dialog, "sheet-stats")).toContainText("101 × 99"); await expect(field(dialog, "sheet-stats")).toContainText("do not divide evenly"); await expect(field(dialog, "sheet-stats")).toContainText("No transparency detected");
  await dialog.getByRole("button", { name: "Save Animation", exact: true }).click(); await expect(field(dialog, "status")).toContainText("saved for this session");
});

test("optional animation sound follows the frame clock, respects mute and disposes with the sprite", async ({ page }) => {
  await openLibrary(page);
  await page.evaluate(async () => {
    const [{ createAnimationLibrary }, { createAnimationPlayer }, { createBattleMapEffectEngine }] = await Promise.all([
      import("/vfx/animationLibrary.js"), import("/vfx/animationPlayer.js"), import("/vfx/effectEngine.js")]);
    const original = window.Audio, calls = []; let enabled = true;
    window.Audio = class {
      constructor(src) { this.src = src; this.plays = 0; this.pauses = 0; calls.push(this); }
      play() { this.plays++; return Promise.resolve(); }
      pause() { this.pauses++; }
      removeAttribute() { this.src = null; }
      load() { this.disposed = true; }
    };
    const surface = document.createElement("div"); surface.style.cssText = "position:relative;width:400px;height:300px"; document.body.appendChild(surface);
    const library = createAnimationLibrary(); library.registerAnimation({ id: "sound_test", name: "Sound test", sprite: "./assets/vfx/combat/melee/sword-slash-test.png", grid: { columns: 6, rows: 6 }, fps: 60,
      playback: "loop", timing: { speed: 4 }, sound: { src: "./assets/audio/spells/lightning-bolt.mp3", volume: .3, startFrame: 10, playbackRate: 1.5 } });
    const engine = createBattleMapEffectEngine({ surface }), player = createAnimationPlayer({ engine, library, isSoundEnabled: () => enabled });
    const result = await player.playAnimation("sound_test", { x: 100, y: 100 });
    window.animationSoundTest = { calls, surface, engine, player, result, mute: () => { enabled = false; }, destroy() { player.destroy(); engine.destroy(); surface.remove(); window.Audio = original; } };
  });
  await expect.poll(() => page.evaluate(() => window.animationSoundTest.calls[0]?.plays)).toBe(1);
  await page.waitForTimeout(220); expect(await page.evaluate(() => window.animationSoundTest.calls[0].plays)).toBe(1);
  expect(await page.evaluate(() => window.animationSoundTest.calls[0].volume)).toBe(.3);
  expect(await page.evaluate(() => window.animationSoundTest.calls[0].playbackRate)).toBe(1.5);
  await page.evaluate(() => window.animationSoundTest.mute());
  await expect.poll(() => page.evaluate(() => window.animationSoundTest.calls[0].pauses)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.animationSoundTest.engine.getState().activeCount)).toBe(1);
  await page.evaluate(() => window.animationSoundTest.destroy());
  expect(await page.evaluate(() => window.animationSoundTest.calls[0].disposed)).toBe(true);
  expect(await page.evaluate(() => window.animationSoundTest.engine.getState().activeCount)).toBe(0);
});
