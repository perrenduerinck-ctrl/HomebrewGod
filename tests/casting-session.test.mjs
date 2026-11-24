import assert from "node:assert/strict";
import test from "node:test";

import {
  createCastResolution,
  createSpellCastingSession
} from "../battleMap/castingSession.js";
import {
  getDefaultSpellById
} from "../data/defaultSpells.js";
import {
  applyGameplayAction,
  ensureGameplayState
} from "../characterSheet/gameplayState.js";

test("previewing and cancellation never spend a spell slot", async () => {
  let confirmations = 0;
  const session = createSpellCastingSession({
    onConfirm: () => {
      confirmations += 1;
      return true;
    }
  });

  session.begin({
    spell: getDefaultSpellById("fireball"),
    characterId: "wizard-1",
    characterName: "Aster",
    casterToken: {
      id: "token-1",
      name: "Aster"
    },
    slotOptions: [{
      kind: "normal",
      level: 3,
      sourceId: "",
      remaining: 1
    }]
  });
  session.updateTarget({
    locked: false,
    validRange: true,
    distanceFeet: 80,
    affectedTokens: [{
      id: "goblin-1",
      name: "Goblin"
    }]
  });

  assert.equal(confirmations, 0);
  assert.equal(
    session.getState().phase,
    "previewing"
  );
  session.cancel();
  assert.equal(confirmations, 0);
  assert.equal(
    session.getState().phase,
    "cancelled"
  );
});

test("only a locked in-range target can confirm and spend a slot", async () => {
  const spent = [];
  const session = createSpellCastingSession({
    onConfirm: ({ slot }) => {
      spent.push(slot);
      return {
        saved: true
      };
    }
  });

  session.begin({
    spell: getDefaultSpellById("fireball"),
    characterId: "wizard-1",
    slotOptions: [{
      kind: "normal",
      level: 4,
      sourceId: "",
      label: "Level 4 slot",
      remaining: 1
    }],
    spellSaveDc: 15
  });
  session.updateTarget({
    locked: true,
    validRange: false,
    distanceFeet: 155,
    affectedTokens: []
  });

  const invalid = await session.confirm({
    kind: "normal",
    level: 4,
    sourceId: ""
  });
  assert.equal(invalid.ok, false);
  assert.equal(spent.length, 0);

  session.updateTarget({
    locked: true,
    validRange: true,
    distanceFeet: 85,
    affectedTokens: [{
      id: "goblin-1",
      name: "Goblin"
    }]
  });
  const confirmed = await session.confirm({
    kind: "normal",
    level: 4,
    sourceId: ""
  });

  assert.equal(confirmed.ok, true);
  assert.equal(spent.length, 1);
  assert.equal(spent[0].level, 4);
  assert.equal(
    confirmed.resolution.damage[0],
    "9d6 fire"
  );
  assert.deepEqual(
    confirmed.resolution.save,
    {
      ability: "dex",
      dc: 15,
      success: "half"
    }
  );
  assert.equal(
    confirmed.resolution
      .affectedTokens[0].name,
    "Goblin"
  );
});

test("failed persistence returns to target-selected without consuming resources", async () => {
  let confirmedEvents = 0;
  const session = createSpellCastingSession({
    onConfirm: () => false,
    onConfirmed: () => {
      confirmedEvents += 1;
    }
  });

  session.begin({
    spell: getDefaultSpellById(
      "burning-hands"
    ),
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      remaining: 1
    }]
  });
  session.updateTarget({
    locked: true,
    validRange: true
  });
  const result = await session.confirm({
    kind: "normal",
    level: 1,
    sourceId: ""
  });

  assert.equal(result.ok, false);
  assert.equal(
    session.getState().phase,
    "target-selected"
  );
  assert.match(
    session.getState().confirmationError,
    /no resource was spent/i
  );
  assert.equal(confirmedEvents, 0);
});

test("presentation runs once after confirmation and cannot break the cast", async () => {
  const calls = [];
  const session = createSpellCastingSession({
    onConfirm: () => ({ saved: true }),
    onConfirmed: (confirmed) => {
      calls.push(confirmed);
      throw new Error("expected presentation failure");
    }
  });

  session.begin({
    spell: getDefaultSpellById("burning-hands"),
    characterId: "wizard-1",
    casterToken: { id: "wizard-token" },
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      remaining: 1
    }]
  });
  session.updateTarget({
    locked: false,
    validRange: true
  });
  assert.equal(calls.length, 0);
  session.updateTarget({
    locked: true,
    validRange: true,
    geometry: {
      shape: "cone"
    }
  });
  assert.equal(calls.length, 0);

  const result = await session.confirm({
    kind: "normal",
    level: 1,
    sourceId: ""
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.phase, "confirmed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].state.phase, "confirmed");
  assert.equal(calls[0].spell.id, "burning-hands");
  assert.equal(calls[0].casterToken.id, "wizard-token");

  const repeated = await session.confirm({
    kind: "normal",
    level: 1,
    sourceId: ""
  });
  assert.equal(repeated.ok, false);
  assert.equal(calls.length, 1);
});

test("resolution reports concentration and attack/save mechanics without rolling", () => {
  const resolution = createCastResolution({
    spell: {
      id: "test-ray",
      name: "Test Ray",
      level: 2,
      concentration: true,
      targeting: {
        attack: {
          type: "ranged"
        }
      },
      damage: [{
        dice: "3d8",
        damageType: "radiant"
      }]
    },
    slotLevel: 2,
    spellAttackBonus: 7
  });

  assert.deepEqual(
    resolution.attack,
    {
      type: "ranged",
      bonus: 7
    }
  );
  assert.deepEqual(
    resolution.damage,
    ["3d8 radiant"]
  );
  assert.equal(
    resolution.concentration,
    true
  );
});

test("homebrew flat spell fields resolve damage, save and attack mechanics", () => {
  const resolution = createCastResolution({
    spell: {
      id: "cinder-bolt",
      name: "Cinder Bolt",
      damageDice: "1d8",
      damageType: "fire",
      saveAbility: "dex",
      saveSuccess: "half",
      attackType: "ranged"
    },
    spellSaveDc: 14,
    spellAttackBonus: 0
  });

  assert.deepEqual(resolution.damage, ["1d8 fire"]);
  assert.deepEqual(resolution.save, {
    ability: "dex",
    dc: 14,
    success: "half"
  });
  assert.deepEqual(resolution.attack, {
    type: "ranged",
    bonus: 0
  });
});

test("unknown save DC and attack bonus stay unknown instead of becoming zero", () => {
  const resolution = createCastResolution({
    spell: {
      saveAbility: "wis",
      attackType: "ranged"
    },
    spellSaveDc: null,
    spellAttackBonus: ""
  });

  assert.equal(resolution.save.dc, null);
  assert.equal(resolution.attack.bonus, null);
});

test("cantrip damage scales at character level and ritual casts retain their resource kind", async () => {
  const scaled = createCastResolution({
    spell: getDefaultSpellById("fire-bolt"),
    characterLevel: 11,
    slotLevel: 0
  });
  assert.equal(scaled.damage[0], "3d10 fire");

  const session = createSpellCastingSession({ onConfirm: () => true });
  session.begin({
    spell: {
      id: "identify",
      name: "Identify",
      level: 1,
      ritual: true,
      range: "Touch"
    },
    slotOptions: [{
      kind: "ritual",
      level: 1,
      sourceId: "",
      label: "Ritual cast",
      remaining: 1
    }]
  });
  session.updateTarget({ locked: true, validRange: true });
  const result = await session.confirm({ kind: "ritual", level: 1, sourceId: "" });
  assert.equal(result.ok, true);
  assert.equal(result.resolution.ritual, true);
  assert.equal(result.resolution.resourceKind, "ritual");
});

test("slot selection previews upcast damage and healing before confirmation", () => {
  const session = createSpellCastingSession();
  session.begin({
    spell: getDefaultSpellById("cure-wounds"),
    characterLevel: 9,
    slotOptions: [
      { kind: "normal", level: 1, sourceId: "", remaining: 1 },
      { kind: "normal", level: 3, sourceId: "", remaining: 1 }
    ]
  });
  const preview = session.preview({ kind: "normal", level: 3, sourceId: "" });
  assert.deepEqual(preview.healing, ["3d8 + MOD"]);
  assert.equal(session.getState().phase, "previewing");
});

test("leveled at-will spell resources remain available in the casting session", async () => {
  const session = createSpellCastingSession({ onConfirm: () => true });
  session.begin({
    spell: { id: "detect-magic", name: "Detect Magic", level: 1, range: "Self" },
    slotOptions: [{
      kind: "special",
      level: 1,
      sourceId: "feature:eldritch-sight",
      label: "Eldritch Sight — at will",
      remaining: Number.POSITIVE_INFINITY
    }]
  });
  session.updateTarget({ locked: true, validRange: true });
  assert.equal(session.getState().canConfirm, true);
  const result = await session.confirm({
    kind: "special",
    level: 1,
    sourceId: "feature:eldritch-sight"
  });
  assert.equal(result.ok, true);
  assert.equal(result.resolution.resourceKind, "special");
});

test("casting source selection carries its own save DC through preview and confirmation", async () => {
  let confirmedSlot = null;
  const session = createSpellCastingSession({
    onConfirm: ({ slot }) => {
      confirmedSlot = slot;
      return true;
    }
  });
  session.begin({
    spell: {
      id: "shared-spell",
      name: "Shared Spell",
      range: "60 feet",
      level: 1,
      saveAbility: "dex"
    },
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      castingSourceId: "wizard-main",
      castingSourceName: "Wizard",
      spellSaveDc: 16,
      remaining: 1
    }, {
      kind: "normal",
      level: 1,
      sourceId: "",
      castingSourceId: "cleric-main",
      castingSourceName: "Cleric",
      spellSaveDc: 13,
      remaining: 1
    }]
  });
  session.updateTarget({ locked: true, validRange: true });
  const selection = {
    kind: "normal",
    level: 1,
    sourceId: "",
    castingSourceId: "cleric-main"
  };
  const preview = session.preview(selection);
  assert.equal(preview.save.dc, 13);
  assert.equal(preview.castingSourceId, "cleric-main");
  assert.equal(preview.castingSourceName, "Cleric");
  const result = await session.confirm(selection);
  assert.equal(result.ok, true);
  assert.equal(confirmedSlot.castingSourceId, "cleric-main");
  assert.equal(result.resolution.save.dc, 13);
});

test("casting targets preserve token identity, center, elevation, and the selected map point", () => {
  const session = createSpellCastingSession();
  session.begin({
    spell: getDefaultSpellById("fireball"),
    slotOptions: [{ kind: "normal", level: 3, sourceId: "", remaining: 1 }]
  });
  const state = session.updateTarget({
    locked: true,
    validRange: true,
    selectedPoint: { x: 320.5, y: 180.25 },
    startElevationFeet: 5,
    endElevationFeet: 20,
    affectedTokens: [{
      id: "flying-target",
      name: "Flying Target",
      type: "monster",
      center: { x: 330, y: 190 },
      elevation: 25
    }]
  });
  assert.deepEqual(state.target.selectedPoint, { x: 320.5, y: 180.25 });
  assert.equal(state.target.startElevationFeet, 5);
  assert.equal(state.target.endElevationFeet, 20);
  assert.deepEqual(state.target.affectedTokens[0], {
    id: "flying-target",
    name: "Flying Target",
    type: "monster",
    center: { x: 330, y: 190 },
    elevation: 25
  });
});

test("active concentration is normalized and can be ended explicitly", () => {
  const character = {
    combat: {
      maxHp: 20,
      currentHp: 20,
      concentration: {
        spellId: "web",
        spellName: "Web",
        startedAtMillis: 42
      }
    }
  };

  const combat = ensureGameplayState(
    character
  );
  assert.equal(
    combat.concentration.spellName,
    "Web"
  );

  const result = applyGameplayAction(
    character,
    {
      type: "end-concentration"
    }
  );
  assert.equal(result.changed, true);
  assert.equal(
    character.combat.concentration,
    null
  );
  assert.match(
    result.message,
    /Web ended/i
  );
});

test("damage creates the correct concentration save and a failed save ends it", () => {
  const character = {
    combat: {
      maxHp: 50,
      currentHp: 50,
      concentration: {
        spellId: "spirit-guardians",
        spellName: "Spirit Guardians",
        startedAtMillis: 1
      }
    }
  };
  const damage = applyGameplayAction(character, { type: "damage", amount: 26 });
  assert.equal(damage.concentrationCheck.dc, 13);
  assert.equal(character.combat.pendingConcentrationCheck.dc, 13);
  const failed = applyGameplayAction(character, {
    type: "resolve-concentration-check",
    total: 12
  });
  assert.equal(failed.succeeded, false);
  assert.equal(character.combat.concentration, null);
  assert.match(failed.message, /ended/i);
});

test("falling unconscious or gaining an incapacitating condition ends concentration", () => {
  const fallen = {
    combat: {
      maxHp: 8,
      currentHp: 8,
      concentration: { spellId: "bless", spellName: "Bless" }
    }
  };
  const damage = applyGameplayAction(fallen, { type: "damage", amount: 8 });
  assert.equal(fallen.combat.currentHp, 0);
  assert.equal(fallen.combat.concentration, null);
  assert.equal(damage.concentrationCheck, null);
  assert.match(damage.message, /fell unconscious/i);

  const stunned = {
    combat: {
      maxHp: 20,
      currentHp: 20,
      concentration: { spellId: "haste", spellName: "Haste" },
      conditions: []
    }
  };
  const condition = applyGameplayAction(stunned, {
    type: "toggle-condition",
    condition: "Stunned"
  });
  assert.equal(stunned.combat.concentration, null);
  assert.equal(condition.concentrationEnded, true);
  assert.match(condition.message, /Concentration on Haste ended/i);
});


test("healing previews use the selected class modifier and keep it through confirmation",async()=>{
  const session=createSpellCastingSession({onConfirm:()=>true});
  session.begin({spell:getDefaultSpellById('cure-wounds'),slotOptions:[{kind:'normal',level:2,remaining:1,castingSourceId:'bard',spellcastingModifier:2},{kind:'normal',level:2,remaining:1,castingSourceId:'cleric',spellcastingModifier:4}]});
  assert.deepEqual(session.preview({kind:'normal',level:2,castingSourceId:'bard'}).healing,['2d8 + 2']);
  assert.deepEqual(session.preview({kind:'normal',level:2,castingSourceId:'cleric'}).healing,['2d8 + 4']);
  session.updateTarget({locked:true,validRange:true,affectedTokens:[{id:'ally'}]});
  const result=await session.confirm({kind:'normal',level:2,castingSourceId:'cleric'});
  assert.deepEqual(result.resolution.healing,['2d8 + 4']);
});

test("custom spell scaling overrides base dice without scaling secondary damage twice",()=>{
  const spell={id:'custom-ray',level:1,damage:[{dice:'1d6',damageType:'fire'},{dice:'1d4',damageType:'cold'}],scaling:{atSlotLevel:{1:'1d6',3:'3d6'}}};
  assert.deepEqual(createCastResolution({spell,slotLevel:3}).damage,['3d6 fire','1d4 cold']);
});


test("healing modifier resolution keeps zero and negative bonuses distinct from an unknown bonus",()=>{
  const spell=getDefaultSpellById('healing-word');
  for(const [modifier,expected] of [[0,'1d4 + 0'],[-2,'1d4 - 2'],[null,'1d4 + MOD']])assert.deepEqual(createCastResolution({spell,slotLevel:1,spellcastingModifier:modifier}).healing,[expected]);
  assert.deepEqual(createCastResolution({spell:{id:'custom-cantrip',level:0,damage:[{dice:'1d10',type:'fire'}],scaling:{atCharacterLevel:{1:'1d10',17:'4d10'}}},characterLevel:20}).damage,['4d10 fire']);
});


test("projectile spells retain individual targets and spend once for the whole cast",async()=>{
 for(const [id,level,characterLevel,count,damage] of [["magic-missile",3,5,5,"1d4 + 1 force"],["eldritch-blast",0,17,4,"1d10 force"],["scorching-ray",4,7,5,"2d6 fire"]]){
  let spends=0;let savedTarget;const session=createSpellCastingSession({onConfirm:({target})=>{spends++;savedTarget=target;return true;}});
  session.begin({spell:getDefaultSpellById(id),characterLevel,slotOptions:[{kind:level?'normal':'cantrip',level,remaining:1}]});
  const tokens=[{id:'a',name:'First'},{id:'b',name:'Second'}];session.updateTarget({locked:true,affectedTokens:[tokens[0]],availableTokens:tokens});
  session.setProjectileTargets(Array.from({length:count},(_,i)=>i%2?'b':'a'));
  const preview=session.preview({level});assert.equal(preview.projectiles.length,count);assert.ok(preview.projectiles.every(p=>p.damage===damage));assert.equal(spends,0);
  const result=await session.confirm({level});assert.equal(result.ok,true);assert.equal(spends,1);assert.equal(savedTarget.projectiles.length,count);assert.deepEqual(result.resolution.affectedTokens.map(t=>t.id),['a','b']);
  assert.equal((await session.confirm({level})).ok,false);assert.equal(spends,1);
 }
});

test("removed secondary projectile targets block the entire cast without spending",async()=>{
 let spends=0;const session=createSpellCastingSession({onConfirm:()=>{spends++;return true;}});
 session.begin({spell:getDefaultSpellById('magic-missile'),slotOptions:[{kind:'normal',level:1,remaining:1},{kind:'normal',level:3,remaining:1}]});
 session.updateTarget({locked:true,affectedTokens:[{id:'a'}],availableTokens:[{id:'a'},{id:'b'}]});
 session.setProjectileTargets(['a','b','a']);assert.equal(session.preview({level:3}).projectiles.length,5);
 session.updateTarget({locked:true,affectedTokens:[{id:'a'}],availableTokens:[{id:'a'}]});
 assert.equal((await session.confirm({level:1})).ok,false);assert.equal(spends,0);
 session.setProjectileTargets(['a','a','a']);assert.equal((await session.confirm({level:1})).ok,true);assert.equal(spends,1);
});

test("Eldritch Blast beam counts follow total character level and preserve separate attacks",()=>{
 for(const [level,count] of [[1,1],[4,1],[5,2],[10,2],[11,3],[16,3],[17,4],[20,4]]){const session=createSpellCastingSession();session.begin({spell:getDefaultSpellById('eldritch-blast'),characterLevel:level});session.updateTarget({locked:true,affectedTokens:[{id:'a'}]});const resolution=session.preview();assert.equal(resolution.projectiles.length,count);assert.equal(resolution.attack.type,'ranged');}
});
