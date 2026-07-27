# Homebrew God

A free browser-based D&D room, battle-map, character, and monster toolkit.

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
