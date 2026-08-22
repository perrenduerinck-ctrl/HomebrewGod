# Phase 17 — Monster Creator

Phase 17 connects and completes the room-scoped Monster Creator.

## Completed

- `app.js` imports and initializes `monsterCreator.js`.
- The battle-map launcher opens `?room=ROOMCODE&view=monsterCreator`.
- The same startup URL restores the Monster Creator after room loading.
- The old placeholder messages were removed.
- Room DMs can create, save, update, duplicate, delete, import, export, and copy monster records.
- Saved stat blocks include:
  - traits;
  - actions;
  - bonus actions;
  - reactions;
  - legendary actions;
  - lair actions;
  - senses;
  - saving throws;
  - skills;
  - damage immunities;
  - damage resistances;
  - damage vulnerabilities;
  - condition immunities.
- A saved monster can create a linked enemy token on the active battle or puzzle map.
- Monster tokens inherit the monster name, optional image, size, HP, and Armor Class.
- DMs have editing and token-creation permissions. Players have read-only library access and may copy or export a viewed monster.

## Verification

- Run `ai-testing/monster-creator-self-test.html` through a static HTTP server.
- Run `ai-testing/character-creator-self-test.html` to guard the existing character workflow.
- Run `ai-testing/app-smoke-test.html` to verify the real application module graph.

The Phase 17 self-test uses in-browser Firestore and token-system doubles; it does not write test data to the production room database.
