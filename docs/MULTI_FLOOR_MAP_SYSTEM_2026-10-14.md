# Multi-floor battle map system — 2026-10-14

## Storage model

- `rooms/{roomCode}/scenes/{sceneId}`: location summary.
- `rooms/{roomCode}/scenes/{sceneId}/floors/{floorId}`: one map, base elevation, order, grid, lighting metadata, description, and DM notes.
- `rooms/{roomCode}/scenes/{sceneId}/connections/{connectionId}`: stairs, ladders, trapdoors, elevators, portals, and custom transitions.
- `rooms/{roomCode}/scenes/{sceneId}/dmFloorNotes/{floorId}`: private DM-only floor notes, physically separated from member-readable floor records.
- `rooms/{roomCode}`: bounded shared view pointers only (`activeSceneId`, `activeFloorId`).
- `rooms/{roomCode}/tokens/{tokenId}`: optional `sceneId`, `floorId`, absolute elevation, and height-above-floor metadata.

Legacy rooms keep using `currentMap` and unassigned tokens without migration. Creating a location offers an optional assignment of current legacy tokens to its first floor. Saved map URLs and Cloudinary public IDs are referenced rather than copied or uploaded again.

## Runtime behavior

- Only the selected floor's map, tokens, and drawing scope render.
- Floor-view changes never modify token records.
- DM floor selection can broadcast through the room document.
- Players may turn off Follow DM and inspect available floors independently.
- Initiative remains room-wide. Its rows show a token's floor and the DM can locate that combatant.
- Player connection use is allowed only for an owned token, an enabled connection, and exploration outside active initiative. Combat transitions require DM adjudication, preventing a floor change from bypassing tracked movement.
- DM transfer is an explicit override and changes the existing token document rather than creating a copy.
- Absolute token elevation remains independent of floor assignment. Flying does not move a token between floors.
- Drawings use `scene:{sceneId}:floor:{floorId}` as their map scope, so reused images do not share strokes.
- Cross-floor creatures are not rendered as local targets, avoiding automatic targeting through ceilings or floors.

## Deletion and failure behavior

- A floor or location cannot be deleted while tokens still reference it.
- Deleting a floor also removes its connection documents but never deletes the saved map image.
- Room deletion now removes scene floors and connections before deleting each scene.
- A missing floor image shows the existing map-load failure state without deleting the floor record.
- Scene/floor listeners are replaced on location changes and disconnected on room/account exit.

## Verification scope

Automated checks cover floor ordering, 20-floor dungeons, negative elevations, map references, stable drawing scopes, token filtering, connection direction, cancellation, DM override, flying, spatial distance, legacy conversion, room cleanup inventory, desktop switching, connection UI, and mobile overflow.

Firestore Emulator evaluation and a real two-client Firebase session remain pending branch CI and approved production-rule deployment.
