# Beta 1.0 playtest gate

## Purpose

The Beta 1.0 gate proves that one DM and one player can complete a representative campaign session without using production data. It runs the real application in independent browser profiles against local Firebase Authentication and Firestore emulators, with the repository's current security rules.

Run it with:

```text
pnpm run test:stage8:browser
```

Java 21 or another Firebase Emulator-compatible Java runtime must be available on `PATH`.

## Latest verified run

Verified on 2026-10-24:

- `pnpm test`: passed;
- `pnpm run test:rules`: 24 passed;
- `pnpm run test:browser`: 200 passed;
- `pnpm run test:movement:browser`: 2 passed;
- `pnpm run test:stage8:browser`: 1 complete DM/player campaign passed.

## Automated campaign

`tests/beta-playtest.spec.mjs` verifies:

- guest DM authentication and registered player authentication;
- room creation, player join, removal, fresh-session denial, and deliberate rejoin;
- a real Character Creator draft save and a linked battle-map token;
- the real map upload UI, with only the external Cloudinary response replaced by a deterministic hosted-image response;
- a three-floor dungeon with two bidirectional stair connections;
- fog settings, a reveal operation, and owner-private exploration state;
- a shared locked door plus a physically private trap and puzzle definition;
- initiative start/end, an atomic tracked move, attack economy, a spell-impact record, combat VFX, a condition, damage, and healing;
- shared, personal, and DM-private campaign notes;
- simultaneous DM/player shared drawing writes;
- full refresh of both browser profiles and persistence of campaign state;
- denial of player room-admin writes and DM-private reads;
- absence of uncaught browser errors during the successful workflow.

The test uses three browser profiles over its lifetime: the live DM and player profiles, followed by a clean profile that signs back into the removed player's registered account. This prevents an already-authorized local cache from being mistaken for post-removal access.

## Supporting automated coverage

The complete release gate also relies on the existing suites for focused edge cases:

- Firestore privacy, ownership, revisions, deleted-room tombstones, token movement, floors, objects, puzzles, fog, journals, and combat turns: `tests/firestore-rules-emulator.test.mjs`.
- Offline/failed-save messaging: `tests/creator-refresh-state.test.mjs`, `tests/journal-drawing.spec.mjs`, `tests/fog-of-war.spec.mjs`, and `tests/multi-floor.spec.mjs`.
- Account-owned data isolation across logout/login and owner switches: `tests/vfx-animation-content.test.mjs` and `tests/vfx-animation-deletion.test.mjs`.
- Mobile and desktop layouts: the Character Creator, battle-map, journal/drawing, multi-floor, object, puzzle, Workshop, and creator browser suites.
- Large Character Creator state and weak-CPU behavior: `tests/character-creator-performance.spec.mjs`.
- 100-token, 100-object, and 500-effect battle-map rendering: `tests/battle-map-performance.spec.mjs`.

## Confirmed defect fixed by this gate

A player who received a shared-map update while another screen was active had fresh room data but could return to a stale Room/Battle map display. Entering Room or Battle now reapplies the latest room snapshot, and opening another campaign clears the previous room's transient data before its first snapshot arrives.

Starting spell targeting from an already-open battle map also performed a redundant screen/listener restart. In test-mode and other transient-token flows, that could remove the linked caster token between preview and confirmed casting. Targeting now keeps the active battle screen and token state intact.

## Manual checks still required before a public beta

- Perform one real Cloudinary upload and delete in the intended production account. Automated tests exercise the application upload path but replace the third-party response to avoid creating external assets.
- Run a short multi-device session on the browsers and touch hardware selected for beta support.
- Confirm production Firebase rules match the reviewed `firestore.rules` before publishing. This gate never deploys rules or writes production data.
- Check monitoring, backup/export readiness, and the release rollback procedure with the production owner.

## Release policy

The Beta gate must pass together with `pnpm test`, `pnpm run test:rules`, `pnpm run test:browser`, and `pnpm run test:movement:browser`. Do not publish from a run with any critical data-loss risk, privilege escalation, false save-success state, broken main campaign workflow, or uncaught browser error.
