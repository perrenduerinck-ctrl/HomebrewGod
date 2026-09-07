import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";

async function screenshotPixels(page, buffer, points) {
  return page.evaluate(async ({ encoded, points }) => {
    const image = new Image(); image.src = "data:image/png;base64," + encoded; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
    return points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
  }, { encoded: buffer.toString("base64"), points });
}

test("VFX modern 36-frame JS playback stays readable in Full and Reduced and absent in Off", async ({ page }) => {
  await openVfxAuditMap(page);
  const result = await page.evaluate(async () => {
    const { createEffectRenderer } = await import("/vfx/effectRenderer.js");
    const { createEffectEngine } = await import("/vfx/effectEngine.js");
    const { createVfxAssetCache, VFX_ASSET_MANIFEST } = await import("/vfx/vfxAssetManifest.js");
    const cache = createVfxAssetCache();
    const versions = VFX_ASSET_MANIFEST.fireball.clips.impact;
    await cache.preload(versions.modern6x6.src);
    const clips = { impact: { ...versions, modern6x6: { ...versions.modern6x6, startFrame: 0, endFrame: 35, framesPerSecond: 24 } } };
    let time = 0, next = 0;
    const frames = new Map(), timers = new Map();
    const target = document.createElement("div"); target.style.cssText = "position:relative;width:400px;height:300px";
    document.body.appendChild(target);
    const renderer = createEffectRenderer({ surface: target, assetCache: cache, now: () => time,
      requestFrame(fn) { frames.set(++next, fn); return next; }, cancelFrame: id => frames.delete(id) });
    const engine = createEffectEngine({ renderer, scheduler: { now: () => time,
      setTimeout(fn) { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id) } });
    const results = [];
    for (const mode of ["full", "reduced", "off"]) {
      engine.clear(); engine.setMode(mode); time = 0;
      const played = engine.play({ type: "fireball-clip-sprite", clips, clip: "impact",
        duration: 1500, position: { x: 200, y: 180 }, shake: { enabled: true, amplitude: 3 } });
      const samples = [];
      for (const at of [100, 600, 1100]) {
        time = at;
        const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time));
        samples.push(renderer.getDebugState().effects[0]?.frame ?? null);
      }
      results.push({ mode, samples, count: target.querySelectorAll(".hg-vfx-sprite").length,
        duration: played.effect?.duration, shake: target.classList.contains("hg-vfx-screen-shake"),
        version: target.querySelector(".hg-vfx-sprite")?.dataset.vfxAssetVersion });
    }
    engine.destroy(); target.remove(); return results;
  });
  for (const state of result.filter(s => s.mode !== "off")) {
    expect(state.duration).toBe(1500);
    expect(state.version).toBe("modern6x6");
    expect(state.count).toBe(1);
    expect(state.samples[0]).toBeLessThan(5);
    expect(state.samples[1]).toBeGreaterThan(10);
    expect(state.samples[2]).toBeGreaterThan(state.samples[1]);
    expect(state.samples[2]).toBeLessThan(35);
  }
  expect(result.find(s => s.mode === "reduced").shake).toBe(false);
  expect(result.find(s => s.mode === "off").count).toBe(0);
});

test("VFX stress: 20 statuses, ten elevated tokens, Fireball, Lightning and ground effects stay bounded", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await openVfxAuditMap(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.collectGarbage");
  const beforeHeap = (await cdp.send("Runtime.getHeapUsage")).usedSize;
  const report = await page.evaluate(async () => {
    const { createEffectRenderer } = await import("/vfx/effectRenderer.js");
    const { createEffectEngine } = await import("/vfx/effectEngine.js");
    const { createCastingSequenceSystem } = await import("/vfx/castingSequence.js");
    const { createSpellVfxEvent } = await import("/vfx/castEvent.js");
    const { getDefaultSpellById } = await import("/data/defaultSpells.js");
    const { createDefaultEffectRegistry } = await import("/vfx/effectRegistry.js");
    const { resolveVfxAlphaSource } = await import("/vfx/alphaAssets.js");
    const statuses = createDefaultEffectRegistry().list().filter(effect => effect.id.startsWith("status-"));
    await Promise.all(statuses.map(async effect => {
      const image = new Image(); image.src = resolveVfxAlphaSource(effect.sprite.src); await image.decode();
    }));
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;left:0;top:0;width:800px;height:600px;z-index:999999;background:#28404b";
    document.body.appendChild(stage);
    const tokens = [];
    for (let i = 0; i < 10; i++) {
      const token = document.createElement("div"); token.className = "hg-token"; token.dataset.tokenId = "stress-" + i;
      token.dataset.visualZ = String(i % 3 * 32);
      token.style.cssText = `position:absolute;left:${100 + i % 5 * 120}px;top:${220 + Math.floor(i / 5) * 150}px;width:40px;height:40px;--hg-token-visual-z:${token.dataset.visualZ}px`;
      token.innerHTML = '<div class="hg-token-fallback">T</div>';
      tokens.push(token); stage.appendChild(token);
    }
    let time = 0, next = 0;
    const timers = new Map(), frames = new Map();
    const scheduler = { now: () => time,
      setTimeout(fn, delay) { timers.set(++next, { fn, at: time + delay }); return next; },
      clearTimeout: id => timers.delete(id) };
    const renderer = createEffectRenderer({ surface: stage, now: () => time,
      getTokenElement: id => tokens.find(token => token.dataset.tokenId === id),
      requestFrame(fn) { frames.set(++next, fn); return next; }, cancelFrame: id => frames.delete(id) });
    const engine = createEffectEngine({ renderer, scheduler });
    const system = createCastingSequenceSystem({ effectEngine: engine, scheduler });
    const step = ms => {
      const end = time + ms;
      let pending;
      while ((pending = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0])) {
        timers.delete(pending[0]); time = pending[1].at; pending[1].fn();
      }
      time = end;
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time));
    };
    const runs = [];
    for (const mode of ["full", "reduced"]) for (let cycle = 0; cycle < 3; cycle++) {
      engine.setMode(mode);
      for (let i = 0; i < 20; i++) engine.play({ type: statuses[i].id,
        duration: 12000, persistent: true, persistentLifetime: 12000, importance: "normal",
        sprite: { loop: true, removeOnComplete: false }, attachment: { tokenId: "stress-" + Math.floor(i / 2), position: "centered" } });
      renderer.refresh();
      const stableReads = renderer.getDebugState().metrics.layoutReads;
      for (let i = 0; i < 20; i++) step(16);
      const extraStableReads = renderer.getDebugState().metrics.layoutReads - stableReads;
      tokens[0].style.left = (130 + cycle * 5) + "px"; tokens[0].style.width = "48px";
      tokens[0].dataset.visualZ = "48"; tokens[0].style.setProperty("--hg-token-visual-z", "48px");
      step(16);
      const invalidatedReads = renderer.getDebugState().metrics.layoutReads - stableReads;
      for (const spellId of ["fireball", "lightning-bolt"]) system.play(createSpellVfxEvent({
        spell: getDefaultSpellById(spellId), casterPoint: { x: 100, y: 250 }, targetPoint: { x: 600, y: 340 } }));
      for (let i = 0; i < 5; i++) engine.play({ type: "profile-ground", preset: "ground",
        duration: 1800, position: { x: 220 + i * 80, y: 400 }, particles: { count: 240 },
        debris: { enabled: true, count: 16 }, importance: "secondary" });
      let peakNodes = 0, peakDynamic = 0, peakParticles = 0, maxFrames = 0, peakEffects = 0;
      for (let i = 0; i < 360; i++) {
        if (i % 3 === 0) await new Promise(requestAnimationFrame);
        step(16);
        const state = renderer.getDebugState();
        peakNodes = Math.max(peakNodes, stage.querySelectorAll("*").length);
        peakDynamic = Math.max(peakDynamic, state.complexity.dynamicNodes);
        peakParticles = Math.max(peakParticles, state.complexity.particles);
        peakEffects = Math.max(peakEffects, state.complexity.activeEffects);
        maxFrames = Math.max(maxFrames, frames.size);
      }
      const metrics = renderer.getDebugState().metrics;
      system.clear(); engine.clear(); step(16);
      runs.push({ mode, cycle, peakNodes, peakDynamic, peakParticles, peakEffects, maxFrames,
        extraStableReads, invalidatedReads, frameMsAverage: metrics.frameMsAverage,
        frameMsMax: metrics.frameMsMax, remainingTimers: timers.size, remainingFrames: frames.size,
        staleElements: stage.querySelectorAll(".hg-map-vfx-effect,.hg-vfx-motion-trail,.hg-vfx-debris,.hg-vfx-ground-shadow").length });
    }
    system.destroy(); engine.destroy(); stage.remove(); return runs;
  });
  await cdp.send("HeapProfiler.collectGarbage");
  const heapGrowth = (await cdp.send("Runtime.getHeapUsage")).usedSize - beforeHeap;
  writeFileSync(testInfo.outputPath("vfx-stress.json"), JSON.stringify({ report, heapGrowth }, null, 2));
  await testInfo.attach("vfx-stress-metrics", { body: JSON.stringify({ report, heapGrowth }, null, 2), contentType: "application/json" });
  for (const run of report) {
    expect(run.peakDynamic).toBeLessThanOrEqual(run.mode === "full" ? 320 : 96);
    expect(run.peakParticles).toBeLessThanOrEqual(run.mode === "full" ? 192 : 48);
    expect(run.peakEffects).toBeLessThanOrEqual(64);
    expect(run.peakNodes).toBeLessThan(900);
    expect(run.maxFrames).toBe(1);
    expect(run.extraStableReads).toBe(0);
    expect(run.invalidatedReads).toBeLessThanOrEqual(6);
    expect(run.invalidatedReads).toBeGreaterThan(0);
    expect(run.remainingTimers + run.remainingFrames + run.staleElements).toBe(0);
  }
  expect(heapGrowth).toBeLessThan(12 * 1024 * 1024);
});

test("VFX cross-layer rendered pixels: ground, shadows, real tokens, airborne, overhead, UI", async ({ page }, testInfo) => {
  await openVfxAuditMap(page);
  await page.evaluate(async () => {
    const { createEffectRenderer } = await import("/vfx/effectRenderer.js");
    const stage = document.createElement("div"); stage.id = "vfx-layer-scene";
    stage.style.cssText = "position:fixed;left:0;top:0;width:600px;height:340px;background:#182c34;z-index:999999";
    document.body.appendChild(stage);
    const renderer = createEffectRenderer({ surface: stage }); renderer.connect();
    const tokenLayer = document.getElementById("tokenLayer");
    stage.appendChild(tokenLayer); tokenLayer.style.cssText = "position:absolute;inset:0;z-index:300";
    const colors = ["#d94141", "#8046d9", "#36ba58", "#e6d335", "#35aedc", "#eb66bc"];
    const layers = ["ground", "shadows", "tokens", "airborne", "overhead", "ui"];
    layers.forEach((layer, i) => {
      const node = document.createElement("div");
      node.style.cssText = `position:absolute;left:40px;top:110px;width:${520 - i * 80}px;height:80px;background:${colors[i]}`;
      if (layer === "tokens") {
        node.className = "hg-token"; node.dataset.tokenId = "ground-scene";
        const body = document.createElement("div"); body.className = "hg-token-fallback";
        body.style.background = colors[i]; node.appendChild(body);
      }
      (layer === "tokens" ? tokenLayer : renderer.getLayerElement(layer)).appendChild(node);
    });
    const elevated = document.createElement("div"); elevated.className = "hg-token";
    elevated.dataset.tokenId = "elevated-scene"; elevated.dataset.visualZ = "40";
    elevated.style.cssText = "position:absolute;left:290px;top:270px;width:44px;height:44px;--hg-token-visual-z:40px";
    elevated.innerHTML = '<div class="hg-token-fallback" style="background:#36ba58">↑</div>';
    tokenLayer.appendChild(elevated);
    const label = document.createElement("p");
    label.style.cssText = "position:absolute;left:24px;top:12px;color:white;font:18px system-ui;z-index:700";
    label.textContent = "UI → overhead → airborne → real token → shadow → ground";
    stage.appendChild(label);
  });
  const shot = await page.locator("#vfx-layer-scene").screenshot({ path: testInfo.outputPath("vfx-cross-layer.png") });
  const actual = await screenshotPixels(page, shot, [[100,150],[200,150],[280,150],[360,150],[440,150],[520,150]]);
  expect(actual.map(p => p.slice(0,3))).toEqual([[235,102,188],[53,174,220],[230,211,53],[54,186,88],[128,70,217],[217,65,65]]);
});

test("VFX modern and alpha compatibility sprites preserve rendered backgrounds in isolated depth layers", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await openVfxAuditMap(page);
  const cells = await page.evaluate(async () => {
    const { VFX_ASSET_MANIFEST } = await import("/vfx/vfxAssetManifest.js");
    const { VFX_ALPHA_COPIES, resolveVfxAlphaSource } = await import("/vfx/alphaAssets.js");
    const { createDefaultEffectRegistry } = await import("/vfx/effectRegistry.js");
    const { createSpriteAnimator } = await import("/vfx/spriteAnimator.js");
    const assets = new Map();
    for (const spell of Object.values(VFX_ASSET_MANIFEST)) for (const versions of Object.values(spell.clips)) {
      if (versions.modern6x6) for (let frame = 0; frame < 36; frame++) {
        assets.set(versions.modern6x6.src + "#" + frame, { ...versions.modern6x6, reviewFrame: frame });
      }
    }
    for (const definition of createDefaultEffectRegistry().list()) {
      if (VFX_ALPHA_COPIES[definition.sprite?.src.split("?")[0]]) assets.set(definition.sprite.src, definition.sprite);
    }
    const stage = document.createElement("section"); stage.id = "vfx-alpha-scene";
    stage.style.cssText = "position:absolute;left:0;top:0;width:600px;z-index:999999;background:#487484;display:grid;grid-template-columns:repeat(5,120px)";
    const backgrounds = ["#15232c", "#eee7cf", "#5178af", null, "#b65447"];
    const samples = [];
    for (const options of assets.values()) {
      const src = options.src;
      const image = new Image(); image.src = resolveVfxAlphaSource(src); await image.decode();
      for (const background of backgrounds) {
        const cell = document.createElement("div");
        cell.style.cssText = `position:relative;width:120px;height:120px;background:${background || "transparent"}`;
        if (background === "#b65447") {
          const token = document.createElement("div"); token.className = "hg-token";
          token.style.cssText = "position:absolute;left:16px;top:16px;width:88px;height:88px;z-index:300";
          token.innerHTML = '<div class="hg-token-fallback" style="background:#9e443b">T</div>';
          cell.appendChild(token);
        }
        const isolated = document.createElement("div");
        isolated.className = "hg-map-vfx-depth-layer";
        isolated.style.cssText = "position:absolute;inset:0;z-index:400;overflow:hidden";
        const sprite = document.createElement("div");
        sprite.style.cssText = "position:absolute;left:0;top:0;mix-blend-mode:normal";
        const animator = createSpriteAnimator({ element: sprite, manual: true, options: {
          ...options, frameWidth: 120, frameHeight: 120, startFrame: 0, endFrame: options.frameCount - 1,
          removeOnComplete: false, blendMode: "normal" } });
        animator.start(0); animator.seek((options.reviewFrame || 0) / options.framesPerSecond * 1000 + .01);
        isolated.appendChild(sprite); cell.appendChild(isolated); stage.appendChild(cell);
        samples.push({ src, frame: options.reviewFrame || 0, color: background || "#487484" });
      }
    }
    document.body.appendChild(stage); return samples;
  });
  const shot = await page.locator("#vfx-alpha-scene").screenshot({ path: testInfo.outputPath("vfx-alpha-backgrounds.png") });
  const values = await screenshotPixels(page, shot, cells.map((_, i) => [(i % 5) * 120 + 3, Math.floor(i / 5) * 120 + 3]));
  const failures = [];
  values.forEach((pixel, i) => {
    const color = cells[i].color.match(/[a-f0-9]{2}/g).map(hex => parseInt(hex, 16));
    // Small edge glow is allowed; a black/gray opaque rectangle is not.
    if (pixel.slice(0, 3).some((v, c) => Math.abs(v - color[c]) > 24)) failures.push({ ...cells[i], pixel });
  });
  expect(cells.length).toBeGreaterThan(150);
  expect(failures).toEqual([]);
});

export async function openVfxAuditMap(page) {
  await page.goto("?smokeTest=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
  const menu = page.locator("#battleToolsMenu");
  if (!await menu.evaluate(element => element.open)) await menu.locator("summary").click();
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await page.locator("#battleTopBar").click({ position: { x: 5, y: 30 } });
}

test("production token elevation: all five attachments follow children at 0/20/40 ft", async ({ page }) => {
  await openVfxAuditMap(page);
  await page.evaluate(() => {
    const token = document.createElement("div");
    token.className = "hg-token";
    token.dataset.tokenId = "vfx-elevation-token";
    Object.assign(token.style, { position: "absolute", left: "240px", top: "200px",
      width: "40px", height: "40px" });
    const body = document.createElement("div");
    body.className = "hg-token-fallback"; body.textContent = "V";
    token.appendChild(body);
    document.getElementById("tokenLayer").appendChild(token);
  });
  for (const feet of [0, 20, 40]) {
    const visualZ = await page.evaluate(async feet => {
      const { elevationToVisualPixels } = await import("/battleMap/elevation.js");
      const token = document.querySelector('[data-token-id="vfx-elevation-token"]');
      const z = elevationToVisualPixels(feet);
      token.dataset.visualZ = String(z);
      token.style.setProperty("--hg-token-visual-z", `${z}px`);
      return z;
    }, feet);
    for (const position of ["under", "centered", "above", "overhead", "orbit"]) {
      const played = await page.evaluate(position => window.__HOMEBREW_GOD_RELEASE_TEST__.playVfxTest({
        type: "procedural-pulse", duration: 350,
        attachment: { tokenId: "vfx-elevation-token", position, radius: 20, cycles: 1 },
        layer: position === "under" ? "ground" : "airborne"
      }), position);
      expect(played.ok).toBe(true);
      const effect = page.locator(`[data-effect-id="${played.id}"]`);
      await expect(effect).toBeVisible();
      const state = await effect.evaluate((element, position) => {
        const token = document.querySelector('[data-token-id="vfx-elevation-token"]');
        const ground = token.getBoundingClientRect();
        const body = token.querySelector(".hg-token-fallback").getBoundingClientRect();
        const overlay = element.parentElement.getBoundingClientRect();
        const progress = Number(element.dataset.vfxProgress);
        let expectedX = body.left + body.width / 2;
        let expectedY = body.top + body.height / 2;
        if (position === "under") expectedY = ground.top + ground.height * .92;
        if (position === "above") expectedY -= ground.height * .62;
        if (position === "overhead") expectedY -= ground.height * .95;
        if (position === "orbit") {
          expectedX += Math.cos(progress * Math.PI * 2) * 20;
          expectedY += Math.sin(progress * Math.PI * 2) * 9;
        }
        return { x: overlay.left + parseFloat(element.style.left),
          y: overlay.top + parseFloat(element.style.top), expectedX, expectedY,
          worldZ: Number(element.dataset.vfxWorldZ), parentTop: token.style.top,
          childRise: ground.top - body.top, layer: element.dataset.effectLayer };
      }, position);
      expect(Math.abs(state.x - state.expectedX)).toBeLessThan(.5);
      expect(Math.abs(state.y - state.expectedY)).toBeLessThan(.5);
      expect(state.worldZ).toBe(position === "under" ? 0 : visualZ);
      expect(state.childRise).toBeCloseTo(visualZ, 1);
      expect(state.parentTop).toBe("200px");
      expect(state.layer).toBe(position === "under" ? "ground" : "airborne");
      await expect(effect).toHaveCount(0);
    }
  }
});

test("VFX world height, perspective, shadows and depth are invariant across five zooms", async ({ page }) => {
  await openVfxAuditMap(page);
  const samples = await page.evaluate(async () => {
    const { createEffectRenderer } = await import("/vfx/effectRenderer.js");
    const { normalizeEffectRequest } = await import("/vfx/effectEngine.js");
    const target = document.createElement("div");
    target.style.cssText = "position:relative;width:600px;height:400px";
    document.body.appendChild(target);
    let time = 0, zoom = 1, next = 0;
    const frames = new Map();
    const renderer = createEffectRenderer({ surface: target, getScale: () => zoom, now: () => time,
      requestFrame: callback => { frames.set(++next, callback); return next; },
      cancelFrame: id => frames.delete(id) });
    renderer.connect();
    const results = [];
    for (const transformed of [false, true]) for (const scale of [.5, .75, 1, 1.5, 2]) {
      renderer.clear(); frames.clear(); time = 0; zoom = scale;
      target.style.width = `${600 * (transformed ? 1 : scale)}px`;
      target.style.height = `${400 * (transformed ? 1 : scale)}px`;
      target.style.transform = transformed ? `scale(${scale})` : "none";
      target.style.transformOrigin = "0 0";
      renderer.refresh();
      for (const [id, y, maxZ] of [["first", 180, 80], ["second", 190, 120]]) {
        renderer.render(normalizeEffectRequest({ preset: "projectile", duration: 1000,
          startPosition: { x: 100 * scale, y: y * scale }, endPosition: { x: 400 * scale, y: y * scale },
          motion: { maxZ }, shadow: { enabled: true, minimumOpacity: .08, minimumScale: .2 },
          particles: { count: 0 } }, { id, definition: { id: "test", kind: "procedural" } }));
      }
      time = 500;
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(time); }
      const values = renderer.getDebugState().effects.map(state => {
        const element = renderer.getEffectElement(state.id);
        const shadow = target.querySelector(`[data-parent-effect-id="${state.id}"].hg-vfx-ground-shadow`);
        return { worldZ: state.worldZ, screenZ: state.screenZ, heightScale: state.heightScale,
          shadowRatio: Number(shadow.dataset.shadowRatio), shadowOpacity: Number(shadow.style.opacity),
          depth: Number(element.style.zIndex), screenScale: parseFloat(element.style.getPropertyValue("--hg-vfx-scale")) };
      });
      const before = renderer.getDebugState().metrics.pathWrites;
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(time); }
      const layer = renderer.getOverlayElement().getBoundingClientRect();
      results.push({ scale, transformed, values, layerWidth: layer.width,
        extraPathWrites: renderer.getDebugState().metrics.pathWrites - before });
    }
    renderer.destroy(); target.remove(); return results;
  });
  const reference = samples.find(sample => sample.scale === 1);
  for (const sample of samples) {
    expect(sample.extraPathWrites).toBe(0);
    expect(sample.layerWidth).toBeCloseTo(600 * sample.scale, 1);
    for (let i = 0; i < sample.values.length; i++) {
      const value = sample.values[i], base = reference.values[i];
      for (const key of ["worldZ", "heightScale", "shadowRatio", "shadowOpacity", "depth"]) {
        expect(value[key]).toBeCloseTo(base[key], 6);
      }
      expect(value.screenZ).toBeCloseTo(base.screenZ * sample.scale, 6);
      expect(value.screenScale).toBeCloseTo(base.screenScale * sample.scale, 6);
    }
  }
});
