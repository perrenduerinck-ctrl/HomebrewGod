import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { validateFloorConnectionDraft } from "../battleMap/floorConnectionEditor.js";
import { measureConnectionDistanceFeet } from "../battleMap/floorConnectionMarkers.js";
import { formatCombatOutcome, normalizeVerifiedCombatOutcome } from "../combat/combatFeedback.js";
import { formatVisibleTokenStats, getTokenStatVisibility } from "../tokens/tokenContextMenu.js";
import { validateTokenEditorDraft } from "../tokens/tokenEditor.js";
import { getLinkedTokenRecordId, requireLinkedTokenRecord } from "../tokens/linkedRecord.js";
import {
  normalizeTokenPrivacy,
  tokenCollectionForRecord,
  tokenIsDmOnly
} from "../tokens/tokenPrivacy.js";

const floors = [{ id: "ground", name: "Ground" }, { id: "upper", name: "Upper" }];
const connection = {
  id: "stairs",
  name: "Main Stairs",
  type: "stairs",
  source: { floorId: "ground", x: 0, y: 25 },
  destination: { floorId: "upper", x: 75, y: 100 },
  movementCost: 0,
  bidirectional: true,
  allowPlayers: true,
  enabled: true,
  hidden: false
};

test("floor connection validation preserves exact zero coordinates and accepts a complete atomic draft", () => {
  const result = validateFloorConnectionDraft(connection, { floors });
  assert.equal(result.source.x, 0);
  assert.equal(result.destination.y, 100);
  assert.equal(result.movementCost, 0);
  assert.equal(result.type, "stairs");
});

test("floor connection validation rejects every malformed field instead of coercing or partially saving", () => {
  for (const [patch, message] of [
    [{ type: "teleporter" }, /valid connection type/i],
    [{ movementCost: "costly" }, /movement cost must be a number/i],
    [{ movementCost: -1 }, /movement cost must be between/i],
    [{ source: { ...connection.source, x: "" } }, /source x is required/i],
    [{ source: { ...connection.source, y: "nope" } }, /source y must be a number/i],
    [{ destination: { ...connection.destination, x: -0.1 } }, /destination x must be between/i],
    [{ destination: { ...connection.destination, y: 100.1 } }, /destination y must be between/i],
    [{ destination: { ...connection.destination, floorId: "ground" } }, /must be different/i]
  ]) {
    assert.throws(() => validateFloorConnectionDraft({ ...connection, ...patch }, { floors }), message);
  }
});

test("HP and AC visibility are independent for non-owners while owners and DMs retain details", () => {
  const token = { currentHp: 8, maxHp: 20, armorClass: 17, display: { hpText: true, ac: false } };
  assert.deepEqual(getTokenStatVisibility({ token }), { hp: true, ac: false, authorized: false });
  assert.equal(formatVisibleTokenStats({ token }).text, "HP 8/20");
  const acOnly = { ...token, display: { hpText: false, ac: true } };
  assert.equal(formatVisibleTokenStats({ token: acOnly }).text, "AC 17");
  assert.deepEqual(formatVisibleTokenStats({ token: { ...token, display: {} } }).parts, []);
  assert.equal(formatVisibleTokenStats({ token: { ...token, display: {} }, canControl: true }).text, "HP 8/20 · AC 17");
});

test("manual HP edits remain verified adjustments and never become damage or healing", () => {
  const outcome = normalizeVerifiedCombatOutcome({
    id: "manual-1", verified: true, type: "manual-adjustment", actorName: "DM",
    targetName: "Goblin", previousHp: 30, nextHp: 15, amount: 15
  });
  assert.equal(outcome.type, "manual-adjustment");
  assert.equal(formatCombatOutcome(outcome), "DM adjusted Goblin HP from 30 to 15.");
  assert.equal(outcome.roll, null);
});

test("token editor validates supported fields without replacing unrelated token data", () => {
  const patch = validateTokenEditorDraft({
    name: "Goblin Scout", imageUrl: "https://example.test/goblin.webp", type: "enemy", sizeCategory: "small",
    currentHp: 7, maxHp: 7, armorClass: 15, movementSpeed: 30, elevation: -10,
    display: { name: true, hpBar: true, hpText: false, ac: true, conditions: true, initiative: false }
  });
  assert.equal(patch.elevation, -10);
  assert.equal(patch.display.hpText, false);
  assert.equal(patch.visibility, "shared");
  assert.equal(patch.vision.distance, 30);
  assert.equal(patch.vision.darkvision, 0);
  assert.equal(Object.hasOwn(patch, "linkedMonsterId"), false);
  const darkvisionPatch = validateTokenEditorDraft({
    ...patch,
    visionDistance: 20,
    darkvision: 120,
    brightLight: 10,
    dimLight: 20
  });
  assert.deepEqual(darkvisionPatch.vision, {
    distance: 20,
    darkvision: 120,
    brightLight: 10,
    dimLight: 20
  });
  assert.equal(validateTokenEditorDraft({ ...patch, visibility: "dm" }).visibility, "dm");
  assert.throws(() => validateTokenEditorDraft({ ...patch, imageUrl: "javascript:alert(1)" }), /HTTPS URL/i);
});

test("linked token records resolve the exact character or monster and reject missing or mismatched data", () => {
  assert.equal(getLinkedTokenRecordId({ linkedCharacterId: "vex-quickstep" }, "character"), "vex-quickstep");
  assert.equal(getLinkedTokenRecordId({ linkedMonsterId: "goblin-boss" }, "monster"), "goblin-boss");
  assert.equal(getLinkedTokenRecordId({ sheetId: "legacy-character" }, "character"), "legacy-character");
  assert.throws(() => getLinkedTokenRecordId({}, "character"), /not linked to a character/i);
  assert.throws(() => requireLinkedTokenRecord(null, { kind: "monster", id: "deleted" }), /no longer exists/i);
  assert.throws(() => requireLinkedTokenRecord({ id: "wrong" }, { kind: "character", id: "expected" }), /did not match/i);
  assert.deepEqual(
    requireLinkedTokenRecord({ id: "vex-quickstep", name: "Vex" }, { kind: "character", id: "vex-quickstep" }),
    { id: "vex-quickstep", firestoreDocumentId: "vex-quickstep", name: "Vex" }
  );
});

test("connection distance remains invariant when viewport and grid scale together", () => {
  const base = measureConnectionDistanceFeet({ x: 25, y: 50 }, { x: 50, y: 50 }, {
    viewportWidth: 800, viewportHeight: 400, pixelsPerSquare: 50, feetPerSquare: 5
  });
  const zoomed = measureConnectionDistanceFeet({ x: 25, y: 50 }, { x: 50, y: 50 }, {
    viewportWidth: 1600, viewportHeight: 800, pixelsPerSquare: 100, feetPerSquare: 5
  });
  assert.equal(base, 20);
  assert.equal(zoomed, base);
});

test("DM-only tokens route to a separate server-protected collection", async () => {
  const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/tokens\/\{tokenId\}[\s\S]{0,100}allow read:\s*if isRoomMember\(roomCode\)/);
  assert.match(rules, /match \/dmTokens\/\{tokenId\}[\s\S]{0,100}allow read:\s*if isRoomDm\(roomCode\)/);
  assert.equal(tokenCollectionForRecord({ visibility: "shared" }), "tokens");
  assert.equal(tokenCollectionForRecord({ visibility: "dm" }), "dmTokens");
  assert.equal(tokenIsDmOnly(normalizeTokenPrivacy({}, "dmTokens")), true);
  assert.equal(normalizeTokenPrivacy({}, "tokens").visibility, "shared");
});
