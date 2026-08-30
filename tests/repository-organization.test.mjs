import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

test("the root contains entry points and configuration, not feature modules or history", () => {
  const rootFiles = fs.readdirSync(root, {
    withFileTypes: true
  }).filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const retiredRootFiles = [
    "characterCreator.js",
    "characterSheet.js",
    "monsterCreator.js",
    "tokens.js",
    "realtimeListeners.js",
    "securityPersistence.js",
    "ruleset2014.js",
    "RULESET_POLICY.md",
    "style.css"
  ];

  retiredRootFiles.forEach((fileName) => {
    assert.equal(rootFiles.includes(fileName), false, fileName);
  });
  assert.equal(
    rootFiles.some((fileName) => /^PHASE(?:_AUDIT|\d)/.test(fileName)),
    false
  );
  assert.deepEqual(
    rootFiles.filter((fileName) => /^default.*\.js$/i.test(fileName)),
    []
  );
});

test("runtime areas, data, assets, tests, and documentation have explicit homes", () => {
  [
    "assets/styles/app.css",
    "battleMap/castingSession.js",
    "battleMap/elevation.js",
    "battleMap/measurement.js",
    "battleMap/spellTemplates.js",
    "battleMap/templateGeometry.js",
    "battleMap/templateRenderer.js",
    "battleMap/tokenCollision.js",
    "characterCreator/index.js",
    "characterSheet/index.js",
    "data/defaultClasses.js",
    "data/defaultSpells.js",
    "data/ruleset2014.js",
    "docs/architecture/REPOSITORY_STRUCTURE.md",
    "docs/development-history/PHASE_AUDIT.md",
    "docs/rules/RULESET_POLICY.md",
    "monsters/creator.js",
    "shared/realtimeListeners.js",
    "shared/securityPersistence.js",
    "tokens/index.js",
    "vfx/castEvent.js",
    "vfx/castingSequence.js",
    "vfx/damageTypes/elemental.js",
    "vfx/damageTypes/index.js",
    "vfx/damageTypes/mystic.js",
    "vfx/damageTypes/physical.js",
    "vfx/damageTypes/registry.js",
    "vfx/effectEngine.js",
    "vfx/effectRegistry.js",
    "vfx/effectRenderer.js",
    "vfx/fireEffects.js",
    "vfx/particles.js",
    "vfx/persistentEffects.js",
    "vfx/spriteAnimator.js"
  ].forEach((relativePath) => {
    assert.equal(
      fs.existsSync(path.join(root, relativePath)),
      true,
      relativePath
    );
  });
});

test("the application and import map use the organized runtime paths", () => {
  const app = read("app.js");
  const index = read("index.html");

  [
    "./characterCreator/index.js",
    "./battleMap/castingSession.js",
    "./battleMap/elevation.js",
    "./battleMap/spellTemplates.js",
    "./battleMap/templateGeometry.js",
    "./battleMap/templateRenderer.js",
    "./battleMap/tokenCollision.js",
    "./monsters/creator.js",
    "./shared/realtimeListeners.js",
    "./shared/securityPersistence.js",
    "./tokens/index.js",
    "./vfx/castEvent.js",
    "./vfx/castingSequence.js",
    "./vfx/effectEngine.js"
  ].forEach((specifier) => {
    assert.match(`${app}\n${index}`, new RegExp(
      specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ));
  });
  assert.match(
    index,
/\.\/assets\/styles\/app\.css\?v=lightning5-test-20260830/
  );
  assert.doesNotMatch(
    `${app}\n${index}`,
    /["']\.\/(?:characterCreator|characterSheet|monsterCreator|tokens)\.js(?:\?|["'])/
  );
});

test("the Pages build includes runtime folders but excludes development folders", () => {
  const build = read("scripts/build-pages.mjs");

  [
    "tests/browser-pages",
    "assets",
    "battleMap",
    "characterCreator",
    "characterSheet",
    "data",
    "monsters",
    "shared",
    "tokens",
    "vfx"
  ].forEach((directory) => {
    assert.match(build, new RegExp(`"${directory}"`));
  });
  assert.doesNotMatch(build, /"(?:docs|node_modules|tests)"/);
});

