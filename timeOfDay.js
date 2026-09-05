import { DAY, HOUR } from "./timeSystem.js";

export const DAY_PHASES = Object.freeze({
  DAWN: "DAWN",
  DAY: "DAY",
  DUSK: "DUSK",
  NIGHT: "NIGHT"
});

export const DAY_PHASE_BOUNDARIES = Object.freeze([
  Object.freeze({ second: 5 * HOUR, phase: DAY_PHASES.DAWN }),
  Object.freeze({ second: 8 * HOUR, phase: DAY_PHASES.DAY }),
  Object.freeze({ second: 18 * HOUR, phase: DAY_PHASES.DUSK }),
  Object.freeze({ second: 21 * HOUR, phase: DAY_PHASES.NIGHT })
]);

function safeWorldTime(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.floor(number))
    : 0;
}

function secondsToday(value) {
  return safeWorldTime(value) % DAY;
}

export function getDayPhase(worldTime) {
  const second = secondsToday(worldTime);
  if (second >= 5 * HOUR && second < 8 * HOUR) {
    return DAY_PHASES.DAWN;
  }
  if (second >= 8 * HOUR && second < 18 * HOUR) {
    return DAY_PHASES.DAY;
  }
  if (second >= 18 * HOUR && second < 21 * HOUR) {
    return DAY_PHASES.DUSK;
  }
  return DAY_PHASES.NIGHT;
}

export function getPhaseProgress(worldTime) {
  const second = secondsToday(worldTime);
  const phase = getDayPhase(worldTime);
  let elapsed;
  let duration;

  if (phase === DAY_PHASES.DAWN) {
    elapsed = second - (5 * HOUR);
    duration = 3 * HOUR;
  } else if (phase === DAY_PHASES.DAY) {
    elapsed = second - (8 * HOUR);
    duration = 10 * HOUR;
  } else if (phase === DAY_PHASES.DUSK) {
    elapsed = second - (18 * HOUR);
    duration = 3 * HOUR;
  } else {
    elapsed = second >= 21 * HOUR
      ? second - (21 * HOUR)
      : (3 * HOUR) + second;
    duration = 8 * HOUR;
  }

  return Math.max(0, Math.min(1, elapsed / duration));
}

function boundaryAt(worldTime, kind, phase) {
  const previousSecond = Math.max(0, worldTime - 1);
  const nextSecond = worldTime;
  return Object.freeze({
    worldTime,
    kind,
    phase,
    fromPhase: getDayPhase(previousSecond),
    toPhase: getDayPhase(nextSecond),
    dayNumber: Math.floor(worldTime / DAY) + 1
  });
}

export function getCrossedTimeBoundaries(
  oldWorldTime,
  newWorldTime
) {
  const oldTime = safeWorldTime(oldWorldTime);
  const newTime = safeWorldTime(newWorldTime);
  if (oldTime === newTime) return [];

  const start = Math.min(oldTime, newTime);
  const end = Math.max(oldTime, newTime);
  const firstDay = Math.floor(start / DAY);
  const lastDay = Math.floor(end / DAY);
  const crossings = [];

  for (let day = firstDay; day <= lastDay; day += 1) {
    const dayStart = day * DAY;
    if (dayStart > start && dayStart <= end) {
      crossings.push(
        boundaryAt(dayStart, "day", DAY_PHASES.NIGHT)
      );
    }

    for (const boundary of DAY_PHASE_BOUNDARIES) {
      const worldTime = dayStart + boundary.second;
      if (worldTime > start && worldTime <= end) {
        crossings.push(
          boundaryAt(worldTime, "phase", boundary.phase)
        );
      }
    }
  }

  crossings.sort((left, right) => left.worldTime - right.worldTime);
  if (newTime < oldTime) {
    return crossings.reverse().map((crossing) => Object.freeze({
      ...crossing,
      direction: "backward",
      fromPhase: crossing.toPhase,
      toPhase: crossing.fromPhase
    }));
  }

  return crossings.map((crossing) => Object.freeze({
    ...crossing,
    direction: "forward"
  }));
}
