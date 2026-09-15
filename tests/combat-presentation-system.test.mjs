import assert from "node:assert/strict";
import {
  attachCombatAnimation,
  buildPresentationPath,
  createCombatPresentationSystem,
  inferCombatAnimationFamily,
  normalizeCombatAnimationAttachment,
  normalizeEffectDuration
} from "../vfx/combatPresentationSystem.js";
import { createCombatEffectLifecycle } from "../vfx/combatEffectLifecycle.js";
import { createTokenAutomation } from "../vfx/tokenAutomation.js";
import { collectCharacterActions } from "../characterSheet/index.js";
import { normalizeMonsterRecord } from "../monsters/creator.js";
import { createAnimationLibrary } from "../vfx/animationLibrary.js";
import { createRoomAnimationPersistence } from "../vfx/roomAnimationPersistence.js";
import { readFileSync } from "node:fs";

const reference = (animationId) => ({
  animationId,
  overrides: {},
  trigger: "afterPrevious",
  delay: 0,
  waitForCompletion: true
});

assert.deepEqual(
  Object.keys(normalizeCombatAnimationAttachment({
    family: "ranged",
    stages: {
      prepare: "draw",
      projectile: "arrow",
      impact: "hit"
    }
  }).stages),
  ["cast", "travel", "impact"],
  "attack stage names map to the shared sequence stages"
);
assert.equal(inferCombatAnimationFamily({ name: "Longbow", range: "150/600 ft." }), "ranged");
assert.equal(inferCombatAnimationFamily({ name: "Dragon Breath" }), "magic");
assert.deepEqual(normalizeEffectDuration("Concentration, up to 1 minute"), {
  unit: "minutes",
  value: 1,
  concentration: true
});

const unnamedLayers = {
  family: "magic",
  stages: { impact: "hit" },
  layers: [{ stages: { impact: "glow" } }]
};
assert.equal(
  normalizeCombatAnimationAttachment(unnamedLayers).layers[0].id,
  normalizeCombatAnimationAttachment(unnamedLayers).layers[0].id,
  "generated layer IDs are deterministic"
);

const item = { name: "Potion of Sparks", actionType: "action" };
attachCombatAnimation(item, {
  family: "magic",
  stages: { impact: "spark" },
  automation: { summon: { name: "Spark" } }
});
assert.equal(item.animation.family, "magic", "generic content owns its attachment");

const curve = buildPresentationPath(
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { kind: "curve", samples: 6, curvature: 0.5 }
);
assert.equal(curve.length, 6);
assert.equal(Math.round(curve.at(-1).x), 100);
assert.notEqual(Math.round(curve[2].y), 0, "curve creates a non-linear path");
const orbit = buildPresentationPath(
  { x: 0, y: 0 },
  { x: 50, y: 50 },
  { kind: "orbit", samples: 8, radius: 20 }
);
assert.equal(orbit.length, 8);

const played = [];
const fakePlayer = {
  prepareAnimation: async () => true,
  async playAnimation(animationId, options) {
    played.push({
      animationId,
      target: options.target,
      projectile: options.projectile,
      placement: options.placement
    });
    options.onEvent?.({
      type: animationId === "hit" ? "impact" : "frame",
      frame: 0
    });
    return {
      ok: true,
      cancel() {},
      pause() {},
      resume() {},
      finished: Promise.resolve("completed"),
      arrived: Promise.resolve("arrived"),
      impacted: Promise.resolve("impact"),
      instances: []
    };
  }
};
const available = new Set(["draw", "arrow", "hit", "glow"]);
let commits = 0;
let cameraCalls = 0;
const presentation = createCombatPresentationSystem({
  player: fakePlayer,
  library: { getAnimation: (id) => available.has(id) ? { id } : null },
  onCamera: () => { cameraCalls += 1; }
});
const multi = await presentation.play({
  content: {
    name: "Volley",
    animation: {
      family: "ranged",
      stages: { prepare: "draw", projectile: "arrow", impact: "hit" },
      targetMode: "all",
      layers: [{ id: "glow", stages: { impact: "glow" } }],
      camera: { shake: 0.3, zoom: 1.05 }
    }
  },
  source: { id: "archer", x: 0, y: 0 },
  targets: [
    { id: "a", x: 10, y: 10 },
    { id: "b", x: 20, y: 20 }
  ],
  targetMode: "all",
  commit: () => { commits += 1; }
});
await multi.committed;
await multi.finished;
assert.equal(commits, 1, "gameplay callback commits once at presentation impact");
assert.equal(played.filter((entry) => entry.animationId === "arrow").length, 2, "projectiles render to every target");
assert.equal(played.filter((entry) => entry.animationId === "glow").length, 2, "layers render for every target");
assert.ok(cameraCalls >= 1, "camera presentation callback is independent of gameplay");

const curved = await presentation.play({
  animation: {
    family: "ranged",
    stages: { projectile: "arrow" },
    motion: { kind: "curve", curvature: 0.5 }
  },
  source: { id: "archer", x: 0, y: 0 },
  target: { id: "c", x: 30, y: 20 }
});
await curved.finished;
assert.equal(
  played.findLast((entry) => entry.animationId === "arrow").projectile.arcHeight,
  120,
  "curved paths become runtime projectile arcs"
);
const following = await presentation.play({
  animation: {
    family: "ranged",
    stages: { projectile: "arrow" },
    motion: { kind: "follow" }
  },
  source: { id: "archer", x: 0, y: 0 },
  target: { id: "moving", x: 30, y: 20 }
});
await following.finished;
assert.equal(
  played.findLast((entry) => entry.animationId === "arrow").placement.followTarget,
  true,
  "follow paths resample the moving target"
);

let endCount = 0;
const lifecycle = createCombatEffectLifecycle({ idFactory: () => "effect-1" });
lifecycle.startEffect({
  controller: { end: () => { endCount += 1; } },
  duration: { unit: "rounds", value: 2 },
  worldTime: 100,
  initiative: { combatActive: true, roundNumber: 3, currentTurnIndex: 0, initiativeOrder: [{ tokenId: "a" }] },
  sourceTokenId: "a"
});
assert.equal(lifecycle.reconcile({
  worldTime: 112,
  initiative: { combatActive: true, roundNumber: 4, currentTurnIndex: 0, initiativeOrder: [{ tokenId: "a" }] },
  tokenIds: ["a"]
}).length, 0);
assert.equal(lifecycle.reconcile({
  worldTime: 118,
  initiative: { combatActive: true, roundNumber: 5, currentTurnIndex: 0, initiativeOrder: [{ tokenId: "a" }] },
  tokenIds: ["a"]
})[0].reason, "rounds-ended");
assert.equal(endCount, 1, "duration expiry triggers the End stage controller");

lifecycle.startEffect({
  id: "concentration",
  controller: { end: () => { endCount += 1; } },
  duration: { unit: "manual", concentration: true },
  concentrationKey: "hero:bless",
  sourceTokenId: "a"
});
assert.equal(lifecycle.reconcile({
  concentrationKeys: new Set(),
  tokenIds: ["a"]
})[0].reason, "concentration-ended");

lifecycle.startEffect({
  id: "other-caster",
  controller: { end: () => { endCount += 1; } },
  duration: { unit: "manual", concentration: true },
  concentrationKey: "wizard-2:haste",
  sourceTokenId: "b"
});
assert.equal(lifecycle.reconcile({
  concentrationByActor: { "wizard-1": "" },
  tokenIds: ["a", "b"]
}).length, 0, "a partial character update does not end another actor's concentration");

lifecycle.startEffect({
  id: "other-status",
  controller: { end: () => { endCount += 1; } },
  duration: { unit: "manual", status: "poisoned" },
  targetTokenIds: ["b"]
});
assert.equal(lifecycle.reconcile({
  statusesByTokenId: { a: [] },
  tokenIds: ["a", "b"]
}).length, 0, "an unrelated status update does not end another token's effect");

const commands = [];
const automation = createTokenAutomation({
  canMutate: () => true,
  createToken: async (command) => commands.push(command),
  updateToken: async (_id, command) => commands.push(command)
});
const automationResults = await automation.execute({
  summon: { name: "Wolf", imageUrl: "https://example.test/wolf.png" },
  transform: { tokenId: "hero", name: "Dire Wolf" }
}, { target: { id: "space", x: 25, y: 40 } });
assert.equal(automationResults.length, 2);
assert.deepEqual(commands.map((command) => command.type), ["summon-token", "transform-token"]);

const character = {
  equipment: {
    items: [{
      id: "longbow",
      name: "Longbow",
      equipped: true,
      category: "weapon",
      damage: "1d8",
      range: "150/600 ft.",
      animation: { family: "ranged", stages: { projectile: "arrow" } }
    }]
  },
  features: {
    customFeatures: [{
      id: "battle-cry",
      name: "Battle Cry",
      actionType: "bonus action",
      animation: { family: "magic", stages: { impact: "glow" } }
    }]
  },
  classMechanics: {
    resources: [{
      id: "ki",
      name: "Focus Points",
      spendOptions: [{ id: "flurry", name: "Flurry", actionType: "bonus action" }]
    }]
  }
};
const actions = collectCharacterActions(character, 2);
const longbow = actions.find((action) => action.name === "Longbow");
const battleCry = actions.find((action) => action.name === "Battle Cry");
assert.deepEqual(longbow.sourcePaths[0], ["equipment", "items", 0]);
assert.equal(longbow.animation.family, "ranged");
assert.deepEqual(battleCry.sourcePaths[0], ["features", "customFeatures", 0]);
assert.deepEqual(
  actions.find((action) => action.name === "Flurry").sourcePaths[0],
  ["classMechanics", "resources", 0, "spendOptions", 0]
);

const monster = normalizeMonsterRecord({
  name: "Dragon",
  actions: ["Bite | Melee Weapon Attack"],
  actionAnimations: {
    "actions:bite": { animation: { family: "melee", stages: { attack: "hit" } } }
  }
});
assert.equal(monster.actionAnimations["actions:bite"].animation.family, "melee");

const roomLibrary = createAnimationLibrary();
roomLibrary.setContext({ ownerId: "dm-1", roomId: "ROOM-1" });
const personalAnimation = roomLibrary.registerAnimation({
  id: "dragon-breath",
  name: "Dragon Breath 01",
  sprite: "https://example.test/dragon.png",
  grid: { columns: 1, rows: 1 },
  frameCount: 1,
  ownership: { kind: "user", scope: "user", ownerId: "dm-1" }
});
const roomWrites = [];
const roomStore = createRoomAnimationPersistence({
  library: roomLibrary,
  db: {},
  collection: (...parts) => parts,
  doc: (...parts) => parts,
  getDocs: async () => ({ docs: [] }),
  setDoc: async (path, value) => roomWrites.push({ path, value }),
  deleteDoc: async () => true,
  serverTimestamp: () => "server-time",
  getUserId: () => "dm-1",
  getRoomId: () => "ROOM-1",
  getIsDm: () => true
});
const shared = await roomStore.shareAnimationWithRoom(personalAnimation.id);
assert.equal(shared.definition.ownership.scope, "room");
assert.deepEqual(roomWrites[0].path.slice(-4), ["rooms", "ROOM-1", "animations", "room_dragon-breath"]);
assert.equal(roomWrites[0].value.roomCode, "ROOM-1");

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
assert.match(rules, /match \/animations\/\{animationId\}/);
assert.match(rules, /ownership'.*scope|ownership.*scope/s);

console.log("Combat presentation system tests passed.");
