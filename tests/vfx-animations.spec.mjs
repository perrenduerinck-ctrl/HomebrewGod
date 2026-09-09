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
    player.destroy(); engine.destroy(); snapshot.remaining = surface.querySelectorAll(".hg-map-vfx-effect").length; surface.remove(); return snapshot;
  });
  expect(result).toMatchObject({ ok: true, width: 160, height: 80, angle: "90deg", blend: "normal", pointer: "none", remaining: 0 });
  expect(result.transform).toContain("translate(0%, -100%) scale(-1, 1)");
  expect(result.pivot).toBe("0% 100%"); expect(result.backgroundPosition).toBe("0px 0px");
  expect(result.backgroundSize).toBe("640px 160px");
});
