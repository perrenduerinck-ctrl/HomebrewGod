# Object System integration boundary

Object System v1 is implemented through the boundaries in this document without
creating another token, effect, or navigation stack.

## Entity contract

Objects are plain serializable room entities. Runtime DOM nodes, animation
controllers, listeners and upload handles must never be stored in Firestore.

```js
{
  id: "object-uuid",
  roomCode: "ABC-123",
  kind: "object",
  name: "Stone Door",
  imageUrl: "https://...",
  sceneId: "scene-id",
  floorId: "floor-id",
  mapId: "scene:scene-id:floor:floor-id",
  transform: { x: 50, y: 50, width: 12, height: 18, rotation: 0 },
  locked: false,
  stateId: "closed",
  visibility: "shared",
  interactionDistanceFeet: 10,
  interactionRadius: { x: 3.2, y: 5.4 },
  revision: 1,
  createdByUid: "uid",
  createdAtMillis: 0,
  updatedAtMillis: 0
}
```

Shared objects use `rooms/{roomCode}/objects/{objectId}`. Physically private DM
objects use `rooms/{roomCode}/dmObjects/{objectId}` so a player query can never
download hidden traps or other private records. The DM subscribes to both while
players subscribe only to shared objects. Firestore rules remain authoritative.
Player transitions require a selected owned shared token on the same scene/floor
and inside the persisted interaction radius. Hiding an editor is not a permission
boundary.

## Host interfaces

Keep the persistence, rendering and interaction responsibilities separate:

`battleMap/objectPersistence.js` owns listeners and writes,
`battleMap/objectModel.js` owns normalization, state transitions, distance,
collision, and vision geometry, and `battleMap/objectSystem.js` owns the map UI.

The renderer should consume normalized object records and use the existing map
coordinate, zoom and elevation utilities. It should not reuse token ownership,
HP, initiative or D&D-specific fields.

## Existing hooks to reuse

- Navigation: add Object Creator under CREATE and Objects under LIBRARY only
  after those screens exist. Route them through `ui/navigation/sidebar.js`.
- Map lifecycle: connect one object listener through the existing screen/room
  listener lifecycle in `app.js`; disconnect it when leaving the room.
- Presentation: optional object Animation IDs use the existing Source/Target
  animation player. Only the animation reference is persisted.
- Combat consequences: listen to `homebrewgod:combat-impact` and translate an
  approved gameplay consequence into an object command. Visual impact events
  alone must never mutate objects.
- Durable effects: temporary object states should reference the existing combat
  effect ID and duration model. They must not create a second clock.
- Vision and movement: closed blocking objects contribute geometry to the
  existing vision calculation, and tracked movement rejects paths through
  blocking objects.
- Uploads: object images are HTTPS-only references. Their Cloudinary public IDs
  participate in existing room-deletion reference checks and cleanup.

## Future state contract

Object states should be data, not bespoke Door/Barrel code:

```js
{
  id: "burning",
  imageUrl: "https://...",
  collision: "solid",
  blocksMovement: true,
  blocksVision: false,
  light: null,
  animation: null,
  interactions: []
}
```

State changes should be explicit commands containing object ID, prior revision
and next state ID. Revision checks prevent a delayed effect or replay from
overwriting a newer DM edit.

## Still deferred

Puzzle-triggered object chains are implemented by the separate Stage 5 boundary
in `PUZZLE_ENVIRONMENT_SYSTEM.md`. Automated destructible-terrain damage, boss
phases, combat rewind, NPC networks and AI dialogue remain outside Object
System v1.
