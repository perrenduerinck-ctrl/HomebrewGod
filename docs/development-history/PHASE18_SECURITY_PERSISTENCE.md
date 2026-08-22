# Phase 18 — Security and Persistence

Phase 18 adds repository-level security boundaries for Firebase and Cloudinary, ownership enforcement, stale-edit protection, recovery behavior, and connection-state feedback.

## Firestore security

`firestore.rules` is deny-by-default. It requires Firebase Authentication and applies these boundaries:

- A room can be read only by its DM or a user with a `rooms/{roomCode}/players/{uid}` membership document.
- A user can create only their own membership document. The client creates that membership before attempting to read a joined room.
- Character documents require `roomCode` and `ownerUid`. The owner or room DM may update/delete them, and ownership is immutable. A DM may repair an older record that has no `ownerUid`.
- Monster documents are writable only by the room DM and must be owned by that DM.
- Maps, puzzle tiles, tokens, classes, species, and backgrounds are room-readable and DM-writable.
- User profiles and saved-room shortcuts are accessible only to that user.
- Any unmatched document is denied.

The Firebase project alias is `homebrewgd`, matching the project used by `app.js`.

## Cloudinary security

The browser no longer contains or uses the `homebrewgod_maps` unsigned upload preset. Uploads go to `uploadCloudinaryImage`, which:

- verifies a Firebase ID token;
- verifies room membership and requires the DM for map, puzzle, and token images;
- accepts only JPEG, PNG, WebP, GIF, or AVIF;
- limits decoded uploads to 8 MB;
- checks file magic bytes against the declared MIME type;
- writes into `homebrewgod/{roomCode}` only.

`deleteCloudinaryAsset` is no longer empty. It verifies authentication, membership/ownership, the managed room folder, and remaining Firestore references before deleting.

The old unsigned preset must also be disabled in the Cloudinary dashboard. If it must temporarily remain enabled during deployment, restrict it to images, 8 MB, the required formats, and the managed folder. The repository intentionally has no unsigned fallback.

## Persistence and recovery

- Character and monster mutations re-read the exact Firestore document before update/delete.
- Character ownership and monster DM ownership are checked in both the client and Firestore rules.
- Revision timestamps reject stale simultaneous edits instead of silently overwriting a newer save.
- Existing character draft migrations and JSON backups remain in place.
- Older ownerless characters can be repaired only by the room DM.
- Interrupted room deletion retains its existing rollback behavior: a failed cleanup clears `deletingAt` so the room can be used again.
- Firebase snapshot metadata plus browser online/offline events drive a visible connection banner.
- Firebase and Cloudinary failures use stable, user-facing error messages.

## Deployment

This phase updates GitHub only; it does not change the live Firebase or Cloudinary accounts by itself. An authorized maintainer can activate the committed boundaries with:

```text
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
firebase deploy --only firestore:rules,functions
```

Set `CLOUDINARY_CLOUD_NAME` to `dkezxpnl6` if the Firebase parameter prompt does not use its committed default. Disable the old unsigned preset after the secure functions are deployed.

## Verification

- `ai-testing/security-persistence-self-test.html`
- `ai-testing/character-creator-self-test.html`
- `ai-testing/monster-creator-self-test.html`
- `ai-testing/app-smoke-test.html`

The security self-test covers client validation, access decisions, stale revisions, disconnect/reconnect transitions, deletion recovery, rules presence, endpoint authentication, and removal of unsigned uploads.
