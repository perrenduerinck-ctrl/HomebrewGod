# Homebrew God spell-system audit and repair

Date: 2026-11-07

Audited base: `origin/main` at `787785ac29e76f41aeaf920247b8beb184487255`

Working branch: `ai/complete-spell-audit-repair`

## Scope traced

The audit followed spells through the built-in catalog and personal Library, Spell Creator normalization and revisioned persistence, canonical character spell sources, Character Creator and playable-sheet presentation, normal/Pact/special resources, combat hotbar generation, action economy, map targeting and collision, confirmation transactions, concentration, monster spell references, VFX events, Firestore ownership contracts, and the existing unit/browser/emulator test gates.

The main implementation boundaries inspected were:

- `spells/`, `data/defaultSpells.js`, and `data/spellTargeting.js`
- `characterCreator/spellSources.js`, `characterCreator/spellChoices.js`, the spell picker/step, and class reconciliation
- `characterSheet/index.js` and `characterSheet/gameplayState.js`
- `combat/actionBar*.js`, `combat/characterCombatCommands.js`, and action economy
- `battleMap/castingSession.js`, spell templates, elevation, measurement, and token collision
- `monsters/spellcastingEditor.js` and monster persistence/integration
- `vfx/castEvent.js`, casting sequences, animation persistence, and presentation effects
- `app.js`, revisioned persistence, Firestore contracts/rules, and spell-related tests

## Confirmed findings and disposition

### Critical

1. **Editing a custom spell silently erased advanced mechanics.**
   - Original cause: `spells/spellCreator.js` rebuilt the save payload only from visible basic fields, while `spells/spellModel.js` and `spells/spellPersistence.js` did not retain all structured fields.
   - Reproduction: save a spell with structured targeting/damage/healing/scaling/effects/material metadata, reopen it, change only the name, save again, and reload.
   - Actual result before repair: unrelated hidden fields were replaced by generated defaults or removed.
   - Expected: only the intentionally edited field changes.
   - Repair: merge visible edits into the normalized loaded record in `mergeSpellCreatorDraft()` (`spells/spellCreator.js:76`); retain structured damage, healing, scaling, effects, costly/consumed materials, targeting, animation, provenance, identity, and revision fields (`spells/spellModel.js:149-180`, `spells/spellPersistence.js`). Independent copies get new local identity while retaining mechanics and provenance (`spells/spellCreator.js:111`).
   - Regression coverage: unit save/reload/edit/save/reload and duplicate tests in `tests/spell-library.test.mjs`; a real UI regression was added at `tests/spell-creator.spec.mjs:58`.

### High

2. **Monster spells used the generic monster-action path instead of the spell casting path.**
   - Original cause: monster spell references were presented as generic abilities, so they bypassed spell templates, spell action classification, monster DC/attack values, cancellation safety, and spell VFX.
   - Repair: monster spells now have their own hotbar kind (`combat/actionBarModel.js:107-177`) and enter the shared targeting/casting session (`app.js:2248`).

3. **Monster daily uses and spell slots were not authoritative.**
   - Original cause: references stored maximum uses but no reliable spent counters, and generic action execution did not recheck them in the Firestore transaction.
   - Repair: references retain `usesUsed`/`slotsUsed`; `combat/monsterSpellcasting.js:24-93` provides shared availability, confirmed spending, concentration, and long-rest restoration. Confirmation reads and updates the linked monster inside the same room transaction, so concurrent DM clients cannot both spend the final use.
   - Regression coverage: `tests/combat-action-bar.test.mjs:652`.

4. **A shared multiclass spell silently used the first matching class.**
   - Original cause: `resolveCharacterSpellcastingStats()` accepted a source ID, but the hotbar and casting session never collected or carried a selection.
   - Repair: valid stable sources are derived at `combat/characterCombatCommands.js:174`; resource choices are paired with a casting source; the map panel shows “Cast via …”; source ID, name, ability, save DC, and attack bonus survive preview and confirmation (`battleMap/castingSession.js:51-451`, `app.js:6120-6135`). The transaction rejects a source removed by another edit.
   - Regression coverage: `tests/combat-action-bar.test.mjs:565` and the source-specific casting-session test.

5. **Legacy monster records could erase catalog casting metadata with blank fields.**
   - Original cause: a normalized blank reference was spread over the built-in spell, changing bonus-action/reaction spells into actions and losing range/level presentation.
   - Repair: catalog mechanics remain authoritative while saved monster resource metadata remains intact in `combat/actionBarModel.js`.

### Medium

6. **Pact-slot display and confirmation used different legacy fallbacks.**
   - Reproduction: a migrated Pact source using `maximumUses` appeared available but confirmation only accepted `slots`/`maximumSlots`.
   - Repair: `getPactSpellSlotLedger()` (`combat/characterCombatCommands.js:74`) is shared by option generation and confirmation, including old `slotUsage.pact` migration behavior.
   - Regression coverage: `tests/combat-action-bar.test.mjs:386`.

7. **Ritual permission was too broad.**
   - Original cause: merely belonging to Artificer/Bard/Cleric/Druid/Wizard, or carrying a `Spellbook` status, could grant ritual casting without applying that class's prepared/known/spellbook rule.
   - Repair: ritual eligibility is evaluated per selected canonical source (`combat/characterCombatCommands.js:196`): Wizard spellbook, Bard known, and prepared Artificer/Cleric/Druid behavior are distinct; explicit feature/manual permissions remain supported.

8. **Concentration did not automatically end for implemented incapacitating events.**
   - Original cause: damage created a save but reaching 0 HP and adding incapacitating conditions left concentration active.
   - Repair: falling unconscious and adding Incapacitated, Paralyzed, Petrified, Stunned, Unconscious, or Dead clears concentration and any pending check (`characterSheet/gameplayState.js:64-74`, `:327-355`, `:545-555`).
   - Regression coverage: `tests/casting-session.test.mjs:530`.

9. **Common `ft`/`ft.` spell ranges were treated as special/unsupported.**
   - Repair: distance parsing accepts feet, foot, ft, and ft. forms in `data/spellTargeting.js`.
   - Regression coverage: `tests/spell-targeting.test.mjs:127`.

10. **Flat custom `damageType` did not reach confirmed VFX events.**
    - Repair: `vfx/castEvent.js` now normalizes flat and structured damage representations.
    - Regression coverage: `tests/vfx-cast-event.test.mjs:199`.

11. **Casting-session target normalization dropped token center/elevation and the selected ground point.**
    - Impact: confirmed gameplay retained token IDs but some animation destinations lacked the authoritative point/elevation metadata.
    - Repair: the immutable target snapshot now keeps token identity, center, elevation, map point, vertical measurements, geometry, and affected-token lists (`battleMap/castingSession.js:16-35`, `:311-347`); `app.js` sends the ground point to VFX when no creature is selected.

12. **Spell validation accepted fractional levels and partial dice strings.**
    - Repair: levels must be integers 0-9; IDs, material consistency, damage/save values, structured damage/healing/scaling tables, and complete dice expressions are checked with understandable errors (`spells/spellModel.js:190-275`).

## Persistence, transactions, and security

- Personal spells remain under `users/{uid}/spells/{spellId}` and continue using revisioned writes. Stale two-tab saves raise the existing useful revision-conflict path instead of silently overwriting.
- Character spell resources, action economy, and monster spell resources are re-read and mutated together inside the existing Firestore transaction at confirmation. Cancellation and failed persistence leave both resources and action economy unchanged.
- No production data was read, migrated, or modified during this pass.
- `firestore.rules` was not changed. The existing owner-scoped personal spell rules and room/monster authorization contracts cover the repaired paths.

## Files changed

- `app.js`
- `battleMap/castingSession.js`
- `characterSheet/gameplayState.js`
- `combat/actionBar.js`
- `combat/actionBarModel.js`
- `combat/actionIconRegistry.js`
- `combat/characterCombatCommands.js`
- `combat/monsterSpellcasting.js` (new)
- `data/spellTargeting.js`
- `library/adapters/spellLibraryAdapter.js`
- `monsters/spellcastingEditor.js`
- `spells/spellCreator.js`
- `spells/spellModel.js`
- `spells/spellPersistence.js`
- `vfx/castEvent.js`
- Focused tests in `tests/casting-session.test.mjs`, `tests/combat-action-bar.test.mjs`, `tests/spell-creator.spec.mjs`, `tests/spell-library.test.mjs`, `tests/spell-targeting.test.mjs`, and `tests/vfx-cast-event.test.mjs`

## Verification performed

Passed:

- `pnpm run test:unit` — full project unit suite, exit 0.
- `pnpm run check:syntax` — 449 JavaScript files.
- `pnpm run check:imports` — 1,208 local references across 479 source files.
- `pnpm run validate:data` — valid; 340 catalog spells and all other catalog counts accepted.
- `pnpm run audit:phases` — all 20 release phases passed.
- Focused spell-source/selection/resource suite — 74 tests passed.
- Focused casting/targeting/template/collision/VFX suite — 45 tests passed.
- Focused combat/casting suite after the final resource repairs — all tests passed.
- `git diff --check` — no whitespace errors.

Blocked, not counted as passed:

- `pnpm exec playwright test tests/spell-creator.spec.mjs`: the required bundled Chromium executable is absent. The installed Edge binary also exits under the Windows app sandbox before a page opens. The three tests were therefore not executed.
- `pnpm run test:rules`: Firebase Emulator Suite could not start because Java is not installed/on `PATH`. Per task constraints, no system software was installed. Static Firestore rule/ownership contract tests passed in the unit suite.

## Regression assessment

The passing project unit suite covered character creation and reconciliation, spell sources and picker limits, playable-sheet spell rendering, normal/Pact/special resources, action economy, concentration checks, spell templates, range/elevation, token collision, VFX events/sequences, revision conflicts, monster persistence, Workshop/Library provenance, Firebase persistence contracts, navigation, and unrelated map/library/creator systems. No production Firebase or user data was used.

## Remaining limitations (not claimed as repaired)

- A real DM + player, two-browser Firestore test still requires the browser runner and emulator prerequisites above.
- Spell text is not a universal automation engine. Damage rolls, saving throws, healing, resistance/immunity, conditions, repeated saves, persistent damage, buffs/debuffs, and HP changes remain manual unless an existing focused subsystem already implements them. The repaired resolution view exposes the correct metadata without inventing results.
- Reaction spells spend the reaction resource, but rules-specific trigger detection still requires table/DM confirmation.
- One-minute and longer casts are explicitly blocked as single combat actions; a multi-round casting workflow is not implemented.
- Supported templates remain circle, sphere, cylinder, cone, line, square, cube, self, and creature/point targeting. Wall paths and exceptional textual ranges need explicit future geometry instead of misleading fallback previews.
- Monster concentration is persisted and replaced on a new concentration spell, but monster-specific manual concentration checks/condition-ending controls are not yet as complete as the character-sheet controls.
- Deleted personal spells copied into a character remain safe because character sources carry records. A monster that only references a deleted personal spell now fails with a clear repair message; it is not silently replaced or deleted.

## Recommended follow-up order

1. Run the new Spell Creator browser regression and existing combat browser tests in CI or a machine with Playwright Chromium.
2. Run Firestore emulator rules and a two-client “final slot/final monster use” concurrency test on a machine with Java.
3. Add monster concentration check/end controls using the existing character concentration model.
4. Add a deliberate multi-round/long-cast workflow rather than weakening the current safe block.
5. Expand spell-effect automation only in small, rule-tested pieces; keep manual resolution explicit for everything else.
