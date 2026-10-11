# Firebase permissions and persistence audit — 2026-10-11

## Deployment contract

- Firebase project: `homebrewgd`.
- GitHub Pages deploys the browser application only.
- Firestore rules deploy separately from `firestore.rules` through Firebase.
- The user-designated `../Firebase.js` is the authoritative local rules source.
- At the start of this pass, `Firebase.js` and `firestore.rules` had identical
  SHA-256 hashes. This pass does not change either file.
- The release workflow runs the Firestore emulator but intentionally does not
  deploy production rules.

## Firestore path inventory

| Scope | Collections used by the client | Authorization model |
| --- | --- | --- |
| Account | `users/{uid}` and `rooms` | Account owner only |
| Personal content | `animations`, `magicItems`, `spells`, `npcs`, `npcRelationships`, `encounters`, `summons`, `libraryIndex`, `workshopFavorites`, `workshopImports`, `workshopCollections`, `workshopLibrary` under `users/{uid}` | Account owner only; revisioned creator records require sequential revisions |
| Workshop | `workshopAssets/{assetId}` and `versions/{version}` | Author writes; authenticated visibility-aware reads |
| Room identity | `rooms/{roomCode}`, `players`, `activePlayers` | Room DM or explicit membership as defined per operation |
| Room creators | `characters`, `monsters`, `classes`, `species`, `backgrounds` | Character owner or DM for characters; DM for other creator records |
| Battle map | `maps`, `puzzleTiles`, `tokens`, `combatTurns` | DM writes except validated owner movement, linked-character token sync, and active-token combat turns |
| Presentation | `animations`, `combatEffects`, `effects` under a room | DM for room animations/gameplay effects; room member ownership for combat effects |
| Journal | `sharedJournal`, `personalJournal`, `dmJournal` | Member-shared, owner-private, and DM-private respectively |
| Drawing | `sharedDrawings`, `dmDrawings` | Completed-stroke writes; player drawing setting enforced; DM-private layer protected |

The rules contain an explicit match for every collection above and finish with
deny-all fallbacks for unknown room and root paths. Cloud Functions use the Admin
SDK and are outside client security-rule evaluation.

## Confirmed client defects repaired

1. A brand-new Character Creator draft had no saved document ID, but its first
   write reused the draft's loaded revision (`0`). Firestore correctly requires
   a character revision of at least `1`, so the first Save Draft or Finalize was
   rejected as `permission-denied`. New documents and duplicated drafts now
   start at revision `1`; existing documents retain atomic revision comparison.
2. Saved-room shortcuts opened a room listener directly. If a legitimate
   player's membership document had gone missing, the listener failed before the
   normal join flow could repair it. Saved rooms now pass through `joinRoom`,
   which recreates the caller's own membership before opening listeners.
3. Firebase failures exposed a generic permission message or the raw SDK text.
   Shared diagnostics now record only safe context: feature, operation, path,
   Firebase code, authenticated state, membership state, expected role, and
   revision state. UID values, tokens, and document contents are excluded.

## Compatibility and security decisions

- Existing IDs, timestamps, ownership fields, schemas, and unknown character
  fields remain preserved.
- Legacy ownerless characters remain DM-repair-only; players do not gain a claim
  path.
- No rule was broadened and no public read/write fallback was added.
- Failed character saves keep the in-memory and browser recovery draft and do
  not display a success message.
- Production Firebase deployment remains manual and separate from GitHub Pages.

## Verification coverage

The emulator suite now covers signed-out, member, non-member, owner, non-owner,
DM, legacy-ownerless, stale-revision, deleted-room, private journal, drawing,
combat, personal library, account index, room creator, animation/effect, and
Workshop visibility paths. Client contract tests cover first-save revision
planning, duplicate revision reset, transaction wiring, saved-room membership
repair, safe diagnostics, and actionable user messages.
