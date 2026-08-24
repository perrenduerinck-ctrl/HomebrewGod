# Character Creator Performance Testing

Priority 12 adds a repeatable Character Creator performance and stress test at
`tests/character-creator-performance.spec.mjs`. It exercises production creator
code in Chromium and writes a JSON measurement report into the Playwright test
artifacts.

## What the test measures

- The first lazy Character Creator module load and render.
- Creating a new draft.
- Switching through the main creator steps.
- Synchronous text-input handling while draft persistence remains debounced.
- Debounced searching across the default spell catalog.
- Normalizing and rendering an inventory with 250 distinct items.
- Class and Review rendering for a level-20, three-class character.
- DOM-node counts for every heavy screen.
- Active Character Creator Firestore listener counts before and after navigation.
- JavaScript heap growth after repeatedly leaving and reopening the creator.

## Weaker-laptop profile

The automated profile uses Chromium's four-times CPU slowdown. The budgets are
intentionally generous enough for shared CI runners while still catching freezes,
unbounded DOM growth, duplicate listeners, or multi-second input handlers. The
exact timings are diagnostic measurements; regressions fail only when they cross
the declared budgets in the test.

Run only this check with:

```text
npm run test:performance
```

The full CI browser command also includes it, so every release-readiness pull
request records the same measurements. No Firebase records are written: the app
smoke harness and the dedicated creator fixture use the existing test doubles.

Performance results always depend on the machine. When investigating a failure,
compare the JSON report with a previous CI run, reproduce with the same four-times
CPU slowdown, and optimize the measured subsystem instead of simply increasing a
budget.
