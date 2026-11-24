import {
  createSpellTemplateInstruction
} from "./spellTemplates.js?v=map-single-target-20260829";

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function finiteInteger(value, fallback = 0, minimum = 0) {
  const number = Number(value);
  return Math.max(
    minimum,
    Math.round(Number.isFinite(number) ? number : fallback)
  );
}

function cloneAffectedTokens(tokens) {
  return (Array.isArray(tokens) ? tokens : [])
    .map((token) => {
      const centerX = Number(token?.center?.x ?? token?.centerX);
      const centerY = Number(token?.center?.y ?? token?.centerY);
      const elevation = Number(token?.elevation ?? token?.elevationFeet);
      return {
        id: cleanText(token?.id),
        name: cleanText(token?.name, "Token"),
        type: cleanText(token?.type, "token"),
        ...(Number.isFinite(centerX) && Number.isFinite(centerY)
          ? { center: Object.freeze({ x: centerX, y: centerY }) }
          : {}),
        ...(Number.isFinite(elevation) ? { elevation } : {})
      };
    })
    .filter((token) => token.id || token.name);
}

function optionalInteger(value) {
  return value === null || value === undefined || String(value).trim() === "" || !Number.isFinite(Number(value)) ? null : Math.round(Number(value));
}

function resolveCastingModifier(expression, modifier) {
  const value = optionalInteger(modifier);
  return value === null ? expression : expression.replace(/\bMOD\b/gi,String(value)).replace(/\+\s*-(\d+)/g,"- $1");
}

function normalizeSlotOption(option = {}) {
  const kind = cleanText(option.kind, "normal") || "normal";
  const level = finiteInteger(option.level, 0, 0);
  const remaining = Number(option.remaining) === Number.POSITIVE_INFINITY
    ? Number.POSITIVE_INFINITY
    : Number.isFinite(Number(option.remaining))
      ? finiteInteger(option.remaining, 0, 0)
      : kind === "cantrip"
        ? Number.POSITIVE_INFINITY
        : 0;

  return Object.freeze({
    kind,
    level,
    sourceId: cleanText(option.sourceId),
    castingSourceId: cleanText(option.castingSourceId),
    castingSourceName: cleanText(option.castingSourceName),
    spellcastingAbility: cleanText(option.spellcastingAbility).toLowerCase(),
    spellcastingModifier: optionalInteger(option.spellcastingModifier),
    spellSaveDc: Number.isFinite(Number(option.spellSaveDc))
      ? finiteInteger(option.spellSaveDc, 0, 0)
      : null,
    spellAttackBonus: Number.isFinite(Number(option.spellAttackBonus))
      ? Math.round(Number(option.spellAttackBonus))
      : null,
    castingTime: cleanText(option.castingTime),
    label: cleanText(
      option.label,
      kind === "cantrip"
        ? "Cantrip — no spell slot"
        : `${kind === "pact" ? "Pact" : "Level"} ${level} slot`
    ),
    remaining
  });
}

function tableValueAtLevel(table, level) {
  if (!table || typeof table !== "object") return "";
  const direct = cleanText(table[String(level)]);
  if (direct) return direct;
  const eligible = Object.entries(table)
    .map(([threshold, value]) => [Number(threshold), cleanText(value)])
    .filter(([threshold, value]) => Number.isFinite(threshold) && threshold <= level && value)
    .sort((left, right) => right[0] - left[0]);
  return eligible[0]?.[1] || "";
}

function getDamageExpression(damageEntry, slotLevel, characterLevel, scaling = {}) {
  const slotTable = damageEntry?.atSlotLevel;
  const direct = tableValueAtLevel(slotTable, slotLevel);

  if (cleanText(direct)) {
    return cleanText(direct);
  }

  const characterScaling = tableValueAtLevel(
    damageEntry?.atCharacterLevel,
    characterLevel
  );
  if (characterScaling) return characterScaling;

  const scaled = tableValueAtLevel(scaling?.atSlotLevel, slotLevel) || tableValueAtLevel(scaling?.atCharacterLevel, characterLevel);
  if (scaled) return scaled;
  const base = cleanText(
    damageEntry?.dice,
    damageEntry?.amount
  );
  return base;
}

export function getSpellProjectileProfile(spell = {}, slotLevel = 0, characterLevel = 1) {
  switch (spell.id) {
    case "eldritch-blast": return Object.freeze({count: characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1, label: "Beam", damage: "1d10 force", separateAttacks: true});
    case "magic-missile": return Object.freeze({count: Math.max(1, Math.min(9, finiteInteger(slotLevel, 1))) + 2, label: "Dart", damage: "1d4 + 1 force", separateAttacks: false});
    case "scorching-ray": return Object.freeze({count: Math.max(2, Math.min(9, finiteInteger(slotLevel, 2))) + 1, label: "Ray", damage: "2d6 fire", separateAttacks: true});
    default: return null;
  }
}

export function createCastResolution({
  spell = {},
  slotLevel = 0,
  characterLevel = 1,
  affectedTokens = [],
  projectiles = [],
  spellSaveDc = null,
  spellAttackBonus = null,
  spellcastingModifier = null,
  resourceKind = "",
  castingSourceId = "",
  castingSourceName = "",
  concentrationReplaced = ""
} = {}) {
  const save = spell.targeting?.save || spell.save || (
    cleanText(spell.saveAbility)
      ? {
          ability: spell.saveAbility,
          success: spell.saveSuccess
        }
      : null
  );
  const projectileProfile = getSpellProjectileProfile(spell, slotLevel, characterLevel);
  const attack = spell.targeting?.attack || spell.attack || (projectileProfile?.separateAttacks ? {type: "ranged"} : null) || (
    cleanText(spell.attackType)
      ? { type: spell.attackType }
      : null
  );
  const structuredDamage = Array.isArray(spell.damage)
    ? spell.damage
    : spell.damage && typeof spell.damage === "object"
      ? [spell.damage]
      : [];
  const damageEntries = structuredDamage.length
    ? structuredDamage
    : cleanText(spell.damageDice)
      ? [{
          dice: spell.damageDice,
          damageType: spell.damageType
        }]
      : [];
  const damage = damageEntries
    .map((entry, index) => {
      const expression = resolveCastingModifier(getDamageExpression(entry, slotLevel, characterLevel, index === 0 ? spell.scaling : {}), spellcastingModifier);
      const damageType = cleanText(
        entry?.damageType,
        entry?.type
      );

      return expression
        ? `${expression}${damageType ? ` ${damageType}` : ""}`
        : "";
    })
    .filter(Boolean);
  const healingEntries = Array.isArray(spell.healing)
    ? spell.healing
    : spell.healing && typeof spell.healing === "object"
      ? [spell.healing]
      : [];
  const healing = healingEntries
    .map((entry) => (
      tableValueAtLevel(entry?.atSlotLevel, slotLevel) ||
      tableValueAtLevel(spell.scaling?.healingAtSlotLevel, slotLevel) ||
      cleanText(entry?.dice, entry?.amount)
    ))
    .filter(Boolean).map(expression => resolveCastingModifier(expression, spellcastingModifier));
  const concentration = (
    spell.concentration === true ||
    spell.targeting?.duration?.concentration === true
  );
  const hasSaveDc = !(
    spellSaveDc === null ||
    spellSaveDc === undefined ||
    String(spellSaveDc).trim() === ""
  );
  const hasAttackBonus = !(
    spellAttackBonus === null ||
    spellAttackBonus === undefined ||
    String(spellAttackBonus).trim() === ""
  );
  const normalizedSaveDc = hasSaveDc && Number.isFinite(Number(spellSaveDc))
    ? finiteInteger(spellSaveDc, 0, 0)
    : null;
  const normalizedAttackBonus = hasAttackBonus && Number.isFinite(Number(spellAttackBonus))
    ? Math.round(Number(spellAttackBonus))
    : null;

  return Object.freeze({
    spellId: cleanText(spell.id),
    spellName: cleanText(spell.name, "Spell"),
    slotLevel: finiteInteger(slotLevel, 0, 0),
    characterLevel: finiteInteger(characterLevel, 1, 1),
    resourceKind: cleanText(resourceKind),
    castingSourceId: cleanText(castingSourceId),
    castingSourceName: cleanText(castingSourceName),
    ritual: cleanText(resourceKind) === "ritual",
    concentrationReplaced: cleanText(concentrationReplaced),
    affectedTokens: Object.freeze(
      cloneAffectedTokens(affectedTokens)
    ),
    projectiles: Object.freeze(projectiles.map((entry) => Object.freeze({...entry}))),
    projectileProfile,
    save: save
      ? Object.freeze({
          ability: cleanText(save.ability),
          dc: normalizedSaveDc,
          success: cleanText(save.success)
        })
      : null,
    attack: attack
      ? Object.freeze({
          type: cleanText(attack.type),
          bonus: normalizedAttackBonus
        })
      : null,
    damage: Object.freeze(damage),
    healing: Object.freeze(healing),
    concentration
  });
}

export function createSpellCastingSession({
  onConfirm = () => true,
  onConfirmed = () => {}
} = {}) {
  let phase = "idle";
  let spell = null;
  let instruction = null;
  let characterId = "";
  let characterName = "";
  let casterToken = null;
  let slotOptions = [];
  let sourceFeedback = [];
  let target = null;
  let resolution = null;
  let confirmationError = "";
  let spellSaveDc = null;
  let spellAttackBonus = null;
  let spellcastingModifier = null;
  let characterLevel = 1;
  let projectileTargetIds = [];

  function getState() {
    return Object.freeze({
      phase,
      spell,
      instruction,
      characterId,
      characterName,
      casterToken,
      slotOptions: Object.freeze([...slotOptions]),
      sourceFeedback: Object.freeze(sourceFeedback.map((entry) => Object.freeze({ ...entry }))),
      target,
      resolution,
      confirmationError,
      canConfirm:
        phase === "target-selected" &&
        target?.validRange !== false &&
        (
          finiteInteger(spell?.level, 0, 0) === 0 ||
          slotOptions.some((option) => option.remaining > 0)
        )
    });
  }

  function begin(config = {}) {
    const nextSpell = config.spell || {};
    const nextInstruction =
      config.instruction ||
      createSpellTemplateInstruction(nextSpell);

    if (!nextInstruction.supported) {
      throw new Error(
        nextInstruction.reason ||
        "This spell cannot use a map template."
      );
    }

    sourceFeedback = (config.sourceFeedback || []).map((entry) => ({ sourceId: cleanText(entry.sourceId), sourceName: cleanText(entry.sourceName), reason: cleanText(entry.reason) }));
    spell = nextSpell;
    instruction = nextInstruction;
    characterId = cleanText(config.characterId);
    characterName = cleanText(
      config.characterName,
      config.character?.identity?.name ||
        config.character?.name ||
        "Character"
    );
    casterToken = config.casterToken || null;
    slotOptions = (Array.isArray(config.slotOptions)
      ? config.slotOptions
      : [])
      .map(normalizeSlotOption)
      .filter((option) => (
        finiteInteger(nextSpell.level, 0, 0) === 0 ||
        option.level >= finiteInteger(nextSpell.level, 0, 0)
      ));
    spellSaveDc = config.spellSaveDc;
    spellAttackBonus = config.spellAttackBonus;
    spellcastingModifier = optionalInteger(config.spellcastingModifier);
    characterLevel = finiteInteger(config.characterLevel, 1, 1);
    target = null;
    projectileTargetIds = [];
    resolution = null;
    confirmationError = "";
    phase = "previewing";
    return getState();
  }

  function updateTarget({
    locked = false,
    validRange = true,
    validTarget = true,
    invalidReason = "",
    distanceFeet = null,
    horizontalFeet = null,
    verticalFeet = null,
    startElevationFeet = 0,
    endElevationFeet = 0,
    affectedTokens = [],
    availableTokens = null,
    selectedPoint = null,
    geometry = null
  } = {}) {
    if (
      phase === "idle" ||
      phase === "cancelled" ||
      phase === "confirmed" ||
      phase === "confirming"
    ) {
      return getState();
    }

    target = Object.freeze({
      locked: locked === true,
      validRange: validRange !== false,
      validTarget: validTarget !== false,
      invalidReason: cleanText(invalidReason),
      distanceFeet: Number.isFinite(Number(distanceFeet))
        ? Number(distanceFeet)
        : null,
      horizontalFeet: Number.isFinite(Number(horizontalFeet))
        ? Number(horizontalFeet)
        : null,
      verticalFeet: Number.isFinite(Number(verticalFeet))
        ? Number(verticalFeet)
        : null,
      startElevationFeet: Number.isFinite(Number(startElevationFeet))
        ? Math.round(Number(startElevationFeet))
        : 0,
      endElevationFeet: Number.isFinite(Number(endElevationFeet))
        ? Math.round(Number(endElevationFeet))
        : 0,
      affectedTokens: Object.freeze(
        cloneAffectedTokens(affectedTokens)
      ),
      availableTokens: Object.freeze(cloneAffectedTokens(availableTokens || affectedTokens)),
      selectedPoint: Number.isFinite(Number(selectedPoint?.x)) &&
        Number.isFinite(Number(selectedPoint?.y))
        ? Object.freeze({ x: Number(selectedPoint.x), y: Number(selectedPoint.y) })
        : null,
      geometry
    });
    phase = locked === true && validRange !== false && validTarget !== false
      ? "target-selected"
      : "previewing";
    confirmationError = "";
    return getState();
  }

  function findSlot(selection = {}) {
    const baseLevel = finiteInteger(spell?.level, 0, 0);
    if (baseLevel === 0) {
      const requestedCastingSourceId = cleanText(selection.castingSourceId);
      return slotOptions.find((option) => (
        option.kind === "cantrip" &&
        (!requestedCastingSourceId || option.castingSourceId === requestedCastingSourceId)
      )) || normalizeSlotOption({
          kind: "cantrip",
          level: 0,
          label: "Cantrip — no spell slot"
        });
    }
    const requestedKind = cleanText(selection.kind, "normal");
    const requestedLevel = finiteInteger(selection.level, baseLevel, 0);
    const requestedSourceId = cleanText(selection.sourceId);
    const requestedCastingSourceId = cleanText(selection.castingSourceId);
    return slotOptions.find((option) => (
      option.kind === requestedKind &&
      option.level === requestedLevel &&
      option.sourceId === requestedSourceId &&
      (!requestedCastingSourceId || option.castingSourceId === requestedCastingSourceId) &&
      option.remaining > 0
    )) || null;
  }

  function setProjectileTargets(ids = []) {
    if (["confirming", "confirmed", "cancelled", "idle"].includes(phase)) return getState();
    projectileTargetIds = ids.map((id) => cleanText(id));
    confirmationError = "";
    return getState();
  }

  function resolvedTarget(slot) {
    const profile = getSpellProjectileProfile(spell, slot.level, characterLevel);
    if (!profile) return {...target, projectiles: []};
    const available = target?.availableTokens || [];
    const projectiles = Array.from({length: profile.count}, (_, index) => {
      const targetId = projectileTargetIds[index] ?? target?.affectedTokens?.[0]?.id ?? "";
      const token = available.find((entry) => entry.id === targetId);
      return {index, label: profile.label, targetId, targetName: token?.name || "Unavailable target", damage: profile.damage, valid: Boolean(token)};
    });
    const ids = new Set(projectiles.map((entry) => entry.targetId));
    return {...target, projectiles, affectedTokens: available.filter((token) => ids.has(token.id))};
  }

  function preview(selection = {}) {
    const slot = findSlot(selection);
    if (!slot) return null;
    return createCastResolution({
      spell,
      slotLevel: slot.level,
      characterLevel,
      affectedTokens: resolvedTarget(slot).affectedTokens || [],
      projectiles: resolvedTarget(slot).projectiles,
      spellSaveDc: slot.spellSaveDc ?? spellSaveDc,
      spellAttackBonus: slot.spellAttackBonus ?? spellAttackBonus,
      spellcastingModifier: slot.spellcastingModifier ?? spellcastingModifier,
      resourceKind: slot.kind,
      castingSourceId: slot.castingSourceId,
      castingSourceName: slot.castingSourceName
    });
  }

  async function confirm(selection = {}) {
    if (phase !== "target-selected" || target?.validRange === false) {
      return Object.freeze({
        ok: false,
        error: "Lock a valid target before confirming the cast.",
        state: getState()
      });
    }

    const slot = findSlot(selection);

    if (!slot) {
      confirmationError =
        "That spell slot is no longer available.";
      return Object.freeze({
        ok: false,
        error: confirmationError,
        state: getState()
      });
    }

    const castTarget = resolvedTarget(slot);
    if (castTarget.projectiles.some((entry) => !entry.valid)) {
      confirmationError = "Choose an available creature in range for every projectile before confirming.";
      return Object.freeze({ok: false, error: confirmationError, state: getState()});
    }
    phase = "confirming";
    confirmationError = "";

    try {
      const result = await onConfirm({
        spell,
        slot,
        target: castTarget,
        characterId,
        casterToken
      });

      if (result === false) {
        phase = "target-selected";
        confirmationError =
          "The cast could not be saved, so no resource was spent.";
        return Object.freeze({
          ok: false,
          error: confirmationError,
          state: getState()
        });
      }

      resolution = createCastResolution({
        spell,
        slotLevel: slot.level,
        characterLevel,
        affectedTokens: castTarget.affectedTokens,
        projectiles: castTarget.projectiles,
        spellSaveDc: slot.spellSaveDc ?? spellSaveDc,
        spellAttackBonus: slot.spellAttackBonus ?? spellAttackBonus,
        spellcastingModifier: slot.spellcastingModifier ?? spellcastingModifier,
        resourceKind: slot.kind,
        castingSourceId: slot.castingSourceId,
        castingSourceName: slot.castingSourceName,
        concentrationReplaced:
          result?.character?.combat?.concentration?.replacedSpellName ||
          result?.combat?.concentration?.replacedSpellName ||
          result?.concentrationReplaced
      });
      phase = "confirmed";
      const confirmedState = getState();

      try {
        const presentationResult = onConfirmed({
          spell,
          slot,
          target: castTarget,
          characterId,
          casterToken,
          resolution,
          state: confirmedState
        });
        presentationResult?.catch?.(() => {});
      } catch {
        // Presentation callbacks must never change a confirmed cast.
      }

      return Object.freeze({
        ok: true,
        slot,
        resolution,
        result,
        state: confirmedState
      });
    } catch (error) {
      phase = "target-selected";
      confirmationError = cleanText(
        error?.message,
        "The cast could not be saved, so no resource was spent."
      );
      return Object.freeze({
        ok: false,
        error: confirmationError,
        state: getState()
      });
    }
  }

  function cancel() {
    if (phase !== "confirmed") {
      phase = "cancelled";
      target = null;
      resolution = null;
      confirmationError = "";
    }
    return getState();
  }

  function reset() {
    phase = "idle";
    spell = null;
    instruction = null;
    characterId = "";
    characterName = "";
    casterToken = null;
    slotOptions = [];
    target = null;
    resolution = null;
    confirmationError = "";
    spellSaveDc = null;
    spellAttackBonus = null;
    spellcastingModifier = null;
    characterLevel = 1;
    projectileTargetIds = [];
    return getState();
  }

  return Object.freeze({
    begin,
    cancel,
    confirm,
    getState,
    preview,
    reset,
    setProjectileTargets,
    updateTarget
  });
}
