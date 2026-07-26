# Phase 12 — Manual and Situational Feats

Phase 12 turns the legacy situational feat text into structured,
player-facing reminders without claiming that the app can detect combat-table
events.

## Handling modes

- **Automatic** — the reminder always applies when its written condition is
  true; no counter or player toggle is required.
- **Tracked** — the app stores a current/maximum use counter and a recharge
  label. The player still decides when the condition is met.
- **Manual** — the sheet gives exact timing, conditions, and use instructions;
  the player or DM applies the result.

Every reviewed effect also records one of the supported action-economy labels:
Action, Bonus action, Reaction, or Passive. Limited and per-target effects
include explicit recharge and usage labels.

## Sheet placement

- Attack-related conditions appear directly below the attack table.
- Defensive conditions appear in **Feat Defenses**.
- Other situational effects appear in **Feat Actions & Reminders**.
- The creator's selected-feat cards show handling, action economy, recharge,
  condition, and manual-use instructions.
- Savage Attacker has a stored once-per-turn counter. Healer and Inspiring
  Leader use per-target labels instead of an incorrect global counter.

## Reviewed feats

Bountiful Luck, Charger, Crossbow Expert, Defensive Duelist, Dungeon Delver,
Grappler, Great Weapon Master, Healer, Inspiring Leader, Mage Slayer, Mounted
Combatant, Polearm Master, Savage Attacker, Sentinel, Sharpshooter, Shield
Master, Skulker, and War Caster.

## Regression coverage

Phase 12 adds 24 self-tests: one for each of the six general checklist items
and one for each of the 18 reviewed feats. The complete creator suite contains
384 self-tests.
