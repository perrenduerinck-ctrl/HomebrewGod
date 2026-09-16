# Object System integration boundary

This milestone does not implement map objects. It reserves the boundaries that
Object System v1 should use so it can be added without creating another token,
effect or navigation stack.

## Entity contract

Objects should be plain serializable room entities. Runtime DOM nodes, animation
controllers, listeners and upload handles must never be stored in Firestore.

```js
{
  id: "object-uuid",
  roomCode: "ABC-123",
  kind: "object",
  name: "Stone Door",
  imageUrl: "https://...",
  transform: { x: 50, y: 50, width: 120, height: 180, rotation: 0 },
  layer: "objects",
  locked: false,
  stateId: "closed",
  createdByUid: "uid",
  createdAtMillis: 0,
  updatedAtMillis: 0
}
```

The first implementation should use `rooms/{roomCode}/objects/{objectId}` and a
single room listener, following the token collection's listener ownership and
cleanup pattern. Firestore rules remain authoritative; hiding an editor is not a
permission boundary.

## Host interfaces

Keep the persistence, rendering and interaction responsibilities separate:

```js
createObjectStore({ listen, create, update, remove })
createObjectLayer({ render, hitTest, clear })
createObjectInteractionController({ select, move, resize, rotate, duplicate })
```

The renderer should consume normalized object records and use the existing map
coordinate, zoom and elevation utilities. It should not reuse token ownership,
HP, initiative or D&D-specific fields.

## Existing hooks to reuse

- Navigation: add Object Creator under CREATE and Objects under LIBRARY only
  after those screens exist. Route them through `ui/navigation/sidebar.js`.
- Map lifecycle: connect one object listener through the existing screen/room
  listener lifecycle in `app.js`; disconnect it when leaving the room.
- Presentation: object animations should use the existing Source/Target
  animation runtime. Persist only animation references.
- Combat consequences: listen to `homebrewgod:combat-impact` and translate an
  approved gameplay consequence into an object command. Visual impact events
  alone must never mutate objects.
- Durable effects: temporary object states should reference the existing combat
  effect ID and duration model. They must not create a second clock.
- Uploads: use the existing secure image validation/upload flow and HTTPS-only
  persisted URLs.

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

## Explicitly deferred

Object placement, object states, reactive terrain, destructible terrain, boss
phases, combat rewind, NPC networks and AI dialogue remain outside this
milestone. Object System v1 is the next feature after this foundation ships.
