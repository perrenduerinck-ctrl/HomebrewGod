import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUILDER_STEPS,
  clampStepIndex,
  getExactBuilderStepById,
  getStepById,
  getStepIndex
} from "../characterCreator/configuration.js";
import {
  calculateAbilityModifier,
  calculateAbilityModifiers,
  calculateProficiencyBonus,
  calculateRuleManualHp,
  calculateRuleRolledHp,
  calculateRuleSavingThrowModifier,
  deriveAbilityBaseFromFinalScores
} from "../characterCreator/rulesMath.js";

const testDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);
const root = path.join(
  testDirectory,
  ".."
);

function readSource(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

test("builder configuration is independent from the creator controller", () => {
  assert.deepEqual(
    BUILDER_STEPS.map((step) => step.id),
    [
      "basics",
      "class",
      "background",
      "species",
      "abilities",
      "equipment",
      "spells",
      "review",
      "save"
    ]
  );
  assert.equal(getStepById("missing").id, "basics");
  assert.equal(getExactBuilderStepById("missing"), null);
  assert.equal(getStepIndex("spells"), 6);
  assert.equal(clampStepIndex(Infinity), 0);
  assert.equal(clampStepIndex(999), 8);
});

test("standalone character calculations live in the rules module", () => {
  assert.equal(calculateAbilityModifier(18), 4);
  assert.deepEqual(
    calculateAbilityModifiers({
      str: 18,
      dex: 9
    }),
    {
      str: 4,
      dex: -1,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0
    }
  );
  assert.deepEqual(
    deriveAbilityBaseFromFinalScores(
      { str: 18, dex: 11 },
      { str: 2, dex: 1 }
    ),
    {
      str: 16,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    }
  );
  assert.equal(calculateProficiencyBonus(9), 4);
  assert.equal(
    calculateRuleSavingThrowModifier({
      abilityModifier: 3,
      proficiencyBonus: 2,
      proficient: true,
      bonus: 1
    }),
    6
  );
  assert.equal(
    calculateRuleRolledHp({
      hitDie: "d8",
      level: 3,
      constitutionModifier: 2,
      rolls: [8, 1]
    }),
    23
  );
  assert.equal(
    calculateRuleManualHp({
      manualOverride: 0
    }),
    1
  );
});

test("characterCreator.js remains the browser-facing coordinator", () => {
  const creator = readSource(
    "characterCreator.js"
  );
  const app = readSource("app.js");
  const index = readSource("index.html");

  assert.equal(
    fs.existsSync(
      path.join(root, "characterCreator.fixed.js")
    ),
    false
  );
  assert.match(
    creator,
    /from "\.\/characterCreator\/configuration\.js"/
  );
  assert.match(
    creator,
    /from "\.\/characterCreator\/realtimePersistence\.js"/
  );
  assert.match(
    creator,
    /from "\.\/characterCreator\/catalogs\.js"/
  );
  assert.match(
    creator,
    /from "\.\/characterCreator\/rendering\.js"/
  );
  [
    "basics",
    "class",
    "background",
    "species",
    "abilities",
    "equipment",
    "spells",
    "review",
    "finish"
  ].forEach((stepName) => {
    assert.match(
      creator,
      new RegExp(
        `characterCreator/steps/${stepName}Step\\.js`
      )
    );
  });
  assert.doesNotMatch(
    creator,
    /const BUILDER_STEPS\s*=/
  );
  assert.doesNotMatch(
    creator,
    /deps\.onSnapshot\s*\(/
  );
  [
    "connectSection19Backgrounds",
    "connectSection19Characters",
    "connectSection19Classes",
    "connectSection19Listener",
    "connectSection19Species",
    "getSection19RoomCollection",
    "readSection19SnapshotRecords",
    "stopSection19Listener"
  ].forEach((removedHelper) => {
    assert.doesNotMatch(
      creator,
      new RegExp(`\\b${removedHelper}\\b`)
    );
  });
  assert.doesNotMatch(
    creator,
    /function calculateRule(?:ManualHp|RolledHp|SavingThrowModifier)/
  );
  assert.doesNotMatch(
    creator,
    /function calculateAbilityModifier/
  );
  assert.match(
    app,
    /import\(\s*"\.\/characterCreator\.js"\s*\)/
  );
  assert.match(
    index,
    /"\.\/characterCreator\.js": "\.\/characterCreator\.js\?v=priority8-20260821"/
  );
});
