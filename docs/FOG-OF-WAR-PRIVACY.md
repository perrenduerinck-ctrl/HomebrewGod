# Fog of War privacy boundary

Fog and vision are presentation controls, except for the explicitly private exploration records described below.

## Protected now

- Only the room DM can create or delete sight-blocking walls.
- Each `visionExploration` record is readable by its owner and the room DM, not by other players.
- Manual Fog of War settings and operations are writable only by the room DM.

## Not protected yet

Room token documents still live in `rooms/{roomCode}/tokens/{tokenId}` and remain readable by every room member. Hiding a token behind the fog overlay would therefore be visual concealment only; a player could still inspect the token record and its coordinates.

For that reason, Phase 2 does not claim secure hidden enemies and does not add a misleading client-only enemy-hiding switch.

## Required server-side change for secure hidden enemies

Before hidden enemies can be considered private, token persistence must separate DM-only token records from player-readable token projections. A safe migration needs all of the following:

1. A DM-only collection for unrevealed enemy records and coordinates.
2. A player-readable projection created only when the DM reveals an enemy.
3. An atomic reveal/hide workflow that cannot briefly expose the private record.
4. Updated token listeners that merge the private and public sources for the DM without duplicating tokens.
5. A backfill policy for existing campaigns, whose legacy token documents have no privacy classification.
6. Firestore Emulator coverage proving that a player cannot read or query unrevealed enemy records.

This migration should be completed as its own reviewed security stage rather than mixed into map rendering work.
