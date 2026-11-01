# Homebrew God Stabilization Release Report

Updated October 31, 2026. Reviewed base: `8be2764`.

## Scope completed in this repair slice

This slice addresses the confirmed Character Creator navigation/performance
regression, the guided multiclass test drift, the primary-class subclass-level
calculation, the documented room-membership revocation gap, and the cancelled
release-workflow bottleneck. It does not certify every proposed audit item in
the broader improvement roadmap.

## Confirmed bugs found and fixed

1. Character Creator progress buttons were repeatedly replaced by a DOM
   enhancement observer, detaching the button while browser automation or a
   user attempted to activate it. Progress buttons are now created once and
   updated in place.
2. Step navigation rebuilt the full Character Creator shell. Navigation now
   refreshes the current step, footer, progress, and affected rail entries
   without replacing unchanged navigation nodes.
3. The Class step eagerly built advanced class and progression interfaces,
   causing a large initial DOM and slow navigation. Those interfaces now load
   on request behind clearly labelled advanced controls.
4. The Class step used total character level when deciding whether the primary
   class had reached its subclass level. It now uses the primary class's own
   level.
5. The advanced Class layout could render the multiclass progression editor
   twice, producing duplicate input IDs. The embedded Abilities/level renderer
   can now omit its duplicate editor.
6. Character Creator browser tests still expected the removed legacy
   level-first workflow. They now exercise the guided single-class/multiclass
   planner and verify that the starting class survives an Abilities edit.
7. A DM could remove a membership, but the removed account could deliberately
   recreate it with the room code. A DM-only private deny list now blocks that
   account from room membership until the DM deliberately allows rejoining.
8. The release workflow placed all validation and long browser suites in one
   cancellable job. Static/security validation, two browser shards, movement,
   and authenticated emulator playtests are now independent required jobs.

## Files changed

- Character Creator runtime and tests:
  `characterCreator/index.js`, `characterCreator/uiEnhancements.js`,
  `characterCreator/steps/classStep.js`,
  `characterCreator/steps/abilitiesStep.js`,
  `characterCreator/selfTests.js`, `tests/browser.spec.mjs`, and
  `tests/character-creator-ui.spec.mjs`.
- Room access and security:
  `rooms/memberAccessManager.js`, `app.js`, `index.html`,
  `assets/styles/screens.css`, `firestore.rules`,
  `rooms/roomDeletionPolicy.js`, and the new room-access unit, browser, and
  emulator tests.
- Release reliability and documentation:
  `.github/workflows/release-readiness.yml`, `package.json`, release contract
  tests, `docs/ROOM_MEMBERSHIP_ACCESS.md`, and the Firestore persistence audit.
- The owner-maintained Firestore mirror at
  `C:\Users\perre\OneDrive\Desktop\ai test\Firebase.js` matches
  `firestore.rules` byte-for-byte. It has not been deployed.

## Performance measurements

- Class-step initial rendering fell from approximately 6.0–6.9 seconds to
  approximately 1.0 second in the local browser profile.
- The Class-step DOM fell from roughly 1,768/1,182 nodes in the recorded
  before profiles to 336 nodes after advanced tools became lazy.
- The complete Character Creator stress profile reported an approximate
  2.15-second P95, below its 6-second release limit.
- Full Character Creator shell renders during the measured navigation flow
  fell to two; ordinary step changes use targeted rendering.

## Automated verification completed

- `pnpm test`: passed after all code changes.
- Syntax validation: passed for 446 JavaScript files.
- Import validation: passed for 1,192 local references across 476 files.
- Full browser baseline after the Character Creator repairs: 201 passed across
  two shards (101 + 100).
- Movement browser suite: 2 passed.
- New room-membership unit tests: 2 passed.
- Room deletion policy tests: 3 passed.
- Release contract tests: 23 passed.
- New room-access browser test: 1 passed.
- Focused app smoke and responsive checks after room-access integration:
  3 passed.
- `git diff --check`: passed.

A final redundant browser-shard rerun was stopped after the local Windows
runner produced no progress or result for 14 minutes. Two earlier attempts were
discarded because isolated processes could not reach the installed browser or
local server. These were runner-environment failures, not application
assertions. The split GitHub workflow will rerun every browser test in clean
jobs before allowing Pages deployment.

## Verification still required

1. The Firestore emulator rules suite and authenticated Stage 8 browser suite
   were not rerun locally because Java is unavailable and the attempted JDK
   installation was cancelled. CI now installs Java 21 and runs both gates.
2. Production Firestore rules parity has not been verified or changed.
3. Perform a real two-account DM/player staging check for remove, immediate
   permission loss, failed room-code rejoin, allow rejoin, refresh, and
   reconnect.
4. Perform the roadmap's real Cloudinary upload/retrieval check and two-device
   desktop/mobile session before calling the broad stabilization release fully
   accepted.
5. The broader linked-sheet, multiplayer, battle-map, combat, creator,
   journal, drawing, library, backup, and recovery audit lists were not all
   manually recertified in this slice. Existing automated coverage remains in
   the required release gates.

## Production actions requiring owner approval

1. Review and deploy the matching `firestore.rules` update first.
2. Only after the rules deploy succeeds, publish the client code. Publishing
   the new client first would expose controls that cannot securely enforce the
   deny list under the old production rules.
3. Do not bypass a failed or cancelled security, browser, movement, or
   authenticated emulator job. Pages deployment now depends on all four.

## Deliberately postponed

The proposed campaign backup/restore system, global undo, trusted offline
puzzle evaluation, dashboard additions, and future feature ideas remain
separate development phases. They were not added during this targeted
stabilization work.

## Recommended next step

Run the branch through the new CI workflow. If all four required jobs pass,
deploy the reviewed Firestore rules, complete the two-account membership test,
and then merge/publish the client. Resume the larger roadmap with linked
character-sheet/token synchronization and battle-map multiplayer reliability,
using confirmed defects from staged play rather than speculative rewrites.
