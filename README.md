# Homebrew God

A free browser-based D&D room, battle-map, character, and monster toolkit.

## Repository layout

Application features and supporting files are grouped by responsibility:

- `characterCreator/` contains the Character Creator coordinator, steps, rules, and persistence.
- `characterSheet/` contains the playable Character Sheet and its state modules.
- `monsters/` contains Monster Creator code.
- `tokens/` contains the token system.
- `shared/` contains utilities shared by multiple application areas.
- `data/` contains built-in game catalogs and ruleset data.
- `assets/` contains styles and other static assets.
- `tests/` contains automated Node and Playwright tests; `tests/browser-pages/` contains browser-facing self-test pages.
- `docs/` contains architecture, rules, and historical implementation notes.

See [`docs/architecture/REPOSITORY_STRUCTURE.md`](docs/architecture/REPOSITORY_STRUCTURE.md) for ownership boundaries and deployment details.

## Release checks

The Phase 20 release suite uses Node.js 22 and Playwright:

```text
npm install
npx playwright install chromium
npm run test:ci
```

Useful individual gates:

```text
npm run check:syntax
npm run check:imports
npm run validate:data
npm run audit:phases
npm run test:unit
npm run test:browser
```

GitHub Actions runs the complete suite on every push and pull request. A push to `main` deploys GitHub Pages only after the release suite passes, then runs browser checks against the deployed URL.
