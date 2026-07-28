# Phase 20: Automated Testing and Release Readiness

Phase 20 turns the existing Homebrew God self-tests into a repeatable release gate.

## Test package

The root `package.json` defines syntax, import-graph, data-validation, phase-audit, unit-fixture, browser, deployed-site, and Pages-build commands. `playwright.config.mjs` runs Chromium in a deterministic single-worker configuration and starts the repository's Node static test server when no deployed URL is supplied.

The browser runner executes the existing internal suites instead of replacing them:

- 458 character-creator assertions, including all-class multiclass ownership, class/subclass isolation, and final character and multiclass flows.
- 97 monster-creator assertions, including create, duplicate, import, export, permissions, and token behavior.
- 60 security and persistence assertions.
- 88 character-module contract assertions.
- The complete 2014 ruleset and catalog policy test.
- The real application smoke mode.

## Fixtures

`tests/fixtures/character-fixtures.mjs` provides:

- 260 class fixtures: every one of the 13 classes at levels 1 through 20.
- Representative multiclass fixtures.
- All 15 unordered full-caster, half-caster, third-caster, Artificer, and Pact Magic pairings.
- Feat-selection fixtures with preserved choices.
- A fixture for every bundled subclass.
- Import/export and save/reload round-trip data.
- Legacy character migration fixtures.

## Release gates

The release fails when any of these checks fail:

- JavaScript syntax checking.
- Missing or incorrectly capitalized relative imports.
- Class, subclass, feat, or spell schema validation.
- Placeholder subclass data.
- New unsupported class, subclass, feat, or spell effect types.
- A character-creator orchestrator at or above 55,000 lines.
- Unit fixtures or browser regression tests.
- Desktop or mobile smoke behavior.

## GitHub Actions and Pages

`.github/workflows/release-readiness.yml` runs the full suite on every push, pull request, and manual dispatch. The GitHub Pages deployment job depends on the test job. It builds a reviewed static artifact, deploys only after all required checks pass, and then runs the application smoke check plus every published character, ruleset, monster, security, and module suite against the deployment URL.

No production Firebase records are created by the automated suite. DM-room and battle-map navigation use the explicit smoke-test harness, while mutations and permissions use isolated in-memory or stubbed persistence tests.
