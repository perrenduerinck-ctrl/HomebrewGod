import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  JOURNAL_COLLECTIONS,
  canMutateJournalEntry,
  journalCollectionForVisibility,
  journalEntryMatches,
  normalizeJournalEntry,
  sanitizeJournalHtml
} from "../journal/journalModel.js";
import {
  MAX_DRAWING_POINTS,
  canDeleteDrawingStroke,
  clientPointToDrawingSpace,
  normalizeDrawingStroke,
  simplifyDrawingPoints,
  stableDrawingMapId
} from "../battleMap/drawingModel.js";

test("journal content is searchable, bounded, and sanitized before persistence", () => {
  const entry = normalizeJournalEntry({
    id: "note-1",
    title: "Hidden Temple",
    category: "Locations",
    visibility: "shared",
    contentHtml: '<p onclick="steal()">Seek the <strong>moon door</strong>.</p><script>steal()</script>'
  }, {
    roomCode: "ROOM-1",
    userId: "user-1",
    userName: "Ari",
    now: 100
  });

  assert.equal(entry.roomCode, "ROOM-1");
  assert.equal(entry.ownerUid, "user-1");
  assert.equal(entry.contentHtml.includes("script"), false);
  assert.equal(entry.contentHtml.includes("onclick"), false);
  assert.equal(journalEntryMatches(entry, { search: "moon door" }), true);
  assert.equal(journalEntryMatches(entry, { search: "dragon" }), false);
  assert.equal(sanitizeJournalHtml("<b>safe</b><img src=x onerror=x>"), "<b>safe</b>");
});

test("journal visibility uses physically separate collections and preserves privacy ownership", () => {
  assert.deepEqual(JOURNAL_COLLECTIONS, {
    shared: "sharedJournal",
    personal: "personalJournal",
    dm: "dmJournal"
  });
  assert.equal(journalCollectionForVisibility("dm"), "dmJournal");
  assert.equal(journalCollectionForVisibility("unknown"), "personalJournal");

  const playerAttempt = normalizeJournalEntry({
    id: "note-2",
    visibility: "dm",
    ownerUid: "player-1"
  }, { roomCode: "ROOM", userId: "player-1", isDm: false, now: 100 });
  assert.equal(playerAttempt.visibility, "personal");
  assert.equal(canMutateJournalEntry(playerAttempt, { userId: "other", isDm: false }), false);
  assert.equal(canMutateJournalEntry(playerAttempt, { userId: "player-1", isDm: false }), true);
});

test("drawing coordinates stay normalized through pan, resize, and zoom", () => {
  const pointAtNormalSize = clientPointToDrawingSpace(
    { left: 100, top: 50, width: 800, height: 400 },
    500,
    250
  );
  const pointAtDoubleSizeAndPan = clientPointToDrawingSpace(
    { left: 260, top: 140, width: 1600, height: 800 },
    1060,
    540
  );
  assert.deepEqual(pointAtNormalSize, { x: 500, y: 500 });
  assert.deepEqual(pointAtDoubleSizeAndPan, pointAtNormalSize);
});

test("drawing payloads are bounded per completed stroke and map IDs are stable", () => {
  const tooManyPoints = Array.from({ length: 900 }, (_, index) => ({
    x: index * 2,
    y: index * 2
  }));
  const simplified = simplifyDrawingPoints(tooManyPoints, 1);
  assert.ok(simplified.length <= MAX_DRAWING_POINTS);
  const stroke = normalizeDrawingStroke({
    id: "stroke-1",
    roomCode: "ROOM",
    mapId: "maps/castle floor 1",
    authorUid: "player-1",
    tool: "pen",
    points: tooManyPoints,
    size: 999
  }, { userId: "player-1", now: 100 });
  assert.equal(stroke.points.length, MAX_DRAWING_POINTS);
  assert.equal(stroke.size, 48);
  assert.equal(stableDrawingMapId("maps/castle floor 1"), stableDrawingMapId("maps/castle floor 1"));
  assert.notEqual(
    stableDrawingMapId(`https://cdn.example/${"same-prefix/".repeat(30)}one.png`),
    stableDrawingMapId(`https://cdn.example/${"same-prefix/".repeat(30)}two.png`)
  );
});

test("undo/delete authorization is scoped to the author unless the actor is DM", () => {
  const stroke = { authorUid: "author" };
  assert.equal(canDeleteDrawingStroke(stroke, { userId: "author", isDm: false }), true);
  assert.equal(canDeleteDrawingStroke(stroke, { userId: "other", isDm: false }), false);
  assert.equal(canDeleteDrawingStroke(stroke, { userId: "dm", isDm: true }), true);
});

test("Firestore rules enforce journal privacy and drawing ownership at collection boundaries", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const authoritativeRules = readFileSync(new URL("../../Firebase.js", import.meta.url), "utf8");
  assert.equal(
    authoritativeRules.replace(/\r\n/g, "\n"),
    rules.replace(/\r\n/g, "\n"),
    "the user-designated Firebase.js rules source must match the deployable repository rules"
  );
  const dmJournal = rules.slice(
    rules.indexOf("match /dmJournal/{entryId}"),
    rules.indexOf("match /sharedDrawings/{strokeId}")
  );
  const personalJournal = rules.slice(
    rules.indexOf("match /personalJournal/{entryId}"),
    rules.indexOf("match /dmJournal/{entryId}")
  );
  const sharedDrawings = rules.slice(
    rules.indexOf("match /sharedDrawings/{strokeId}"),
    rules.indexOf("match /dmDrawings/{strokeId}")
  );
  const dmDrawings = rules.slice(
    rules.indexOf("match /dmDrawings/{strokeId}"),
    rules.indexOf("match /maps/{mapId}")
  );

  assert.match(dmJournal, /allow read:\s*if isRoomDm\(roomCode\)/);
  assert.doesNotMatch(dmJournal, /isRoomMember\(roomCode\)/);
  assert.match(personalJournal, /resource\.data\.ownerUid == request\.auth\.uid/);
  assert.match(sharedDrawings, /playerDrawingEnabled\(roomCode\)/);
  assert.match(sharedDrawings, /resource\.data\.authorUid == request\.auth\.uid/);
  assert.match(sharedDrawings, /allow update:\s*if false/);
  assert.match(dmDrawings, /allow read:\s*if isRoomDm\(roomCode\)/);
  assert.match(rules, /request\.resource\.data\.points\.size\(\) <= 512/);
});

test("app integration keeps new listeners modular and cleans room-owned records", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const build = readFileSync(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /createJournalSystem/);
  assert.match(app, /createMapDrawingSystem/);
  assert.match(app, /journalSystem\.disconnect\(\)/);
  assert.match(app, /mapDrawingSystem\.disconnect\(\)/);
  for (const collection of [
    "sharedJournal", "personalJournal", "dmJournal", "sharedDrawings", "dmDrawings"
  ]) {
    assert.match(app, new RegExp(`"${collection}"`));
  }
  assert.match(build, /"journal"/);
  assert.match(index, /journal\/journal\.css/);
  assert.match(index, /battleMap\/drawingTools\.css/);
});
