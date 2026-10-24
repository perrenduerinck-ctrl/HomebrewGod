import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("battle-map renderers reuse stable token, object, and fog DOM", async () => {
  const [tokens, objects, fog, effects, app] = await Promise.all([
    read("tokens/index.js"),
    read("battleMap/objectSystem.js"),
    read("battleMap/fogOfWar.js"),
    read("effects/effectRuntime.js"),
    read("app.js")
  ]);
  assert.match(tokens, /const renderedTokenElements = new Map\(\)/);
  assert.match(tokens, /existingTokenElement\?\.__homebrewGodRenderKey === renderKey/);
  assert.doesNotMatch(tokens, /layer\.innerHTML = ""/);
  assert.match(objects, /const renderedObjects = new Map\(\)/);
  assert.match(objects, /existing\?\.__homebrewGodRenderKey === renderKey/);
  assert.doesNotMatch(objects, /layer\.replaceChildren\(\)/);
  assert.match(fog, /maskSignature !== lastMaskSignature/);
  assert.match(effects, /const recordsByTarget = new Map\(\)/);
  assert.match(effects, /recordsByTarget\.get\(text\(tokenId\)\)/);
  assert.match(app, /getBattleMapPerformanceState/);
});

test("inactive map overlays yield pointer input to tokens and controls", async () => {
  const [fog, vision, drawing, templates] = await Promise.all([
    read("battleMap/fogOfWar.js"),
    read("battleMap/visionSystem.js"),
    read("battleMap/drawingTools.js"),
    read("battleMap/templateRenderer.js")
  ]);
  assert.match(fog, /overlay\.style\.pointerEvents = visible && state\.active/);
  assert.match(vision, /overlay\.style\.pointerEvents = state\.active \? "auto" : "none"/);
  assert.match(drawing, /overlay\.style\.pointerEvents = drawingEnabled \? "auto" : "none"/);
  assert.match(templates, /overlay\.hidden = !enabled/);
});
