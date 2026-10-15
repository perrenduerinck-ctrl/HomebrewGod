# Firebase persistence audit — 2026-10-14

Status: **CODE COMPLETE — LIVE VERIFICATION PENDING**

Production Firestore rules: **NOT VERIFIED**. No production Firebase deployment or production-data mutation was performed during this pass.

## Confirmed repairs

1. Permission failures were reporting guessed causes. Character listeners treated every `permission-denied` as a confirmed missing membership, while character saves treated an authenticated user with a room code as a confirmed member. Diagnostics now report membership and ownership as `unknown` unless the client has direct evidence.
2. Generic `aborted` and `failed-precondition` errors were being presented as revision conflicts. Only an explicit stale revision signal now receives the newer-version message.
3. Shared revisioned creator persistence inferred authentication from record ownership. It now receives the active actor UID and reports observed ownership separately from authentication.
4. Opening a saved room recreated a missing membership before checking room access. Saved-room reopening now performs a read-only recovery attempt and never silently restores a removed membership. Entering a room code through the explicit Join flow remains the deliberate admission mechanism.
5. A direct account switch could retain old room listeners until the new account finished loading. Auth transitions now clear old room state first and use a generation guard to reject late async work.

## Authorization and persistence inventory

| Feature | Firestore path | Read boundary | Write boundary | Revision/concurrency behavior |
| --- | --- | --- | --- | --- |
| Rooms | `rooms/{roomCode}` | Room members | DM; narrowly validated player movement/action requests | Room transactions for initiative and movement |
| Membership | `rooms/{roomCode}/players/{uid}` | Room members | Self player record or DM | Room-code join is the current admission model |
| Characters | `rooms/{roomCode}/characters/{id}` | Room members | Owner or room DM | Sequential revision; transaction on existing saves |
| Tokens | `rooms/{roomCode}/tokens/{id}` | Room members | DM; owner for validated movement/sync/connection transitions | Movement and floor transitions have field allowlists |
| Maps and puzzle tiles | `rooms/{roomCode}/{maps,puzzleTiles}/{id}` | Room members | DM | Stable document IDs; Cloudinary assets remain references |
| Scenes/floors/connections | `rooms/{roomCode}/scenes/{sceneId}/...` | Room members | DM definitions; validated owner token transition | Dedicated documents avoid unbounded room records |
| Initiative/combat turns | Room state and `combatTurns/{tokenId}` | Room members | DM initiative; active token owner for validated economy | Turn keys and sequential turn revisions |
| Monsters and room animations | Room subcollections | Room members | DM | Existing owner and revision contracts retained |
| Personal creator libraries | `users/{uid}/{magicItems,spells,npcs,npcRelationships,encounters,summons}/{id}` | Account owner | Account owner | Sequential revision transactions |
| Personal animations/library index | `users/{uid}/{animations,libraryIndex}/{id}` | Account owner | Account owner | Ownership fields must match the path UID |
| Journal | Separate shared, personal, and DM subcollections | Visibility-specific rules | Owner/DM by visibility | Sequential journal revision |
| Drawings | Separate shared and DM subcollections | Members or DM-only | Stroke author/DM with player-drawing policy | Completed-stroke writes; no cross-author update |
| Workshop | `workshopAssets`, versions, favorites, imports, collections | Visibility and membership rules | Author/account owner | Immutable versions and author-preserving summaries |

## Rules parity

- Repository source: `firestore.rules`.
- User-designated authoritative local source: `../Firebase.js`.
- Local sources are byte-identical after this pass (SHA-256 `3FEAC8B7B0DB0FBAB4F5AC325CE90FBB5206CAD5AC116C5E230636771572E7DE`).
- Client compatibility: the proposed rules include scene/floor/connection reads, DM definition writes, and narrowly validated player token transitions.
- Production parity: **NOT VERIFIED**.
- Deployment approval required: **yes**, before multi-floor writes can work on the live site.

## Known authorization limitation

The product currently treats possession of a valid room code as permission to create one's own player membership. Removing a membership blocks reads immediately, and saved-room reopening no longer recreates it. However, a former member who still knows the room code can deliberately use Join again. A durable ban/revocation system would require a separate DM-managed deny list or invite model; this pass does not invent one.

## Verification

- Node unit suite: passed.
- Firebase diagnostic, character realtime, listener, persistence, movement, initiative, elevation, token collision, room deletion, and multi-floor regressions: passed.
- Targeted Chromium multi-floor UI tests at desktop/mobile widths: passed.
- Syntax and import graph: passed.
- Local Firestore Emulator: not run because Java is unavailable on this workstation.
- Branch CI is the intended rule-emulator gate because the workflow installs Java 21.
- Live Firebase saves and production rule parity: unverified by design.

## Deployment procedure after owner approval

1. Review the `firestore.rules` diff and confirm it remains identical to `../Firebase.js`.
2. Confirm branch CI, including `pnpm run test:rules`, is green.
3. From the reviewed commit, run `firebase deploy --only firestore:rules --project homebrewgd`.
4. Perform a disposable DM/player smoke test: create a location, add two floors, move an owned token through an enabled connection, and verify a non-owner update is denied.

