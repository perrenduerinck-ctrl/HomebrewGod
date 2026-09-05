export const SECOND = 1;
export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
export const WEEK = 604800;
export const COMBAT_ROUND_SECONDS = 6;

export const SHORT_REST_SECONDS = HOUR;
export const LONG_REST_SECONDS = 8 * HOUR;

export const TIME_MODES = Object.freeze({
  EXPLORATION: "exploration",
  COMBAT: "combat"
});

export const TIME_EVENTS = Object.freeze({
  COMBAT_START:
    "homebrewgod:combat-start",
  COMBAT_ROUND_COMPLETE:
    "homebrewgod:combat-round-complete",
  COMBAT_END:
    "homebrewgod:combat-end"
});

export const WEEKDAYS = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);

const MAX_WORLD_TIME = Number.MAX_SAFE_INTEGER;

function normalizeInteger(
  value,
  fallback = 0,
  minimum = 0,
  maximum = MAX_WORLD_TIME
) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(numeric)
    )
  );
}

export function normalizeTimeMode(mode) {
  return mode === TIME_MODES.COMBAT
    ? TIME_MODES.COMBAT
    : TIME_MODES.EXPLORATION;
}

export function normalizeTimeState(source = {}) {
  const worldTime = normalizeInteger(
    source.worldTime,
    0
  );
  const timeMode = normalizeTimeMode(
    source.timeMode
  );
  const combatRoundsCompleted =
    timeMode === TIME_MODES.COMBAT
      ? normalizeInteger(
          source.combatRoundsCompleted,
          0
        )
      : 0;
  const hasCombatStartedAt =
    source.combatStartedAt !== null &&
    source.combatStartedAt !== undefined;
  const rawCombatStartedAt =
    hasCombatStartedAt
      ? Number(source.combatStartedAt)
      : Number.NaN;
  const combatStartedAt =
    timeMode === TIME_MODES.COMBAT
      ? (
          Number.isFinite(rawCombatStartedAt)
            ? normalizeInteger(
                rawCombatStartedAt,
                worldTime
              )
            : worldTime
        )
      : null;

  return Object.freeze({
    worldTime,
    timeMode,
    timePaused:
      source.timePaused === true,
    combatStartedAt,
    combatRoundsCompleted
  });
}

export function getTimeComponents(value) {
  const state =
    typeof value === "object" && value !== null
      ? normalizeTimeState(value)
      : normalizeTimeState({ worldTime: value });
  const worldTime = state.worldTime;
  const elapsedDays = Math.floor(
    worldTime / DAY
  );
  const secondsToday =
    worldTime % DAY;
  const hour = Math.floor(
    secondsToday / HOUR
  );
  const minute = Math.floor(
    (secondsToday % HOUR) / MINUTE
  );
  const second =
    secondsToday % MINUTE;
  const weekdayIndex =
    elapsedDays % WEEKDAYS.length;

  return Object.freeze({
    worldTime,
    second,
    minute,
    hour,
    day: elapsedDays + 1,
    dayOfWeek: weekdayIndex + 1,
    week: Math.floor(elapsedDays / 7) + 1,
    weekdayIndex,
    weekday: WEEKDAYS[weekdayIndex]
  });
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatTime(value) {
  const current = getTimeComponents(value);

  return [
    pad2(current.hour),
    pad2(current.minute),
    pad2(current.second)
  ].join(":");
}

export function formatDate(value) {
  const current = getTimeComponents(value);

  return (
    `Week ${current.week} · ` +
    `Day ${current.day} — ` +
    current.weekday
  );
}

export function formatDateTime(value) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function exactDateTimeToSeconds({
  week = 1,
  dayOfWeek = 1,
  hour = 0,
  minute = 0,
  second = 0
} = {}) {
  const safeWeek = normalizeInteger(
    week,
    1,
    1
  );
  const safeDay = normalizeInteger(
    dayOfWeek,
    1,
    1,
    7
  );
  const safeHour = normalizeInteger(
    hour,
    0,
    0,
    23
  );
  const safeMinute = normalizeInteger(
    minute,
    0,
    0,
    59
  );
  const safeSecond = normalizeInteger(
    second,
    0,
    0,
    59
  );

  return normalizeInteger(
    ((safeWeek - 1) * WEEK) +
      ((safeDay - 1) * DAY) +
      (safeHour * HOUR) +
      (safeMinute * MINUTE) +
      safeSecond,
    0
  );
}

function addWorldSeconds(
  worldTime,
  seconds
) {
  const amount = normalizeInteger(
    seconds,
    0
  );

  return normalizeInteger(
    normalizeInteger(worldTime, 0) + amount,
    0
  );
}

export function timeStatesEqual(left, right) {
  const a = normalizeTimeState(left);
  const b = normalizeTimeState(right);

  return (
    a.worldTime === b.worldTime &&
    a.timeMode === b.timeMode &&
    a.timePaused === b.timePaused &&
    a.combatStartedAt === b.combatStartedAt &&
    a.combatRoundsCompleted ===
      b.combatRoundsCompleted
  );
}

export function applyTimeCommand(
  currentState,
  command = {}
) {
  const state = normalizeTimeState(
    currentState
  );
  const type = String(
    command.type || ""
  );
  let next = state;

  if (type === "set-world-time") {
    next = {
      ...state,
      worldTime: normalizeInteger(
        command.seconds,
        state.worldTime
      )
    };
  } else if (type === "advance-time") {
    next = {
      ...state,
      worldTime: addWorldSeconds(
        state.worldTime,
        command.seconds
      )
    };
  } else if (type === "set-mode") {
    const timeMode = normalizeTimeMode(
      command.mode
    );
    next = {
      ...state,
      timeMode,
      combatStartedAt:
        timeMode === TIME_MODES.COMBAT
          ? state.combatStartedAt ??
            state.worldTime
          : null,
      combatRoundsCompleted:
        timeMode === TIME_MODES.COMBAT
          ? state.combatRoundsCompleted
          : 0
    };
  } else if (type === "set-paused") {
    next = {
      ...state,
      timePaused:
        command.paused === true
    };
  } else if (type === "toggle-paused") {
    next = {
      ...state,
      timePaused: !state.timePaused
    };
  } else if (type === "start-combat") {
    if (
      state.timeMode !==
      TIME_MODES.COMBAT
    ) {
      next = {
        ...state,
        timeMode: TIME_MODES.COMBAT,
        combatStartedAt: state.worldTime,
        combatRoundsCompleted: 0
      };
    }
  } else if (type === "end-combat") {
    if (
      state.timeMode ===
      TIME_MODES.COMBAT
    ) {
      next = {
        ...state,
        timeMode: TIME_MODES.EXPLORATION,
        combatStartedAt: null,
        combatRoundsCompleted: 0
      };
    }
  } else if (type === "advance-combat-round") {
    if (
      state.timeMode !==
      TIME_MODES.COMBAT
    ) {
      throw new Error(
        "A combat round can only be completed while combat time is active."
      );
    }

    next = {
      ...state,
      worldTime: addWorldSeconds(
        state.worldTime,
        COMBAT_ROUND_SECONDS
      ),
      combatRoundsCompleted:
        state.combatRoundsCompleted + 1
    };
  } else if (type === "rewind-combat-round") {
    if (
      state.timeMode === TIME_MODES.COMBAT &&
      state.combatRoundsCompleted > 0
    ) {
      next = {
        ...state,
        worldTime: Math.max(
          0,
          state.worldTime - COMBAT_ROUND_SECONDS
        ),
        combatRoundsCompleted:
          state.combatRoundsCompleted - 1
      };
    }
  } else {
    throw new Error(
      `Unknown campaign time command: ${type || "empty"}`
    );
  }

  return normalizeTimeState(next);
}

export function toRoomTimeFields(value) {
  const state = normalizeTimeState(value);

  return {
    worldTime: state.worldTime,
    timeMode: state.timeMode,
    timePaused: state.timePaused,
    combatStartedAt:
      state.combatStartedAt,
    combatRoundsCompleted:
      state.combatRoundsCompleted
  };
}

export class TimePermissionError extends Error {
  constructor() {
    super(
      "Only the room DM can change campaign time."
    );
    this.name = "TimePermissionError";
    this.code = "time/permission-denied";
  }
}

export function createTimeSystem({
  initialState = {},
  canMutate = () => true,
  commit = null
} = {}) {
  let state = normalizeTimeState(
    initialState
  );
  let mutationQueue = Promise.resolve();
  const subscribers = new Set();

  function getState() {
    return { ...state };
  }

  function notify(reason) {
    const snapshot = getState();

    subscribers.forEach((subscriber) => {
      subscriber(snapshot, reason);
    });
  }

  function applySnapshot(value) {
    const next = normalizeTimeState(value);
    const changed = !timeStatesEqual(
      state,
      next
    );
    state = next;

    if (changed) {
      notify("snapshot");
    }

    return getState();
  }

  async function executeNow(command) {
    if (!canMutate()) {
      throw new TimePermissionError();
    }

    const previousState = getState();
    const previewState = applyTimeCommand(
      previousState,
      command
    );

    if (
      timeStatesEqual(
        previousState,
        previewState
      )
    ) {
      return previousState;
    }

    const committedState =
      typeof commit === "function"
        ? await commit(
            { ...command },
            {
              previousState,
              previewState:
                { ...previewState }
            }
          )
        : previewState;

    state = normalizeTimeState(
      committedState || previewState
    );
    notify(command.type);
    return getState();
  }

  function execute(command) {
    const result = mutationQueue.then(
      () => executeNow(command)
    );
    mutationQueue = result.catch(
      () => undefined
    );
    return result;
  }

  function getComponents() {
    return getTimeComponents(state);
  }

  const api = {
    getState,
    applySnapshot,
    applyRoomSnapshot: applySnapshot,
    subscribe(subscriber, {
      immediate = true
    } = {}) {
      if (typeof subscriber !== "function") {
        throw new TypeError(
          "Campaign time subscribers must be functions."
        );
      }
      subscribers.add(subscriber);
      if (immediate) {
        subscriber(getState(), "subscribe");
      }
      return () => subscribers.delete(
        subscriber
      );
    },
    getWorldTime: () => state.worldTime,
    setWorldTime: (seconds) => execute({
      type: "set-world-time",
      seconds
    }),
    advanceTime: (seconds) => execute({
      type: "advance-time",
      seconds
    }),
    advanceSeconds(seconds) {
      return api.advanceTime(seconds);
    },
    advanceMinutes(minutes) {
      return api.advanceTime(
        normalizeInteger(minutes, 0) *
          MINUTE
      );
    },
    advanceHours(hours) {
      return api.advanceTime(
        normalizeInteger(hours, 0) *
          HOUR
      );
    },
    advanceDays(days) {
      return api.advanceTime(
        normalizeInteger(days, 0) *
          DAY
      );
    },
    setExactDateTime(values) {
      return api.setWorldTime(
        exactDateTimeToSeconds(values)
      );
    },
    getCurrentSecond: () =>
      getComponents().second,
    getCurrentMinute: () =>
      getComponents().minute,
    getCurrentHour: () =>
      getComponents().hour,
    getCurrentDay: () =>
      getComponents().day,
    getCurrentWeek: () =>
      getComponents().week,
    getCurrentWeekday: () =>
      getComponents().weekday,
    getFormattedTime: () =>
      formatTime(state),
    getFormattedDate: () =>
      formatDate(state),
    getFormattedDateTime: () =>
      formatDateTime(state),
    setTimeMode: (mode) => execute({
      type: "set-mode",
      mode
    }),
    getTimeMode: () => state.timeMode,
    setPaused: (paused) => execute({
      type: "set-paused",
      paused
    }),
    togglePaused: () => execute({
      type: "toggle-paused"
    }),
    isPaused: () => state.timePaused,
    startCombatTime: () => execute({
      type: "start-combat"
    }),
    endCombatTime: () => execute({
      type: "end-combat"
    }),
    advanceCombatRound: () => execute({
      type: "advance-combat-round"
    }),
    rewindCombatRound: () => execute({
      type: "rewind-combat-round"
    }),
    getCombatRound: () =>
      state.timeMode === TIME_MODES.COMBAT
        ? state.combatRoundsCompleted + 1
        : null,
    getCombatElapsedSeconds: () =>
      state.combatRoundsCompleted *
        COMBAT_ROUND_SECONDS,
    createEffectWindow(durationSeconds) {
      const duration = normalizeInteger(
        durationSeconds,
        0
      );
      return {
        startedAt: state.worldTime,
        expiresAt: addWorldSeconds(
          state.worldTime,
          duration
        )
      };
    }
  };

  return Object.freeze(api);
}
