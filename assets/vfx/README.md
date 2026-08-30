# Supplied VFX artwork

The PNGs in `cantrips/` and `library/` were supplied by the project owner.
They are copied unchanged, with transparent backgrounds retained. The renderer
scales and rotates them at runtime; no image-generation or external upload
service is involved. Only assets used by the selected spell are preloaded.

## Cantrip batch 1

- Ray of Frost: frost-projectile + frost-impact (4x4, 16 frames).
- Frostbite: the same frost-impact sheet, target only.
- Eldritch Blast: force-projectile + force-impact (4x4, 16 frames).
- Shocking Grasp: lightning-impact (4x4, 16 frames), target only.
- Sacred Flame: radiant-projectile falling at the target + radiant-impact
  (4x4, 16 frames). It does not travel from the caster.
- Fire Bolt retains its existing assets in `fire/`.

The two force impact attachments ending `82ded898a0d2` and
`219885d8cdfa` are byte-for-byte duplicates; only one copy is stored.

## Reserved artwork (not loaded at startup)

- `cantrips/dark-*.png`: dark-energy projectile/impact, reserved.
- `cantrips/lightning-projectile.png`: lightning bolt, reserved.
- `library/meteor-*.png`: meteor projectile and impact sheet.
- `library/lightning-spear.png`, `lightning-storm-impact.png`: stronger lightning.
- `library/ice-spear.png`: alternate ice projectile (Ice Storm uses `ice-burst.png` below).
- `library/void-*.png`: void projectile and impact sheet.
- `library/radiant-spear.png`: alternate radiant projectile.

The meteor impact sheet has visible grid seams; crop/padding metadata or a
cleaner sheet will be needed before animating that variant. It is not used now.

## Lightning Bolt / Ice Storm polish

- `storms/lightning-charge.png`: owner attachment ending `f200bab78219`,
  unchanged 1254px RGB, 4x4. Frames 0–3 form the charge; frames 4–11 animate
  the moving bolt head. Shared frame windows keep these phases separate.
- `storms/lightning-impact.png`: attachment ending `eccaca59d728`, unchanged
  1254px RGB, 4x4. Full 16-frame impact.
- The above black-backed sheets use an additive surface layer (screen blend),
  not fake transparency or a black rectangle over the battle map.
- `library/ice-burst.png` is now used for Ice Storm's staggered ground impacts.
  Shared procedural hail/cloud/frost complete the effect inside its template.
- The supplied lance (`df0f9abe`) and vortex (`48636a1e`) sheets remain optional
  future variants; they are not copied or downloaded for these compositions.

The normal and additive layers share engine caps, resize, Off/Reduced settings,
and cleanup. No extra persistent effects or gameplay state are created.

## Lightning Bolt 5×5 experiment

`lightning/lightning-bolt-main-5x5.png` is the owner's unchanged 1254×1254 RGBA
attachment ending `70c61d39f438`: 5 columns, 5 rows, 25 frames at 24 fps, no loop.
One main sprite contains charge, line discharge and endpoint fade. Full adds
one tiny procedural charge (2 effects total); Reduced uses only the main sprite
(1); Off uses none. No per-token effects or persistent aftermath are spawned.
The DM-only Lightning VFX selector keeps the 4×4 baseline available; its older
textures are loaded only when that comparison is selected. See
`docs/LIGHTNING_5X5_TEST.md` for the budget, tradeoffs and validation.
