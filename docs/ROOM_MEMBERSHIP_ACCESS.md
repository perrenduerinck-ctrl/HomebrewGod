# Room Membership Access

Updated October 31, 2026.

Homebrew God still supports ordinary room-code joining. A DM can now revoke a
saved player membership and create a private deny-list record at
`rooms/{roomCode}/bannedUsers/{uid}`. The blocked account cannot restore its own
membership by entering the room code again.

## Security boundary

- Only the room DM can read or write the deny list.
- A player-membership create is denied when a matching deny-list record exists.
- Room membership also checks the deny list, so a ban revokes reads even if a
  stale membership document still exists.
- The DM operation creates the ban, removes the membership, and clears matching
  active-session records in one Firestore batch.
- Removing a ban does not silently recreate membership. The player must
  deliberately join again with the room code.
- Deny-list records are included in permanent room cleanup.

The Room Access panel is DM-only. It lists saved campaign memberships separately
from blocked accounts and requires confirmation before either action.

## Deployment requirement

The client panel must not be released before the matching `firestore.rules`
change is deployed. Without those rules the UI cannot securely prevent a
blocked account from creating a new membership. Run the Firestore emulator
suite and deploy the reviewed rules before publishing the client change to
production.
