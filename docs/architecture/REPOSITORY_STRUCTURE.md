# Repository Structure

Homebrew God keeps runtime code, game data, tests, documentation, and static assets in separate areas. The repository root is reserved for the browser entry points and deployment configuration.

## Runtime ownership

| Area | Path | Responsibility |
| --- | --- | --- |
| Application shell | `app.js`, `index.html` | Authentication, rooms, navigation, and application startup |
| Character Creator | `characterCreator/` | Creator coordinator, steps, validation, rules, rendering, and creator persistence |
| Character Sheet | `characterSheet/` | Playable sheet UI, gameplay state, and sheet persistence |
| Monster Creator | `monsters/` | Monster creation and monster persistence |
| Token system | `tokens/` | Token state, synchronization, and token interactions |
| Shared code | `shared/` | Realtime-listener lifecycle and security-aware persistence used by multiple features |
| Game data | `data/` | Built-in classes, subclasses, feats, spells, species/background content, and the 2014 ruleset |
| Static assets | `assets/` | Styles and future images or static media |

The Battle Map currently remains part of `app.js` because it shares the room lifecycle, DOM registry, and realtime listeners owned by the application shell. There are no independent Battle Map source files to group yet. Extracting it requires a behavior-preserving feature change and is intentionally not disguised as a simple file move.

## Tests and documentation

- `tests/` contains Node contract/unit tests, Playwright tests, and fixtures.
- `tests/browser-pages/` contains browser-loadable self-test pages that are included in the GitHub Pages artifact.
- `docs/architecture/` contains current architecture documentation.
- `docs/rules/` contains ruleset policy.
- `docs/development-history/` preserves completed phase reports and the phase audit.

## Deployment

`scripts/build-pages.mjs` copies only browser entry files, runtime directories, browser self-test pages, and required Firebase audit files into `dist/`. Documentation, Node tests, build scripts, and development dependencies are not deployed as application code.
