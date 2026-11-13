import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

test("every catalog spell resolves and renders travel and impact review frames", async ({ page }) => {
  test.setTimeout(180000);
  const output = resolve("output/spell-catalog-review"); mkdirSync(output, { recursive: true });
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto("?smokeTest=1");
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  const count = await page.evaluate(async () => {
    const { DEFAULT_SPELLS } = await import("/data/defaultSpells.js");
    const { createDefaultCastingSequenceRegistry } = await import("/vfx/castingSequence.js");
    const { createDefaultEffectRegistry } = await import("/vfx/effectRegistry.js");
    const { createEffectRenderer } = await import("/vfx/effectRenderer.js");
    const { createEffectEngine } = await import("/vfx/effectEngine.js");
    const { createVfxAssetCache } = await import("/vfx/vfxAssetManifest.js");
    const { createSpellVfxEvent } = await import("/vfx/castEvent.js");
    window.catalogReview = { spells: DEFAULT_SPELLS, registry: createDefaultCastingSequenceRegistry(), effects: createDefaultEffectRegistry(), createEffectRenderer, createEffectEngine, cache: createVfxAssetCache(), createSpellVfxEvent, active: [] };
    return DEFAULT_SPELLS.length;
  });
  expect(count).toBe(340);
  const report = [];
  for (let offset = 0; offset < count; offset += 20) {
    const rows = await page.evaluate(async (offset) => {
      const review = window.catalogReview;
      review.active.forEach((engine) => engine.destroy()); review.active = [];
      document.getElementById("catalog-review")?.remove();
      const stage = document.createElement("section"); stage.id = "catalog-review";
      stage.style.cssText = "position:absolute;left:0;top:0;z-index:9999999;background:#14212e;display:grid;grid-template-columns:repeat(4,320px);color:white;font:13px Arial";
      document.body.append(stage);
      const rows = [];
      for (const spell of review.spells.slice(offset, offset + 20)) {
        const event = review.createSpellVfxEvent({ spell, casterTokenId: "caster", casterPoint: { x: 30, y: 65 }, targetPoint: { x: 125, y: 65 }, affectedTokens: [{ id: "target" }] });
        const sequence = review.registry.resolve(event);
        if (!sequence) throw new Error("Missing sequence: " + spell.id);
        const card = document.createElement("article"); card.style.cssText = "height:160px;border:1px solid #526575;overflow:hidden;box-sizing:border-box";
        const title = document.createElement("div"); title.textContent = spell.name; title.style.cssText = "height:25px;padding:5px"; card.append(title);
        const row = document.createElement("div"); row.style.cssText = "display:flex"; card.append(row); stage.append(card);
        const phases = [];
        for (const phase of ["travel", "impact"]) {
          const surface = document.createElement("div"); surface.style.cssText = "position:relative;width:158px;height:125px;background:linear-gradient(45deg,#203749,#344d60);overflow:hidden";
          const label = document.createElement("span"); label.textContent = phase; label.style.cssText = "position:absolute;bottom:0;left:4px;font-size:10px;z-index:9999"; surface.append(label); row.append(surface);
          const definitions = sequence.phases.find((entry) => entry.phase === phase).effects;
          for (const effect of definitions) {
            const sprite = review.effects.get(effect.type)?.sprite;
            if (sprite?.src) await review.cache.preload(sprite.src);
          }
          let time = 0, id = 0; const frames = new Map();
          const renderer = review.createEffectRenderer({ surface, assetCache: review.cache, now: () => time, requestFrame(fn) { frames.set(++id, fn); return id; }, cancelFrame(key) { frames.delete(key); } });
          const engine = review.createEffectEngine({ renderer, scheduler: { now: () => time, setTimeout() { return ++id; }, clearTimeout() {} } });
          review.active.push(engine);
          for (const effect of definitions) {
            const result = engine.play({ ...effect, duration: 1200, delay: 0, scale: Math.min(.25, effect.scale || 1), position: { x: 78, y: 65 }, startPosition: { x: 25, y: 65 }, endPosition: { x: 125, y: 65 }, shake: { enabled: false }, hitStopMs: 0 });
            if (!result.ok) throw new Error(spell.id + ": " + (result.reason || "render rejected"));
          }
          time = 350; const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(time));
          phases.push({ phase, effects: definitions.length, rendered: renderer.getDebugState().effects.length });
        }
        rows.push({ id: spell.id, name: spell.name, sequence: sequence.id, phases });
      }
      await Promise.all([...document.images].filter((image) => !image.complete).map((image) => image.decode().catch(() => {})));
      return rows;
    }, offset);
    for (const row of rows) for (const phase of row.phases) expect(phase.rendered, row.id + " " + phase.phase).toBeGreaterThanOrEqual(phase.effects);
    report.push(...rows);
    await page.locator("#catalog-review").screenshot({ path: resolve(output, "catalog-" + String(offset / 20 + 1).padStart(2, "0") + ".png") });
  }
  writeFileSync(resolve(output, "manifest.json"), JSON.stringify(report, null, 2));
});
