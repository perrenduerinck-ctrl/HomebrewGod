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

function getDamageExpression(damageEntry, slotLevel, characterLevel) {
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

  const base = cleanText(
    damageEntry?.dice,
    damageEntry?.amount
  );
  return base;
}

export function createCastResolution({
  spell = {},
  slotLevel = 0,
  characterLevel = 1,
  affectedTokens = [],
  spellSaveDc = null,
  spellAttackBonus = null,
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
  const attack = spell.targeting?.attack || spell.attack || (
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
    .map((entry) => {
      const expression = getDamageExpression(entry, slotLevel, characterLevel) ||
        tableValueAtLevel(spell.scaling?.atCharacterLevel, characterLevel) ||
        tableValueAtLevel(spell.scaling?.atSlotLevel, slotLevel);
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
    .filter(Boolean);
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
  let characterLevel = 1;

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
    characterLevel = finiteInteger(config.characterLevel, 1, 1);
    target = null;
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

  function preview(selection = {}) {
    const slot = findSlot(selection);
    if (!slot) return null;
    return createCastResolution({
      spell,
      slotLevel: slot.level,
      characterLevel,
      affectedTokens: target?.affectedTokens || [],
      spellSaveDc: slot.spellSaveDc ?? spellSaveDc,
      spellAttackBonus: slot.spellAttackBonus ?? spellAttackBonus,
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

    phase = "confirming";
    confirmationError = "";

    try {
      const result = await onConfirm({
        spell,
        slot,
        target,
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
        affectedTokens: target.affectedTokens,
        spellSaveDc: slot.spellSaveDc ?? spellSaveDc,
        spellAttackBonus: slot.spellAttackBonus ?? spellAttackBonus,
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
          target,
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
    characterLevel = 1;
    return getState();
  }

  return Object.freeze({
    begin,
    cancel,
    confirm,
    getState,
    preview,
    reset,
    updateTarget
  });
}
