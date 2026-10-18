import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildActionTooltip,
  getActionAvailability,
  resolveActionIcon,
  validateCustomActionIcon
} from "../combat/actionIconRegistry.js";
import { buildTokenContextActions } from "../tokens/tokenContextMenu.js";
import {
  DEFAULT_CONNECTION_INTERACTION_FEET,
  getFloorConnectionIcon,
  measureConnectionDistanceFeet,
  validateFloorConnectionUse
} from "../battleMap/floorConnectionMarkers.js";
import {
  formatCombatOutcome,
  normalizeVerifiedCombatOutcome
} from "../combat/combatFeedback.js";

test("hotbar icons are recognizable, deterministic and reject executable custom images", () => {
  assert.equal(resolveActionIcon({ kind: "universal", id: "dash", name: "Dash" }).value, "➠");
  assert.equal(resolveActionIcon({ kind: "spell", name: "Fireball", raw: { school: "evocation", damageType: "fire" } }).value, "✹");
  assert.equal(resolveActionIcon({ kind: "weapon", name: "Longbow", raw: {} }).value, "➶");
  assert.equal(resolveActionIcon({ kind: "item", name: "Potion of Healing", raw: {} }).value, "✚");
  assert.equal(resolveActionIcon({ kind: "homebrew", name: "Unknown Art" }).value, "◆");
  assert.equal(validateCustomActionIcon("javascript:alert(1)"), "");
  assert.equal(validateCustomActionIcon("https://example.com/icon.svg"), "");
  assert.match(validateCustomActionIcon("https://example.com/icon.webp"), /^https:/);
});

test("hotbar availability and tooltips explain turns, spent resources and spell slots", () => {
  const action = { kind: "spell", name: "Shield", resource: "reaction", raw: { level: 1, range: "Self" } };
  assert.equal(getActionAvailability({ action, controlled: false }).reason, "You do not control this token.");
  assert.equal(getActionAvailability({ action, turnUsable: false }).state, "outside-turn");
  assert.equal(getActionAvailability({ action, resourceAvailable: false }).state, "expended");
  const noSlot = getActionAvailability({ action, spellSlotOptions: [{ remaining: 0 }] });
  assert.equal(noSlot.state, "needs-slot");
  assert.match(buildActionTooltip(action, { availability: noSlot, costLabel: "Reaction" }), /No eligible spell slot/);
  assert.match(buildActionTooltip(action, { availability: noSlot, costLabel: "Reaction" }), /Range: Self/);
});

test("token context actions remain permission and token-type aware", () => {
  const player = buildTokenContextActions({
    token: { id: "hero", linkedCharacterId: "character-1", elevation: 20 },
    canControl: true,
    combatActive: true,
    isCurrentTurn: false
  });
  assert.ok(player.some((entry) => entry.id === "open-character"));
  assert.ok(player.some((entry) => entry.id === "spells"));
  assert.equal(player.find((entry) => entry.id === "move").enabled, false);
  assert.ok(!player.some((entry) => entry.id === "adjust-hp"));

  const monsterDm = buildTokenContextActions({
    token: { id: "goblin", linkedMonsterId: "monster-1" },
    isDm: true,
    canControl: true,
    combatActive: true,
    isCurrentTurn: false
  });
  assert.ok(monsterDm.some((entry) => entry.id === "open-monster"));
  assert.ok(monsterDm.some((entry) => entry.id === "adjust-hp"));
  assert.equal(monsterDm.find((entry) => entry.id === "move").enabled, true);

  const generic = buildTokenContextActions({ token: { id: "crate" } });
  assert.ok(!generic.some((entry) => ["open-character", "open-monster", "spells"].includes(entry.id)));
  assert.ok(!generic.some((entry) => entry.id === "stats"));
});

test("floor markers cover all connection types and use elevation-aware proximity", () => {
  for (const type of ["stairs", "ladder", "trapdoor", "portal", "elevator", "custom"]) {
    assert.ok(getFloorConnectionIcon(type));
  }
  assert.equal(measureConnectionDistanceFeet(
    { x: 50, y: 50, elevation: 0 },
    { x: 60, y: 50 },
    { viewportWidth: 640, viewportHeight: 640, pixelsPerSquare: 64, feetPerSquare: 5, floorElevation: 0 }
  ), 5);
  assert.equal(measureConnectionDistanceFeet(
    { x: 50, y: 50, elevation: 10 },
    { x: 50, y: 50 },
    { viewportWidth: 640, viewportHeight: 640, pixelsPerSquare: 64, feetPerSquare: 5, floorElevation: 0 }
  ), 10);
});

test("floor connection validation blocks distance, ownership, disabled, one-way and combat bypasses", () => {
  const connection = {
    id: "stairs-1",
    enabled: true,
    allowPlayers: true,
    bidirectional: false,
    source: { floorId: "ground", x: 50, y: 50 },
    destination: { floorId: "upper", x: 50, y: 50 }
  };
  const token = { id: "hero", sceneId: "keep", floorId: "ground" };
  const base = { connection, token, sceneId: "keep", floorId: "ground", canControl: true, distanceFeet: 5 };
  assert.equal(validateFloorConnectionUse(base).ok, true);
  assert.match(validateFloorConnectionUse({ ...base, distanceFeet: DEFAULT_CONNECTION_INTERACTION_FEET + 1 }).reason, /Move within/);
  assert.match(validateFloorConnectionUse({ ...base, canControl: false }).reason, /do not control/);
  assert.match(validateFloorConnectionUse({ ...base, combatActive: true }).reason, /initiative/);
  assert.match(validateFloorConnectionUse({ ...base, connection: { ...connection, enabled: false } }).reason, /disabled/);
  assert.match(validateFloorConnectionUse({ ...base, floorId: "upper", token: { ...token, floorId: "upper" } }).reason, /direction/);
  assert.equal(validateFloorConnectionUse({ ...base, isDm: true, distanceFeet: 999, combatActive: true }).ok, true);
});

test("combat feedback accepts only verified outcomes and never fabricates roll fields", () => {
  assert.equal(normalizeVerifiedCombatOutcome({ id: "fake", type: "damage", amount: 12 }), null);
  const outcome = normalizeVerifiedCombatOutcome({
    id: "confirmed-1",
    verified: true,
    type: "damage",
    amount: 12,
    actorName: "Vex",
    targetName: "Goblin"
  });
  assert.equal(outcome.amount, 12);
  assert.equal(outcome.roll, null);
  assert.equal(formatCombatOutcome(outcome), "Vex confirmed 12 damage to Goblin.");
  const rolled = normalizeVerifiedCombatOutcome({
    id: "confirmed-2",
    authoritative: true,
    type: "miss",
    roll: { die: "d20", rolled: 4, modifier: 7, total: 11 }
  });
  assert.equal(rolled.roll.total, 11);
});

test("game-feel modules are integrated without new Firestore collections or rules", async () => {
  const [app, html, rules] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8")
  ]);
  assert.match(app, /createTokenContextMenu/);
  assert.match(app, /createFloorConnectionMarkers/);
  assert.match(app, /createCombatFeedback/);
  assert.match(app, /floorSystem\.useConnection/);
  assert.match(app, /const battleGameFeelTestMode = startupParams\.has\("battleGameFeelTest"\)/);
  assert.doesNotMatch(app, /__HOMEBREW_GOD_SMOKE__\s*&&\s*battleGameFeelTestMode/);
  assert.match(app, /!\(battleGameFeelTestMode && screenName === "battle"\)/);
  assert.match(app, /preserveTokenTestState:\s*battleGameFeelTestMode && screenName === "battle"/);
  assert.match(app, /if \(battleGameFeelTestMode && !roomCode\)[\s\S]{0,180}kind: "generic"/);
  assert.match(app, /let releaseBattleGameFeelRoomCode = ""/);
  assert.doesNotMatch(app, /setBattleGameFeelTestContext:[\s\S]{0,450}currentRoomCode\s*=/);
  assert.match(app, /setBattleGameFeelTestContext:[\s\S]{0,450}await ensureCombatActionBar\(\)/);
  assert.match(html, /combatFeedback\.css/);
  assert.match(html, /app\.js\?v=battle-game-feel-20261018/);
  assert.doesNotMatch(rules, /combatFeedback|combatLog|actionHistory/);
});

