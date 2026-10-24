# Character and Combat Integration

Stage 6 is an audit-and-repair pass over the existing Character Creator,
playable sheet, linked-token, Combat Action Bar, initiative, movement, gameplay
effects, and combat-presentation systems. It does not introduce a second
character or combat model.

## Authoritative data flow

- Character choices and gameplay resources remain on
  `rooms/{roomCode}/characters/{characterId}`.
- Linked map tokens remain projections of the character's name, portrait,
  size, HP, AC, Dexterity/initiative, movement modes, vision, owner, and saved
  revision.
- A confirmed character save refreshes only tokens linked to that exact
  character and only when the actor may update those tokens.
- Initiative and movement remain room-scoped. Confirmed movement updates the
  token position and room movement budget in one transaction.
- Per-turn actions, bonus actions, reactions, Extra Attack, Action Surge, and
  Dash are tracked through the existing `combatTurns` and `movementState`
  records.
- Actions and bonus actions remain limited to the active token. A controlled
  combatant may spend its reaction off-turn exactly once, and that reaction is
  refreshed atomically when its next turn begins.
- Spell slots, class/feat resources, and consumable quantities are changed in
  the same Firestore transaction as their action-economy cost. Previewing or
  cancelling does not spend them.
- Gameplay effects remain in the existing `effects` collection and expire from
  authoritative initiative turn counters or campaign world time.
- Combat Log entries are generated only from confirmed local gameplay events;
  unverified values are ignored and stable event IDs are deduplicated.

## Compatibility repair

The Battle Map listens directly to saved character documents. Older saved
characters may store normal spell slots as
`magic.spellSlots[level] = { maximum, used }`, while current characters use
`magic.slots` plus `magic.slotUsage.normal`.

The shared combat command adapter accepts both representations. A confirmed
legacy cast updates the current usage ledger and mirrors the `used` count back
to the legacy record without mutating the original in-memory character or
discarding unknown fields. Slot type and level are revalidated at commit time,
so stale or malformed selections cannot spend an ineligible slot.

## Deliberate manual resolution

Attack rolls, saving throws, damage rolls, contested checks, and adjudication
remain manual unless the existing record contains enough reliable structured
data. The system tracks confirmed resource use and presentation without
inventing missing D&D rules.

## Verification

Run the focused non-browser suite with:

```text
pnpm run test:character-combat
```

The relevant browser coverage includes Character Creator UI, Combat Action
Bar, gameplay effects, Battle Map game-feel, the playable character sheet,
class/multiclass state, and confirmed spell targeting.
