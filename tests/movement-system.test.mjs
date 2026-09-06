import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MAX_BASE_MOVEMENT_SPEED,
  canControlToken,
  cancelPendingMovement,
  confirmPendingMovement,
  createMovementSystem,
  createPendingMovement,
  getTokenMovementMode,
  measureMovementDistance,
  normalizeBaseMovementSpeed,
  normalizeMovementState,
  readTokenBaseSpeed,
  synchronizeMovementState,
  toRoomMovementFields
} from "../combat/movementSystem.js";
import { applyInitiativeCommand, combatantFromToken } from "../combat/initiativeSystem.js";
import { buildInitiativeRoomTransition } from "../combat/initiativeTimeIntegration.js";
import { createTokenSystem } from "../tokens/index.js";

function initiative(tokenId = "hero", roundNumber = 1, baseSpeed = 30) {
  return {
    combatActive: true,
    roundNumber,
    currentTurnIndex: 0,
    currentCombatantId: tokenId,
    initiativeOrder: [{ tokenId, name: tokenId, baseSpeed }]
  };
}

function fresh(speed = 30) {
  return synchronizeMovementState({}, initiative("hero", 1, speed), {
    activeToken: { id: "hero", name: "Hero", x: 10, y: 10, movementSpeed: speed }
  });
}

function preview(state, feet, x = 20) {
  return createPendingMovement(state, {
    tokenId: state.activeTokenId,
    startPosition: state.lastConfirmedPosition || { x: 10, y: 10 },
    endPosition: { x, y: 10 },
    distanceFeet: feet
  });
}

test("linked characters and monsters inherit canonical base walking speed", () => {
  const tokens = createTokenSystem({ autoInit: false });
  const character = tokens.buildCharacterLinkedTokenPatch({
    id: "sheet", ownerUid: "owner", identity: { name: "Hero" },
    combat: { maxHp: 20, armorClass: 15, baseSpeed: { walk: 45 } }
  }, {});
  assert.equal(character.movementSpeed, 45);
  assert.equal(character.linkedCharacter.walkingSpeed, 45);
  assert.equal(combatantFromToken({ id: "hero", ...character }).baseSpeed, 45);

  const monster = tokens.buildMonsterLinkedTokenPatch({
    id: "wolf", name: "Wolf", hp: 11, ac: 13,
    speed: "40 ft., climb 20 ft."
  }, {});
  assert.equal(monster.movementSpeed, 40);
  assert.equal(monster.linkedMonster.walkingSpeed, 40);
});

test("base speed normalization rejects invalid values and clamps huge values", () => {
  assert.equal(normalizeBaseMovementSpeed("45 ft."), 45);
  assert.equal(normalizeBaseMovementSpeed("invalid"), 30);
  assert.equal(normalizeBaseMovementSpeed(-100), 0);
  assert.equal(normalizeBaseMovementSpeed(3e30), MAX_BASE_MOVEMENT_SPEED);
  assert.equal(readTokenBaseSpeed({ combat: { baseSpeed: { walk: 35 } } }), 35);
  assert.equal(readTokenBaseSpeed({ speed: { walk: 25 } }), 25);
});

test("a current turn starts full, rerenders preserve it, and a new turn resets it", () => {
  const start = fresh(30);
  assert.equal(start.movementRemaining, 30);
  const moved = confirmPendingMovement(preview(start, 10));
  const rerender = synchronizeMovementState(moved, initiative(), {
    activeToken: { id: "hero", x: 20, y: 10, movementSpeed: 30 }
  });
  assert.equal(rerender.movementRemaining, 20);
  assert.equal(rerender.movementSpent, 10);
  const newTurn = synchronizeMovementState(moved, initiative("hero", 2), {
    activeToken: { id: "hero", x: 20, y: 10, movementSpeed: 30 }
  });
  assert.equal(newTurn.movementRemaining, 30);
  assert.equal(newTurn.movementSpent, 0);
});

test("confirmed moves accumulate while cancelled and unconfirmed moves consume zero", () => {
  let state = fresh();
  state = confirmPendingMovement(preview(state, 10, 20));
  assert.equal(state.movementRemaining, 20);
  const cancelled = cancelPendingMovement(preview(state, 5, 25));
  assert.equal(cancelled.movementRemaining, 20);
  state = confirmPendingMovement(preview(cancelled, 5, 25));
  state = confirmPendingMovement(preview(state, 8, 33));
  assert.equal(state.movementRemaining, 7);
  assert.equal(state.movementSpent, 23);
  const local = preview(state, 2, 35);
  assert.equal(toRoomMovementFields(local).movementState.pendingMovement, undefined);
});

test("non-current and over-budget moves are blocked; DM Force Move stays safe", () => {
  assert.throws(() => createPendingMovement(fresh(), {
    tokenId: "goblin",
    startPosition: { x: 0, y: 0 }, endPosition: { x: 1, y: 1 }, distanceFeet: 5
  }), /current combatant/i);
  const withFive = confirmPendingMovement(preview(fresh(), 25));
  const tooFar = preview(withFive, 18, 40);
  assert.equal(tooFar.pendingMovement.overage, 13);
  assert.throws(() => confirmPendingMovement(tooFar), /exceeds/i);
  const forced = confirmPendingMovement(tooFar, { force: true });
  assert.equal(forced.movementRemaining, 0);
  assert.equal(forced.movementSpent, 30);
  assert.equal(forced.lastMoveForced, true);
  assert.equal(forced.movementOverage, 13);
  assert.equal(normalizeMovementState({
    combatActive: true, activeTokenId: "hero", baseSpeed: 30,
    movementRemaining: -1, movementSpent: 900, movementTurnKey: "1:hero"
  }).movementRemaining, 0);
});

test("refresh preserves budget; turn change, deletion, removal, and combat end clear stale state", () => {
  const moved = confirmPendingMovement(preview(fresh(35), 12.5));
  const restored = synchronizeMovementState(
    toRoomMovementFields(moved), initiative("hero", 1, 35),
    { activeToken: { id: "hero", x: 20, y: 10, movementSpeed: 35 } }
  );
  assert.equal(restored.movementRemaining, 22.5);
  const other = synchronizeMovementState(preview(restored, 2), initiative("goblin", 1, 25), {
    activeToken: { id: "goblin", x: 40, y: 40, movementSpeed: 25 }
  });
  assert.equal(other.activeTokenId, "goblin");
  assert.equal(other.pendingMovement, null);
  assert.equal(other.movementRemaining, 25);
  assert.equal(synchronizeMovementState(other, initiative("goblin"), { tokenExists: false }).combatActive, false);
  assert.equal(synchronizeMovementState(other, { combatActive: false }).activeTokenId, null);
});

test("an unrelated same-turn room snapshot preserves a local unconfirmed preview", () => {
  const hero = { id: "hero", ownerUid: "owner", x: 10, y: 10, movementSpeed: 30 };
  const system = createMovementSystem({
    initialState: fresh(),
    getInitiativeState: () => initiative(),
    getTokens: () => [hero],
    getUserUid: () => "owner"
  });
  system.previewMove({
    tokenId: "hero",
    startPosition: { x: 10, y: 10 },
    endPosition: { x: 20, y: 10 },
    distanceFeet: 10
  });
  system.applyRoomSnapshot({
    ...toRoomMovementFields(fresh()),
    roomName: "Unrelated room update"
  });
  assert.equal(system.getState().pendingMovement.distanceFeet, 10);
  assert.equal(system.getState().movementRemaining, 30);
});

test("controller synchronization clears a missing active token and restores after token load", () => {
  const hero = { id: "hero", ownerUid: "owner", x: 20, y: 10, movementSpeed: 30 };
  const persisted = toRoomMovementFields(
    confirmPendingMovement(preview(fresh(), 10, 20))
  );
  let tokens = [hero];
  const system = createMovementSystem({
    initialState: persisted,
    getInitiativeState: () => initiative(),
    getTokens: () => tokens,
    getUserUid: () => "owner"
  });
  system.sync(persisted);
  assert.equal(system.getState().movementRemaining, 20);

  tokens = [];
  system.sync(persisted);
  assert.equal(system.getState().combatActive, false);
  assert.equal(system.getState().activeTokenId, null);

  tokens = [hero];
  system.sync(persisted, "tokens-rendered");
  assert.equal(system.getState().activeTokenId, "hero");
  assert.equal(system.getState().movementRemaining, 20);

  tokens = [];
  system.applyRoomSnapshot(persisted);
  assert.equal(system.getState().activeTokenId, null);
});

test("initiative transitions atomically switch budgets and Previous Turn resets without position undo", () => {
  const order = [
    { tokenId: "hero", name: "Hero", baseSpeed: 30 },
    { tokenId: "goblin", name: "Goblin", baseSpeed: 25 }
  ];
  const room = {
    initiativeState: { ...initiative(), initiativeOrder: order },
    movementState: toRoomMovementFields(confirmPendingMovement(preview(fresh(), 18))).movementState,
    timeState: { worldTime: 0, timeMode: "combat", combatRoundsCompleted: 0 }
  };
  const next = buildInitiativeRoomTransition(room, { type: "next-turn" });
  assert.equal(next.movementState.activeTokenId, "goblin");
  assert.equal(next.movementState.movementRemaining, 25);
  assert.ok(next.roomFields.movementState);
  const previous = buildInitiativeRoomTransition({ ...room, ...next.roomFields }, { type: "previous-turn" });
  assert.equal(previous.movementState.activeTokenId, "hero");
  assert.equal(previous.movementState.movementRemaining, 30);
  assert.equal(previous.movementState.lastConfirmedPosition, null);
});

test("ownership rejects other characters/enemies and permits the DM", async () => {
  const hero = { id: "hero", ownerUid: "owner", x: 10, y: 10, movementSpeed: 30 };
  assert.equal(canControlToken(hero, { userUid: "owner" }), true);
  assert.equal(canControlToken(hero, { userUid: "other" }), false);
  assert.equal(canControlToken({ id: "enemy", type: "enemy" }, { userUid: "owner" }), false);
  assert.equal(canControlToken({ id: "enemy" }, { isDm: true }), true);

  const owner = createMovementSystem({
    initialState: fresh(), getInitiativeState: () => initiative(),
    getTokens: () => [hero], getUserUid: () => "owner"
  });
  owner.previewMove({
    tokenId: "hero", startPosition: { x: 10, y: 10 },
    endPosition: { x: 40, y: 10 }, distanceFeet: 40
  });
  await assert.rejects(owner.confirmMove({ force: true }), /Only the DM/i);
  const stranger = createMovementSystem({
    initialState: fresh(), getInitiativeState: () => initiative(),
    getTokens: () => [hero], getUserUid: () => "stranger"
  });
  assert.throws(() => stranger.previewMove({
    tokenId: "hero", startPosition: { x: 10, y: 10 },
    endPosition: { x: 20, y: 10 }, distanceFeet: 10
  }), /do not control/i);
});

test("exploration stays free while combat tracks only the current controlled token", () => {
  const hero = { id: "hero", ownerUid: "owner" };
  const ally = { id: "ally", ownerUid: "owner" };
  const enemy = { id: "enemy", ownerUid: "enemy-owner", type: "enemy" };
  assert.equal(getTokenMovementMode(hero, { combatActive: false }, {
    userUid: "owner"
  }), "free");
  assert.equal(getTokenMovementMode(hero, initiative(), {
    userUid: "owner"
  }), "tracked");
  assert.equal(getTokenMovementMode(ally, initiative(), {
    userUid: "owner"
  }), "blocked");
  assert.equal(getTokenMovementMode(enemy, initiative(), {
    userUid: "owner"
  }), "blocked");
  assert.equal(getTokenMovementMode(enemy, initiative("enemy"), {
    isDm: true
  }), "tracked");
  assert.equal(getTokenMovementMode(enemy, { combatActive: false }, {
    isDm: true
  }), "free");
});

test("movement distance exactly matches canonical flat and elevation-aware ruler math", () => {
  const flat = measureMovementDistance(
    { x: 0, y: 0 }, { x: 192, y: 0 },
    { pixelsPerSquare: 64, feetPerSquare: 5 }
  );
  assert.equal(flat.feet, 15);
  const elevated = measureMovementDistance(
    { x: 0, y: 0, elevation: 0 }, { x: 192, y: 0, elevation: 20 },
    { pixelsPerSquare: 64, feetPerSquare: 5 }
  );
  assert.equal(elevated.horizontalFeet, 15);
  assert.equal(elevated.verticalFeet, 20);
  assert.equal(elevated.feet, 25);
});

test("full rounds remain exactly six seconds with two and twenty combatants", () => {
  for (const count of [2, 20]) {
    const order = Array.from({ length: count }, (_, index) => ({
      tokenId: `t-${index}`, name: `Token ${index}`,
      totalInitiative: count - index, baseSpeed: 30
    }));
    const started = applyInitiativeCommand({ initiativeOrder: order }, { type: "start-combat" }).state;
    let room = {
      initiativeState: started,
      worldTime: 100,
      timeMode: "combat",
      combatStartedAt: 100,
      combatRoundsCompleted: 0
    };
    for (let index = 0; index < count; index += 1) {
      const transition = buildInitiativeRoomTransition(room, { type: "next-turn" });
      room = { ...room, ...transition.roomFields };
    }
    assert.equal(room.initiativeState.roundNumber, 2);
    assert.equal(room.worldTime, 106);
  }
});

test("integration remains modular and Firestore validates meaningful confirmed writes", () => {
  const root = new URL("../", import.meta.url);
  const app = fs.readFileSync(new URL("app.js", root), "utf8");
  const tokens = fs.readFileSync(new URL("tokens/index.js", root), "utf8");
  const rules = fs.readFileSync(new URL("firestore.rules", root), "utf8");
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  assert.match(app, /createMovementSystem/);
  assert.match(app, /transaction\.update\(tokenRef[\s\S]*transaction\.update\(roomRef/);
  assert.match(tokens, /measureMovementDistance/);
  assert.match(rules, /tokenMovementFieldsOnly/);
  assert.match(rules, /ownsRoomToken/);
  assert.match(rules, /trackedTokenMoveIsConfirmed/);
  assert.match(rules, /movementRemaining[\s\S]*< previous\.get\('movementRemaining'/);
  assert.match(html, /data-movement-action="confirm"/);
});
