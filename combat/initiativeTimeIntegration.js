import {
  applyInitiativeCommand,
  initiativeStatesEqual,
  normalizeInitiativeState,
  toRoomInitiativeFields
} from "./initiativeSystem.js";
import {
  TIME_MODES,
  applyTimeCommand,
  normalizeTimeState,
  timeStatesEqual,
  toRoomTimeFields
} from "../timeSystem.js";
import {
  movementStatesEqual,
  normalizeMovementState,
  synchronizeMovementState,
  toRoomMovementFields
} from "./movementSystem.js?v=movement-robustness-20260906";

function hasEffect(effects, effect) {
  return Array.isArray(effects) && effects.includes(effect);
}

export function reconcileInitiativeTimeState(
  currentTimeState,
  initiativeState,
  effects = []
) {
  const initiative = normalizeInitiativeState(
    initiativeState
  );
  let time = normalizeTimeState(currentTimeState);

  if (hasEffect(effects, "combat-ended")) {
    return applyTimeCommand(time, {
      type: "end-combat"
    });
  }

  if (!initiative.combatActive) {
    return time;
  }

  if (hasEffect(effects, "combat-started")) {
    if (time.timeMode === TIME_MODES.COMBAT) {
      time = applyTimeCommand(time, {
        type: "end-combat"
      });
    }
    time = applyTimeCommand(time, {
      type: "start-combat"
    });
  } else if (time.timeMode !== TIME_MODES.COMBAT) {
    time = applyTimeCommand(time, {
      type: "start-combat"
    });
  }

  return applyTimeCommand(time, {
    type: "synchronize-combat-rounds",
    combatRoundsCompleted:
      Math.max(0, initiative.roundNumber - 1)
  });
}

export function buildInitiativeRoomTransition(
  room,
  command
) {
  const previousInitiativeState =
    normalizeInitiativeState(room);
  const initiativeResult = applyInitiativeCommand(
    previousInitiativeState,
    command
  );
  const previousTimeState = normalizeTimeState(room);
  const timeState = reconcileInitiativeTimeState(
    previousTimeState,
    initiativeResult.state,
    initiativeResult.effects
  );
  const previousMovementState = normalizeMovementState(room);
  const activeCombatant = initiativeResult.state.initiativeOrder.find(
    (combatant) => (
      combatant.tokenId === initiativeResult.state.currentCombatantId
    )
  );
  // Previous Turn deliberately starts a valid, fresh budget for the
  // restored actor. Token positions are not rewound in this first version.
  const movementState = synchronizeMovementState(
    previousMovementState,
    initiativeResult.state,
    {
      activeToken: activeCombatant || null,
      baseSpeed: activeCombatant?.baseSpeed,
      tokenExists:
        !initiativeResult.state.combatActive || Boolean(activeCombatant)
    }
  );

  return Object.freeze({
    state: initiativeResult.state,
    effects: [...initiativeResult.effects],
    timeState,
    movementState,
    initiativeChanged: !initiativeStatesEqual(
      previousInitiativeState,
      initiativeResult.state
    ),
    timeChanged: !timeStatesEqual(
      previousTimeState,
      timeState
    ),
    movementChanged: !movementStatesEqual(
      previousMovementState,
      movementState,
      { persistedOnly: true }
    ),
    roomFields: {
      ...toRoomInitiativeFields(
        initiativeResult.state
      ),
      ...toRoomTimeFields(timeState),
      ...toRoomMovementFields(movementState)
    }
  });
}
