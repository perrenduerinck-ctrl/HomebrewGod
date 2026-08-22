# Phase 9: Correct Feat Ability Scores

Phase 9 makes feat and normal Ability Score Improvement increases obey their own ability-score ceilings without lowering imported, manual, or magical values.

## Ability-score policy

- A structured feat ability effect declares `maximum`; the catalog supplies 20 when the field is omitted.
- Fixed, selectable, and two-point ability effects apply one capped increase at a time.
- Normal class ASI sources use the same default maximum of 20.
- An imported or manually entered base score may remain above 20, up to the application-wide ceiling of 30. A normal feat or ASI cannot increase it further unless that effect declares a higher maximum.
- `magic:` and `manual-override:` bonus sources apply after the normal advancement cap. They remain separate sources and may carry the final score above 20, up to 30.
- The catalog entry named “Ability Score Improvement” is not offered in the feat picker. Players use the distinct normal ASI mode instead.

## Catalog and schema

- Character schema: 11
- Feat schema: 3
- Default feat ability maximum: 20
- Every fixed, selectable, and ability-score-improvement effect has a normalized, validated maximum from 1 through 30.

## Validation

The browser self-test suite adds 11 Phase 9 regressions, bringing the expected total to 317. The tests cover:

- default 20 caps and half-feats at 20;
- declared effect maxima;
- fixed and selectable ability increases;
- two points in one ability and one point in each of two abilities;
- imported scores already above 20;
- manual and magical values above 20;
- separation of magical override and normal ASI sources;
- removal of the pseudo-ASI feat from the feat picker.
