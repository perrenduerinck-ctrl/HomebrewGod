import {
  createSpellTemplateInstruction
} from "./spellTemplates.js";

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
    .map((token) => ({
      id: cleanText(token?.id),
      name: cleanText(token?.name, "Token"),
      type: cleanText(token?.type, "token")
    }))
    .filter((token) => token.id || token.name);
}

function normalizeSlotOption(option = {}) {
  const kind = cleanText(option.kind, "normal") || "normal";
  const level = finiteInteger(option.level, 0, 0);
  const remaining = Number.isFinite(Number(option.remaining))
    ? finiteInteger(option.remaining, 0, 0)
    : kind === "cantrip"
      ? Number.POSITIVE_INFINITY
      : 0;

  return Object.freeze({
    kind,
    level,
    sourceId: cleanText(option.sourceId),
    label: cleanText(
      option.label,
      kind === "cantrip"
        ? "Cantrip — no spell slot"
        : `${kind === "pact" ? "Pact" : "Level"} ${level} slot`
    ),
    remaining
  });
}

function getDamageExpression(damageEntry, slotLevel) {
  const slotTable = damageEntry?.atSlotLevel;
  const direct = slotTable?.[String(slotLevel)];

  if (cleanText(direct)) {
    return cleanText(direct);
  }

  const base = cleanText(
    damageEntry?.dice,
    damageEntry?.amount
  );
  return base;
}

export function createCastResolution({
  spell = {},
  slotLevel = 0,
  affectedTokens = [],
  spellSaveDc = null,
  spellAttackBonus = null
} = {}) {
  const save = spell.targeting?.save || spell.save || null;
  const attack = spell.targeting?.attack || null;
  const damage = (Array.isArray(spell.damage) ? spell.damage : [])
    .map((entry) => {
      const expression = getDamageExpression(entry, slotLevel);
      const damageType = cleanText(
        entry?.damageType,
        entry?.type
      );

      return expression
        ? `${expression}${damageType ? ` ${damageType}` : ""}`
        : "";
    })
    .filter(Boolean);
  const concentration = (
    spell.concentration === true ||
    spell.targeting?.duration?.concentration === true
  );
  const normalizedSaveDc = Number.isFinite(Number(spellSaveDc))
    ? finiteInteger(spellSaveDc, 0, 0)
    : null;
  const normalizedAttackBonus = Number.isFinite(Number(spellAttackBonus))
    ? Math.round(Number(spellAttackBonus))
    : null;

  return Object.freeze({
    spellId: cleanText(spell.id),
    spellName: cleanText(spell.name, "Spell"),
    slotLevel: finiteInteger(slotLevel, 0, 0),
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
    concentration
  });
}

export function createSpellCastingSession({
  onConfirm = () => true
} = {}) {
  let phase = "idle";
  let spell = null;
  let instruction = null;
  let characterId = "";
  let characterName = "";
  let casterToken = null;
  let slotOptions = [];
  let target = null;
  let resolution = null;
  let confirmationError = "";
  let spellSaveDc = null;
  let spellAttackBonus = null;

  function getState() {
    return Object.freeze({
      phase,
      spell,
      instruction,
      characterId,
      characterName,
      casterToken,
      slotOptions: Object.freeze([...slotOptions]),
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
    target = null;
    resolution = null;
    confirmationError = "";
    phase = "previewing";
    return getState();
  }

  function updateTarget({
    locked = false,
    validRange = true,
    distanceFeet = null,
    affectedTokens = [],
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
      distanceFeet: Number.isFinite(Number(distanceFeet))
        ? Number(distanceFeet)
        : null,
      affectedTokens: Object.freeze(
        cloneAffectedTokens(affectedTokens)
      ),
      geometry
    });
    phase = locked === true && validRange !== false
      ? "target-selected"
      : "previewing";
    confirmationError = "";
    return getState();
  }

  async function confirm(selection = {}) {
    if (phase !== "target-selected" || target?.validRange === false) {
      return Object.freeze({
        ok: false,
        error: "Lock a valid target before confirming the cast.",
        state: getState()
      });
    }

    const baseLevel = finiteInteger(spell?.level, 0, 0);
    const requestedKind = cleanText(
      selection.kind,
      baseLevel === 0 ? "cantrip" : "normal"
    );
    const requestedLevel = finiteInteger(
      selection.level,
      baseLevel,
      0
    );
    const requestedSourceId = cleanText(selection.sourceId);
    const slot = baseLevel === 0
      ? normalizeSlotOption({
          kind: "cantrip",
          level: 0,
          label: "Cantrip — no spell slot"
        })
      : slotOptions.find((option) => (
          option.kind === requestedKind &&
          option.level === requestedLevel &&
          option.sourceId === requestedSourceId &&
          option.remaining > 0
        ));

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
        affectedTokens: target.affectedTokens,
        spellSaveDc,
        spellAttackBonus
      });
      phase = "confirmed";

      return Object.freeze({
        ok: true,
        slot,
        resolution,
        result,
        state: getState()
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
    return getState();
  }

  return Object.freeze({
    begin,
    cancel,
    confirm,
    getState,
    reset,
    updateTarget
  });
}
