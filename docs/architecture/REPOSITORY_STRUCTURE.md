# Repository Structure

Homebrew God keeps runtime code, game data, tests, documentation, and static assets in separate areas. The repository root is reserved for the browser entry points and deployment configuration.

## Runtime ownership

| Area | Path | Responsibility |
| --- | --- | --- |
| Application shell | `app.js`, `index.html` | Authentication, rooms, navigation, and application startup |
| Character Creator | `characterCreator/` | Creator coordinator, steps, validation, rules, rendering, and creator persistence |
| Character Sheet | `characterSheet/` | Playable sheet UI, gameplay state, and sheet persistence |
| Monster Creator | `monsters/` | Monster creation and monster persistence |
| Battle Map | `battleMap/` | Measurement, targeting templates, casting sessions, elevation, and token collision |
| Token system | `tokens/` | Token state, synchronization, and token interactions |
| Visual effects | `vfx/` | Presentation-only cast sequencing, effect lifecycle, procedural fire visuals, damage-type visual identities, rendering, particles, sprites, and persistent visuals |
| Shared code | `shared/` | Realtime-listener lifecycle and security-aware persistence used by multiple features |
| Game data | `data/` | Built-in classes, subclasses, feats, spells, species/background content, and the 2014 ruleset |
| Static assets | `assets/` | Styles and future images or static media |

The application shell still owns Battle Map room lifecycle and DOM wiring. Reusable measurement, targeting, collision, and visual-effect behavior stays in the `battleMap/` and `vfx/` modules so it can be tested without owning game state.

## Tests and documentation

- `tests/` contains Node contract/unit tests, Playwright tests, and fixtures.
- `tests/browser-pages/` contains browser-loadable self-test pages that are included in the GitHub Pages artifact.
- `docs/architecture/` contains current architecture documentation.
- `docs/rules/` contains ruleset policy.
- `docs/development-history/` preserves completed phase reports and the phase audit.

## Deployment

`scripts/build-pages.mjs` copies only browser entry files, runtime directories, browser self-test pages, and required Firebase audit files into `dist/`. Documentation, Node tests, build scripts, and development dependencies are not deployed as application code.
