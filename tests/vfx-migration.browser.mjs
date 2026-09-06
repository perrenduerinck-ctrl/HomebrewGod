import { expect, test } from "@playwright/test";

async function openBattle(page, mode = "auto") {
  await page.goto(`?smokeTest=1&vfxAssets=${mode}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
  const tools = page.locator("#battleToolsMenu");
  if (!await tools.evaluate(element => element.open)) await tools.locator("summary").click();
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await page.locator("#battleTopBar").click({ position: { x: 5, y: 30 } });
}

for (const { mode, failModern, version } of [
  { mode: "auto", failModern: false, version: "modern6x6" },
  { mode: "legacy", failModern: false, version: "legacy" },
  { mode: "modern6x6", failModern: true, version: "legacy" }
]) {
  test(`Fireball migration: ${mode}, modern failure ${failModern}`, async ({ page }, testInfo) => {
    const modernRequests = [];
    const crashes = [];
    page.on("pageerror", error => crashes.push(error.message));
    await page.route("**/fireball-impact-alpha-6x6.png", route => {
      modernRequests.push(route.request().url());
      return failModern ? route.fulfill({ status: 404, body: "missing test asset" }) : route.continue();
    });
    await openBattle(page, mode);
    const played = await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.playVfxTest({
      type: "fireball-clip-sprite", clip: "charge", duration: 2200,
      position: { x: 300, y: 180 }, scale: .86, layer: "airborne",
      timeline: [
        { id: "impact", type: "clip", clip: "impact", atMilliseconds: 350 },
        { id: "aftermath", type: "clip", clip: "aftermath", atMilliseconds: 1300 }
      ]
    }));
    expect(played.ok).toBe(true);
    const effect = page.locator(`[data-effect-id="${played.id}"]`);
    const sprite = effect.locator(".hg-vfx-clip-sprite");
    await expect(sprite).toHaveAttribute("data-vfx-clip", "impact");
    await expect(sprite).toHaveAttribute("data-vfx-asset-version", version);
    await expect(sprite).toHaveAttribute("data-sprite-columns", version === "legacy" ? "4" : "6");
    const before = await sprite.evaluate(element => element.style.backgroundPosition);
    await expect.poll(() => sprite.evaluate(element => element.style.backgroundPosition)).not.toBe(before);
    expect(await sprite.evaluate(element => getComputedStyle(element).mixBlendMode)).toBe("screen");
    await effect.screenshot({ path: testInfo.outputPath(`fireball-${version}.png`) });
    await expect(sprite).toHaveAttribute("data-vfx-clip", "aftermath");
    await expect(sprite).toHaveAttribute("data-vfx-asset-version", version);
    await expect(effect).toHaveCount(0);
    expect(crashes).toEqual([]);
    if (mode === "legacy") expect(modernRequests).toEqual([]);
    else expect(modernRequests.length).toBeGreaterThan(0);
  });
}

test("Fireball migration visual comparison and real PNG alpha", async ({ page }, testInfo) => {
  await openBattle(page);
  const alpha = await page.evaluate(async () => {
    const { createVfxAssetCache, getVfxClipSet } = await import("/vfx/vfxAssetManifest.js");
    const { createVfxClipController } = await import("/vfx/clipController.js");
    const cache = createVfxAssetCache();
    const clips = getVfxClipSet("fireball");
    const modern = clips.impact;
    const old = getVfxClipSet("fireball", { mode: "legacy" }).impact;
    await Promise.all([cache.preload(modern.src), cache.preload(old.src)]);
    const image = new Image(); image.src = modern.src; await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0, soft = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] === 0) transparent++;
      else if (pixels[index] < 255) soft++;
    }
    const plate = document.createElement("section"); plate.id = "vfx-comparison";
    plate.style.cssText = "position:fixed;inset:0;z-index:999999;background:#152b34;color:#e2eff0;padding:28px;font:16px system-ui;overflow:auto";
    plate.innerHTML = '<h1 style="margin:0 0 8px">Fireball · migration comparison</h1><p>Same 160 px anchor · impact window · transparent sprite backgrounds</p>';
    for (const [mode, label] of [["modern6x6", "Preferred 6 × 6 / 36-frame sheet"], ["legacy", "Legacy 4 × 4 / 16-frame sheet"]]) {
      const heading = document.createElement("h2"); heading.textContent = label;
      heading.style.cssText = "font-size:18px;margin:24px 0 12px"; plate.appendChild(heading);
      const row = document.createElement("div"); row.style.cssText = "display:flex;gap:8px";
      plate.appendChild(row);
      for (const progress of [0, .15, .3, .5, .7, .9]) {
        const cell = document.createElement("div");
        cell.style.cssText = "width:166px;flex:none;text-align:center;font-size:12px";
        const stage = document.createElement("div");
        stage.style.cssText = "width:166px;height:166px;display:grid;place-items:center;background-color:#47616a;background-image:linear-gradient(45deg,#354f58 25%,transparent 25%,transparent 75%,#354f58 75%),linear-gradient(45deg,#354f58 25%,transparent 25%,transparent 75%,#354f58 75%);background-size:32px 32px;background-position:0 0,16px 16px;position:relative";
        const sprite = document.createElement("div"); sprite.style.mixBlendMode = "screen";
        stage.appendChild(sprite); cell.appendChild(stage); row.appendChild(cell);
        const controller = createVfxClipController({ element: sprite, clips,
          initialClip: "impact", assetCache: cache, assetMode: mode, manual: true, now: () => 0 });
        const options = controller.getState().options;
        controller.seek(progress * (options.endFrame - options.startFrame + 1) / options.framesPerSecond * 1000);
        const caption = document.createElement("div"); caption.style.paddingTop = "8px";
        caption.textContent = `${Math.round(progress * 100)}% · frame ${controller.getState().currentFrame}`;
        cell.appendChild(caption);
      }
    }
    document.body.appendChild(plate);
    return { transparent, soft, total: image.width * image.height };
  });
  expect(alpha.transparent / alpha.total).toBeGreaterThan(.1);
  expect(alpha.soft).toBeGreaterThan(1000);
  await page.locator("#vfx-comparison").screenshot({ path: testInfo.outputPath("fireball-migration-comparison.png") });
});
