# Puzzle and environment interaction boundary

Stage 5 extends interactive map objects; it does not add another token, map,
animation, sound, or clock system.

## Storage and privacy

Puzzle definitions live at `rooms/{roomCode}/dmPuzzles/{puzzleId}`. This is a
physically DM-only collection. Players cannot list or read trigger order,
hidden progress, reset baselines, or target actions. Firestore rules enforce
that boundary and sequential revisions.

Shared objects remain in `objects`; hidden objects remain in `dmObjects`.
Players interact only with permitted shared objects through the existing
distance- and ownership-checked object transaction. The DM's puzzle engine
observes the resulting authoritative object revision and applies approved
target actions.

## Puzzle contract

A puzzle contains:

- one to twenty trigger rows (`objectId`, required `stateId`);
- a trigger mode: all, any, or ordered sequence;
- one to twenty target actions (`objectId`, `stateId`, lock behavior);
- reset actions captured from the linked objects' original states;
- DM-private runtime progress and a sequential revision;
- explicit cross-floor permission, disabled by default.

Puzzle inputs and outputs are stable object IDs. Renaming, moving, resizing, or
changing the artwork for an object does not break a connection. Missing objects
produce a visible puzzle error instead of silently targeting a replacement.

## Execution safety

Every reactive chain receives an execution ID. Objects changed by a puzzle keep
that ID long enough for another puzzle to react. Each puzzle can execute once
per chain, and a chain is capped at 32 object changes. This prevents circular
lever/door links from running forever.

Reset uses a separate suppressed execution ID, restores every captured source
and target state, clears sequence progress, and does not re-trigger the puzzle
being reset.

## Existing systems reused

- Object persistence owns all object state writes and revision handling.
- Object snapshots drive the existing animation player, so a target object's
  assigned animation and optional animation sound play for connected clients.
- Closed-door movement and sight blocking continue through the Stage 4 object
  collision and vision geometry.
- Room deletion uses the shared room-owned collection inventory.
- Listener cleanup follows the existing battle-screen and room lifecycle.

## Operational limitation

Puzzle evaluation runs in the connected DM session, matching the normal live
table workflow. Object interactions remain safely persisted if the DM is
offline, but ordered sequence history is not reconstructed without an active DM
listener. Moving this evaluation to a trusted server can be considered later if
offline puzzle automation becomes a product requirement.
