# Phase 13 - Feat Prerequisites and Repeatability

Phase 13 makes feat eligibility deterministic at selection time, during final
review, and while migrating older character data.

## Enforced prerequisites

The creator enforces ability scores, armor proficiency, weapon proficiency,
actual spell access, species and subrace, class or background, prerequisite
feats, and prerequisite-feat choice combinations. A selected feat is checked
again during final review so a later character change cannot silently leave an
ineligible feat in place.

The feat catalog also has an allowlist validator. A missing or unsupported
prerequisite type fails catalog validation and is treated as unmet at runtime.

## Setting policy

Setting prerequisites are advisory in the fixed Legacy 5e (2014) ruleset.
The creator displays the named setting and the text "advisory; not enforced"
on feat choices. This avoids silently accepting setting-limited material while
leaving campaign availability under the DM's control.

## Repeatability

- Elemental Adept is repeatable once per distinct damage type. Used damage
  types are removed from later choice lists and duplicate values are rejected.
- Magic Initiate is non-repeatable under the selected 2014 rules edition.
- All other non-repeatable feats are rejected when already selected in another
  advancement slot.
- Migration removes duplicate non-repeatable feats and duplicate
  repeat-by-choice instances, preserving the first valid selection and adding
  a warning.

## Regression coverage

Phase 13 adds 16 self-tests, one for each checklist item. The complete creator
suite contains 400 self-tests. The ruleset policy test also validates every
catalog prerequisite type.
