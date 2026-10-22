# Fog of War privacy boundary

Fog and vision are presentation controls. DM-only token storage is the security boundary for unrevealed enemies.

## Protected now

- Only the room DM can create or delete sight-blocking walls.
- Each `visionExploration` record is readable by its owner and the room DM, not by other players.
- Manual Fog of War settings and operations are writable only by the room DM.
- Shared tokens live in `rooms/{roomCode}/tokens/{tokenId}` and remain readable by room members.
- Unrevealed tokens live in `rooms/{roomCode}/dmTokens/{tokenId}` and are readable only by the room DM.
- The DM client merges both collections. Player clients never subscribe to or receive the DM-only collection.
- Hide/reveal moves a token between collections in one Firestore transaction while preserving its token ID and record data.
- DM-only tokens cannot be placed in the room-shared initiative state. Reveal them first.

## Existing campaigns

Legacy tokens remain shared by default so existing campaigns render exactly as before. A DM can edit a token and enable **DM-only hidden token** to migrate that record into secure storage. New tokens can be created directly as DM-only from the token controls.

Fog alone does not make a shared token private. The token must be marked DM-only.

## Enforcement and verification

Firestore rules reject player reads and every non-DM write to `dmTokens`. They also reject records marked `visibility: "dm"` in the shared token collection. Firestore Emulator coverage verifies DM access, player denial, and shared-token compatibility.
