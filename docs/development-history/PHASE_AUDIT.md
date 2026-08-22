# Homebrew God Phases 1–20 Audit

This audit combines static release gates, schema validators, fixtures, browser suites, and the implementation notes from each phase. A phase is marked pass only when its required files exist and its applicable automated validation succeeds.

| Phase | Status | Primary evidence |
| --- | --- | --- |
| 1. Working application | Pass | Real application smoke mode, exact-case import graph, character sheet module, deployed-site smoke test |
| 2. 2014 ruleset | Pass | `RULESET_POLICY.md`, ruleset policy browser test, 13/118/101/340 catalog counts |
| 3. Multiclass rules | Pass | Character regressions for prerequisites, class ownership, level limits, proficiency grants, cleanup, and first Unarmored Defense |
| 4. Multiclass HP | Pass | 16 named Phase 4 regressions plus d6/d8/d10/d12 fixtures |
| 5. Multiclass spellcasting | Pass | 29 named Phase 5 regressions plus all 15 spellcasting-progression pair fixtures |
| 6. Shared class features | Pass | 15 named Phase 6 regressions for Extra Attack, resources, save DCs, and class-level scaling |
| 7. Subclasses | Pass | 26 named Phase 7 regressions, 118 validated subclasses, placeholder rejection |
| 8. Base classes | Pass | 14 named Phase 8 regressions, 13 classes and 285 validated features |
| 9. Feat ability scores | Pass | 11 named Phase 9 regressions and explicit feat ability-cap contracts |
| 10. Feat spellcasting | Pass | 20 named Phase 10 regressions and spell-source validation |
| 11. Feat mechanics | Pass | 23 named Phase 11 regressions and supported-effect gate |
| 12. Situational feats | Pass | 7 named Phase 12 regressions plus action-economy, recharge, usage, and manual-instruction validation |
| 13. Feat prerequisites | Pass | 17 named Phase 13 regressions and unsupported-prerequisite rejection |
| 14. Species/backgrounds | Pass | 13 named Phase 14 regressions and built-in content expectations |
| 15. Spells | Pass | 16 named Phase 15 regressions; 319 SRD spells, 21 additional cantrips, and 399 validated references |
| 16. Character sheet | Pass | 27 named Phase 16 regressions, presentation module tests, print/export/rest/resource/token checks |
| 17. Monster creator | Pass | 97 browser assertions and application/module integration |
| 18. Security/persistence | Pass | 60 browser assertions, Firestore rules, upload validation, secure deletion function, conflict and recovery checks |
| 19. Character modules | Pass | 88 module assertions, 12 DOM-independent domains, 53,938-line orchestrator |
| 20. Release readiness | Pass | Root package, CI workflow, 260 class fixtures, 15 casting combinations, unit/browser/mobile/deployed gates |

## Audit totals

- 20 of 20 phases have implementation evidence.
- 13 classes and 285 base-class features validate.
- 118 subclasses validate without placeholder text.
- 101 feats validate, including prerequisite and structured-effect rules.
- 340 spells validate: 319 SRD spells and 21 reviewed additional cantrips.
- 399 feat/subclass spell references validate.
- 458 character, 97 monster, 60 security/persistence, and 88 module browser assertions pass.
- 130 local import references resolve with exact filename capitalization.
- 12 release fixture and workflow contract tests pass.

The automated audit intentionally avoids production Firebase or Cloudinary mutations. Production-facing behavior is covered through rules, permission stubs, persistence conflict tests, safe screen navigation, and the deployed GitHub Pages smoke suite.
