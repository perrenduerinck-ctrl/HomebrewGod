import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  COMBAT_ROUND_SECONDS,
  DAY,
  HOUR,
  MINUTE,
  TIME_MODES,
  WEEK,
  applyTimeCommand,
  createTimeSystem,
  exactDateTimeToSeconds,
  formatDate,
  formatDateTime,
  formatTime,
  getTimeComponents,
  normalizeTimeState,
  toRoomTimeFields
} from "../timeSystem.js";

test("world time zero is Week 1, Day 1, Monday at midnight", () => {
  const current = getTimeComponents(0);

  assert.deepEqual(
    {
      week: current.week,
      day: current.day,
      weekday: current.weekday,
      time: formatTime(0)
    },
    {
      week: 1,
      day: 1,
      weekday: "Monday",
      time: "00:00:00"
    }
  );
  assert.equal(
    formatDate(0),
    "Week 1 · Day 1 — Monday"
  );
  assert.equal(
    formatDateTime(0),
    "Week 1 · Day 1 — Monday · 00:00:00"
  );
});

test("minute, hour, day, and week boundaries use one elapsed-second clock", async () => {
  const clock = createTimeSystem();

  await clock.advanceSeconds(60);
  assert.equal(
    clock.getFormattedTime(),
    "00:01:00"
  );

  await clock.advanceMinutes(59);
  assert.equal(
    clock.getFormattedTime(),
    "01:00:00"
  );

  await clock.advanceHours(23);
  assert.equal(clock.getCurrentDay(), 2);
  assert.equal(
    clock.getCurrentWeekday(),
    "Tuesday"
  );
  assert.equal(
    clock.getFormattedTime(),
    "00:00:00"
  );

  const nextWeek = getTimeComponents(WEEK);
  assert.equal(nextWeek.week, 2);
  assert.equal(nextWeek.day, 8);
  assert.equal(nextWeek.weekday, "Monday");
});

test("exact date entry converts back to the single worldTime integer", async () => {
  const seconds = exactDateTimeToSeconds({
    week: 2,
    dayOfWeek: 3,
    hour: 14,
    minute: 30
  });
  const clock = createTimeSystem();

  await clock.setExactDateTime({
    week: 2,
    dayOfWeek: 3,
    hour: 14,
    minute: 30
  });

  assert.equal(
    seconds,
    WEEK + (2 * DAY) +
      (14 * HOUR) +
      (30 * MINUTE)
  );
  assert.equal(
    clock.getFormattedDateTime(),
    "Week 2 · Day 10 — Wednesday · 14:30:00"
  );
});

test("a completed combat round always advances exactly six seconds", async () => {
  const clock = createTimeSystem({
    initialState: {
      worldTime: 12 * HOUR
    }
  });

  await clock.startCombatTime();
  assert.equal(
    clock.getWorldTime(),
    12 * HOUR
  );
  assert.equal(clock.getCombatRound(), 1);

  // One round can contain twenty combatants; the initiative system calls
  // this once only after the final combatant completes the full round.
  const combatants = Array.from(
    { length: 20 },
    (_, index) => index + 1
  );
  combatants.forEach(() => {
    // Individual turns deliberately do not touch campaign time.
  });
  await clock.advanceCombatRound();

  assert.equal(
    clock.getWorldTime(),
    (12 * HOUR) +
      COMBAT_ROUND_SECONDS
  );
  assert.equal(clock.getCombatRound(), 2);
  assert.equal(
    clock.getCombatElapsedSeconds(),
    6
  );
});

test("ten completed rounds advance one minute and ending mid-round adds nothing", async () => {
  const clock = createTimeSystem({
    initialState: {
      worldTime: 12 * HOUR
    }
  });

  await clock.startCombatTime();
  for (let round = 0; round < 10; round += 1) {
    await clock.advanceCombatRound();
  }

  assert.equal(
    clock.getWorldTime(),
    (12 * HOUR) + 60
  );
  assert.equal(
    clock.getCombatElapsedSeconds(),
    60
  );

  const beforeEnd = clock.getWorldTime();
  await clock.endCombatTime();
  assert.equal(
    clock.getWorldTime(),
    beforeEnd
  );
  assert.equal(
    clock.getTimeMode(),
    TIME_MODES.EXPLORATION
  );
});

test("rewinding an accidentally completed combat round restores six seconds", async () => {
  const clock = createTimeSystem({
    initialState: { worldTime: 100 }
  });
  await clock.startCombatTime();
  await clock.advanceCombatRound();
  await clock.rewindCombatRound();
  assert.equal(clock.getWorldTime(), 100);
  assert.equal(clock.getCombatRound(), 1);
  await clock.rewindCombatRound();
  assert.equal(clock.getWorldTime(), 100);
});

test("combat start and end are idempotent and never create extra writes", async () => {
  let commitCount = 0;
  const clock = createTimeSystem({
    commit(command, context) {
      commitCount += 1;
      return applyTimeCommand(
        context.previousState,
        command
      );
    }
  });

  await clock.startCombatTime();
  await clock.startCombatTime();
  assert.equal(commitCount, 1);

  await clock.endCombatTime();
  await clock.endCombatTime();
  assert.equal(commitCount, 2);
  assert.equal(clock.getWorldTime(), 0);
});

test("players can apply synchronized snapshots but cannot mutate the clock", async () => {
  let isDm = false;
  const clock = createTimeSystem({
    canMutate: () => isDm
  });

  clock.applyRoomSnapshot({
    worldTime: 400,
    timeMode: "exploration"
  });
  assert.equal(clock.getWorldTime(), 400);
  await assert.rejects(
    clock.advanceMinutes(1),
    (error) => (
      error.code ===
      "time/permission-denied"
    )
  );
  assert.equal(clock.getWorldTime(), 400);

  isDm = true;
  await clock.advanceMinutes(1);
  assert.equal(clock.getWorldTime(), 460);
});

test("authoritative commits synchronize DM, players, refresh, and rejoin", async () => {
  let authoritativeRoom = {
    dmUid: "dm-1"
  };
  const dmClock = createTimeSystem({
    canMutate: () => true,
    commit(command) {
      const next = applyTimeCommand(
        authoritativeRoom,
        command
      );
      authoritativeRoom = {
        ...authoritativeRoom,
        ...toRoomTimeFields(next)
      };
      return next;
    }
  });

  await dmClock.advanceDays(2);
  await dmClock.advanceHours(4);
  await dmClock.advanceMinutes(35);

  const playerClock = createTimeSystem({
    canMutate: () => false,
    initialState: authoritativeRoom
  });
  assert.equal(
    playerClock.getWorldTime(),
    dmClock.getWorldTime()
  );

  const refreshedClock = createTimeSystem({
    initialState: authoritativeRoom
  });
  assert.equal(
    refreshedClock.getFormattedDateTime(),
    "Week 1 · Day 3 — Wednesday · 04:35:00"
  );
});

test("old rooms default safely and future effects use absolute timestamps", () => {
  const oldRoom = normalizeTimeState({
    roomName: "Legacy room"
  });
  const oldCombatRoom = normalizeTimeState({
    worldTime: 1234,
    timeMode: "combat"
  });
  const clock = createTimeSystem({
    initialState: oldRoom
  });

  assert.equal(oldRoom.worldTime, 0);
  assert.equal(
    oldRoom.timeMode,
    TIME_MODES.EXPLORATION
  );
  assert.equal(
    oldCombatRoom.combatStartedAt,
    1234
  );
  assert.deepEqual(
    clock.createEffectWindow(10 * MINUTE),
    {
      startedAt: 0,
      expiresAt: 600
    }
  );
});

test("room integration uses the existing listener, DM role, and atomic writes", async () => {
  const appSource = await readFile(
    new URL("../app.js", import.meta.url),
    "utf8"
  );
  const indexSource = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8"
  );

  assert.match(
    appSource,
    /campaignTimeSystem\.applyRoomSnapshot\(\s*room/
  );
  assert.match(
    appSource,
    /latestRoom\.dmUid !== userUid/
  );
  assert.match(
    appSource,
    /runTransaction\([\s\S]*toRoomTimeFields\(nextState\)/
  );
  assert.doesNotMatch(
    appSource,
    /setInterval\([\s\S]{0,200}(?:worldTime|campaignTime)/
  );
  assert.match(
    indexSource,
    /data-time-complete-round/
  );
  assert.match(
    indexSource,
    /data-time-dm-controls/
  );
  assert.match(
    appSource,
    /TIME_EVENTS\.COMBAT_ROUND_COMPLETE/
  );
});
