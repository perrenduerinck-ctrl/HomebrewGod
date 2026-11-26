# Spell outcome automation — first pass

Confirmed supported casts store their rolled amounts and selected targets with the
caster's existing play state. This write also spends the spell resource. Requests
survive reloads and reach the room DM through the compact Spell results panel.

The DM confirms attack hits, critical hits, or saving-throw results and applies the
results once. HP, temporary HP absorption, concentration checks, conditions, and
the completed-cast marker commit in one transaction. Retrying cannot apply the same
saved cast twice. Missing or relinked targets and changed maps/floors abort the
operation. Players can submit casts but cannot apply other actors' HP or effects.

Known exact damage resistances, vulnerabilities, damage immunities, and condition
immunities are honored. The DM can also specify damage adjustments or condition
immunity when a conditional rule is not present in the saved statistics. Rolls
are retained; changing a result or retrying does not reroll amounts.

Conditions use the existing effects system, including its turn and world-time
expiry, modifiers, and visuals. Linked actors retain condition-source maps so
another token for the actor cannot bypass incapacitation. Concentration effects
belong to a particular concentration instance, including same-spell recasts.
Restoration removes the chosen condition without removing unrelated conditions.
Repeat-save effects expose a save-result control; the DM supplies the actual
saving throw total. Spell timing metadata is stored in the existing `timing` map,
so no production permission-rule change is needed.

## Supported first-pass spells

Acid Splash, Chill Touch, Eldritch Blast, Fire Bolt, Frostbite, Poison Spray,
Ray of Frost, Sacred Flame, Shocking Grasp, Vicious Mockery,
Burning Hands, Dissonant Whispers, Guiding Bolt, Inflict Wounds, Magic Missile,
Ray of Sickness, Scorching Ray, Shatter, Thunderwave, Fireball, Lightning Bolt,
Cone of Cold, Finger of Death, Cure Wounds, Healing Word, Mass Cure Wounds,
Mass Healing Word, Heal, Lesser Restoration, Hold Person, Hold Monster,
Blindness/Deafness, Charm Person, Entangle, Grease, Hypnotic Pattern,
Hideous Laughter, and Greater Invisibility. Only definitions actually present
in the catalog are counted by the automated coverage test.

The supported damage/healing amount and listed conditions are automated. Other
rules, such as forced movement, reaction restrictions, sight-dependent modifiers,
standing up, escape checks, or conditional spell endings, still require normal
adjudication. An explicit Other spell rules section distinguishes this boundary.

## Remaining work

- Persistent damage/healing zones, recurring turn triggers, and delayed weapon-hit effects.
- Split healing pools, selectable multi-type damage, and other complex spell-specific outcomes.
- Additional condition triggers and special saves/contests.
- Summoned creature creation and stat-block lifecycle.
- Private DM-only caster/target workflows. These currently retain existing controls
  so private targets are not copied into shared character result records.

The current batch supports up to 24 targets and retains up to 24 pending casts per
caster plus recent completed results. Wider areas fall back to the existing
controls. Resolve or dismiss a full pending queue before adding another automated
cast.

## Verification

Pure calculation and transaction tests cover slot/cantrip scaling, damage/save
math, critical hits, projectiles, temporary HP absorption, concentration instance
expiry, restoration, actor aliases, and rollback. Isolated Firestore tests cover
concurrent DMs, player permissions, atomic casts, full-size areas, monsters, and
removal after token deletion. Browser room journeys exercise the visible casting
and results controls, source-specific healing, restoration, concentration cleanup,
cantrip scaling, reloads, and player-to-DM handoff.
