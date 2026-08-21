import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDerivedSignature,
  createScopedDerivedCache,
  getDerivedObjectIdentity
} from "../characterCreator/derivedCache.js";
import {
  calculateAbilityModifier,
  calculateCharacterCarryingCapacity,
  calculateProficiencyBonus,
  getRulesMathCacheMetrics
} from "../characterCreator/rulesMath.js";
import {
  buildClassLevelOrder,
  calculateClassProgressionLevel,
  getClassProgressionCacheMetrics
} from "../characterCreator/classProgression.js";
import {
  getClassFeatureCacheMetrics,
  getClassFeaturesThroughLevel
} from "../characterCreator/classMechanics.js";
import {
  buildSpellLibraryFromSources,
  getSpellSourceCacheMetrics
} from "../characterCreator/spellSources.js";

const cache = createScopedDerivedCache({
  maximumEntriesPerScope: 2
});
let calculations = 0;

const first = cache.get(
  "inventory",
  "weight:10",
  () => {
    calculations += 1;
    return { weight: 10 };
  }
);
const second = cache.get(
  "inventory",
  "weight:10",
  () => {
    calculations += 1;
    return { weight: 999 };
  }
);

assert.strictEqual(second, first);
assert.equal(calculations, 1);
assert.equal(cache.getMetrics().scopes.inventory.hits, 1);

cache.get("inventory", "weight:11", () => ({ weight: 11 }));
cache.get("inventory", "weight:12", () => ({ weight: 12 }));
assert.equal(cache.getMetrics().scopes.inventory.evictions, 1);

assert.equal(
  createDerivedSignature({ b: 2, a: 1 }),
  createDerivedSignature({ a: 1, b: 2 })
);
assert.notEqual(
  createDerivedSignature({ a: 1 }),
  createDerivedSignature({ a: 2 })
);

const identityRecord = {};
assert.equal(
  getDerivedObjectIdentity(identityRecord),
  getDerivedObjectIdentity(identityRecord)
);
assert.notEqual(
  getDerivedObjectIdentity(identityRecord),
  getDerivedObjectIdentity({})
);

const rulesBefore = getRulesMathCacheMetrics();
assert.equal(calculateAbilityModifier(18), 4);
assert.equal(calculateAbilityModifier(18), 4);
assert.equal(calculateProficiencyBonus(9), 4);
assert.equal(calculateProficiencyBonus(9), 4);
const rulesAfter = getRulesMathCacheMetrics();
assert.ok(
  rulesAfter.hits >= rulesBefore.hits + 2,
  "ability modifiers and proficiency bonuses should hit their caches"
);

const character = {
  name: "Cache Test",
  abilities: { scores: { str: 12 } },
  identity: { size: "medium" },
  mechanics: [],
  classMechanics: {},
  featMechanics: {},
  features: [],
  feats: [],
  species: {}
};
const carryingBefore = getRulesMathCacheMetrics();
const carryingOne = calculateCharacterCarryingCapacity(character);
character.name = "Unrelated rename";
const carryingTwo = calculateCharacterCarryingCapacity(character);
const carryingAfterRename = getRulesMathCacheMetrics();

assert.strictEqual(carryingTwo, carryingOne);
assert.equal(carryingOne.carryingCapacity, 180);
assert.equal(
  carryingAfterRename.hits,
  carryingBefore.hits + 1,
  "unrelated character fields should not invalidate carrying capacity"
);

character.abilities.scores.str = 20;
const carryingThree = calculateCharacterCarryingCapacity(character);
assert.equal(carryingThree.carryingCapacity, 300);
assert.notStrictEqual(carryingThree, carryingOne);

const classes = [
  { entryId: "fighter", level: 3, name: "Fighter" },
  { entryId: "wizard", level: 2, name: "Wizard" }
];
const progressionBefore = getClassProgressionCacheMetrics();
assert.equal(calculateClassProgressionLevel(classes), 5);
const orderOne = buildClassLevelOrder(classes);
classes[0].name = "Renamed Fighter";
assert.equal(calculateClassProgressionLevel(classes), 5);
const orderTwo = buildClassLevelOrder(classes);
const progressionAfter = getClassProgressionCacheMetrics();

assert.strictEqual(orderTwo, orderOne);
assert.ok(progressionAfter.hits >= progressionBefore.hits + 2);

classes[1].level = 3;
assert.equal(calculateClassProgressionLevel(classes), 6);
assert.notStrictEqual(buildClassLevelOrder(classes), orderOne);

const featuresByLevel = {
  1: [{ id: "one", name: "First" }],
  3: [{ id: "three", name: "Third" }]
};
let normalizationCalls = 0;
const normalizeFeature = (feature, level) => {
  normalizationCalls += 1;
  return { ...feature, level };
};
const featureMetricsBefore = getClassFeatureCacheMetrics();
const featuresOne = getClassFeaturesThroughLevel(
  featuresByLevel,
  3,
  normalizeFeature
);
const featuresTwo = getClassFeaturesThroughLevel(
  featuresByLevel,
  3,
  normalizeFeature
);
const featureMetricsAfter = getClassFeatureCacheMetrics();

assert.deepEqual(featuresTwo, featuresOne);
assert.equal(normalizationCalls, 4);
assert.equal(
  featureMetricsAfter.hits,
  featureMetricsBefore.hits + 1
);

const spellSources = [{
  sourceId: "class:wizard",
  sourceType: "class",
  sourceName: "Wizard",
  selectedSpellIds: ["magic-missile"],
  spellRecords: [{
    id: "magic-missile",
    name: "Magic Missile"
  }]
}];
const sourceMetricsBefore = getSpellSourceCacheMetrics();
const libraryOne = buildSpellLibraryFromSources(spellSources);
const libraryTwo = buildSpellLibraryFromSources(spellSources);
const sourceMetricsAfter = getSpellSourceCacheMetrics();

assert.strictEqual(libraryTwo, libraryOne);
assert.equal(
  sourceMetricsAfter.hits,
  sourceMetricsBefore.hits + 1
);

spellSources[0].selectedSpellIds.push("shield");
const libraryThree = buildSpellLibraryFromSources(spellSources);
assert.notStrictEqual(libraryThree, libraryOne);
assert.equal(libraryThree.length, 2);

const testDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);
const creatorSource = fs.readFileSync(
  path.join(
    testDirectory,
    "..",
    "characterCreator.fixed.js"
  ),
  "utf8"
);
[
  "ability-modifier",
  "proficiency-bonus",
  "class-progression-level",
  "unlocked-class-features",
  "selected-feat-instances",
  "feat-prerequisite",
  "spellcasting-progression",
  "spellcasting-summary",
  "spell-eligibility",
  "inventory-weight",
  "container-summaries",
  "character-hit-dice",
  "character-hp",
  "saving-throws",
  "passive-scores",
  "initiative",
  "armor-class-options",
  "weapon-attacks"
].forEach((scope) => {
  assert.match(
    creatorSource,
    new RegExp(`derivedCache\\.get\\(\\s*"${scope}"`),
    `${scope} should be cached in the Character Creator`
  );
});

console.log(
  "Scoped derived calculation cache contracts passed."
);
