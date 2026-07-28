// =====================================================
// HOMEBREW GOD - CHARACTER SHEET VIEW
// Rendering uses a protected snapshot; tracked changes flow through callbacks.
// =====================================================

import {
  buildCharacterSheetPresentation
} from "./characterCreator/sheetPresentation.js";
import {
  STANDARD_CONDITIONS
} from "./characterSheet/gameplayState.js";
import {
  getDefaultSpellById
} from "./defaultSpells.js";
import {
  calculateInventoryLineWeight
} from "./characterCreator/inventoryEquipment.js";
import {
  calculateCharacterCarryingCapacity
} from "./characterCreator/rulesMath.js";

const ABILITIES = Object.freeze([
  { id: "str", name: "Strength", short: "STR" },
  { id: "dex", name: "Dexterity", short: "DEX" },
  { id: "con", name: "Constitution", short: "CON" },
  { id: "int", name: "Intelligence", short: "INT" },
  { id: "wis", name: "Wisdom", short: "WIS" },
  { id: "cha", name: "Charisma", short: "CHA" }
]);

const SKILLS = Object.freeze([
  { id: "acrobatics", name: "Acrobatics", ability: "dex" },
  { id: "animal-handling", name: "Animal Handling", ability: "wis" },
  { id: "arcana", name: "Arcana", ability: "int" },
  { id: "athletics", name: "Athletics", ability: "str" },
  { id: "deception", name: "Deception", ability: "cha" },
  { id: "history", name: "History", ability: "int" },
  { id: "insight", name: "Insight", ability: "wis" },
  { id: "intimidation", name: "Intimidation", ability: "cha" },
  { id: "investigation", name: "Investigation", ability: "int" },
  { id: "medicine", name: "Medicine", ability: "wis" },
  { id: "nature", name: "Nature", ability: "int" },
  { id: "perception", name: "Perception", ability: "wis" },
  { id: "performance", name: "Performance", ability: "cha" },
  { id: "persuasion", name: "Persuasion", ability: "cha" },
  { id: "religion", name: "Religion", ability: "int" },
  { id: "sleight-of-hand", name: "Sleight of Hand", ability: "dex" },
  { id: "stealth", name: "Stealth", ability: "dex" },
  { id: "survival", name: "Survival", ability: "wis" }
]);

const CURRENCY = Object.freeze(["cp", "sp", "ep", "gp", "pp"]);

const INVENTORY_FILTER_OPTIONS =
  Object.freeze([
    ["equipped", "Equipped"],
    ["attuned", "Attuned"],
    ["weapons", "Weapons"],
    ["armor", "Armor"],
    ["magical", "Magical"],
    ["containers", "Containers"]
  ]);

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "object" || typeof value === "function") {
    return fallback;
  }

  const text = String(value).trim();

  if (/^\[object\s+[^\]]+\]$/i.test(text)) {
    return fallback;
  }

  return text || fallback;
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampInteger(value, fallback = 0, minimum = 0) {
  return Math.max(
    minimum,
    Math.round(finiteNumber(value, fallback))
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatModifier(value) {
  const number = Math.round(finiteNumber(value, 0));
  return number >= 0 ? `+${number}` : String(number);
}

function abilityModifier(score) {
  return Math.floor((finiteNumber(score, 10) - 10) / 2);
}

function titleFromId(value, fallback = "Unknown") {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cloneSnapshot(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      console.warn(
        "Character sheet could not use structuredClone; using a JSON snapshot instead.",
        error
      );
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn(
      "Character sheet could not clone the supplied character. Rendering a protected empty sheet.",
      error
    );

    return {};
  }
}

function safeImageUrl(value) {
  const url = cleanText(value);

  if (!url) {
    return "";
  }

  if (
    /^(https?:|blob:)/i.test(url) ||
    /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(url)
  ) {
    return url;
  }

  return "";
}

function getName(character) {
  return firstText(
    character?.identity?.name,
    character?.name,
    "Unnamed Character"
  );
}

function getSpeciesName(character) {
  return firstText(
    character?.species?.name,
    character?.race,
    "No Species"
  );
}

function getBackgroundName(character) {
  return firstText(
    character?.background?.name,
    character?.backgroundName,
    "No Background"
  );
}

function getClassEntries(character) {
  const entries = asArray(
    character?.classProgression?.classes
  );

  if (entries.length) {
    return entries.map((entry, index) => ({
      entryId: firstText(entry?.entryId, `class-${index + 1}`),
      classId: firstText(entry?.classId, normalizeKey(entry?.className)),
      className: firstText(entry?.className, titleFromId(entry?.classId, "Class")),
      level: clampInteger(entry?.level, 1, 1),
      // The class entry is canonical. Do not prefer the legacy top-level choice.
      subclassName: firstText(entry?.subclassName),
      subclassId: firstText(entry?.subclassId)
    }));
  }

  const legacyClassName = firstText(
    character?.className,
    character?.classData?.className,
    "No Class"
  );

  return [{
    entryId: "legacy-class-1",
    classId: firstText(character?.classId, normalizeKey(legacyClassName)),
    className: legacyClassName,
    level: clampInteger(character?.level, 1, 1),
    subclassName: firstText(character?.subclassName),
    subclassId: ""
  }];
}

function getTotalLevel(character, classEntries = getClassEntries(character)) {
  const explicit = optionalNumber(
    character?.classProgression?.totalLevel
  );

  if (explicit !== null && explicit > 0) {
    return clampInteger(explicit, 1, 1);
  }

  const classTotal = classEntries.reduce(
    (sum, entry) => sum + clampInteger(entry?.level, 0, 0),
    0
  );

  return classTotal || clampInteger(character?.level, 1, 1);
}

function formatClassEntry(entry) {
  const className = firstText(entry?.className, "Class");
  const level = clampInteger(entry?.level, 1, 1);
  const subclass = firstText(entry?.subclassName);

  if (normalizeKey(className) === "no-class") {
    return "No Class";
  }

  return `${className} ${level}${subclass ? ` \u2014 ${subclass}` : ""}`;
}

function getAbilityScore(character, abilityId) {
  return finiteNumber(
    character?.abilities?.scores?.[abilityId] ??
    character?.stats?.[abilityId],
    10
  );
}

function getAbilityModifier(character, abilityId) {
  const saved = optionalNumber(
    character?.abilities?.modifiers?.[abilityId]
  );

  return saved === null
    ? abilityModifier(getAbilityScore(character, abilityId))
    : Math.round(saved);
}

function getProficiencyBonus(character, totalLevel = getTotalLevel(character)) {
  const saved = optionalNumber(character?.combat?.proficiencyBonus);

  if (saved !== null) {
    return Math.max(0, Math.round(saved));
  }

  return 2 + Math.floor((Math.max(1, totalLevel) - 1) / 4);
}

function getSkillEntry(character, skill) {
  const entries = isRecord(character?.proficiencies?.skills)
    ? character.proficiencies.skills
    : {};

  return (
    entries[skill.id] ||
    entries[skill.name] ||
    entries[normalizeKey(skill.name)] ||
    null
  );
}

function isLegacySkillProficient(character, skill) {
  const accepted = new Set([
    normalizeKey(skill.id),
    normalizeKey(skill.name)
  ]);

  return asArray(character?.skills).some((value) => {
    return accepted.has(normalizeKey(value));
  });
}

function getSkillDetails(character, skill, proficiencyBonus) {
  const entry = getSkillEntry(character, skill);
  const expertise = entry?.expertise === true;
  const proficient = expertise || entry?.proficient === true ||
    isLegacySkillProficient(character, skill);
  const explicit = optionalNumber(entry?.modifier ?? entry?.bonus);
  const modifier = explicit === null
    ? getAbilityModifier(character, skill.ability) +
      (expertise ? proficiencyBonus * 2 : proficient ? proficiencyBonus : 0)
    : Math.round(explicit);

  return { entry, expertise, proficient, modifier };
}

function getSavingThrowProficiencies(character) {
  const values = asArray(character?.proficiencies?.savingThrows);

  return new Set(
    values.flatMap((value) => {
      const normalized = normalizeKey(value);
      const ability = ABILITIES.find((candidate) => {
        return (
          candidate.id === normalized ||
          normalizeKey(candidate.name) === normalized ||
          normalizeKey(candidate.short) === normalized
        );
      });

      return ability ? [ability.id] : [];
    })
  );
}

function getPassivePerception(character, proficiencyBonus) {
  const explicitValues = [
    character?.combat?.passivePerception,
    character?.passivePerception,
    character?.proficiencies?.skills?.perception?.passive
  ];

  for (const value of explicitValues) {
    const number = optionalNumber(value);

    if (number !== null) {
      return Math.round(number);
    }
  }

  const perception = SKILLS.find((skill) => skill.id === "perception");
  return 10 + getSkillDetails(character, perception, proficiencyBonus).modifier;
}

function getPassiveSkillScore(character, skillId, proficiencyBonus) {
  if (skillId === "perception") {
    return getPassivePerception(
      character,
      proficiencyBonus
    );
  }

  const skill = SKILLS.find((entry) => {
    return entry.id === skillId;
  });
  const explicit = optionalNumber(
    character?.proficiencies?.skills?.[skillId]?.passive
  );

  if (explicit !== null) {
    return Math.round(explicit);
  }

  return skill
    ? 10 + getSkillDetails(
      character,
      skill,
      proficiencyBonus
    ).modifier
    : 10;
}

function formatSpeed(speed, legacySpeed = "") {
  if (isRecord(speed)) {
    const labels = {
      walk: "walk",
      climb: "climb",
      swim: "swim",
      fly: "fly",
      burrow: "burrow"
    };

    const parts = Object.entries(labels)
      .map(([key, label]) => ({
        label,
        value: optionalNumber(speed[key])
      }))
      .filter((entry) => entry.value !== null && entry.value > 0)
      .map((entry) => `${entry.label} ${entry.value} ft.`);

    const special = cleanText(speed.special);

    if (special) {
      parts.push(special);
    }

    return parts.join(", ") || "Not recorded";
  }

  const number = optionalNumber(speed);

  if (number !== null) {
    return `${number} ft.`;
  }

  return firstText(speed, legacySpeed, "Not recorded");
}

function formatHitDice(character) {
  const dice = asArray(character?.combat?.hitDice);

  if (!dice.length) {
    return "Not recorded";
  }

  return dice.map((entry) => {
    const count = clampInteger(entry?.count, 1, 1);
    const die = firstText(entry?.die, entry?.hitDie, "d8");
    const className = firstText(entry?.className);
    return `${count}${die}${className ? ` ${className}` : ""}`;
  }).join(", ");
}

function getLevelOrderRows(character, classEntries = getClassEntries(character)) {
  const byEntryId = new Map(
    classEntries.map((entry, index) => [
      firstText(entry.entryId, `class-${index + 1}`),
      entry
    ])
  );
  const rawOrder = asArray(
    character?.classProgression?.levelOrder
  );
  const order = rawOrder.length
    ? rawOrder
    : classEntries.flatMap((entry) => {
      return Array.from(
        { length: clampInteger(entry.level, 0, 0) },
        () => entry.entryId
      );
    });
  const classLevels = new Map();

  return order.map((value, index) => {
    const entryId = isRecord(value)
      ? firstText(
        value.classEntryId,
        value.entryId,
        value.id
      )
      : cleanText(value);
    const entry = byEntryId.get(entryId) ||
      classEntries.find((candidate) => {
        return (
          normalizeKey(candidate.classId) ===
          normalizeKey(
            isRecord(value)
              ? value.classId
              : value
          )
        );
      }) ||
      classEntries[0] ||
      {
        entryId,
        className: "Class",
        classId: ""
      };
    const key = firstText(entry.entryId, entry.classId, entryId);
    const classLevel = (classLevels.get(key) || 0) + 1;
    classLevels.set(key, classLevel);

    return {
      characterLevel: index + 1,
      classLevel,
      className: firstText(entry.className, titleFromId(entry.classId, "Class")),
      subclassName: firstText(entry.subclassName)
    };
  });
}

function renderClassProgression(character) {
  const entries = getClassEntries(character);
  const levelOrder = getLevelOrderRows(character, entries);

  return `
    <div class="hg-sheet-card-grid">
      <article class="hg-sheet-card">
        <h2>Class &amp; Subclass Progression</h2>
        ${renderContentList(entries.map((entry) => ({
          id: entry.entryId,
          name: `${entry.className} ${entry.level}`,
          summary: entry.subclassName
            ? `Subclass: ${entry.subclassName}`
            : "No subclass selected",
          source: entry.entryId
        })))}
      </article>

      <article class="hg-sheet-card hg-sheet-wide-card">
        <h2>Level-by-Level Multiclass Order</h2>
        ${levelOrder.length ? `
          <ol class="hg-sheet-level-order">
            ${levelOrder.map((entry) => `
              <li>
                <strong>Character ${entry.characterLevel}</strong>
                <span>${escapeHtml(`${entry.className} ${entry.classLevel}${entry.subclassName ? ` — ${entry.subclassName}` : ""}`)}</span>
              </li>
            `).join("")}
          </ol>
        ` : `<p class="hg-sheet-muted">No class level order is recorded.</p>`}
      </article>
    </div>
  `;
}

function getArmorClassSummary(character) {
  const summary = character?.combat?.armorClassOptions;

  if (
    isRecord(summary) &&
    Array.isArray(summary.options)
  ) {
    return summary;
  }

  const total = Math.round(finiteNumber(
    character?.combat?.armorClass ??
    character?.armorClass,
    10
  ));

  return {
    selected: {
      id: firstText(
        character?.combat?.selectedArmorClassMethod,
        "recorded"
      ),
      label: "Recorded Armor Class",
      total,
      breakdown: "Stored character value"
    },
    options: []
  };
}

function renderArmorClassOptions(character) {
  const summary = getArmorClassSummary(character);
  const selected = isRecord(summary.selected)
    ? summary.selected
    : {};
  const options = asArray(summary.options);

  return `
    <article class="hg-sheet-card">
      <h2>Armor Class Options</h2>
      <p class="hg-sheet-selected-rule">
        <strong>${escapeHtml(firstText(selected.label, "Selected Armor Class"))}: ${Math.round(finiteNumber(selected.total, 10))}</strong>
        <span>${escapeHtml(firstText(selected.breakdown, "Stored character value"))}</span>
      </p>
      ${options.length ? `
        <ul class="hg-sheet-list">
          ${options.map((option) => `
            <li class="${option.id === selected.id ? "hg-sheet-selected-option" : ""}">
              <strong>${escapeHtml(firstText(option.label, "Armor Class"))}: ${Math.round(finiteNumber(option.total, 10))}</strong>
              <span>${escapeHtml(firstText(option.breakdown, "No breakdown recorded"))}</span>
              ${option.id === selected.id ? "<small>Selected</small>" : ""}
            </li>
          `).join("")}
        </ul>
      ` : `<p class="hg-sheet-muted">No alternate Armor Class methods are available.</p>`}
    </article>
  `;
}

function getHitDieKey(entry, index = 0) {
  return firstText(
    entry?.classEntryId,
    entry?.entryId,
    entry?.classId,
    normalizeKey(entry?.className),
    `hit-die-${index + 1}`
  );
}

function renderHitDiceByClass(character) {
  const dice = asArray(character?.combat?.hitDice);
  const usage = isRecord(character?.combat?.hitDiceUsage)
    ? character.combat.hitDiceUsage
    : {};

  if (!dice.length) {
    return `<p class="hg-sheet-muted">No hit dice are recorded.</p>`;
  }

  return `
    <div class="hg-sheet-resource-list">
      ${dice.map((entry, index) => {
        const key = getHitDieKey(entry, index);
        const maximum = clampInteger(entry?.count, 1, 1);
        const used = Math.min(
          maximum,
          clampInteger(usage[key], 0, 0)
        );
        const remaining = maximum - used;

        return `
          <article class="hg-sheet-resource-row" data-hit-die="${escapeHtml(key)}">
            <div>
              <strong>${escapeHtml(firstText(entry?.className, "Class"))}</strong>
              <span>${remaining} / ${maximum} ${escapeHtml(firstText(entry?.die, entry?.hitDie, "d8"))}</span>
            </div>
            <div class="hg-sheet-inline-actions hg-sheet-no-print">
              <button
                type="button"
                data-character-sheet-action="adjust-hit-die"
                data-hit-die-id="${escapeHtml(key)}"
                data-delta="1"
                ${remaining <= 0 ? "disabled" : ""}
              >Spend</button>
              <button
                type="button"
                data-character-sheet-action="adjust-hit-die"
                data-hit-die-id="${escapeHtml(key)}"
                data-delta="-1"
                ${used <= 0 ? "disabled" : ""}
              >Restore</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function formatResourceRecharge(value) {
  const recharge = normalizeKey(value);

  return {
    shortrest: "short rest",
    "short-rest": "short rest",
    longrest: "long rest",
    "long-rest": "long rest",
    shortorlongrest: "short or long rest",
    "short-or-long-rest": "short or long rest",
    turn: "start of turn"
  }[recharge] || titleFromId(value, "manual restoration").toLowerCase();
}

function renderTrackedResources(resources, kind, fallbackText) {
  const entries = asArray(resources);

  if (!entries.length) {
    return `<p class="hg-sheet-muted">${escapeHtml(fallbackText)}</p>`;
  }

  return `
    <div class="hg-sheet-resource-list">
      ${entries.map((entry, index) => {
        const id = firstText(
          entry?.id,
          entry?.resourceId,
          `${kind}-resource-${index + 1}`
        );
        const maximum = optionalNumber(entry?.maximumUses);
        const current = maximum === null
          ? null
          : Math.min(
            Math.max(0, maximum),
            clampInteger(
              entry?.currentUses,
              maximum,
              0
            )
          );

        return `
          <article class="hg-sheet-resource-row" data-${escapeHtml(kind)}-resource="${escapeHtml(id)}">
            <div>
              <strong>${escapeHtml(firstText(entry?.name, titleFromId(entry?.canonicalId, "Resource")))}</strong>
              <span>${
                maximum === null
                  ? escapeHtml(firstText(entry?.summary, "No usage limit recorded"))
                  : `${current} / ${Math.max(0, maximum)}${entry?.die ? ` · ${escapeHtml(entry.die)}` : ""}`
              }</span>
              <small>Recharges after ${escapeHtml(formatResourceRecharge(entry?.recharge))}</small>
            </div>
            ${maximum === null ? "" : `
              <div class="hg-sheet-inline-actions hg-sheet-no-print">
                <button
                  type="button"
                  data-character-sheet-action="adjust-${escapeHtml(kind)}-resource"
                  data-resource-id="${escapeHtml(id)}"
                  data-delta="-1"
                  ${current <= 0 ? "disabled" : ""}
                >Spend</button>
                <button
                  type="button"
                  data-character-sheet-action="adjust-${escapeHtml(kind)}-resource"
                  data-resource-id="${escapeHtml(id)}"
                  data-delta="1"
                  ${current >= maximum ? "disabled" : ""}
                >Restore</button>
              </div>
            `}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function collectSheetResistances(character) {
  return [
    ...asArray(character?.resistances),
    ...asArray(character?.species?.resistances),
    ...asArray(character?.classMechanics?.resistances),
    ...asArray(character?.featMechanics?.resistances)
  ]
    .map((entry) => {
      return isRecord(entry)
        ? firstText(entry.name, entry.damageType, entry.type)
        : cleanText(entry);
    })
    .filter(Boolean)
    .filter((value, index, values) => {
      return values.findIndex((candidate) => {
        return normalizeKey(candidate) === normalizeKey(value);
      }) === index;
    });
}

function collectSheetSenses(character) {
  return [
    ...asArray(character?.senses),
    ...asArray(character?.identity?.senses),
    ...asArray(character?.species?.senses),
    ...asArray(character?.featMechanics?.senses)
  ]
    .map((entry) => {
      if (!isRecord(entry)) {
        return cleanText(entry);
      }

      const range = clampInteger(entry.range, 0, 0);
      return `${titleFromId(firstText(entry.sense, entry.name, entry.type), "Special sense")}${range ? ` ${range} ft.` : ""}`;
    })
    .filter(Boolean);
}

function renderDefensesAndMovement(character) {
  const resistances = collectSheetResistances(character);
  const senses = collectSheetSenses(character);

  return `
    <article class="hg-sheet-card">
      <h2>Defenses, Senses &amp; Movement</h2>
      ${renderDefinitionList([
        ["Resistances", listText(resistances)],
        ["Senses", listText(senses)],
        ["Speed", formatSpeed(character?.combat?.speed, character?.speed)],
        ["Languages", listText(character?.proficiencies?.languages)],
        ["Armor Proficiencies", listText(character?.proficiencies?.armor)],
        ["Weapon Proficiencies", listText(character?.proficiencies?.weapons)],
        ["Tool Proficiencies", listText(character?.proficiencies?.tools)]
      ])}
    </article>
  `;
}

function getManualSituationalEntries(character) {
  const featEffects = asArray(
    character?.featMechanics?.situationalEffects
  )
    .filter((entry) => {
      return cleanText(entry?.handling) !== "automatic";
    })
    .map(formatFeatSituationalEntry);
  const classEffects = [
    ...asArray(character?.classMechanics?.passiveEffects),
    ...asArray(character?.classMechanics?.restrictions)
  ].map((entry, index) => {
    if (isRecord(entry)) {
      return {
        id: firstText(entry.id, `class-effect-${index + 1}`),
        name: firstText(entry.name, entry.label, titleFromId(entry.type, "Class reminder")),
        summary: firstText(entry.instructions, entry.summary, entry.description),
        source: firstText(entry.className, entry.source)
      };
    }

    return {
      id: `class-effect-${index + 1}`,
      name: "Class reminder",
      summary: cleanText(entry),
      source: ""
    };
  });

  return [...featEffects, ...classEffects]
    .filter((entry) => {
      return entry.name || entry.summary;
    });
}

function listText(values, fallback = "None recorded") {
  const items = asArray(values)
    .map((value) => {
      if (isRecord(value)) {
        return firstText(value.name, value.label, value.id);
      }

      return cleanText(value);
    })
    .filter(Boolean);

  return items.length ? items.join(", ") : fallback;
}

function renderDefinitionList(rows) {
  return `
    <dl class="hg-sheet-definition-list">
      ${rows.map(([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(firstText(value, "Not recorded"))}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function normalizeContentEntries(values, fallbackPrefix) {
  return asArray(values).map((value, index) => {
    if (isRecord(value)) {
      const summary = firstText(
        value.summary,
        value.shortDescription,
        value.notes
      );
      const fullDescription = firstText(
        value.description,
        value.fullDescription
      );
      const normalizedSummary =
        cleanText(summary)
          .replace(/\s+/g, " ")
          .trim();
      const normalizedDescription =
        cleanText(fullDescription)
          .replace(/\s+/g, " ")
          .trim();
      const summaryKey =
        normalizedSummary.toLocaleLowerCase();
      const descriptionKey =
        normalizedDescription.toLocaleLowerCase();
      let description =
        normalizedDescription;
      let descriptionLabel =
        "Full description";

      if (
        summaryKey &&
        descriptionKey === summaryKey
      ) {
        description = "";
      } else if (
        summaryKey &&
        descriptionKey.startsWith(
          summaryKey
        )
      ) {
        description =
          normalizedDescription
            .slice(
              normalizedSummary.length
            )
            .replace(
              /^[\s.:;\u2014\u2013-]+/,
              ""
            )
            .trim();
        descriptionLabel =
          "Additional details";
      }

      const levelGained = [
        value.levelGained,
        value.gainedAtLevel,
        value.unlockLevel,
        value.unlockedLevel,
        value.classLevel,
        value.minimumLevel,
        value.level
      ]
        .map((entry) => {
          return optionalNumber(entry);
        })
        .find((entry) => {
          return entry !== null &&
            entry > 0;
        });

      return {
        id: firstText(value.id, `${fallbackPrefix}-${index + 1}`),
        name: firstText(value.name, value.label, titleFromId(value.id, "Unnamed")),
        summary: firstText(
          normalizedSummary,
          normalizedDescription
        ),
        description:
          normalizedSummary
            ? description
            : "",
        descriptionLabel,
        choices: firstText(
          value.choicesText,
          typeof value.choices === "string"
            ? value.choices
            : "",
          formatChoiceMap(
            value.choices ||
            value.selections ||
            value.selectedChoices
          ),
          value.choice
        ),
        source: firstText(
          value.sourceLabel,
          value.sourceName,
          value.className,
          value.subclassName,
          value.speciesName,
          value.backgroundName,
          value.source,
          value.featName
        ),
        levelGained:
          levelGained === undefined
            ? null
            : Math.max(
                1,
                Math.round(levelGained)
              ),
        resourceId: firstText(
          value.resourceId
        ),
        canonicalId: firstText(
          value.canonicalId
        ),
        featureId: firstText(
          value.featureId
        ),
        sourceId: firstText(
          value.sourceId
        ),
        featName: firstText(
          value.featName
        )
      };
    }

    return {
      id: `${fallbackPrefix}-${index + 1}`,
      name: firstText(value, "Unnamed"),
      summary: "",
      description: "",
      descriptionLabel:
        "Full description",
      choices: "",
      source: "",
      levelGained: null,
      resourceId: "",
      canonicalId: "",
      featureId: "",
      sourceId: "",
      featName: ""
    };
  });
}

function renderContentList(values, fallbackText = "None recorded") {
  if (!values.length) {
    return `<p class="hg-sheet-muted">${escapeHtml(fallbackText)}</p>`;
  }

  return `
    <ul class="hg-sheet-list">
      ${values.map((entry) => `
        <li>
          <strong>${escapeHtml(entry.name)}</strong>
          ${entry.summary ? `<span>${escapeHtml(entry.summary)}</span>` : ""}
          ${entry.description ? `<span class="hg-sheet-full-description">${escapeHtml(entry.description)}</span>` : ""}
          ${entry.choices ? `<span><b>Choices:</b> ${escapeHtml(entry.choices)}</span>` : ""}
          ${entry.source ? `<small>${escapeHtml(entry.source)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function formatFeatSituationalEntry(entry) {
  const handlingId =
    cleanText(entry?.handling);
  const handling = {
    automatic: "Automatic",
    tracked: "Tracked",
    manual: "Manual"
  }[handlingId] || "Manual";
  const actionEconomy = {
    action: "Action",
    bonusAction: "Bonus action",
    reaction: "Reaction",
    passive: "Passive"
  }[cleanText(entry?.actionEconomy)] || "Passive";
  const recharge = {
    none: "None",
    turn: "Start of turn",
    shortRest: "Short rest",
    longRest: "Long rest",
    shortOrLongRest: "Short or long rest"
  }[cleanText(entry?.recharge)] ||
    titleFromId(entry?.recharge, "None");
  const usage = isRecord(entry?.usage)
    ? cleanText(
      entry.usage.label,
      entry.usage.scope === "perTarget"
        ? "Once per target"
        : ""
    )
    : "";
  const timing = cleanText(entry?.activationTime);
  const details = [
    `${handling} · ${actionEconomy}${timing ? ` (${timing})` : ""}`,
    entry?.condition
      ? `When: ${cleanText(entry.condition)}`
      : "",
    handlingId === "manual" || handlingId === "tracked"
      ? `Use: ${cleanText(entry?.instructions, entry?.summary)}`
      : "",
    `Recharge: ${recharge}${usage ? ` · ${usage}` : ""}`
  ].filter(Boolean);

  return {
    id: cleanText(entry?.id),
    name: titleFromId(
      entry?.effectId,
      cleanText(entry?.featName, "Feat effect")
    ),
    summary: cleanText(
      entry?.summary,
      entry?.instructions,
      details[0]
    ),
    description: details.join(". "),
    source: cleanText(entry?.featName),
    resourceId: cleanText(
      entry?.resourceId
    )
  };
}

function getFeatSituationalEntries(character, section) {
  return asArray(
    character?.featMechanics
      ?.situationalEffects
  )
    .filter((entry) => {
      return cleanText(
        entry?.section,
        "utility"
      ) === section;
    })
    .map(formatFeatSituationalEntry);
}

function formatChoiceMap(value) {
  if (!isRecord(value)) {
    return "";
  }

  return Object.entries(value)
    .flatMap(([key, rawValues]) => {
      const values = (
        Array.isArray(rawValues)
          ? rawValues
          : [rawValues]
      )
        .map((entry) => {
          if (isRecord(entry)) {
            return firstText(
              entry.name,
              entry.label,
              entry.id
            );
          }

          return cleanText(entry);
        })
        .filter(Boolean);

      return values.length
        ? [
            `${
              titleFromId(
                cleanText(key)
                  .replace(
                    /([a-z0-9])([A-Z])/g,
                    "$1-$2"
                  )
              )
            }: ${values.join(", ")}`
          ]
        : [];
    })
    .join("; ");
}

function getFeatEntries(character) {
  const byKey = new Map();

  const add = (value) => {
    const record = isRecord(value) ? value : {};
    const id = firstText(record.id, record.featId, value);
    const name = firstText(
      record.name,
      record.featName,
      titleFromId(id, "Feat")
    );
    const key = normalizeKey(id || name);

    if (!key) {
      return;
    }

    const existing = byKey.get(key) || {};

    byKey.set(key, {
      id: firstText(existing.id, id, key),
      name: firstText(existing.name, name),
      summary: firstText(
        record.summary,
        record.featSummary,
        existing.summary
      ),
      description: firstText(
        record.description,
        record.featDescription,
        existing.description
      ),
      levelGained:
        record.levelGained ??
        record.gainedAtLevel ??
        record.unlockLevel ??
        record.level ??
        existing.levelGained,
      choices: firstText(
        record.choicesText,
        formatChoiceMap(
          record.choices ||
          record.featChoices
        ),
        existing.choices
      ),
      source: firstText(
        record.sourceLabel,
        record.source,
        existing.source
      ),
      resourceId: firstText(
        record.resourceId,
        existing.resourceId
      ),
      canonicalId: firstText(
        record.canonicalId,
        existing.canonicalId
      ),
      featureId: firstText(
        record.featureId,
        existing.featureId
      ),
      sourceId: firstText(
        record.sourceId,
        existing.sourceId
      ),
      featName: firstText(
        record.featName,
        name,
        existing.featName
      )
    });
  };

  asArray(character?.feats).forEach(add);
  asArray(character?.selectedFeats).forEach(add);
  asArray(character?.featMechanics?.instances).forEach(add);

  asArray(character?.advancementChoices).forEach((choice) => {
    const mode = normalizeKey(choice?.mode || choice?.type);

    if (mode.includes("feat")) {
      add(
        choice?.feat ||
        choice?.selectedFeat ||
        choice?.featId ||
        choice?.selectedFeatId
      );
    }
  });

  return Array.from(byKey.values());
}

export function collectCharacterFeatures(
  character
) {
  const classFeatures = asArray(
    character?.features?.classFeatures
  );
  const subclassFeatures = classFeatures.filter((entry) => {
    return (
      normalizeKey(entry?.source) === "subclass" ||
      normalizeKey(entry?.sourceType) === "subclass" ||
      normalizeKey(entry?.featureType) === "subclass"
    );
  });
  const baseClassFeatures = classFeatures.filter((entry) => {
    return !subclassFeatures.includes(entry);
  });
  const classResources = asArray(
    character?.classMechanics?.resources
  ).map((resource) => {
    return {
      ...resource,
      _featureResourceKind: "class"
    };
  });
  const featResources = asArray(
    character?.featMechanics?.resources
  ).filter((resource) => {
    return resource?.kind !==
      "featSpell";
  }).map((resource) => {
    return {
      ...resource,
      _featureResourceKind: "feat"
    };
  });
  const addResources = (
    entries,
    resources
  ) => {
    return entries.map((entry) => {
      return {
        ...entry,
        resource:
          getActionResourceMatch(
            entry,
            resources
          )
      };
    });
  };

  return [
    {
      id: "class",
      title: "Class Features",
      entries: addResources(
        normalizeContentEntries(
          baseClassFeatures,
          "class-feature"
        ),
        classResources
      )
    },
    {
      id: "subclass",
      title: "Subclass Features",
      entries: addResources(
        normalizeContentEntries(
          subclassFeatures,
          "subclass-feature"
        ),
        classResources
      )
    },
    {
      id: "species",
      title: "Species Traits",
      entries: addResources(
        normalizeContentEntries(
          character?.features?.speciesTraits?.length
            ? character.features.speciesTraits
            : character?.species?.traits,
          "species-trait"
        ),
        [
          ...classResources,
          ...featResources
        ]
      )
    },
    {
      id: "background",
      title: "Background Features",
      entries: addResources(
        normalizeContentEntries(
          character?.features?.backgroundFeatures,
          "background-feature"
        ),
        [
          ...classResources,
          ...featResources
        ]
      )
    },
    {
      id: "feats",
      title: "Feats",
      entries: addResources(
        normalizeContentEntries(
          getFeatEntries(character),
          "feat"
        ),
        featResources
      )
    },
    {
      id: "custom",
      title: "Custom Features",
      entries: addResources(
        normalizeContentEntries(
          character?.features?.customFeatures,
          "custom-feature"
        ),
        [
          ...classResources,
          ...featResources
        ]
      )
    }
  ];
}

function getAttackRows(character, proficiencyBonus) {
  const rows = [];
  const seen = new Set();

  const addAttack = (attack, fallbackName = "Attack") => {
    if (!attack) {
      return;
    }

    const name = firstText(attack.name, attack.label, fallbackName);
    const key = firstText(attack.id, normalizeKey(name));

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    const abilityId = firstText(
      attack.attackAbility,
      attack.ability,
      attack.ranged ? "dex" : "str"
    ).toLowerCase();
    const explicitAttackBonus = optionalNumber(
      attack.attackBonus ?? attack.toHit ?? attack.bonus
    );
    const magicalAttackBonus = finiteNumber(attack.magicalAttackBonus, 0);
    const proficient = attack.proficient === true;
    const attackBonus = explicitAttackBonus === null
      ? (
        attack.damageDice ||
        attack.weaponType ||
        normalizeKey(attack.category) === "weapon"
          ? getAbilityModifier(character, abilityId) +
            magicalAttackBonus +
            (proficient ? proficiencyBonus : 0)
          : null
      )
      : Math.round(explicitAttackBonus);
    const damage = firstText(
      attack.damage,
      attack.damageText,
      attack.damageDice
        ? `${attack.damageDice}${
          finiteNumber(attack.magicalDamageBonus, 0)
            ? ` ${formatModifier(attack.magicalDamageBonus)}`
            : ""
        }`
        : ""
    );
    const notes = [
      attack.weaponType,
      attack.damageType,
      attack.finesse ? "finesse" : "",
      attack.ranged ? "ranged" : "",
      attack.thrown ? "thrown" : "",
      attack.versatileDamageDice
        ? `versatile ${attack.versatileDamageDice}`
        : "",
      attack.notes
    ].map((value) => cleanText(value)).filter(Boolean).join(", ");

    rows.push({
      name,
      attackBonus,
      damage: damage || "Not recorded",
      notes: notes || "\u2014"
    });
  };

  asArray(character?.attacks).forEach((attack) => addAttack(attack));
  asArray(character?.combat?.attacks).forEach((attack) => addAttack(attack));
  asArray(
    character?.featMechanics
      ?.naturalWeapons
  ).forEach((attack) => {
    addAttack(
      attack,
      "Natural Weapon"
    );
  });

  asArray(character?.equipment?.items)
    .filter((item) => {
      return Boolean(
        item?.damageDice ||
        item?.weaponType ||
        normalizeKey(item?.category) === "weapon"
      );
    })
    .forEach((item) => addAttack(item, "Weapon"));

  return rows;
}

function renderAttackTable(character, proficiencyBonus) {
  const rows = getAttackRows(character, proficiencyBonus);
  const conditionalEntries =
    getFeatSituationalEntries(
      character,
      "attack"
    );

  if (!rows.length && !conditionalEntries.length) {
    return `<p class="hg-sheet-muted">No attacks are recorded yet.</p>`;
  }

  return `
    ${rows.length ? `
      <div class="hg-sheet-table-wrap">
        <table class="hg-sheet-table">
          <thead>
            <tr>
              <th>Attack</th>
              <th>To Hit</th>
              <th>Damage</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.name)}</td>
                <td>${row.attackBonus === null ? "\u2014" : escapeHtml(formatModifier(row.attackBonus))}</td>
                <td>${escapeHtml(row.damage)}</td>
                <td>${escapeHtml(row.notes)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="hg-sheet-muted">No attack entries are recorded.</p>`}
    ${conditionalEntries.length ? `
      <div data-feat-attack-conditions="true">
        <h3>Conditional feat effects</h3>
        ${renderContentList(conditionalEntries)}
      </div>
    ` : ""}
  `;
}

const ACTION_SECTION_DEFINITIONS = Object.freeze([
  {
    id: "action",
    title: "Actions",
    emptyText: "No actions are currently recorded."
  },
  {
    id: "bonusAction",
    title: "Bonus Actions",
    emptyText: "No bonus actions are currently recorded."
  },
  {
    id: "reaction",
    title: "Reactions",
    emptyText: "No reactions are currently recorded."
  },
  {
    id: "other",
    title: "Other Actions",
    emptyText: "No other actions are currently recorded."
  }
]);

function formatActionField(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatActionField(entry))
      .filter(Boolean)
      .join(", ");
  }

  if (isRecord(value)) {
    const amount = firstText(
      value.value,
      value.amount,
      value.distance,
      value.count
    );
    const unit = firstText(
      value.unit,
      value.units,
      value.type
    );

    return firstText(
      value.label,
      value.name,
      amount
        ? `${amount}${unit ? ` ${unit}` : ""}`
        : ""
    );
  }

  return cleanText(value);
}

function normalizeActionSection(value) {
  const key = normalizeKey(value);

  if (
    [
      "bonus",
      "bonus-action",
      "bonusaction",
      "1-bonus-action",
      "one-bonus-action"
    ].includes(key)
  ) {
    return "bonusAction";
  }

  if (
    [
      "reaction",
      "1-reaction",
      "one-reaction"
    ].includes(key)
  ) {
    return "reaction";
  }

  if (
    [
      "action",
      "attack",
      "attack-action",
      "main-action",
      "standard-action",
      "1-action",
      "one-action"
    ].includes(key)
  ) {
    return "action";
  }

  if (
    [
      "other",
      "other-action",
      "special",
      "free-action",
      "no-action"
    ].includes(key)
  ) {
    return "other";
  }

  if (key === "passive") {
    return "passive";
  }

  return "";
}

function getExplicitActionSection(entry) {
  const activation = isRecord(entry?.activation)
    ? entry.activation
    : {};
  const candidates = [
    entry?.actionEconomy,
    entry?.actionType,
    entry?.activationType,
    activation.type,
    activation.actionEconomy,
    entry?.castingTime,
    entry?.castTime
  ];

  for (const candidate of candidates) {
    const section = normalizeActionSection(candidate);

    if (section) {
      return section;
    }
  }

  return "";
}

function inferActionSection(entry, options = {}) {
  const explicit = getExplicitActionSection(entry);

  if (explicit) {
    return explicit;
  }

  if (options.defaultSection) {
    return options.defaultSection;
  }

  const actionText = [
    entry?.activation,
    entry?.activationTime,
    entry?.castingTime,
    entry?.castTime,
    entry?.summary,
    entry?.description,
    entry?.instructions,
    entry?.notes
  ]
    .map((value) => formatActionField(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bbonus[- ]action\b/.test(actionText)) {
    return "bonusAction";
  }

  if (/\breaction\b/.test(actionText)) {
    return "reaction";
  }

  if (
    /\b(?:as|use|using|spend|take)\s+(?:an?|your|the)\s+action\b/.test(actionText) ||
    /\baction\s+to\b/.test(actionText) ||
    /\battack action\b/.test(actionText)
  ) {
    return "action";
  }

  if (
    /\bno action required\b/.test(actionText) ||
    /\bonce per turn\b/.test(actionText) ||
    /\b(?:when|after)\s+you\s+(?:hit|attack|cast)\b/.test(actionText)
  ) {
    return "other";
  }

  return (
    options.hasResource &&
    options.allowResourceOnly !== false
  )
    ? "other"
    : "";
}

function isAttackRecord(entry) {
  return Boolean(
    entry &&
    (
      entry.damageDice ||
      entry.damage ||
      entry.attackBonus !== undefined ||
      entry.toHit !== undefined ||
      entry.weaponType ||
      normalizeKey(entry.category) === "weapon" ||
      normalizeKey(entry.attackType).includes("attack")
    )
  );
}

function getActionResourceMatch(entry, resources) {
  const entryIds = [
    entry?.resourceId,
    entry?.id,
    entry?.canonicalId,
    entry?.featureId,
    entry?.effectId,
    entry?.sourceId
  ]
    .map((value) => normalizeKey(value))
    .filter(Boolean);
  const entryNames = [
    entry?.name,
    entry?.label,
    entry?.featureName,
    entry?.featName
  ]
    .map((value) => normalizeKey(value))
    .filter(Boolean);

  let bestMatch = null;
  let bestScore = 0;

  resources.forEach((resource) => {
    const resourceIds = [
      resource?.id,
      resource?.resourceId,
      resource?.canonicalId,
      resource?.featureId,
      resource?.sourceId
    ]
      .map((value) => normalizeKey(value))
      .filter(Boolean);
    const resourceNames = [
      resource?.name,
      resource?.label,
      resource?.featureName,
      resource?.featName,
      resource?.canonicalId
    ]
      .map((value) => normalizeKey(value))
      .filter(Boolean);
    let score = 0;

    if (
      entryIds.some((value) => {
        return resourceIds.includes(value);
      })
    ) {
      score = 4;
    } else if (
      entryNames.some((value) => {
        return resourceNames.includes(value);
      })
    ) {
      score = 3;
    } else if (
      entryIds.some((value) => {
        return resourceIds.some((candidate) => {
          return (
            value.length > 5 &&
            candidate.length > 5 &&
            (
              value.endsWith(candidate) ||
              candidate.endsWith(value)
            )
          );
        });
      })
    ) {
      score = 2;
    }

    if (score > bestScore) {
      bestMatch = resource;
      bestScore = score;
    }
  });

  return bestMatch;
}

function renderFeatureResource(
  resource,
  canTrack
) {
  if (!resource) {
    return "";
  }

  const maximumUses = optionalNumber(
    resource.maximumUses
  );

  if (maximumUses === null) {
    return "";
  }

  const maximum = Math.max(
    0,
    Math.round(maximumUses)
  );
  const remaining = Math.min(
    maximum,
    clampInteger(
      resource.currentUses,
      maximum,
      0
    )
  );
  const resourceId = firstText(
    resource.id,
    resource.resourceId,
    resource.canonicalId
  );
  const kind = firstText(
    resource._featureResourceKind
  );

  if (!resourceId || !kind) {
    return "";
  }

  return `
    <div
      class="hg-sheet-feature-resource"
      data-feature-resource="${escapeHtml(resourceId)}"
    >
      <div>
        <strong>${remaining} / ${maximum} uses remaining</strong>
        <span>Recharge: ${escapeHtml(formatResourceRecharge(resource.recharge))}</span>
      </div>
      <div class="hg-sheet-inline-actions hg-sheet-no-print">
        <button
          type="button"
          data-character-sheet-action="adjust-${escapeHtml(kind)}-resource"
          data-resource-id="${escapeHtml(resourceId)}"
          data-delta="-1"
          ${!canTrack || remaining <= 0 ? "disabled" : ""}
        >Spend</button>
        <button
          type="button"
          data-character-sheet-action="adjust-${escapeHtml(kind)}-resource"
          data-resource-id="${escapeHtml(resourceId)}"
          data-delta="1"
          ${!canTrack || remaining >= maximum ? "disabled" : ""}
        >Restore</button>
      </div>
    </div>
  `;
}

function renderFeatureList(
  entries,
  options = {}
) {
  const canTrack =
    options.canTrack !== false;
  const showResources =
    options.showResources !== false;

  return `
    <div class="hg-sheet-feature-list">
      ${entries.map((entry) => {
        const sourceDetails = [
          entry.source,
          entry.levelGained
            ? `Level ${entry.levelGained}`
            : ""
        ].filter(Boolean);

        return `
          <article
            class="hg-sheet-feature-card"
            data-sheet-feature-id="${escapeHtml(entry.id)}"
          >
            <header>
              <strong>${escapeHtml(entry.name)}</strong>
              ${sourceDetails.length ? `
                <span>${escapeHtml(sourceDetails.join(" \u00b7 "))}</span>
              ` : ""}
            </header>

            ${entry.summary ? `
              <p class="hg-sheet-feature-summary">${escapeHtml(entry.summary)}</p>
            ` : ""}

            ${entry.choices ? `
              <p class="hg-sheet-feature-choices">
                <strong>Choices:</strong>
                <span>${escapeHtml(entry.choices)}</span>
              </p>
            ` : ""}

            ${showResources
              ? renderFeatureResource(
                  entry.resource,
                  canTrack
                )
              : ""}

            ${entry.description ? `
              <details class="hg-sheet-feature-description">
                <summary>${escapeHtml(firstText(entry.descriptionLabel, "Full description"))}</summary>
                <p>${escapeHtml(entry.description)}</p>
              </details>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function getActionAttackBonus(entry, character, proficiencyBonus) {
  const explicit = optionalNumber(
    entry?.attackBonus ??
    entry?.toHit ??
    entry?.bonus
  );

  if (explicit !== null) {
    return Math.round(explicit);
  }

  if (!isAttackRecord(entry)) {
    return null;
  }

  const abilityId = firstText(
    entry?.attackAbility,
    entry?.ability,
    entry?.ranged ? "dex" : "str"
  ).toLowerCase();

  return (
    getAbilityModifier(character, abilityId) +
    finiteNumber(entry?.magicalAttackBonus, 0) +
    (
      entry?.proficient === true
        ? proficiencyBonus
        : 0
    )
  );
}

function getActionDescription(entry) {
  const summary = firstText(
    entry?.summary,
    entry?.shortDescription,
    entry?.notes
  );
  const candidates = [
    firstText(
      entry?.description,
      entry?.fullDescription
    ),
    entry?.condition
      ? `When: ${cleanText(entry.condition)}`
      : "",
    entry?.instructions &&
    cleanText(entry.instructions) !== summary
      ? `Use: ${cleanText(entry.instructions)}`
      : ""
  ].filter(Boolean);

  return candidates
    .filter((value, index, values) => {
      return values.findIndex((candidate) => {
        return normalizeKey(candidate) === normalizeKey(value);
      }) === index;
    })
    .join("\n\n");
}

function mergeActionRecord(existing, incoming) {
  if (!existing) {
    return incoming;
  }

  const sources = [
    ...asArray(existing.sources),
    ...asArray(incoming.sources)
  ].filter(Boolean).filter((value, index, values) => {
    return values.findIndex((candidate) => {
      return normalizeKey(candidate) === normalizeKey(value);
    }) === index;
  });
  const richerText = (left, right) => {
    return cleanText(right).length > cleanText(left).length
      ? right
      : left;
  };

  return {
    ...existing,
    sources,
    summary: richerText(existing.summary, incoming.summary),
    description: richerText(
      existing.description,
      incoming.description
    ),
    attackBonus:
      existing.attackBonus ??
      incoming.attackBonus,
    saveDc:
      existing.saveDc ??
      incoming.saveDc,
    damage: firstText(
      existing.damage,
      incoming.damage
    ),
    damageType: firstText(
      existing.damageType,
      incoming.damageType
    ),
    healing: firstText(
      existing.healing,
      incoming.healing
    ),
    range: firstText(
      existing.range,
      incoming.range
    ),
    target: firstText(
      existing.target,
      incoming.target
    ),
    numberOfAttacks:
      existing.numberOfAttacks ??
      incoming.numberOfAttacks,
    resource:
      existing.resource ||
      incoming.resource
  };
}

export function collectCharacterActions(
  character,
  proficiencyBonus = getProficiencyBonus(
    character,
    getTotalLevel(
      character,
      getClassEntries(character)
    )
  )
) {
  const safeCharacter = isRecord(character)
    ? character
    : {};
  const classResources = asArray(
    safeCharacter?.classMechanics?.resources
  ).map((entry, index) => ({
    ...entry,
    _actionResourceKey: `class:${firstText(entry?.id, index)}`,
    _actionResourceKind: "class"
  }));
  const featResources = asArray(
    safeCharacter?.featMechanics?.resources
  ).filter((entry) => {
    return entry?.kind !== "featSpell";
  }).map((entry, index) => ({
    ...entry,
    _actionResourceKey: `feat:${firstText(entry?.id, index)}`,
    _actionResourceKind: "feat"
  }));
  const resources = [
    ...classResources,
    ...featResources
  ];
  const referencedResources = new Set();
  const actionMap = new Map();

  const addAction = (
    rawEntry,
    {
      defaultName = "Action",
      defaultSection = "",
      source = "",
      sourceKind = "",
      numberOfAttacks = null,
      allowResourceOnly = true
    } = {}
  ) => {
    if (!rawEntry) {
      return;
    }

    const entry = isRecord(rawEntry)
      ? rawEntry
      : {
        name: cleanText(rawEntry)
      };
    const name = firstText(
      entry.name,
      entry.label,
      entry.featureName,
      entry.spellName,
      titleFromId(entry.id, defaultName)
    );

    if (!name) {
      return;
    }

    const resource = getActionResourceMatch(
      entry,
      resources
    );
    const section = inferActionSection(
      entry,
      {
        defaultSection,
        hasResource: Boolean(resource),
        allowResourceOnly
      }
    );

    if (
      !section ||
      section === "passive"
    ) {
      return;
    }

    if (resource) {
      referencedResources.add(
        resource._actionResourceKey
      );
    }

    const damage = firstText(
      entry.damage,
      entry.damageText,
      entry.damageDice
        ? `${entry.damageDice}${
          finiteNumber(
            entry.magicalDamageBonus,
            0
          )
            ? ` ${formatModifier(entry.magicalDamageBonus)}`
            : ""
        }`
        : ""
    );
    const action = {
      id: firstText(
        entry.id,
        entry.actionId,
        normalizeKey(name)
      ),
      key: `${normalizeKey(name)}:${section}`,
      name,
      section,
      sources: [
        firstText(
          entry.featName,
          entry.className,
          entry.subclassName,
          entry.speciesName,
          source,
          sourceKind
        )
      ].filter(Boolean),
      summary: firstText(
        entry.summary,
        entry.shortDescription,
        entry.notes
      ),
      description: getActionDescription(entry),
      attackBonus: getActionAttackBonus(
        entry,
        safeCharacter,
        proficiencyBonus
      ),
      saveDc: optionalNumber(
        entry.saveDc ??
        entry.saveDC ??
        entry.savingThrowDc ??
        entry.spellSaveDc ??
        entry.savingThrow?.dc
      ),
      damage,
      damageType: firstText(
        entry.damageType,
        entry.damage?.type
      ),
      healing: firstText(
        formatActionField(entry.healing),
        formatActionField(entry.healingAmount),
        formatActionField(entry.healingDice)
      ),
      range: firstText(
        formatActionField(entry.range),
        formatActionField(entry.attackRange),
        formatActionField(entry.reach)
      ),
      target: firstText(
        formatActionField(entry.target),
        formatActionField(entry.targets),
        formatActionField(entry.targetText)
      ),
      numberOfAttacks:
        optionalNumber(
          entry.numberOfAttacks ??
          entry.attacks ??
          entry.attackCount
        ) ??
        numberOfAttacks,
      resource
    };

    actionMap.set(
      action.key,
      mergeActionRecord(
        actionMap.get(action.key),
        action
      )
    );
  };

  const addFeature = (
    entry,
    context
  ) => {
    addAction(entry, context);

    asArray(entry?.effects).forEach((effect) => {
      addAction(
        {
          ...effect,
          name: firstText(
            effect?.name,
            effect?.label,
            entry?.name
          ),
          summary: firstText(
            effect?.summary,
            entry?.summary
          ),
          description: firstText(
            effect?.description,
            entry?.description
          ),
          featureName: firstText(
            effect?.featureName,
            entry?.name
          ),
          className: firstText(
            effect?.className,
            entry?.className
          ),
          featName: firstText(
            effect?.featName,
            entry?.featName
          )
        },
        context
      );
    });
  };

  const equippedWeapons = asArray(
    safeCharacter?.equipment?.items
  ).filter((item) => {
    return (
      item?.equipped === true &&
      isAttackRecord(item)
    );
  });

  equippedWeapons.forEach((item) => {
    addAction(
      item,
      {
        defaultName: "Weapon Attack",
        defaultSection: "action",
        source: "Equipped weapon",
        numberOfAttacks: clampInteger(
          safeCharacter?.combat?.attacksPerAction,
          1,
          1
        )
      }
    );
  });

  asArray(
    safeCharacter?.featMechanics?.naturalWeapons
  ).forEach((entry) => {
    addAction(
      entry,
      {
        defaultName: "Natural Weapon",
        defaultSection: "action",
        source: firstText(
          entry?.featName,
          "Natural weapon"
        ),
        numberOfAttacks: clampInteger(
          safeCharacter?.combat?.attacksPerAction,
          1,
          1
        )
      }
    );
  });

  [
    ...asArray(safeCharacter?.magic?.spellAttacks),
    ...asArray(safeCharacter?.magic?.attacks),
    ...asArray(safeCharacter?.spellAttacks)
  ].forEach((entry) => {
    addAction(
      entry,
      {
        defaultName: "Spell Attack",
        defaultSection: "action",
        source: firstText(
          entry?.source,
          "Spell"
        )
      }
    );
  });

  [
    ...asArray(safeCharacter?.attacks),
    ...asArray(safeCharacter?.combat?.attacks)
  ].forEach((entry) => {
    addAction(
      entry,
      {
        defaultName: "Attack",
        defaultSection: "action",
        source: "Attack",
        numberOfAttacks: clampInteger(
          safeCharacter?.combat?.attacksPerAction,
          1,
          1
        )
      }
    );
  });

  const classFeatures = asArray(
    safeCharacter?.features?.classFeatures
  );
  classFeatures.forEach((entry) => {
    const isSubclass = (
      normalizeKey(entry?.source) === "subclass" ||
      normalizeKey(entry?.sourceType) === "subclass" ||
      normalizeKey(entry?.featureType) === "subclass"
    );

    addFeature(
      entry,
      {
        defaultName: isSubclass
          ? "Subclass Feature"
          : "Class Feature",
        source: firstText(
          entry?.subclassName,
          entry?.className,
          entry?.sourceLabel,
          isSubclass
            ? "Subclass feature"
            : "Class feature"
        ),
        sourceKind: isSubclass
          ? "Subclass feature"
          : "Class feature"
      }
    );
  });

  const speciesTraits = safeCharacter
    ?.features?.speciesTraits?.length
      ? safeCharacter.features.speciesTraits
      : safeCharacter?.species?.traits;
  asArray(speciesTraits).forEach((entry) => {
    addFeature(
      entry,
      {
        defaultName: "Species Trait",
        source: firstText(
          entry?.speciesName,
          safeCharacter?.species?.name,
          safeCharacter?.speciesName,
          "Species trait"
        ),
        sourceKind: "Species trait"
      }
    );
  });

  [
    ...asArray(safeCharacter?.feats),
    ...asArray(safeCharacter?.selectedFeats),
    ...asArray(safeCharacter?.featMechanics?.instances)
  ].forEach((entry) => {
    addFeature(
      entry?.feat || entry,
      {
        defaultName: "Feat",
        source: firstText(
          entry?.featName,
          entry?.name,
          entry?.feat?.name,
          "Feat"
        ),
        sourceKind: "Feat",
        allowResourceOnly: false
      }
    );
  });

  asArray(
    safeCharacter?.features?.customFeatures
  ).forEach((entry) => {
    addFeature(
      entry,
      {
        defaultName: "Custom Feature",
        source: firstText(
          entry?.source,
          "Custom feature"
        ),
        sourceKind: "Custom feature"
      }
    );
  });

  [
    ...asArray(
      safeCharacter?.classMechanics?.actions
    ),
    ...asArray(
      safeCharacter?.classMechanics?.combatProfiles
    )
  ].forEach((entry) => {
    addAction(
      entry,
      {
        defaultName: firstText(
          entry?.featureName,
          "Class Action"
        ),
        source: firstText(
          entry?.className,
          entry?.featureName,
          "Class mechanic"
        ),
        sourceKind: "Class mechanic"
      }
    );
  });

  asArray(
    safeCharacter?.featMechanics?.actions
  ).forEach((entry) => {
    addAction(
      entry,
      {
        defaultName: "Feat Action",
        source: firstText(
          entry?.featName,
          "Feat mechanic"
        ),
        sourceKind: "Feat mechanic"
      }
    );
  });

  asArray(
    safeCharacter?.featMechanics?.situationalEffects
  ).forEach((entry) => {
    if (
      getExplicitActionSection(entry) ===
      "passive"
    ) {
      return;
    }

    addAction(
      {
        ...entry,
        name: firstText(
          entry?.name,
          titleFromId(
            entry?.effectId,
            entry?.featName
          )
        )
      },
      {
        defaultName: "Situational Action",
        source: firstText(
          entry?.featName,
          "Feat effect"
        ),
        sourceKind: "Situational effect"
      }
    );
  });

  resources.forEach((resource) => {
    const spendOptions = asArray(
      resource?.spendOptions
    );

    spendOptions.forEach((option) => {
      addAction(
        {
          ...option,
          resourceId: resource.id,
          currentUses:
            resource.currentUses,
          maximumUses:
            resource.maximumUses,
          recharge:
            resource.recharge
        },
        {
          defaultName: firstText(
            option?.name,
            resource?.name,
            "Resource Action"
          ),
          source: firstText(
            option?.className,
            resource?.className,
            resource?.featName,
            resource?.name
          ),
          sourceKind:
            resource._actionResourceKind === "class"
              ? "Class resource"
              : "Feat resource"
        }
      );
    });

    if (
      !spendOptions.length &&
      !referencedResources.has(
        resource._actionResourceKey
      )
    ) {
      addAction(
        {
          ...resource,
          actionType: "other",
          summary: firstText(
            resource?.summary,
            "Tracked resource"
          )
        },
        {
          defaultName: "Tracked Resource",
          source: firstText(
            resource?.className,
            resource?.featName,
            resource?._actionResourceKind === "class"
              ? "Class resource"
              : "Feat resource"
          )
        }
      );
    }
  });

  const order = new Map(
    ACTION_SECTION_DEFINITIONS.map(
      (section, index) => [
        section.id,
        index
      ]
    )
  );

  return Array.from(
    actionMap.values()
  ).sort((left, right) => {
    return (
      (order.get(left.section) ?? 99) -
        (order.get(right.section) ?? 99) ||
      left.name.localeCompare(right.name)
    );
  });
}

function getActionSectionLabel(section) {
  return ACTION_SECTION_DEFINITIONS.find(
    (entry) => entry.id === section
  )?.title.replace(/s$/, "") ||
    "Other Action";
}

function renderActionCard(action, canTrack) {
  const resource = action.resource;
  const maximumUses = optionalNumber(
    resource?.maximumUses
  );
  const remainingUses = maximumUses === null
    ? null
    : Math.min(
      Math.max(0, maximumUses),
      clampInteger(
        resource?.currentUses,
        maximumUses,
        0
      )
    );
  const damage = action.damage &&
    action.damageType &&
    !normalizeKey(action.damage).includes(
      normalizeKey(action.damageType)
    )
      ? `${action.damage} ${action.damageType}`
      : firstText(
        action.damage,
        action.damageType
      );
  const quickFacts = [
    action.attackBonus === null
      ? null
      : [
        "Attack",
        formatModifier(action.attackBonus)
      ],
    action.saveDc === null
      ? null
      : [
        "Save DC",
        String(Math.round(action.saveDc))
      ],
    damage
      ? ["Damage", damage]
      : null,
    action.healing
      ? ["Healing", action.healing]
      : null,
    action.range
      ? ["Range", action.range]
      : null,
    action.target
      ? ["Target", action.target]
      : null,
    action.numberOfAttacks === null
      ? null
      : [
        "Attacks",
        String(
          Math.max(
            1,
            Math.round(
              action.numberOfAttacks
            )
          )
        )
      ]
  ].filter(Boolean);
  const sourceText = asArray(action.sources)
    .filter((source) => {
      return normalizeKey(source) !== "attack";
    })
    .join(" \u00b7 ") ||
    "Character";

  return `
    <article
      class="hg-sheet-action-card"
      data-sheet-action-key="${escapeHtml(normalizeKey(action.name))}"
      data-sheet-action-section="${escapeHtml(action.section)}"
    >
      <header>
        <div>
          <strong>${escapeHtml(action.name)}</strong>
          <span>${escapeHtml(sourceText)}</span>
        </div>
        <span class="hg-sheet-action-badge">${escapeHtml(getActionSectionLabel(action.section))}</span>
      </header>

      ${quickFacts.length ? `
        <dl class="hg-sheet-action-facts">
          ${quickFacts.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join("")}
        </dl>
      ` : ""}

      ${action.summary ? `
        <p class="hg-sheet-action-summary">${escapeHtml(action.summary)}</p>
      ` : ""}

      ${maximumUses === null ? "" : `
        <div class="hg-sheet-action-resource">
          <div>
            <strong>${remainingUses} / ${Math.max(0, maximumUses)} uses remaining</strong>
            <span>Recharge: ${escapeHtml(formatResourceRecharge(resource?.recharge))}</span>
          </div>
          <div class="hg-sheet-inline-actions hg-sheet-no-print">
            <button
              type="button"
              data-character-sheet-action="adjust-${escapeHtml(resource?._actionResourceKind)}-resource"
              data-resource-id="${escapeHtml(resource?.id)}"
              data-delta="-1"
              ${!canTrack || remainingUses <= 0 ? "disabled" : ""}
            >Spend</button>
            <button
              type="button"
              data-character-sheet-action="adjust-${escapeHtml(resource?._actionResourceKind)}-resource"
              data-resource-id="${escapeHtml(resource?.id)}"
              data-delta="1"
              ${!canTrack || remainingUses >= maximumUses ? "disabled" : ""}
            >Restore</button>
          </div>
        </div>
      `}

      ${action.description ? `
        <details class="hg-sheet-action-description">
          <summary>Full description</summary>
          <p>${escapeHtml(action.description)}</p>
        </details>
      ` : ""}
    </article>
  `;
}

function renderActionSections(
  character,
  proficiencyBonus,
  canTrack
) {
  const actions = collectCharacterActions(
    character,
    proficiencyBonus
  );

  return `
    <div class="hg-sheet-action-sections">
      ${ACTION_SECTION_DEFINITIONS.map((section) => {
        const sectionActions = actions.filter(
          (action) => {
            return action.section === section.id;
          }
        );

        return `
          <section
            class="hg-sheet-action-section"
            aria-label="${escapeHtml(section.title)}"
            data-sheet-action-section-group="${escapeHtml(section.id)}"
          >
            <header class="hg-sheet-action-section-heading">
              <h2>${escapeHtml(section.title)}</h2>
              <span>${sectionActions.length}</span>
            </header>
            ${sectionActions.length ? `
              <div class="hg-sheet-action-card-grid">
                ${sectionActions.map((action) => {
                  return renderActionCard(
                    action,
                    canTrack
                  );
                }).join("")}
              </div>
            ` : `
              <p class="hg-sheet-action-empty">${escapeHtml(section.emptyText)}</p>
            `}
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function inventoryItemMatches(
  entry,
  search,
  filters
) {
  const query = cleanText(search)
    .toLocaleLowerCase();
  const searchText = [
    entry.name,
    entry.category,
    entry.notes,
    entry.description,
    entry.parent?.name,
    entry.containerId,
    entry.equipped ? "equipped" : "",
    entry.attuned ? "attuned" : "",
    entry.isMagical ? "magical" : "",
    entry.isContainer ? "container" : ""
  ].join(" ").toLocaleLowerCase();

  if (
    query &&
    !searchText.includes(query)
  ) {
    return false;
  }

  return filters.every((filter) => {
    if (filter === "equipped") {
      return entry.equipped;
    }
    if (filter === "attuned") {
      return entry.attuned;
    }
    if (filter === "weapons") {
      return entry.isWeapon;
    }
    if (filter === "armor") {
      return entry.isArmor;
    }
    if (filter === "magical") {
      return entry.isMagical;
    }
    if (filter === "containers") {
      return entry.isContainer;
    }

    return true;
  });
}

export function collectCharacterInventory(
  character,
  {
    search = "",
    filters = []
  } = {}
) {
  const allowedFilters = new Set(
    INVENTORY_FILTER_OPTIONS.map(
      ([id]) => id
    )
  );
  const activeFilters = asArray(filters)
    .map(normalizeKey)
    .filter((filter) => {
      return allowedFilters.has(filter);
    });
  const query = cleanText(search);
  const rawItems = asArray(
    character?.equipment?.items
  );
  const entries = rawItems.map(
    (item, index) => {
      const category = firstText(
        item?.category,
        "miscellaneous"
      );
      const categoryKey =
        normalizeKey(category);
      const id = firstText(
        item?.id,
        `inventory-item-${index + 1}`
      );
      const individualWeight =
        optionalNumber(item?.weight);

      return {
        id,
        key: `${id}:${index}`,
        index,
        name: firstText(
          item?.name,
          "Unnamed Item"
        ),
        quantity: clampInteger(
          item?.quantity,
          1,
          1
        ),
        individualWeight,
        lineWeight:
          calculateInventoryLineWeight(
            item
          ),
        category,
        notes: firstText(
          item?.notes
        ),
        description: firstText(
          item?.description,
          item?.fullDescription
        ),
        containerId: firstText(
          item?.containerId
        ),
        isContainer:
          item?.isContainer === true,
        isMagical:
          item?.isMagical === true ||
          categoryKey === "magic-item",
        requiresAttunement:
          item?.requiresAttunement ===
          true,
        equipped:
          item?.equipped === true,
        attuned:
          item?.attuned === true,
        isWeapon:
          categoryKey.includes(
            "weapon"
          ) ||
          Boolean(item?.weaponType),
        isArmor:
          categoryKey.includes(
            "armor"
          ) ||
          categoryKey === "shield" ||
          item?.isShield === true,
        parent: null,
        children: [],
        visible: true,
        matchesFilter: true
      };
    }
  );
  const byId = new Map();

  entries.forEach((entry) => {
    const rawId = cleanText(
      rawItems[entry.index]?.id
    );

    if (rawId && !byId.has(rawId)) {
      byId.set(rawId, entry);
    }
  });

  const createsCycle = (
    entry,
    candidateParent
  ) => {
    const visited = new Set([
      entry.key
    ]);
    let current = candidateParent;

    while (current) {
      if (visited.has(current.key)) {
        return true;
      }

      visited.add(current.key);
      current = byId.get(
        current.containerId
      ) || null;
    }

    return false;
  };

  entries.forEach((entry) => {
    const parent = byId.get(
      entry.containerId
    );

    if (
      parent &&
      parent !== entry &&
      parent.isContainer &&
      !createsCycle(entry, parent)
    ) {
      entry.parent = parent;
      parent.children.push(entry);
    }
  });

  const hasActiveFilters =
    Boolean(query) ||
    activeFilters.length > 0;
  const visible = new Set();

  entries.forEach((entry) => {
    entry.matchesFilter =
      inventoryItemMatches(
        entry,
        query,
        activeFilters
      );

    if (!hasActiveFilters) {
      visible.add(entry.key);
      return;
    }

    if (entry.matchesFilter) {
      let current = entry;

      while (current) {
        visible.add(current.key);
        current = current.parent;
      }
    }
  });

  entries.forEach((entry) => {
    entry.visible = visible.has(
      entry.key
    );
  });

  const roots = entries.filter(
    (entry) => {
      return !entry.parent;
    }
  );

  return {
    entries,
    roots,
    visibleRoots: roots.filter(
      (entry) => entry.visible
    ),
    total: entries.length,
    matchedCount: entries.filter(
      (entry) => {
        return entry.matchesFilter;
      }
    ).length,
    search: query,
    filters: activeFilters,
    hasActiveFilters
  };
}

function formatInventoryWeight(value) {
  if (value === null) {
    return "\u2014";
  }

  return `${Number(
    Number(value).toFixed(2)
  )} lb.`;
}

function renderInventoryItemDetails(entry) {
  const notes = firstText(entry.notes);
  const description = firstText(
    entry.description
  );
  const repeated =
    notes &&
    description &&
    notes.replace(/\s+/g, " ")
      .toLocaleLowerCase() ===
      description.replace(/\s+/g, " ")
        .toLocaleLowerCase();

  if (!notes && !description) {
    return "";
  }

  return `
    <details class="hg-sheet-item-details">
      <summary>Notes &amp; description</summary>
      ${notes ? `
        <p>${escapeHtml(notes)}</p>
      ` : ""}
      ${description && !repeated ? `
        <p>${escapeHtml(description)}</p>
      ` : ""}
    </details>
  `;
}

function renderInventoryItemControls(
  entry,
  interactive
) {
  if (!interactive) {
    return "";
  }

  return `
    <div class="hg-sheet-inline-actions hg-sheet-no-print">
      ${entry.isContainer ? "" : `
        <button
          type="button"
          data-character-sheet-action="toggle-item-equipped"
          data-item-id="${escapeHtml(entry.id)}"
          data-item-index="${entry.index}"
          ${entry.containerId ? "disabled" : ""}
          ${entry.containerId ? 'title="Move this item out of its container before equipping it."' : ""}
        >${entry.equipped ? "Unequip" : "Equip"}</button>
      `}
      ${entry.isMagical && entry.requiresAttunement ? `
        <button
          type="button"
          data-character-sheet-action="toggle-item-attuned"
          data-item-id="${escapeHtml(entry.id)}"
          data-item-index="${entry.index}"
        >${entry.attuned ? "Unattune" : "Attune"}</button>
      ` : ""}
    </div>
  `;
}

function renderInventoryItemFacts(entry) {
  const location = entry.parent
    ? `Inside ${entry.parent.name}`
    : entry.containerId
      ? `Container not found: ${entry.containerId}`
      : "Not inside a container";

  return `
    <dl class="hg-sheet-inventory-facts">
      <div>
        <dt>Quantity</dt>
        <dd>${entry.quantity}</dd>
      </div>
      <div>
        <dt>Each</dt>
        <dd>${escapeHtml(formatInventoryWeight(entry.individualWeight))}</dd>
      </div>
      <div>
        <dt>Total</dt>
        <dd>${escapeHtml(formatInventoryWeight(entry.lineWeight))}</dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>${escapeHtml(titleFromId(entry.category, "Item"))}</dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>${escapeHtml(location)}</dd>
      </div>
      <div>
        <dt>Equipped</dt>
        <dd>${entry.equipped ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt>Attuned</dt>
        <dd>${entry.attuned ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt>Magical</dt>
        <dd>${entry.isMagical ? "Yes" : "No"}</dd>
      </div>
    </dl>
  `;
}

function renderInventoryEntry(
  entry,
  {
    interactive,
    forceOpen
  }
) {
  const children = entry.children.filter(
    (child) => child.visible
  );
  const badges = [
    entry.equipped ? "Equipped" : "",
    entry.attuned ? "Attuned" : "",
    entry.isMagical ? "Magical" : "",
    entry.isContainer ? "Container" : ""
  ].filter(Boolean);
  const content = `
    ${renderInventoryItemFacts(entry)}
    ${renderInventoryItemDetails(entry)}
    ${renderInventoryItemControls(
      entry,
      interactive
    )}
  `;

  if (entry.isContainer) {
    return `
      <details
        class="hg-sheet-container-card"
        data-inventory-item-id="${escapeHtml(entry.id)}"
        data-inventory-container="${escapeHtml(entry.id)}"
        ${forceOpen ? "open" : ""}
      >
        <summary>
          <span>
            <strong>${escapeHtml(entry.name)}</strong>
            <small>${escapeHtml(titleFromId(entry.category, "Container"))}</small>
          </span>
          <span class="hg-sheet-inventory-badges">
            ${badges.map((badge) => `
              <span>${escapeHtml(badge)}</span>
            `).join("")}
          </span>
        </summary>
        <div class="hg-sheet-container-body">
          ${content}
          <section class="hg-sheet-container-contents">
            <h3>Contents</h3>
            ${children.length ? `
              <div class="hg-sheet-inventory-list">
                ${children.map((child) => {
                  return renderInventoryEntry(
                    child,
                    {
                      interactive,
                      forceOpen
                    }
                  );
                }).join("")}
              </div>
            ` : `
              <p class="hg-sheet-muted">${
                forceOpen
                  ? "No matching contents."
                  : "This container is empty."
              }</p>
            `}
          </section>
        </div>
      </details>
    `;
  }

  return `
    <article
      class="hg-sheet-inventory-item"
      data-inventory-item-id="${escapeHtml(entry.id)}"
      data-inventory-location="${escapeHtml(entry.parent?.id || "")}"
    >
      <header>
        <span>
          <strong>${escapeHtml(entry.name)}</strong>
          <small>${escapeHtml(titleFromId(entry.category, "Item"))}</small>
        </span>
        <span class="hg-sheet-inventory-badges">
          ${badges.length
            ? badges.map((badge) => `
                <span>${escapeHtml(badge)}</span>
              `).join("")
            : "<span>Carried</span>"}
        </span>
      </header>
      ${content}
    </article>
  `;
}

function renderEquipment(character, options = {}) {
  const interactive =
    options.interactive === true;
  const inventory =
    collectCharacterInventory(
      character,
      {
        search: options.search,
        filters: options.filters
      }
    );

  if (!inventory.total) {
    return `<p class="hg-sheet-muted">No equipment is recorded yet.</p>`;
  }

  const rootContainers =
    inventory.visibleRoots.filter(
      (entry) => entry.isContainer
    );
  const looseItems =
    inventory.visibleRoots.filter(
      (entry) => !entry.isContainer
    );

  return `
    <div class="hg-sheet-inventory-toolbar hg-sheet-no-print">
      <label>
        <span>Search inventory</span>
        <input
          type="search"
          value="${escapeHtml(inventory.search)}"
          placeholder="Search name, category, notes, or location"
          data-character-sheet-input="inventory-search"
        >
      </label>
      <div
        class="hg-sheet-inventory-filters"
        aria-label="Inventory filters"
      >
        ${INVENTORY_FILTER_OPTIONS.map(
          ([id, label]) => `
            <button
              type="button"
              class="${inventory.filters.includes(id) ? "active" : ""}"
              data-character-sheet-action="toggle-inventory-filter"
              data-inventory-filter="${escapeHtml(id)}"
              aria-pressed="${inventory.filters.includes(id) ? "true" : "false"}"
            >${escapeHtml(label)}</button>
          `
        ).join("")}
      </div>
      <p>
        Showing ${inventory.matchedCount} of ${inventory.total} item${inventory.total === 1 ? "" : "s"}
      </p>
    </div>

    ${inventory.visibleRoots.length ? `
      <div class="hg-sheet-inventory-sections">
        ${rootContainers.length ? `
          <section data-inventory-section="containers">
            <h3>Containers</h3>
            <div class="hg-sheet-inventory-list">
              ${rootContainers.map((entry) => {
                return renderInventoryEntry(
                  entry,
                  {
                    interactive,
                    forceOpen:
                      inventory
                        .hasActiveFilters
                  }
                );
              }).join("")}
            </div>
          </section>
        ` : ""}

        ${looseItems.length ? `
          <section data-inventory-section="uncontained">
            <h3>Not in a Container</h3>
            <div class="hg-sheet-inventory-list">
              ${looseItems.map((entry) => {
                return renderInventoryEntry(
                  entry,
                  {
                    interactive,
                    forceOpen:
                      inventory
                        .hasActiveFilters
                  }
                );
              }).join("")}
            </div>
          </section>
        ` : ""}
      </div>
    ` : `
      <p class="hg-sheet-action-empty">
        No inventory items match the current search and filters.
      </p>
    `}
  `;
}

function renderCurrency(character) {
  const currency = isRecord(character?.equipment?.currency)
    ? character.equipment.currency
    : {};

  return `
    <div class="hg-sheet-currency-grid">
      ${CURRENCY.map((denomination) => `
        <div>
          <strong>${clampInteger(currency[denomination], 0, 0)}</strong>
          <span>${escapeHtml(denomination.toUpperCase())}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAbilities(character) {
  return `
    <div class="hg-sheet-ability-grid">
      ${ABILITIES.map((ability) => {
        const score = Math.round(getAbilityScore(character, ability.id));
        const modifier = getAbilityModifier(character, ability.id);

        return `
          <article class="hg-sheet-ability-box">
            <span>${escapeHtml(ability.short)}</span>
            <strong>${escapeHtml(formatModifier(modifier))}</strong>
            <small>${score}</small>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderSavingThrows(character, proficiencyBonus) {
  const proficiencies = getSavingThrowProficiencies(character);

  return `
    <div class="hg-sheet-compact-list">
      ${ABILITIES.map((ability) => {
        const proficient = proficiencies.has(ability.id);
        const value = getAbilityModifier(character, ability.id) +
          (proficient ? proficiencyBonus : 0);

        return `
          <div class="hg-sheet-skill-row">
            <span class="hg-sheet-prof-mark" aria-label="${proficient ? "Proficient" : "Not proficient"}">
              ${proficient ? "\u25cf" : "\u25cb"}
            </span>
            <span>${escapeHtml(ability.name)}</span>
            <strong>${escapeHtml(formatModifier(value))}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderSkills(character, proficiencyBonus) {
  return `
    <div class="hg-sheet-skill-list">
      ${SKILLS.map((skill) => {
        const details = getSkillDetails(character, skill, proficiencyBonus);
        const marker = details.expertise
          ? "\u25c9"
          : details.proficient
            ? "\u25cf"
            : "\u25cb";
        const label = details.expertise
          ? "Expertise"
          : details.proficient
            ? "Proficient"
            : "Not proficient";

        return `
          <div class="hg-sheet-skill-row">
            <span class="hg-sheet-prof-mark" aria-label="${escapeHtml(label)}">${marker}</span>
            <span>
              ${escapeHtml(skill.name)}
              <small>${escapeHtml(skill.ability.toUpperCase())}</small>
            </span>
            <strong>${escapeHtml(formatModifier(details.modifier))}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderFeatMechanics(character) {
  const mechanics = isRecord(
    character?.featMechanics
  )
    ? character.featMechanics
    : {};
  const selectedFeatures = asArray(
    mechanics.selectedFeatures
  );
  const elementalAdepts = asArray(
    mechanics.elementalAdepts
  );
  const damageReductions = asArray(
    mechanics.damageReductions
  );
  const senses = asArray(
    mechanics.senses
  );
  const telepathy = asArray(
    mechanics.telepathy
  );
  const ritualBooks = asArray(
    mechanics.ritualBooks
  );
  const actions = asArray(
    mechanics.actions
  );
  const situationalEffects =
    asArray(
      mechanics
        .situationalEffects
    );
  const healingBonuses = asArray(
    mechanics.healingBonuses
  );
  const resistances = asArray(
    mechanics.resistances
  );
  const armorClassModifiers =
    asArray(
      mechanics
        .armorClassModifiers
    );
  const hasMechanics = [
    selectedFeatures,
    elementalAdepts,
    damageReductions,
    senses,
    telepathy,
    ritualBooks,
    actions,
    situationalEffects,
    healingBonuses,
    resistances,
    armorClassModifiers
  ].some((entries) => {
    return entries.length > 0;
  });

  if (!hasMechanics) {
    return "";
  }

  const featureEntries =
    selectedFeatures.map((entry) => {
      const details = [
        entry.summary,
        entry.saveDc
          ? `Save DC ${entry.saveDc} (${String(entry.saveAbility || "").toUpperCase()})`
          : "",
        entry.cost !== null &&
          entry.cost !== undefined
          ? `Cost: ${entry.cost} sorcery point${entry.cost === 1 ? "" : "s"}`
          : ""
      ].filter(Boolean).join(" ");

      return {
        id: entry.id,
        name:
          firstText(
            entry.name,
            entry.featureType,
            "Selected feature"
          ),
        summary: details,
        source:
          firstText(
            entry.featName
          )
      };
    });
  const defenseEntries = [
    ...resistances.map((damageType) => {
      return {
        name:
          `${titleFromId(damageType)} resistance`,
        summary:
          "Damage resistance granted by a selected feat."
      };
    }),
    ...armorClassModifiers.map((entry) => {
      return {
        name:
          `${formatModifier(entry.value)} Armor Class`,
        summary:
          entry.condition
            ? `Applies while ${titleFromId(entry.condition).toLowerCase()}.`
            : "Applies while the feat's requirements are met.",
        source:
          entry.featName
      };
    }),
    ...damageReductions.map((entry) => {
      return {
        name:
          `Reduce damage by ${clampInteger(entry.value, 0, 0)}`,
        summary:
          `${listText(entry.damageTypes, "Eligible damage")} while ${titleFromId(entry.condition).toLowerCase()}.`,
        source:
          entry.featName
      };
    }),
    ...situationalEffects
      .filter((entry) => {
        return cleanText(
          entry.section,
          "utility"
        ) === "defense";
      })
      .map(
        formatFeatSituationalEntry
      )
  ];
  const senseEntries = [
    ...senses.map((entry) => {
      const range =
        clampInteger(
          entry.range,
          0,
          0
        );
      const detail = [
        range
          ? `${range} ft.`
          : "",
        entry.bonus
          ? `includes a +${entry.bonus} ft. feat increase`
          : "",
        entry.magicalDarkness
          ? "works in magical darkness"
          : ""
      ].filter(Boolean).join("; ");

      return {
        name:
          titleFromId(
            entry.sense,
            "Special sense"
          ),
        summary: detail,
        source:
          entry.featName
      };
    }),
    ...telepathy.map((entry) => {
      const restrictions = [
        entry.oneWay
          ? "You initiate one-way communication"
          : "",
        entry
          .responseRequiredSharedLanguage
          ? "The creature can respond only if it shares a language with you"
          : ""
      ].filter(Boolean).join(". ");

      return {
        name: "Telepathy",
        summary:
          `${clampInteger(entry.range, 0, 0)} ft. ${restrictions}.`,
        source:
          entry.featName
      };
    })
  ];
  const elementalEntries =
    elementalAdepts.map((entry) => {
      return {
        name:
          `${titleFromId(entry.damageType)} spells`,
        summary: [
          entry.ignoreResistance
            ? "Ignore resistance to this damage type."
            : "",
          entry.minimumDamageDie
            ? `Treat each damage-die result below ${entry.minimumDamageDie} as ${entry.minimumDamageDie}.`
            : ""
        ].filter(Boolean).join(" "),
        source:
          entry.featName
      };
    });
  const actionEntries =
    [
      ...actions.map((entry) => {
        return {
          id: entry.id,
          name:
            firstText(
              entry.name,
              "Feat action"
            ),
          summary:
            firstText(
              entry.summary,
              entry.activation
            ),
          source:
            entry.featName
        };
      }),
      ...situationalEffects
        .filter((entry) => {
          return cleanText(
            entry.section,
            "utility"
          ) === "utility";
        })
        .map(
          formatFeatSituationalEntry
        )
    ];
  const healingEntries =
    healingBonuses.map((entry) => {
      return {
        id: entry.id,
        name:
          `Healing +${clampInteger(entry.value, 0, 0)}`,
        summary:
          `Add your proficiency bonus to healing from ${listText(entry.sources, "eligible sources")}.`,
        source:
          entry.featName
      };
    });

  return `
    <div class="hg-sheet-card-grid hg-sheet-feature-grid">
      ${featureEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Selected Feat Features</h2>
          ${renderFeatureList(
            normalizeContentEntries(
              featureEntries,
              "selected-feat-feature"
            )
          )}
        </article>
      ` : ""}

      ${defenseEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Defenses</h2>
          ${renderFeatureList(
            normalizeContentEntries(
              defenseEntries,
              "feat-defense"
            )
          )}
        </article>
      ` : ""}

      ${senseEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Senses &amp; Communication</h2>
          ${renderFeatureList(
            normalizeContentEntries(
              senseEntries,
              "feat-sense"
            )
          )}
        </article>
      ` : ""}

      ${elementalEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Elemental Adept</h2>
          ${renderFeatureList(
            normalizeContentEntries(
              elementalEntries,
              "elemental-adept"
            )
          )}
        </article>
      ` : ""}

      ${ritualBooks.map((book) => `
        <article class="hg-sheet-card">
          <h2>Ritual Book</h2>
          ${renderDefinitionList([
            ["Class", firstText(book.ritualClassName, titleFromId(book.ritualClassId))],
            ["Maximum Ritual Spell Level", String(clampInteger(book.maximumSpellLevel, 0, 0))],
            ["Ritual Spells", asArray(book.spells).map((spell) => firstText(spell?.name, titleFromId(spell?.id))).filter(Boolean).join(", ") || "None recorded"]
          ])}
        </article>
      `).join("")}

      ${actionEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Actions &amp; Reminders</h2>
          ${renderFeatureList(
            normalizeContentEntries(
              actionEntries,
              "feat-reminder"
            )
          )}
        </article>
      ` : ""}

      ${healingEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Healing</h2>
          ${renderFeatureList(
            normalizeContentEntries(
              healingEntries,
              "feat-healing"
            )
          )}
        </article>
      ` : ""}
    </div>
  `;
}

function renderMainPanel(character, summary) {
  const combat = isRecord(character?.combat) ? character.combat : {};
  const currentHp = clampInteger(
    combat.currentHp ?? character?.currentHp,
    0,
    0
  );
  const maxHp = clampInteger(
    combat.maxHp ?? character?.maxHp,
    0,
    0
  );
  const temporaryHp = clampInteger(combat.temporaryHp, 0, 0);
  const armorClass = Math.round(finiteNumber(
    combat.armorClass ?? character?.armorClass,
    10
  ));
  const initiative = optionalNumber(combat.initiative) ??
    getAbilityModifier(character, "dex");
  const speed = formatSpeed(combat.speed, character?.speed);
  const featureGroups =
    collectCharacterFeatures(
      character
    ).filter((group) => {
      return group.entries.length > 0;
    });
  const classResources = asArray(
    character?.classMechanics?.resources
  );
  const featResources = asArray(
    character?.featMechanics?.resources
  ).filter((entry) => {
    return entry?.kind !== "featSpell";
  });
  const manualEffects = getManualSituationalEntries(character);

  return `
    <section class="hg-sheet-panel" aria-label="Main character sheet">
      <div class="hg-sheet-stat-grid">
        <article class="hg-sheet-stat-card">
          <span>Armor Class</span>
          <strong>${armorClass}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Initiative</span>
          <strong>${escapeHtml(formatModifier(initiative))}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Speed</span>
          <strong class="hg-sheet-stat-text">${escapeHtml(speed)}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Hit Points</span>
          <strong>${currentHp} / ${maxHp}</strong>
          ${temporaryHp ? `<small>${temporaryHp} temporary</small>` : ""}
        </article>
        <article class="hg-sheet-stat-card">
          <span>Proficiency</span>
          <strong>${escapeHtml(formatModifier(summary.proficiencyBonus))}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Passive Perception</span>
          <strong>${summary.passivePerception}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Passive Investigation</span>
          <strong>${getPassiveSkillScore(character, "investigation", summary.proficiencyBonus)}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Passive Insight</span>
          <strong>${getPassiveSkillScore(character, "insight", summary.proficiencyBonus)}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Hit Dice</span>
          <strong class="hg-sheet-stat-text">${escapeHtml(formatHitDice(character))}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Attacks / Action</span>
          <strong>${clampInteger(combat.attacksPerAction, 1, 1)}</strong>
        </article>
      </div>

      ${renderClassProgression(character)}

      <div class="hg-sheet-two-column">
        <div>
          <article class="hg-sheet-card">
            <h2>Abilities</h2>
            ${renderAbilities(character)}
          </article>

          <article class="hg-sheet-card">
            <h2>Saving Throws</h2>
            ${renderSavingThrows(character, summary.proficiencyBonus)}
          </article>

          <article class="hg-sheet-card">
            <h2>Skills</h2>
            ${renderSkills(character, summary.proficiencyBonus)}
          </article>

          ${renderArmorClassOptions(character)}
        </div>

        <div>
          <article class="hg-sheet-card">
            <h2>Attacks</h2>
            ${renderAttackTable(character, summary.proficiencyBonus)}
          </article>

          <article class="hg-sheet-card">
            <h2>Hit Points &amp; Hit Dice by Class</h2>
            ${renderDefinitionList([
              ["Current HP", `${currentHp} / ${maxHp}`],
              ["Temporary HP", String(temporaryHp)],
              ["HP Method", titleFromId(combat?.hpCalculation?.mode, "Not recorded")]
            ])}
            ${renderHitDiceByClass(character)}
          </article>

          <article class="hg-sheet-card">
            <h2>Equipment</h2>
            ${renderEquipment(character)}
          </article>

          <div class="hg-sheet-card-grid">
            <article class="hg-sheet-card">
              <h2>Currency</h2>
              ${renderCurrency(character)}
            </article>

            <article class="hg-sheet-card">
              <h2>Proficiencies</h2>
              ${renderDefinitionList([
                ["Armor", listText(character?.proficiencies?.armor)],
                ["Weapons", listText(character?.proficiencies?.weapons)],
                ["Tools", listText(character?.proficiencies?.tools)]
              ])}
            </article>

            <article class="hg-sheet-card">
              <h2>Languages</h2>
              <p>${escapeHtml(listText(character?.proficiencies?.languages))}</p>
            </article>
          </div>
        </div>
      </div>

      <div class="hg-sheet-card-grid">
        <article class="hg-sheet-card">
          <h2>Class Resources</h2>
          ${renderTrackedResources(
            classResources,
            "class",
            "No limited class resources are recorded."
          )}
        </article>

        <article class="hg-sheet-card">
          <h2>Feat Resources</h2>
          ${renderTrackedResources(
            featResources,
            "feat",
            "No limited feat resources are recorded."
          )}
        </article>

        ${renderDefensesAndMovement(character)}

        <article class="hg-sheet-card">
          <h2>Manual &amp; Situational Effects</h2>
          ${renderContentList(
            manualEffects,
            "No manual or situational effects are recorded."
          )}
        </article>
      </div>

      <div class="hg-sheet-feature-groups">
        ${featureGroups.map((group) => `
          <section
            class="hg-sheet-card hg-sheet-feature-group"
            data-feature-group="${escapeHtml(group.id)}"
          >
            <h2>${escapeHtml(group.title)}</h2>
            ${renderFeatureList(
              group.entries,
              { showResources: false }
            )}
          </section>
        `).join("")}
      </div>

      ${renderFeatMechanics(character)}

      ${firstText(character?.features?.notes, character?.notes) ? `
        <article class="hg-sheet-card">
          <h2>Notes</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(character?.features?.notes, character?.notes))}</p>
        </article>
      ` : ""}
    </section>
  `;
}

function renderCombatStats(character, summary) {
  const combat = isRecord(character?.combat)
    ? character.combat
    : {};
  const currentHp = clampInteger(
    combat.currentHp ?? character?.currentHp,
    0,
    0
  );
  const maxHp = clampInteger(
    combat.maxHp ?? character?.maxHp,
    1,
    1
  );
  const temporaryHp = clampInteger(
    combat.temporaryHp,
    0,
    0
  );
  const armorClass = Math.round(
    finiteNumber(
      combat.armorClass ?? character?.armorClass,
      10
    )
  );
  const initiative =
    optionalNumber(combat.initiative) ??
    getAbilityModifier(character, "dex");

  return `
    <div class="hg-sheet-stat-grid hg-sheet-combat-stats">
      <article class="hg-sheet-stat-card">
        <span>Armor Class</span>
        <strong>${armorClass}</strong>
      </article>
      <article class="hg-sheet-stat-card">
        <span>Current HP</span>
        <strong>${currentHp} / ${maxHp}</strong>
        ${temporaryHp ? `<small>+${temporaryHp} temporary</small>` : ""}
      </article>
      <article class="hg-sheet-stat-card">
        <span>Initiative</span>
        <strong>${escapeHtml(formatModifier(initiative))}</strong>
      </article>
      <article class="hg-sheet-stat-card">
        <span>Speed</span>
        <strong class="hg-sheet-stat-text">${escapeHtml(formatSpeed(combat.speed, character?.speed))}</strong>
      </article>
      <article class="hg-sheet-stat-card">
        <span>Proficiency</span>
        <strong>${escapeHtml(formatModifier(summary.proficiencyBonus))}</strong>
      </article>
      <article class="hg-sheet-stat-card">
        <span>Inspiration</span>
        <strong>${combat.inspiration === true ? "Yes" : "No"}</strong>
        <button
          type="button"
          class="hg-sheet-small-control hg-sheet-no-print"
          data-character-sheet-action="toggle-inspiration"
          ${summary.canTrack ? "" : "disabled"}
        >${combat.inspiration === true ? "Spend" : "Gain"}</button>
      </article>
    </div>
  `;
}

function renderHitPointControls(character, canTrack) {
  const combat = isRecord(character?.combat)
    ? character.combat
    : {};
  const currentHp = clampInteger(
    combat.currentHp ?? character?.currentHp,
    0,
    0
  );
  const maxHp = clampInteger(
    combat.maxHp ?? character?.maxHp,
    1,
    1
  );
  const temporaryHp = clampInteger(
    combat.temporaryHp,
    0,
    0
  );
  const deathSaves = isRecord(combat.deathSaves)
    ? combat.deathSaves
    : {};
  const successes = Math.min(
    3,
    clampInteger(deathSaves.successes, 0, 0)
  );
  const failures = Math.min(
    3,
    clampInteger(deathSaves.failures, 0, 0)
  );

  return `
    <article class="hg-sheet-card hg-sheet-wide-card">
      <h2>Hit Points &amp; Survival</h2>
      <div class="hg-sheet-vitals-layout">
        <div>
          <div class="hg-sheet-hp-display">
            <span>Current</span>
            <strong>${currentHp}</strong>
            <span>of ${maxHp}</span>
            <small>${temporaryHp} temporary HP</small>
          </div>
          <div class="hg-sheet-value-control hg-sheet-no-print">
            <label>
              Amount
              <input
                type="number"
                min="0"
                step="1"
                value="1"
                inputmode="numeric"
                data-character-sheet-input="hp-amount"
                ${canTrack ? "" : "disabled"}
              >
            </label>
            <button type="button" data-character-sheet-action="damage" ${canTrack ? "" : "disabled"}>Damage</button>
            <button type="button" data-character-sheet-action="heal" ${canTrack ? "" : "disabled"}>Heal</button>
            <button type="button" data-character-sheet-action="set-current-hp" ${canTrack ? "" : "disabled"}>Set Current</button>
            <button type="button" data-character-sheet-action="set-temp-hp" ${canTrack ? "" : "disabled"}>Set Temp</button>
          </div>
        </div>
        <div class="hg-sheet-death-saves">
          <h3>Death Saves</h3>
          ${[
            ["success", "Successes", successes],
            ["failure", "Failures", failures]
          ].map(([kind, label, value]) => `
            <div>
              <span>${label}</span>
              <strong aria-label="${label}: ${value}">${"\u25cf".repeat(value)}${"\u25cb".repeat(3 - value)}</strong>
              <span class="hg-sheet-inline-actions hg-sheet-no-print">
                <button
                  type="button"
                  data-character-sheet-action="adjust-death-save"
                  data-death-save-kind="${kind}"
                  data-delta="-1"
                  ${!canTrack || value <= 0 ? "disabled" : ""}
                >&minus;</button>
                <button
                  type="button"
                  data-character-sheet-action="adjust-death-save"
                  data-death-save-kind="${kind}"
                  data-delta="1"
                  ${!canTrack || value >= 3 ? "disabled" : ""}
                >+</button>
              </span>
            </div>
          `).join("")}
          <button
            type="button"
            class="hg-sheet-no-print"
            data-character-sheet-action="reset-death-saves"
            ${!canTrack || (!successes && !failures) ? "disabled" : ""}
          >Reset Death Saves</button>
        </div>
      </div>
    </article>
  `;
}

function renderConditions(character, canTrack) {
  const active = asArray(
    character?.combat?.conditions
  ).map((condition) => cleanText(condition)).filter(Boolean);

  return `
    <article class="hg-sheet-card">
      <h2>Conditions</h2>
      <div class="hg-sheet-chip-list">
        ${active.length
          ? active.map((condition) => `
              <button
                type="button"
                class="hg-sheet-condition-chip"
                data-character-sheet-action="toggle-condition"
                data-condition="${escapeHtml(condition)}"
                ${canTrack ? "" : "disabled"}
              >${escapeHtml(condition)} <span aria-hidden="true">&times;</span></button>
            `).join("")
          : `<span class="hg-sheet-muted">No active conditions.</span>`}
      </div>
      <div class="hg-sheet-condition-controls hg-sheet-no-print">
        <label>
          Standard condition
          <select data-character-sheet-input="standard-condition" ${canTrack ? "" : "disabled"}>
            ${STANDARD_CONDITIONS.map((condition) => `
              <option value="${escapeHtml(condition)}">${escapeHtml(condition)}</option>
            `).join("")}
          </select>
        </label>
        <button
          type="button"
          data-character-sheet-action="add-standard-condition"
          ${canTrack ? "" : "disabled"}
        >Add</button>
        <label>
          Custom condition
          <input
            type="text"
            maxlength="60"
            placeholder="Custom condition"
            data-character-sheet-input="custom-condition"
            ${canTrack ? "" : "disabled"}
          >
        </label>
        <button
          type="button"
          data-character-sheet-action="add-custom-condition"
          ${canTrack ? "" : "disabled"}
        >Add Custom</button>
      </div>
    </article>
  `;
}

function renderActionsPanel(character, summary) {
  return `
    <section class="hg-sheet-panel" aria-label="Actions">
      ${renderCombatStats(character, summary)}
      <div class="hg-sheet-card-grid">
        ${renderHitPointControls(character, summary.canTrack)}
        ${renderConditions(character, summary.canTrack)}
        <div class="hg-sheet-wide-card">
          ${renderActionSections(
            character,
            summary.proficiencyBonus,
            summary.canTrack
          )}
        </div>
        <article class="hg-sheet-card">
          <h2>Hit Dice</h2>
          ${renderHitDiceByClass(character)}
        </article>
      </div>
    </section>
  `;
}

function renderAbilitiesPanel(character, summary) {
  return `
    <section class="hg-sheet-panel" aria-label="Abilities">
      <div class="hg-sheet-card-grid">
        <article class="hg-sheet-card">
          <h2>Ability Scores</h2>
          ${renderAbilities(character)}
        </article>
        <article class="hg-sheet-card">
          <h2>Saving Throws</h2>
          ${renderSavingThrows(character, summary.proficiencyBonus)}
        </article>
        <article class="hg-sheet-card">
          <h2>Passive Scores</h2>
          ${renderDefinitionList([
            ["Perception", String(summary.passivePerception)],
            ["Investigation", String(getPassiveSkillScore(character, "investigation", summary.proficiencyBonus))],
            ["Insight", String(getPassiveSkillScore(character, "insight", summary.proficiencyBonus))]
          ])}
        </article>
        <article class="hg-sheet-card hg-sheet-wide-card">
          <h2>Skills</h2>
          ${renderSkills(character, summary.proficiencyBonus)}
        </article>
        ${renderDefensesAndMovement(character)}
        ${renderArmorClassOptions(character)}
        <article class="hg-sheet-card">
          <h2>Proficiencies</h2>
          ${renderDefinitionList([
            ["Armor", listText(character?.proficiencies?.armor)],
            ["Weapons", listText(character?.proficiencies?.weapons)],
            ["Tools", listText(character?.proficiencies?.tools)],
            ["Languages", listText(character?.proficiencies?.languages)]
          ])}
        </article>
      </div>
    </section>
  `;
}

function getInventoryWeight(character) {
  return asArray(character?.equipment?.items)
    .reduce((total, item) => {
      const weight =
        calculateInventoryLineWeight(
          item
        );

      return weight === null
        ? total
        : total + weight;
    }, 0);
}

function renderInventoryPanel(
  character,
  summary,
  options = {}
) {
  const carrying =
    calculateCharacterCarryingCapacity(
      character
    );
  const capacity =
    carrying.carryingCapacity;
  const weight = getInventoryWeight(character);
  const remaining = Math.max(
    0,
    capacity - weight
  );
  const encumbranceStatus =
    weight > capacity
      ? `Over capacity by ${Number(
          (weight - capacity).toFixed(2)
        )} lb.`
      : weight === capacity
        ? "At capacity"
        : "Within capacity";
  const attuned = asArray(
    character?.equipment?.items
  ).filter((item) => {
    return item?.attuned === true;
  }).length;

  return `
    <section class="hg-sheet-panel" aria-label="Inventory">
      <div class="hg-sheet-stat-grid">
        <article class="hg-sheet-stat-card">
          <span>Carried Weight</span>
          <strong>${Number(weight.toFixed(2))} lb.</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Capacity</span>
          <strong>${Number(capacity.toFixed(2))} lb.</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Remaining Capacity</span>
          <strong>${Number(remaining.toFixed(2))} lb.</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Encumbrance</span>
          <strong class="hg-sheet-stat-text">${encumbranceStatus}</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Attunement</span>
          <strong>${attuned} / 3</strong>
        </article>
      </div>
      ${attuned >= 3 ? `
        <div class="hg-sheet-callout" role="status">
          The normal attunement limit is reached.
        </div>
      ` : ""}
      <article class="hg-sheet-card">
        <h2>Equipment &amp; Containers</h2>
        <p class="hg-sheet-section-kicker">Expand an item for notes. Equip and attune changes save to this character.</p>
        ${renderEquipment(character, {
          interactive: summary.canTrack,
          search: options.search,
          filters: options.filters
        })}
      </article>
      <div class="hg-sheet-card-grid">
        <article class="hg-sheet-card">
          <h2>Currency</h2>
          ${renderCurrency(character)}
        </article>
        <article class="hg-sheet-card">
          <h2>Inventory Notes</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(character?.equipment?.notes, "No inventory notes."))}</p>
        </article>
      </div>
    </section>
  `;
}

function renderFeaturesPanel(
  character,
  canTrack = true
) {
  const featureGroups =
    collectCharacterFeatures(
      character
    ).filter((group) => {
      return group.entries.length > 0;
    });

  return `
    <section class="hg-sheet-panel" aria-label="Features">
      ${renderClassProgression(character)}
      <div class="hg-sheet-feature-groups">
        ${featureGroups.map((group) => `
          <section
            class="hg-sheet-card hg-sheet-feature-group"
            data-feature-group="${escapeHtml(group.id)}"
          >
            <h2>${escapeHtml(group.title)}</h2>
            ${renderFeatureList(
              group.entries,
              { canTrack }
            )}
          </section>
        `).join("")}
      </div>
      ${renderFeatMechanics(character)}
      ${firstText(character?.features?.notes, character?.notes) ? `
        <article class="hg-sheet-card">
          <h2>Feature Notes &amp; Reminders</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(character?.features?.notes, character?.notes))}</p>
        </article>
      ` : ""}
    </section>
  `;
}

function renderStoryPanel(character) {
  const identity = isRecord(character?.identity) ? character.identity : {};
  const background = isRecord(character?.background) ? character.background : {};

  return `
    <section class="hg-sheet-panel" aria-label="Story character sheet">
      <div class="hg-sheet-card-grid">
        <article class="hg-sheet-card">
          <h2>Identity</h2>
          ${renderDefinitionList([
            ["Name", getName(character)],
            ["Species", getSpeciesName(character)],
            ["Background", getBackgroundName(character)],
            ["Size", titleFromId(identity.size, "Not recorded")],
            ["Pronouns", identity.pronouns],
            ["Age", identity.age],
            ["Alignment / Outlook", identity.alignment],
            ["Deity / Belief", identity.deity]
          ])}
        </article>

        <article class="hg-sheet-card">
          <h2>Appearance</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(identity.appearance, character?.appearance, "No appearance recorded."))}</p>
        </article>

        <article class="hg-sheet-card hg-sheet-wide-card">
          <h2>Backstory</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(background.backstory, character?.backstory, "No backstory recorded."))}</p>
        </article>

        <article class="hg-sheet-card">
          <h2>Personality Traits</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(background.traits, character?.personality?.traits, character?.personalityTraits, "None recorded."))}</p>
        </article>

        <article class="hg-sheet-card">
          <h2>Ideals</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(background.ideals, character?.personality?.ideals, character?.ideals, "None recorded."))}</p>
        </article>

        <article class="hg-sheet-card">
          <h2>Bonds</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(background.bonds, character?.personality?.bonds, character?.bonds, "None recorded."))}</p>
        </article>

        <article class="hg-sheet-card">
          <h2>Flaws</h2>
          <p class="hg-sheet-preserve-lines">${escapeHtml(firstText(background.flaws, character?.personality?.flaws, character?.flaws, "None recorded."))}</p>
        </article>
      </div>
    </section>
  `;
}

const SPELL_STATUS_ORDER = Object.freeze([
  "Prepared",
  "Always prepared",
  "Known",
  "Spellbook",
  "Innate",
  "Species-granted",
  "Feat-granted",
  "Subclass-granted",
  "Mystic Arcanum",
  "Custom spell"
]);

const SPELL_FILTER_OPTIONS = Object.freeze([
  ["prepared", "Prepared"],
  ["known", "Known"],
  ["concentration", "Concentration"],
  ["ritual", "Ritual"],
  ["action", "Action"],
  ["bonus-action", "Bonus Action"],
  ["reaction", "Reaction"],
  ["damage", "Damage"],
  ["healing", "Healing"]
]);

const SPELL_REFERENCE_ALIASES = Object.freeze({
  "melfs-acid-arrow": "acid-arrow",
  "melf-s-acid-arrow": "acid-arrow",
  "leomunds-secret-chest": "secret-chest",
  "mordenkainens-faithful-hound": "faithful-hound",
  "mordenkainens-private-sanctum": "private-sanctum",
  "otilukes-resilient-sphere": "resilient-sphere",
  "bigbys-hand": "arcane-hand"
});

function getSpellReferenceId(reference) {
  const rawId = normalizeKey(
    isRecord(reference)
      ? firstText(
          reference.spellId,
          reference.id,
          reference.name
        )
      : reference
  );

  return SPELL_REFERENCE_ALIASES[rawId] || rawId;
}

function getSpellLevelLabel(level) {
  const safeLevel = clampInteger(level, 0, 0);
  return safeLevel === 0
    ? "Cantrip"
    : `Level ${Math.min(9, safeLevel)}`;
}

function getSpellGroupLabel(level) {
  return finiteNumber(level, 0) === 0
    ? "Cantrips"
    : `Level ${finiteNumber(level, 0)}`;
}

function formatSpellComponents(components) {
  if (typeof components === "string") {
    return cleanText(components, "Not recorded");
  }

  if (!isRecord(components)) {
    return "Not recorded";
  }

  const values = [];

  if (components.verbal === true) {
    values.push("V");
  }
  if (components.somatic === true) {
    values.push("S");
  }
  if (components.material === true) {
    values.push(
      components.materialText
        ? `M (${components.materialText})`
        : "M"
    );
  }

  return values.join(", ") || "Not recorded";
}

function spellHasEffect(spell, effectType) {
  const normalizedType = normalizeKey(effectType);

  if (
    asArray(spell?.effects).some((effect) => {
      return normalizeKey(effect?.type) === normalizedType;
    })
  ) {
    return true;
  }

  const value = spell?.[normalizedType];

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length > 0;
  }

  if (cleanText(value)) {
    return true;
  }

  return asArray(spell?.tags).some((tag) => {
    return normalizeKey(tag) === normalizedType;
  });
}

function getSpellActionKind(castingTime) {
  const normalized = cleanText(castingTime).toLowerCase();

  if (normalized.includes("bonus action")) {
    return "bonus-action";
  }

  if (normalized.includes("reaction")) {
    return "reaction";
  }

  return normalized.includes("action")
    ? "action"
    : "";
}

function createSpellCollectionRecord(reference) {
  const referenceRecord = isRecord(reference)
    ? reference
    : {};
  const id = getSpellReferenceId(reference);
  const catalogSpell = getDefaultSpellById(id);
  const spell = catalogSpell || referenceRecord;
  const level = Math.max(
    0,
    Math.min(
      9,
      clampInteger(
        firstText(
          spell.level,
          referenceRecord.spellLevel
        ),
        0,
        0
      )
    )
  );

  return {
    ...spell,
    id: firstText(
      catalogSpell?.id,
      id,
      `spell-${normalizeKey(spell.name)}`
    ),
    name: firstText(
      catalogSpell?.name,
      spell.name,
      referenceRecord.spellName,
      titleFromId(id, "Unnamed Spell")
    ),
    level,
    school: firstText(spell.school, "unknown"),
    castingTime: firstText(
      spell.castingTime,
      "Not recorded"
    ),
    range: firstText(spell.range, "Not recorded"),
    components:
      spell.components ??
      referenceRecord.components ??
      "",
    duration: firstText(
      spell.duration,
      "Not recorded"
    ),
    concentration:
      spell.concentration === true,
    ritual: spell.ritual === true,
    summary: firstText(
      spell.summary,
      spell.description
    ),
    description: firstText(
      spell.description,
      spell.summary
    ),
    higherLevelDescription: firstText(
      spell.higherLevelDescription,
      spell.higherLevel
    ),
    rulesSource: firstText(
      spell.sourceLabel,
      spell.source
    ),
    statuses: new Set(),
    sources: new Set()
  };
}

function addSpellReference(
  records,
  reference,
  {
    statuses = [],
    sources = []
  } = {}
) {
  const id = getSpellReferenceId(reference);

  if (!id) {
    return;
  }

  let spell = records.get(id);

  if (!spell) {
    spell = createSpellCollectionRecord(reference);
    records.set(id, spell);
  } else if (
    isRecord(reference) &&
    !getDefaultSpellById(id)
  ) {
    const merged = createSpellCollectionRecord({
      ...spell,
      ...reference,
      statuses: undefined,
      sources: undefined
    });
    merged.statuses = spell.statuses;
    merged.sources = spell.sources;
    spell = merged;
    records.set(id, spell);
  }

  statuses
    .map(cleanText)
    .filter(Boolean)
    .forEach((status) => {
      spell.statuses.add(status);
    });

  sources
    .map(cleanText)
    .filter(Boolean)
    .forEach((source) => {
      spell.sources.add(source);
    });
}

function getClassSpellSourceLabel(source, fallbackKey) {
  const classLabel = firstText(
    source?.className,
    titleFromId(
      source?.classId || fallbackKey,
      "Spellcasting"
    )
  );
  const subclassLabel = firstText(
    source?.subclassName
  );

  return subclassLabel
    ? `${classLabel} \u2014 ${subclassLabel}`
    : classLabel;
}

export function collectCharacterSpells(character) {
  const magic = isRecord(character?.magic)
    ? character.magic
    : {};
  const records = new Map();
  const classSources = isRecord(magic.classSources)
    ? Object.entries(magic.classSources)
    : [];

  const addMany = (
    references,
    statuses,
    sources
  ) => {
    asArray(references).forEach((reference) => {
      addSpellReference(
        records,
        reference,
        { statuses, sources }
      );
    });
  };

  addMany(
    magic.knownSpellIds,
    ["Known"],
    ["Spellcasting"]
  );
  addMany(
    magic.preparedSpellIds,
    ["Prepared"],
    ["Spellcasting"]
  );

  classSources.forEach(
    ([sourceKey, source]) => {
      const sourceLabel =
        getClassSpellSourceLabel(
          source,
          sourceKey
        );
      const subclassLabel = firstText(
        source?.subclassName
      );
      const subclassStatuses =
        subclassLabel
          ? ["Subclass-granted"]
          : [];

      addMany(
        source?.cantripIds,
        ["Known"],
        [sourceLabel]
      );
      addMany(
        source?.knownSpellIds,
        ["Known"],
        [sourceLabel]
      );
      addMany(
        source?.preparedSpellIds,
        ["Prepared"],
        [sourceLabel]
      );
      addMany(
        source?.spellbookSpellIds,
        ["Spellbook"],
        [sourceLabel]
      );
      addMany(
        source?.alwaysPreparedSpellIds,
        [
          "Prepared",
          "Always prepared",
          ...subclassStatuses
        ],
        [sourceLabel]
      );
      addMany(
        source?.subclassSpellIds,
        [
          "Subclass-granted",
          "Always prepared",
          "Prepared"
        ],
        [sourceLabel]
      );
      addMany(
        isRecord(
          source?.mysticArcanumSpellIds
        )
          ? Object.values(
              source.mysticArcanumSpellIds
            )
          : [],
        ["Known", "Mystic Arcanum"],
        [sourceLabel]
      );

      const expandedSpells = isRecord(
        source?.expandedSpells
      )
        ? Object.values(
            source.expandedSpells
          ).flat()
        : [];

      expandedSpells.forEach((reference) => {
        addSpellReference(
          records,
          reference,
          {
            statuses: [
              "Subclass-granted",
              ...(
                reference
                  ?.alwaysPrepared === true
                  ? [
                      "Prepared",
                      "Always prepared"
                    ]
                  : []
              )
            ],
            sources: [sourceLabel]
          }
        );
      });
    }
  );

  asArray(magic.innateSpells)
    .forEach((spell) => {
      const source = firstText(
        spell?.sourceLabel,
        spell?.sourceName,
        spell?.innateSource,
        spell?.source,
        "Innate magic"
      );
      const isSpeciesSpell =
        /species|ancestry|race/i.test(
          [
            spell?.sourceType,
            spell?.source,
            spell?.innateSource
          ].join(" ")
        );

      addSpellReference(
        records,
        spell,
        {
          statuses: [
            "Innate",
            ...(
              isSpeciesSpell
                ? ["Species-granted"]
                : []
            )
          ],
          sources: [source]
        }
      );
    });

  const featRecords =
    getFeatSpellRecords(character);

  featRecords.forEach((record) => {
    addSpellReference(
      records,
      firstText(
        record?.spellId,
        record?.spellName
      ),
      {
        statuses: ["Feat-granted"],
        sources: [
          firstText(
            record?.featName,
            titleFromId(
              record?.featId,
              "Feat"
            )
          )
        ]
      }
    );
  });

  if (isRecord(magic.featSources)) {
    Object.entries(magic.featSources)
      .forEach(([sourceKey, source]) => {
        const sourceLabel = firstText(
          source?.featName,
          titleFromId(
            source?.featId || sourceKey,
            "Feat"
          )
        );

        addMany(
          source?.spellIds,
          ["Feat-granted"],
          [sourceLabel]
        );
        asArray(source?.grants)
          .forEach((grant) => {
            addSpellReference(
              records,
              firstText(
                grant?.spellId,
                grant?.id,
                grant?.name
              ),
              {
                statuses: [
                  "Feat-granted"
                ],
                sources: [sourceLabel]
              }
            );
          });
      });
  }

  asArray(magic.customSpells)
    .forEach((spell) => {
      addSpellReference(
        records,
        spell,
        {
          statuses: ["Custom spell"],
          sources: [
            firstText(
              spell?.sourceLabel,
              spell?.sourceName,
              spell?.source,
              "Custom spell"
            )
          ]
        }
      );
    });

  return [...records.values()]
    .map((spell) => {
      const statuses =
        SPELL_STATUS_ORDER.filter(
          (status) => {
            return spell.statuses.has(
              status
            );
          }
        );
      const sources = [
        ...spell.sources
      ];
      const actionKind =
        getSpellActionKind(
          spell.castingTime
        );

      return {
        ...spell,
        statuses,
        sources,
        prepared:
          statuses.includes(
            "Prepared"
          ) ||
          statuses.includes(
            "Always prepared"
          ),
        known:
          statuses.includes("Known"),
        actionKind,
        dealsDamage:
          spellHasEffect(
            spell,
            "damage"
          ),
        heals:
          spellHasEffect(
            spell,
            "healing"
          )
      };
    })
    .sort((left, right) => {
      return (
        left.level - right.level ||
        left.name.localeCompare(
          right.name
        )
      );
    });
}

export function filterCharacterSpells(
  spells,
  {
    search = "",
    filters = []
  } = {}
) {
  const query = cleanText(search)
    .toLowerCase();
  const activeFilters = new Set(
    asArray(filters)
      .map(normalizeKey)
      .filter(Boolean)
  );

  return asArray(spells).filter((spell) => {
    const searchText = [
      spell?.name,
      spell?.school,
      spell?.castingTime,
      spell?.range,
      spell?.duration,
      spell?.summary,
      spell?.description,
      spell?.rulesSource,
      ...asArray(spell?.statuses),
      ...asArray(spell?.sources)
    ].join(" ").toLowerCase();

    if (
      query &&
      !searchText.includes(query)
    ) {
      return false;
    }

    return [...activeFilters]
      .every((filter) => {
        if (filter === "prepared") {
          return spell.prepared === true;
        }
        if (filter === "known") {
          return spell.known === true;
        }
        if (filter === "concentration") {
          return spell.concentration === true;
        }
        if (filter === "ritual") {
          return spell.ritual === true;
        }
        if (
          [
            "action",
            "bonus-action",
            "reaction"
          ].includes(filter)
        ) {
          return spell.actionKind === filter;
        }
        if (filter === "damage") {
          return spell.dealsDamage === true;
        }
        if (filter === "healing") {
          return spell.heals === true;
        }

        return true;
      });
  });
}

export function characterHasSpellContent(character) {
  const magic = isRecord(character?.magic)
    ? character.magic
    : {};

  return Boolean(
    collectCharacterSpells(character)
      .length ||
    Object.keys(
      isRecord(magic.classSources)
        ? magic.classSources
        : {}
    ).length ||
    Object.values(
      isRecord(magic.slots)
        ? magic.slots
        : {}
    ).some((value) => {
      return finiteNumber(value, 0) > 0;
    }) ||
    finiteNumber(
      magic?.pactMagic?.slots,
      0
    ) > 0 ||
    asArray(magic.pactMagicSources)
      .some((source) => {
        return finiteNumber(
          source?.slots,
          0
        ) > 0;
      }) ||
    cleanText(
      magic.spellcastingAbility
    ) ||
    optionalNumber(
      magic.spellSaveDc
    ) !== null ||
    optionalNumber(
      magic.spellAttackBonus
    ) !== null
  );
}

function renderSpellSourceSummary(
  source,
  fallbackKey
) {
  return `
    <article class="hg-sheet-card">
      <h2>${escapeHtml(
        getClassSpellSourceLabel(
          source,
          fallbackKey
        )
      )}</h2>
      ${renderDefinitionList([
        [
          "Spellcasting Ability",
          titleFromId(
            source?.spellcastingAbility,
            "Not recorded"
          )
        ],
        [
          "Spell Save DC",
          optionalNumber(
            source?.spellSaveDc
          ) === null
            ? "Not recorded"
            : String(
                source.spellSaveDc
              )
        ],
        [
          "Spell Attack Bonus",
          optionalNumber(
            source?.spellAttackBonus
          ) === null
            ? "Not recorded"
            : formatModifier(
                source
                  .spellAttackBonus
              )
        ]
      ])}
    </article>
  `;
}

function renderSpellSlots(magic) {
  const slots = isRecord(magic?.slots) ? magic.slots : {};
  const usage = isRecord(magic?.slotUsage?.normal)
    ? magic.slotUsage.normal
    : {};
  const levels = Object.keys(slots)
    .filter((level) => optionalNumber(slots[level]) !== null)
    .sort((a, b) => finiteNumber(a) - finiteNumber(b));

  if (!levels.length) {
    return `<p class="hg-sheet-muted">No normal spell slots recorded.</p>`;
  }

  return `
    <div class="hg-sheet-slot-grid">
      ${levels.map((level) => {
        const total = clampInteger(slots[level], 0, 0);
        const used = Math.min(total, clampInteger(usage[level], 0, 0));

        return `
          <div class="hg-sheet-slot-row" data-normal-spell-slot="${escapeHtml(level)}">
            <div>
              <span>Level ${escapeHtml(level)}</span>
              <strong>${total - used} / ${total}</strong>
            </div>
            <div class="hg-sheet-inline-actions hg-sheet-no-print">
              <button
                type="button"
                data-character-sheet-action="adjust-spell-slot"
                data-slot-kind="normal"
                data-slot-level="${escapeHtml(level)}"
                data-delta="1"
                ${used >= total ? "disabled" : ""}
              >Spend</button>
              <button
                type="button"
                data-character-sheet-action="adjust-spell-slot"
                data-slot-kind="normal"
                data-slot-level="${escapeHtml(level)}"
                data-delta="-1"
                ${used <= 0 ? "disabled" : ""}
              >Restore</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getFeatSpellRecords(character) {
  const direct = asArray(
    character?.featMechanics?.spellcasting
  );
  const fromSources = isRecord(
    character?.magic?.featSources
  )
    ? Object.values(
        character.magic.featSources
      ).flatMap((source) => {
        return asArray(source?.spellRecords);
      })
    : [];
  const records = new Map();

  [...direct, ...fromSources]
    .forEach((entry, index) => {
      if (!isRecord(entry)) {
        return;
      }

      const key = firstText(
        entry.id,
        `${entry.sourceId || entry.featId || "feat"}:${entry.spellId || index}`
      );

      records.set(key, entry);
    });

  return [...records.values()];
}

function formatFeatSpellRecharge(value) {
  const recharge = cleanText(value);

  if (recharge === "shortOrLongRest") {
    return "short or long rest";
  }

  if (recharge === "longRest") {
    return "long rest";
  }

  if (recharge === "shortRest") {
    return "short rest";
  }

  return recharge
    ? titleFromId(recharge, recharge)
    : "";
}

function renderFeatSpellResources(character) {
  const records = getFeatSpellRecords(character);

  if (!records.length) {
    return `<p class="hg-sheet-muted">No feat spells recorded.</p>`;
  }

  return `
    <ul class="hg-sheet-list">
      ${records.map((record) => {
        const maximumUses = optionalNumber(
          record.maximumUses
        );
        const currentUses = optionalNumber(
          record.currentUses
        );
        const usage = record.atWill === true
          ? "At will"
          : maximumUses === null
            ? "Known spell"
            : `${Math.max(0, currentUses ?? maximumUses)} / ${Math.max(0, maximumUses)} use${maximumUses === 1 ? "" : "s"} remaining`;
        const recharge = formatFeatSpellRecharge(
          record.recharge
        );
        const details = [
          titleFromId(
            record.spellcastingAbility,
            "Ability not recorded"
          ),
          usage,
          recharge
            ? `Recharges after a ${recharge}`
            : "",
          record.canUseSpellSlots === true
            ? "May also use normal spell slots"
            : ""
        ].filter(Boolean);

        return `
          <li data-feat-spell-resource="${escapeHtml(firstText(record.id, record.spellId))}">
            <strong>${escapeHtml(firstText(record.spellName, titleFromId(record.spellId, "Feat spell")))}</strong>
            <span>${escapeHtml(details.join(" · "))}</span>
            <small>${escapeHtml(firstText(record.featName, titleFromId(record.featId, "Feat")))}</small>
            ${maximumUses === null ? "" : `
              <span class="hg-sheet-inline-actions hg-sheet-no-print">
                <button
                  type="button"
                  data-character-sheet-action="adjust-feat-resource"
                  data-resource-id="${escapeHtml(firstText(record.id, record.spellId))}"
                  data-delta="-1"
                  ${(currentUses ?? maximumUses) <= 0 ? "disabled" : ""}
                >Spend</button>
                <button
                  type="button"
                  data-character-sheet-action="adjust-feat-resource"
                  data-resource-id="${escapeHtml(firstText(record.id, record.spellId))}"
                  data-delta="1"
                  ${(currentUses ?? maximumUses) >= maximumUses ? "disabled" : ""}
                >Restore</button>
              </span>
            `}
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderSpellStatusBadges(spell) {
  return `
    <div class="hg-sheet-spell-badges" aria-label="Spell status">
      ${spell.statuses.map((status) => `
        <span>${escapeHtml(status)}</span>
      `).join("")}
    </div>
  `;
}

function renderSpellCard(spell) {
  const source = [
    ...spell.sources,
    ...(
      spell.rulesSource &&
      !spell.sources.includes(
        spell.rulesSource
      )
        ? [spell.rulesSource]
        : []
    )
  ].join(" \u00b7 ");
  const completeDescription = [
    spell.description,
    spell.higherLevelDescription
      ? `At Higher Levels: ${spell.higherLevelDescription}`
      : ""
  ].filter(Boolean).join("\n\n");

  return `
    <article
      class="hg-sheet-spell-card"
      data-sheet-spell-id="${escapeHtml(spell.id)}"
      data-sheet-spell-level="${spell.level}"
    >
      <header>
        <div>
          <strong>${escapeHtml(spell.name)}</strong>
          <span>${escapeHtml(
            `${getSpellLevelLabel(
              spell.level
            )} \u00b7 ${titleFromId(
              spell.school,
              "Unknown school"
            )}`
          )}</span>
        </div>
        ${renderSpellStatusBadges(spell)}
      </header>

      <dl class="hg-sheet-spell-facts">
        ${[
          [
            "Casting Time",
            spell.castingTime
          ],
          ["Range", spell.range],
          [
            "Components",
            formatSpellComponents(
              spell.components
            )
          ],
          ["Duration", spell.duration],
          [
            "Concentration",
            spell.concentration
              ? "Yes"
              : "No"
          ],
          [
            "Ritual",
            spell.ritual
              ? "Yes"
              : "No"
          ],
          [
            "Source",
            firstText(
              source,
              "Not recorded"
            )
          ],
          [
            "Status",
            spell.statuses.join(", ")
          ]
        ].map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(
              firstText(
                value,
                "Not recorded"
              )
            )}</dd>
          </div>
        `).join("")}
      </dl>

      ${spell.summary ? `
        <p class="hg-sheet-spell-summary">${escapeHtml(spell.summary)}</p>
      ` : ""}

      ${completeDescription ? `
        <details class="hg-sheet-spell-description">
          <summary>Full spell description</summary>
          <p>${escapeHtml(completeDescription)}</p>
        </details>
      ` : ""}
    </article>
  `;
}

function renderSpellLibrary(
  character,
  {
    search = "",
    filters = []
  } = {}
) {
  const allSpells =
    collectCharacterSpells(character);
  const activeFilters = asArray(filters)
    .map(normalizeKey)
    .filter(Boolean);
  const visibleSpells =
    filterCharacterSpells(
      allSpells,
      {
        search,
        filters: activeFilters
      }
    );
  const groups = Array.from(
    { length: 10 },
    (_, level) => {
      return {
        level,
        spells:
          visibleSpells.filter(
            (spell) => {
              return (
                spell.level === level
              );
            }
          )
      };
    }
  ).filter((group) => {
    return group.spells.length > 0;
  });

  return `
    <section class="hg-sheet-spell-library" aria-label="Spell library">
      <header class="hg-sheet-spell-library-heading">
        <div>
          <h2>Spells</h2>
          <span>
            ${visibleSpells.length} of ${allSpells.length}
            spell${allSpells.length === 1 ? "" : "s"}
          </span>
        </div>
        <label>
          <span>Search spells</span>
          <input
            type="search"
            value="${escapeHtml(search)}"
            placeholder="Name, school, source, or description"
            autocomplete="off"
            data-character-sheet-input="spell-search"
          >
        </label>
      </header>

      <div
        class="hg-sheet-spell-filters hg-sheet-no-print"
        aria-label="Spell filters"
      >
        ${SPELL_FILTER_OPTIONS.map(
          ([id, label]) => {
            const active =
              activeFilters.includes(id);

            return `
              <button
                type="button"
                class="${active ? "active" : ""}"
                data-character-sheet-action="toggle-spell-filter"
                data-spell-filter="${id}"
                aria-pressed="${active ? "true" : "false"}"
              >${escapeHtml(label)}</button>
            `;
          }
        ).join("")}
      </div>

      ${groups.length ? `
        <div class="hg-sheet-spell-groups">
          ${groups.map((group) => `
            <section
              class="hg-sheet-spell-group"
              data-spell-level-group="${group.level}"
            >
              <header>
                <h3>${escapeHtml(
                  getSpellGroupLabel(
                    group.level
                  )
                )}</h3>
                <span>${group.spells.length}</span>
              </header>
              <div class="hg-sheet-spell-card-grid">
                ${group.spells.map(
                  renderSpellCard
                ).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      ` : `
        <p
          class="hg-sheet-spell-empty"
          role="status"
        >
          No spells match the current search and filters.
        </p>
      `}
    </section>
  `;
}

function renderSpellPanel(
  character,
  {
    search = "",
    filters = []
  } = {}
) {
  const magic = isRecord(character?.magic) ? character.magic : {};
  const classSources = isRecord(magic.classSources)
    ? Object.entries(magic.classSources)
    : [];
  const pactSlots = clampInteger(magic?.pactMagic?.slots, 0, 0);
  const pactUsed = Math.min(pactSlots, clampInteger(magic?.slotUsage?.pact, 0, 0));
  const pactSources = (
    asArray(magic.pactMagicSources).length
      ? asArray(magic.pactMagicSources)
      : pactSlots
        ? [{
          classEntryId: "legacy:pact-magic",
          className: "Pact Magic",
          slots: pactSlots,
          slotLevel: magic?.pactMagic?.slotLevel
        }]
        : []
  ).map((source, index) => {
    const sourceId = firstText(
      source.classEntryId,
      source.sourceId,
      `pact-source-${index + 1}`
    );
    const maximum = clampInteger(source.slots, 0, 0);
    const used = Math.min(
      maximum,
      clampInteger(
        magic?.slotUsage?.pactSources?.[sourceId],
        index === 0 ? pactUsed : 0,
        0
      )
    );

    return {
      sourceId,
      className: firstText(source.className, "Pact Magic"),
      slotLevel: clampInteger(source.slotLevel, 0, 0),
      maximum,
      used
    };
  }).filter((source) => {
    return source.maximum > 0;
  });

  return `
    <section class="hg-sheet-panel" aria-label="Spell character sheet">
      <div class="hg-sheet-callout">
        Spell learning and preparation remain in the Character Creator. Uses and spell-slot spending can be tracked here.
      </div>

      <div class="hg-sheet-card-grid">
        ${classSources.length
          ? classSources.map(([key, source]) => renderSpellSourceSummary(source, key)).join("")
          : `
            <article class="hg-sheet-card">
              <h2>Spellcasting</h2>
              ${renderDefinitionList([
                ["Ability", titleFromId(magic.spellcastingAbility, "Not recorded")],
                ["Save DC", optionalNumber(magic.spellSaveDc) === null ? "Not recorded" : String(magic.spellSaveDc)],
                ["Attack Bonus", optionalNumber(magic.spellAttackBonus) === null ? "Not recorded" : formatModifier(magic.spellAttackBonus)]
              ])}
            </article>
          `}

        <article class="hg-sheet-card">
          <h2>Spell Slots</h2>
          ${renderSpellSlots(magic)}
        </article>

        <article class="hg-sheet-card">
          <h2>Pact Magic</h2>
          ${pactSources.length ? `
            <div class="hg-sheet-resource-list">
              ${pactSources.map((source) => `
                <article class="hg-sheet-resource-row" data-pact-source="${escapeHtml(source.sourceId)}">
                  <div>
                    <strong>${escapeHtml(source.className)}</strong>
                    <span>${source.maximum - source.used} / ${source.maximum} level ${source.slotLevel}</span>
                    <small>Recharges after a short or long rest</small>
                  </div>
                  <div class="hg-sheet-inline-actions hg-sheet-no-print">
                    <button
                      type="button"
                      data-character-sheet-action="adjust-spell-slot"
                      data-slot-kind="pact"
                      data-slot-source-id="${escapeHtml(source.sourceId)}"
                      data-slot-level="${source.slotLevel}"
                      data-delta="1"
                      ${source.used >= source.maximum ? "disabled" : ""}
                    >Spend</button>
                    <button
                      type="button"
                      data-character-sheet-action="adjust-spell-slot"
                      data-slot-kind="pact"
                      data-slot-source-id="${escapeHtml(source.sourceId)}"
                      data-slot-level="${source.slotLevel}"
                      data-delta="-1"
                      ${source.used <= 0 ? "disabled" : ""}
                    >Restore</button>
                  </div>
                </article>
              `).join("")}
            </div>
          ` : `<p class="hg-sheet-muted">No Pact Magic slots recorded.</p>`}
        </article>

        <article class="hg-sheet-card">
          <h2>Feat Spells</h2>
          ${renderFeatSpellResources(character)}
        </article>

        ${cleanText(magic.notes) ? `
          <article class="hg-sheet-card">
            <h2>Spell Notes</h2>
            <p class="hg-sheet-preserve-lines">${escapeHtml(magic.notes)}</p>
          </article>
        ` : ""}
      </div>

      ${renderSpellLibrary(
        character,
        { search, filters }
      )}
    </section>
  `;
}

function ensureStyles() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById("homebrewGodCharacterSheetStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "homebrewGodCharacterSheetStyles";
  style.textContent = `
    .hg-character-sheet,
    .hg-character-sheet * {
      box-sizing: border-box;
    }

    .hg-character-sheet {
      width: 100%;
      max-width: 1500px;
      margin: 0 auto;
      color: #edf1ff;
      overflow-wrap: anywhere;
    }

    .hg-character-sheet button {
      margin: 0 !important;
    }

    .hg-character-sheet-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px;
      border: 1px solid rgba(127, 153, 255, 0.3);
      border-radius: 18px;
      background:
        radial-gradient(circle at top left, rgba(92, 112, 255, 0.22), transparent 44%),
        linear-gradient(145deg, rgba(18, 27, 55, 0.98), rgba(8, 12, 27, 0.99));
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.3);
    }

    .hg-character-sheet-portrait,
    .hg-character-sheet-portrait-placeholder {
      width: 88px;
      height: 88px;
      border-radius: 16px;
      border: 1px solid rgba(151, 172, 255, 0.36);
      background: rgba(7, 11, 27, 0.78);
    }

    .hg-character-sheet-portrait {
      display: block;
      object-fit: cover;
    }

    .hg-character-sheet-portrait-placeholder {
      display: grid;
      place-items: center;
      color: #aeb8df;
      font-size: 28px;
      font-weight: 800;
    }

    .hg-character-sheet-heading {
      min-width: 0;
    }

    .hg-character-sheet-heading h1 {
      margin: 0 0 5px;
      font-size: clamp(26px, 4vw, 42px);
      line-height: 1.05;
    }

    .hg-character-sheet-heading p {
      margin: 3px 0;
      color: #bdc7ed;
    }

    .hg-character-sheet-heading .hg-sheet-class-line {
      color: #f4d88b;
      font-weight: 750;
    }

    .hg-character-sheet-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0;
      padding: 8px;
      border: 1px solid rgba(127, 153, 255, 0.22);
      border-radius: 14px;
      background: rgba(7, 11, 27, 0.82);
    }

    .hg-character-sheet-tab {
      flex: 1 1 130px;
      min-width: 0;
      border: 1px solid rgba(127, 153, 255, 0.24) !important;
      background: rgba(22, 31, 62, 0.82) !important;
      color: #dbe3ff !important;
    }

    .hg-character-sheet-tab.active {
      border-color: #879cff !important;
      background: linear-gradient(135deg, #4b5fd8, #764bb4) !important;
      color: #fff !important;
    }

    .hg-sheet-panel {
      display: grid;
      gap: 14px;
    }

    .hg-sheet-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 10px;
    }

    .hg-sheet-stat-card,
    .hg-sheet-card,
    .hg-sheet-callout {
      min-width: 0;
      border: 1px solid rgba(127, 153, 255, 0.22);
      border-radius: 15px;
      background:
        radial-gradient(circle at top left, rgba(84, 113, 233, 0.08), transparent 55%),
        linear-gradient(180deg, rgba(15, 22, 45, 0.98), rgba(8, 12, 26, 0.98));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    }

    .hg-sheet-stat-card {
      display: grid;
      align-content: center;
      min-height: 100px;
      padding: 13px;
      text-align: center;
    }

    .hg-sheet-stat-card span,
    .hg-sheet-stat-card small {
      color: #aeb8df;
      font-size: 12px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.055em;
    }

    .hg-sheet-stat-card strong {
      margin-top: 5px;
      font-size: 27px;
      line-height: 1.1;
    }

    .hg-sheet-stat-card .hg-sheet-stat-text {
      font-size: 17px;
      line-height: 1.3;
      text-transform: none;
    }

    .hg-sheet-two-column {
      display: grid;
      grid-template-columns: minmax(270px, 0.75fr) minmax(0, 1.55fr);
      gap: 14px;
      align-items: start;
    }

    .hg-sheet-two-column > div {
      display: grid;
      min-width: 0;
      gap: 14px;
    }

    .hg-sheet-card {
      padding: 14px;
    }

    .hg-sheet-card h2 {
      margin: 0 0 11px;
      color: #f4d88b;
      font-size: 17px;
      letter-spacing: 0.025em;
    }

    .hg-sheet-card p {
      margin: 0;
      line-height: 1.55;
    }

    .hg-sheet-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 14px;
    }

    .hg-sheet-wide-card {
      grid-column: 1 / -1;
    }

    .hg-sheet-ability-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .hg-sheet-ability-box {
      display: grid;
      place-items: center;
      min-width: 0;
      padding: 10px 5px;
      border: 1px solid rgba(151, 172, 255, 0.25);
      border-radius: 12px;
      background: rgba(8, 13, 30, 0.76);
    }

    .hg-sheet-ability-box span,
    .hg-sheet-ability-box small {
      color: #aeb8df;
      font-size: 11px;
      font-weight: 800;
    }

    .hg-sheet-ability-box strong {
      padding: 3px 0;
      font-size: 23px;
    }

    .hg-sheet-compact-list,
    .hg-sheet-skill-list {
      display: grid;
      gap: 4px;
    }

    .hg-sheet-skill-row {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr) auto;
      gap: 6px;
      align-items: center;
      min-width: 0;
      padding: 6px 3px;
      border-bottom: 1px solid rgba(127, 153, 255, 0.11);
    }

    .hg-sheet-skill-row:last-child {
      border-bottom: 0;
    }

    .hg-sheet-skill-row small {
      margin-left: 5px;
      color: #919cc8;
      font-size: 10px;
    }

    .hg-sheet-prof-mark {
      color: #9db1ff;
      text-align: center;
    }

    .hg-sheet-list {
      display: grid;
      gap: 9px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .hg-sheet-list li {
      display: grid;
      gap: 3px;
      padding-bottom: 9px;
      border-bottom: 1px solid rgba(127, 153, 255, 0.12);
    }

    .hg-sheet-list li:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .hg-sheet-list span,
    .hg-sheet-list small,
    .hg-sheet-muted {
      color: #aeb8df;
      line-height: 1.45;
    }

    .hg-sheet-list small {
      font-size: 11px;
    }

    .hg-sheet-feature-groups {
      display: grid;
      gap: 14px;
      align-items: start;
    }

    .hg-sheet-feature-group {
      min-width: 0;
    }

    .hg-sheet-feature-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
      align-items: start;
    }

    .hg-sheet-feature-card {
      display: grid;
      min-width: 0;
      gap: 9px;
      padding: 12px;
      border: 1px solid rgba(127, 153, 255, 0.18);
      border-radius: 12px;
      background: rgba(7, 11, 27, 0.62);
    }

    .hg-sheet-feature-card > header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4px 10px;
      min-width: 0;
    }

    .hg-sheet-feature-card > header strong {
      color: #f2f5ff;
      overflow-wrap: anywhere;
    }

    .hg-sheet-feature-card > header span {
      color: #9fabd6;
      font-size: 11px;
      line-height: 1.4;
      text-align: right;
    }

    .hg-sheet-feature-summary,
    .hg-sheet-feature-choices {
      color: #bdc7eb;
      font-size: 13px;
      line-height: 1.5 !important;
    }

    .hg-sheet-feature-choices {
      display: grid;
      gap: 2px;
      padding: 8px 9px;
      border: 1px solid rgba(244, 216, 139, 0.2);
      border-radius: 9px;
      background: rgba(244, 216, 139, 0.06);
    }

    .hg-sheet-feature-choices strong {
      color: #f4d88b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hg-sheet-feature-resource {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 9px;
      border: 1px solid rgba(112, 218, 173, 0.24);
      border-radius: 10px;
      background: rgba(32, 113, 82, 0.12);
    }

    .hg-sheet-feature-resource > div:first-child {
      display: grid;
      gap: 2px;
    }

    .hg-sheet-feature-resource strong {
      color: #ccf7e4;
      font-size: 12px;
    }

    .hg-sheet-feature-resource span {
      color: #a8c9be;
      font-size: 11px;
    }

    .hg-sheet-feature-description {
      min-width: 0;
      border-top: 1px solid rgba(127, 153, 255, 0.14);
      padding-top: 8px;
    }

    .hg-sheet-feature-description summary {
      width: fit-content;
      color: #9eb1ff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
    }

    .hg-sheet-feature-description p {
      margin-top: 8px;
      color: #b8c3e7;
      font-size: 13px;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .hg-sheet-action-sections {
      display: grid;
      gap: 14px;
    }

    .hg-sheet-action-section {
      min-width: 0;
      padding: 14px;
      border: 1px solid rgba(127, 153, 255, 0.22);
      border-radius: 15px;
      background:
        radial-gradient(circle at top left, rgba(84, 113, 233, 0.08), transparent 55%),
        linear-gradient(180deg, rgba(15, 22, 45, 0.98), rgba(8, 12, 26, 0.98));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    }

    .hg-sheet-action-section-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 11px;
    }

    .hg-sheet-action-section-heading h2 {
      margin: 0;
      color: #f4d88b;
      font-size: 18px;
      letter-spacing: 0.025em;
    }

    .hg-sheet-action-section-heading > span {
      display: grid;
      place-items: center;
      min-width: 28px;
      min-height: 28px;
      padding: 3px 8px;
      border: 1px solid rgba(135, 156, 255, 0.34);
      border-radius: 999px;
      color: #dbe3ff;
      background: rgba(75, 95, 216, 0.18);
      font-size: 12px;
      font-weight: 800;
    }

    .hg-sheet-action-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 10px;
    }

    .hg-sheet-action-card {
      display: grid;
      align-content: start;
      min-width: 0;
      gap: 10px;
      padding: 12px;
      border: 1px solid rgba(127, 153, 255, 0.18);
      border-radius: 12px;
      background: rgba(7, 11, 27, 0.62);
    }

    .hg-sheet-action-card > header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }

    .hg-sheet-action-card > header > div {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .hg-sheet-action-card > header strong {
      color: #fff;
      font-size: 16px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .hg-sheet-action-card > header div span {
      color: #9eabd8;
      font-size: 11px;
    }

    .hg-sheet-action-badge {
      padding: 4px 8px;
      border: 1px solid rgba(151, 172, 255, 0.3);
      border-radius: 999px;
      color: #dbe3ff;
      background: rgba(75, 95, 216, 0.16);
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hg-sheet-action-facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
      gap: 6px;
      margin: 0;
    }

    .hg-sheet-action-facts > div {
      display: grid;
      min-width: 0;
      gap: 2px;
      padding: 7px;
      border: 1px solid rgba(127, 153, 255, 0.13);
      border-radius: 8px;
      background: rgba(15, 22, 45, 0.72);
    }

    .hg-sheet-action-facts dt {
      color: #8f9bc7;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.045em;
    }

    .hg-sheet-action-facts dd {
      min-width: 0;
      margin: 0;
      color: #f2f4ff;
      font-size: 13px;
      font-weight: 750;
      overflow-wrap: anywhere;
    }

    .hg-sheet-action-summary,
    .hg-sheet-action-empty {
      color: #aeb8df;
      line-height: 1.45;
    }

    .hg-sheet-action-resource {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 9px;
      border: 1px solid rgba(244, 216, 139, 0.2);
      border-radius: 9px;
      background: rgba(244, 216, 139, 0.055);
    }

    .hg-sheet-action-resource > div:first-child {
      display: grid;
      gap: 2px;
    }

    .hg-sheet-action-resource strong {
      color: #f9e7b6;
      font-size: 12px;
    }

    .hg-sheet-action-resource span {
      color: #aeb8df;
      font-size: 10px;
    }

    .hg-sheet-action-description {
      border-top: 1px solid rgba(127, 153, 255, 0.12);
      padding-top: 8px;
    }

    .hg-sheet-action-description summary {
      width: fit-content;
      color: #aebeff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 750;
    }

    .hg-sheet-action-description p {
      margin: 8px 0 0;
      color: #c5cdef;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .hg-sheet-spell-library {
      display: grid;
      min-width: 0;
      gap: 12px;
      padding: 14px;
      border: 1px solid rgba(127, 153, 255, 0.22);
      border-radius: 15px;
      background:
        radial-gradient(circle at top left, rgba(84, 113, 233, 0.08), transparent 55%),
        linear-gradient(180deg, rgba(15, 22, 45, 0.98), rgba(8, 12, 26, 0.98));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    }

    .hg-sheet-spell-library-heading {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 0.65fr);
      gap: 14px;
      align-items: end;
    }

    .hg-sheet-spell-library-heading > div {
      display: grid;
      gap: 3px;
    }

    .hg-sheet-spell-library-heading h2 {
      margin: 0;
      color: #f4d88b;
      font-size: 20px;
    }

    .hg-sheet-spell-library-heading > div > span,
    .hg-sheet-spell-library-heading label > span {
      color: #aeb8df;
      font-size: 12px;
    }

    .hg-sheet-spell-library-heading label {
      display: grid;
      min-width: 0;
      gap: 5px;
      font-weight: 700;
    }

    .hg-sheet-spell-filters,
    .hg-sheet-spell-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .hg-sheet-spell-filters button {
      min-height: 34px;
      padding: 6px 10px !important;
      border-color: rgba(127, 153, 255, 0.28) !important;
      color: #dbe3ff !important;
      background: rgba(22, 31, 62, 0.82) !important;
      font-size: 11px !important;
    }

    .hg-sheet-spell-filters button.active {
      border-color: #879cff !important;
      color: #fff !important;
      background: linear-gradient(135deg, #4b5fd8, #764bb4) !important;
    }

    .hg-sheet-spell-groups {
      display: grid;
      min-width: 0;
      gap: 14px;
    }

    .hg-sheet-spell-group {
      display: grid;
      min-width: 0;
      gap: 9px;
    }

    .hg-sheet-spell-group > header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      border-bottom: 1px solid rgba(127, 153, 255, 0.16);
      padding-bottom: 7px;
    }

    .hg-sheet-spell-group > header h3 {
      margin: 0;
      color: #dce4ff;
      font-size: 17px;
    }

    .hg-sheet-spell-group > header span {
      display: grid;
      place-items: center;
      min-width: 27px;
      min-height: 27px;
      padding: 3px 8px;
      border: 1px solid rgba(135, 156, 255, 0.34);
      border-radius: 999px;
      color: #dbe3ff;
      background: rgba(75, 95, 216, 0.18);
      font-size: 11px;
      font-weight: 800;
    }

    .hg-sheet-spell-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 10px;
    }

    .hg-sheet-spell-card {
      display: grid;
      align-content: start;
      min-width: 0;
      gap: 10px;
      padding: 12px;
      border: 1px solid rgba(127, 153, 255, 0.18);
      border-radius: 12px;
      background: rgba(7, 11, 27, 0.62);
    }

    .hg-sheet-spell-card > header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }

    .hg-sheet-spell-card > header > div:first-child {
      display: grid;
      min-width: 0;
      gap: 3px;
    }

    .hg-sheet-spell-card > header strong {
      color: #fff;
      font-size: 16px;
      line-height: 1.25;
    }

    .hg-sheet-spell-card > header > div:first-child span {
      color: #9eabd8;
      font-size: 11px;
    }

    .hg-sheet-spell-badges {
      justify-content: flex-end;
      max-width: 190px;
    }

    .hg-sheet-spell-badges span {
      padding: 3px 7px;
      border: 1px solid rgba(151, 172, 255, 0.3);
      border-radius: 999px;
      color: #dbe3ff;
      background: rgba(75, 95, 216, 0.16);
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.035em;
    }

    .hg-sheet-spell-facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin: 0;
    }

    .hg-sheet-spell-facts > div {
      display: grid;
      min-width: 0;
      gap: 2px;
      padding: 7px;
      border: 1px solid rgba(127, 153, 255, 0.13);
      border-radius: 8px;
      background: rgba(15, 22, 45, 0.72);
    }

    .hg-sheet-spell-facts dt {
      color: #8f9bc7;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.045em;
    }

    .hg-sheet-spell-facts dd {
      min-width: 0;
      margin: 0;
      color: #f2f4ff;
      font-size: 12px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .hg-sheet-spell-summary,
    .hg-sheet-spell-empty {
      margin: 0;
      color: #aeb8df;
      line-height: 1.45;
    }

    .hg-sheet-spell-description {
      border-top: 1px solid rgba(127, 153, 255, 0.12);
      padding-top: 8px;
    }

    .hg-sheet-spell-description summary {
      width: fit-content;
      color: #aebeff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 750;
    }

    .hg-sheet-spell-description p {
      margin: 8px 0 0;
      color: #c5cdef;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .hg-sheet-definition-list {
      display: grid;
      gap: 8px;
      margin: 0;
    }

    .hg-sheet-definition-list > div {
      display: grid;
      grid-template-columns: minmax(105px, 0.6fr) minmax(0, 1.4fr);
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(127, 153, 255, 0.12);
    }

    .hg-sheet-definition-list > div:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .hg-sheet-definition-list dt {
      color: #9eabd8;
      font-size: 12px;
      font-weight: 750;
    }

    .hg-sheet-definition-list dd {
      min-width: 0;
      margin: 0;
    }

    .hg-sheet-table-wrap {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      border: 1px solid rgba(127, 153, 255, 0.14);
      border-radius: 11px;
    }

    .hg-sheet-table {
      width: 100%;
      min-width: 560px;
      border-collapse: collapse;
    }

    .hg-sheet-table th,
    .hg-sheet-table td {
      padding: 9px;
      border-bottom: 1px solid rgba(127, 153, 255, 0.12);
      text-align: left;
      vertical-align: top;
    }

    .hg-sheet-table tr:last-child td {
      border-bottom: 0;
    }

    .hg-sheet-table th {
      color: #9eabd8;
      background: rgba(7, 11, 27, 0.72);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.045em;
    }

    .hg-sheet-table td small {
      display: block;
      margin-top: 2px;
      color: #909cc8;
    }

    .hg-sheet-currency-grid,
    .hg-sheet-slot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 7px;
    }

    .hg-sheet-currency-grid > div,
    .hg-sheet-slot-grid > div {
      display: grid;
      place-items: center;
      gap: 2px;
      min-width: 0;
      padding: 9px 5px;
      border: 1px solid rgba(127, 153, 255, 0.18);
      border-radius: 10px;
      background: rgba(7, 11, 27, 0.68);
    }

    .hg-sheet-currency-grid span,
    .hg-sheet-slot-grid span {
      color: #9eabd8;
      font-size: 10px;
      font-weight: 750;
      text-transform: uppercase;
    }

    .hg-sheet-callout {
      padding: 12px 14px;
      border-color: rgba(244, 216, 139, 0.32);
      color: #d8def8;
    }

    .hg-sheet-preserve-lines {
      white-space: pre-wrap;
    }

    .hg-character-sheet-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 7px;
      max-width: 460px;
    }

    .hg-character-sheet-toolbar button,
    .hg-sheet-inline-actions button {
      padding: 7px 10px !important;
      font-size: 12px !important;
    }

    .hg-sheet-sync-status {
      font-size: 12px;
    }

    .hg-sheet-full-description {
      color: #d8def8 !important;
      white-space: pre-wrap;
    }

    .hg-sheet-level-order {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 7px;
      margin: 0;
      padding: 0;
      counter-reset: none;
      list-style-position: inside;
    }

    .hg-sheet-level-order li {
      display: grid;
      gap: 2px;
      padding: 9px;
      border: 1px solid rgba(127, 153, 255, 0.16);
      border-radius: 10px;
      background: rgba(7, 11, 27, 0.58);
    }

    .hg-sheet-level-order span,
    .hg-sheet-selected-rule span {
      color: #aeb8df;
      font-size: 12px;
    }

    .hg-sheet-selected-rule {
      display: grid;
      gap: 3px;
      margin-bottom: 12px !important;
      padding: 10px;
      border: 1px solid rgba(244, 216, 139, 0.35);
      border-radius: 10px;
      background: rgba(244, 216, 139, 0.07);
    }

    .hg-sheet-selected-option {
      padding: 8px !important;
      border: 1px solid rgba(244, 216, 139, 0.35) !important;
      border-radius: 9px;
      background: rgba(244, 216, 139, 0.06);
    }

    .hg-sheet-resource-list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }

    .hg-sheet-resource-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 9px;
      border: 1px solid rgba(127, 153, 255, 0.16);
      border-radius: 10px;
      background: rgba(7, 11, 27, 0.58);
    }

    .hg-sheet-resource-row > div:first-child,
    .hg-sheet-slot-row > div:first-child {
      display: grid;
      gap: 2px;
    }

    .hg-sheet-resource-row span,
    .hg-sheet-resource-row small {
      color: #aeb8df;
    }

    .hg-sheet-resource-row small {
      font-size: 11px;
    }

    .hg-sheet-inline-actions {
      display: flex !important;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .hg-character-sheet-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      max-width: 520px;
    }

    .hg-sheet-more-menu {
      position: relative;
    }

    .hg-sheet-more-menu > summary {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 7px 12px;
      border: 1px solid rgba(127, 153, 255, 0.34);
      border-radius: 9px;
      color: #edf1ff;
      background: rgba(22, 31, 62, 0.88);
      cursor: pointer;
      list-style: none;
    }

    .hg-sheet-more-menu > summary::-webkit-details-marker {
      display: none;
    }

    .hg-sheet-more-menu > div {
      position: absolute;
      z-index: 12;
      top: calc(100% + 6px);
      right: 0;
      display: grid;
      min-width: 170px;
      gap: 6px;
      padding: 8px;
      border: 1px solid rgba(127, 153, 255, 0.3);
      border-radius: 12px;
      background: #0c132a;
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.42);
    }

    .hg-sheet-danger-button {
      border-color: rgba(255, 114, 132, 0.48) !important;
      color: #ffd6dc !important;
    }

    .hg-sheet-sync-status {
      display: inline-flex;
      width: fit-content;
      padding: 4px 9px;
      border: 1px solid rgba(105, 222, 168, 0.28);
      border-radius: 999px;
      color: #bdf3d8 !important;
      background: rgba(34, 140, 94, 0.13);
      font-size: 12px;
      font-weight: 750;
    }

    .hg-sheet-sync-status[data-sheet-save-status="preview"],
    .hg-sheet-sync-status[data-sheet-save-status="dirty"] {
      border-color: rgba(244, 216, 139, 0.35);
      color: #f4d88b !important;
      background: rgba(244, 216, 139, 0.08);
    }

    .hg-sheet-value-control,
    .hg-sheet-condition-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: end;
      margin-top: 12px;
    }

    .hg-sheet-value-control label,
    .hg-sheet-condition-controls label {
      display: grid;
      flex: 1 1 150px;
      gap: 5px;
      color: #aeb8df;
      font-size: 12px;
      font-weight: 700;
    }

    .hg-character-sheet input,
    .hg-character-sheet select {
      width: 100%;
      min-height: 38px;
      padding: 8px 10px;
      border: 1px solid rgba(127, 153, 255, 0.3);
      border-radius: 9px;
      color: #edf1ff;
      background: rgba(7, 11, 27, 0.82);
    }

    .hg-sheet-vitals-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 0.7fr);
      gap: 18px;
    }

    .hg-sheet-hp-display {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: baseline;
    }

    .hg-sheet-hp-display strong {
      color: #fff;
      font-size: clamp(36px, 7vw, 62px);
      line-height: 1;
    }

    .hg-sheet-hp-display span,
    .hg-sheet-hp-display small,
    .hg-sheet-section-kicker {
      color: #aeb8df;
    }

    .hg-sheet-hp-display small {
      flex-basis: 100%;
    }

    .hg-sheet-death-saves {
      display: grid;
      align-content: start;
      gap: 9px;
      padding: 12px;
      border: 1px solid rgba(127, 153, 255, 0.18);
      border-radius: 12px;
      background: rgba(7, 11, 27, 0.48);
    }

    .hg-sheet-death-saves h3,
    .hg-sheet-section-kicker {
      margin: 0 0 4px;
    }

    .hg-sheet-death-saves > div {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 8px;
      align-items: center;
    }

    .hg-sheet-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .hg-sheet-condition-chip {
      padding: 6px 9px !important;
      border-radius: 999px !important;
      border-color: rgba(244, 216, 139, 0.38) !important;
      color: #f9e7b6 !important;
      background: rgba(244, 216, 139, 0.09) !important;
    }

    .hg-sheet-small-control {
      justify-self: center;
      margin-top: 8px !important;
      padding: 5px 9px !important;
      font-size: 11px !important;
    }

    .hg-sheet-inventory-toolbar {
      display: grid;
      grid-template-columns: minmax(230px, 0.75fr) minmax(0, 1.5fr) auto;
      gap: 10px 14px;
      align-items: end;
      margin-bottom: 14px;
      padding: 12px;
      border: 1px solid rgba(127, 153, 255, 0.18);
      border-radius: 12px;
      background: rgba(7, 11, 27, 0.48);
    }

    .hg-sheet-inventory-toolbar label {
      display: grid;
      min-width: 0;
      gap: 5px;
    }

    .hg-sheet-inventory-toolbar label > span {
      color: #aeb8df;
      font-size: 12px;
      font-weight: 800;
    }

    .hg-sheet-inventory-toolbar p {
      align-self: center;
      color: #9fabd6;
      font-size: 12px;
      white-space: nowrap;
    }

    .hg-sheet-inventory-filters,
    .hg-sheet-inventory-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .hg-sheet-inventory-filters button {
      min-height: 34px;
      padding: 6px 10px !important;
      border-color: rgba(127, 153, 255, 0.28) !important;
      color: #dbe3ff !important;
      background: rgba(22, 31, 62, 0.82) !important;
      font-size: 11px !important;
    }

    .hg-sheet-inventory-filters button.active {
      border-color: #879cff !important;
      color: #fff !important;
      background: linear-gradient(135deg, #4b5fd8, #764bb4) !important;
    }

    .hg-sheet-inventory-sections,
    .hg-sheet-inventory-sections > section,
    .hg-sheet-inventory-list {
      display: grid;
      min-width: 0;
      gap: 10px;
    }

    .hg-sheet-inventory-sections {
      gap: 16px;
    }

    .hg-sheet-inventory-sections h3,
    .hg-sheet-container-contents h3 {
      margin: 0;
      color: #dce4ff;
      font-size: 14px;
      letter-spacing: 0.035em;
    }

    .hg-sheet-container-card,
    .hg-sheet-inventory-item {
      min-width: 0;
      padding: 12px;
      border: 1px solid rgba(127, 153, 255, 0.2);
      border-radius: 12px;
      background: rgba(7, 11, 27, 0.62);
    }

    .hg-sheet-container-card > summary,
    .hg-sheet-inventory-item > header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 7px 12px;
      align-items: center;
      min-width: 0;
    }

    .hg-sheet-container-card > summary {
      cursor: pointer;
    }

    .hg-sheet-container-card > summary > span:first-child,
    .hg-sheet-inventory-item > header > span:first-child {
      display: grid;
      min-width: 0;
      gap: 2px;
    }

    .hg-sheet-container-card > summary strong,
    .hg-sheet-inventory-item > header strong {
      color: #f2f5ff;
      overflow-wrap: anywhere;
    }

    .hg-sheet-container-card > summary small,
    .hg-sheet-inventory-item > header small {
      color: #9fabd6;
      font-size: 11px;
    }

    .hg-sheet-inventory-badges > span {
      padding: 3px 7px;
      border: 1px solid rgba(127, 153, 255, 0.22);
      border-radius: 999px;
      color: #cfd8fb;
      background: rgba(75, 95, 216, 0.12);
      font-size: 10px;
      font-weight: 800;
    }

    .hg-sheet-container-body {
      display: grid;
      gap: 10px;
      margin-top: 11px;
      padding-top: 11px;
      border-top: 1px solid rgba(127, 153, 255, 0.14);
    }

    .hg-sheet-container-contents {
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 10px;
      border-left: 3px solid rgba(135, 156, 255, 0.32);
      border-radius: 0 10px 10px 0;
      background: rgba(38, 49, 94, 0.12);
    }

    .hg-sheet-inventory-facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
      gap: 6px;
      margin: 10px 0 0;
    }

    .hg-sheet-inventory-facts > div {
      min-width: 0;
      padding: 7px 8px;
      border: 1px solid rgba(127, 153, 255, 0.12);
      border-radius: 8px;
      background: rgba(9, 14, 31, 0.56);
    }

    .hg-sheet-inventory-facts dt {
      color: #8f9ac5;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .hg-sheet-inventory-facts dd {
      margin: 2px 0 0;
      color: #e2e7fa;
      font-size: 11px;
      overflow-wrap: anywhere;
    }

    .hg-sheet-inventory-item {
      display: grid;
      gap: 9px;
    }

    .hg-sheet-item-details {
      border-top: 1px solid rgba(127, 153, 255, 0.12);
      padding-top: 7px;
    }

    .hg-sheet-item-details summary {
      width: fit-content;
      color: #9eb1ff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
    }

    .hg-sheet-item-details p {
      margin-top: 8px;
      color: #aeb8df;
      font-size: 12px;
    }

    .hg-sheet-slot-row {
      grid-template-columns: 1fr !important;
      place-items: stretch !important;
      min-width: 135px !important;
    }

    .hg-sheet-slot-row .hg-sheet-inline-actions {
      justify-content: center;
    }

    .hg-sheet-print-only {
      display: none;
    }

    @media (max-width: 850px) {
      .hg-character-sheet-header {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .hg-character-sheet-toolbar {
        grid-column: 1 / -1;
        max-width: none;
        width: 100%;
      }

      .hg-sheet-two-column {
        grid-template-columns: 1fr;
      }

      .hg-sheet-vitals-layout {
        grid-template-columns: 1fr;
      }

      .hg-sheet-inventory-toolbar {
        grid-template-columns: 1fr;
        align-items: stretch;
      }

      .hg-sheet-inventory-toolbar p {
        white-space: normal;
      }
    }

    @media (max-width: 560px) {
      .hg-character-sheet-header {
        grid-template-columns: 1fr;
        padding: 13px;
        text-align: center;
      }

      .hg-character-sheet-portrait,
      .hg-character-sheet-portrait-placeholder {
        width: 78px;
        height: 78px;
        margin: 0 auto;
      }

      .hg-character-sheet-tabs {
        position: sticky;
        top: 0;
        z-index: 5;
        flex-wrap: nowrap;
        overflow-x: auto;
        overscroll-behavior-inline: contain;
      }

      .hg-character-sheet-tab {
        flex: 0 0 auto;
        min-width: 105px;
        padding-inline: 6px !important;
      }

      .hg-sheet-stat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hg-sheet-card-grid {
        grid-template-columns: 1fr;
      }

      .hg-sheet-feature-list,
      .hg-sheet-feature-resource {
        grid-template-columns: 1fr;
      }

      .hg-sheet-feature-card > header span {
        text-align: left;
      }

      .hg-sheet-definition-list > div {
        grid-template-columns: 1fr;
        gap: 3px;
      }

      .hg-sheet-resource-row {
        grid-template-columns: 1fr;
      }

      .hg-sheet-action-card-grid {
        grid-template-columns: 1fr;
      }

      .hg-sheet-spell-library-heading,
      .hg-sheet-spell-card > header {
        grid-template-columns: 1fr;
      }

      .hg-sheet-spell-card-grid {
        grid-template-columns: 1fr;
      }

      .hg-sheet-spell-badges {
        justify-content: flex-start;
        max-width: none;
      }

      .hg-sheet-spell-filters button {
        flex: 1 1 105px;
      }

      .hg-sheet-inventory-filters button {
        flex: 1 1 105px;
      }

      .hg-sheet-inventory-facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hg-sheet-spell-facts {
        grid-template-columns: 1fr;
      }

      .hg-sheet-action-card > header,
      .hg-sheet-action-resource {
        grid-template-columns: 1fr;
      }

      .hg-sheet-action-badge {
        width: fit-content;
      }

      .hg-sheet-inline-actions {
        justify-content: stretch;
      }

      .hg-sheet-inline-actions button {
        flex: 1 1 100px;
      }

      .hg-sheet-value-control button,
      .hg-sheet-condition-controls button {
        flex: 1 1 120px;
      }

      .hg-sheet-more-menu > div {
        right: auto;
        left: 0;
      }
    }

    @media print {
      @page {
        margin: 0.45in;
      }

      body,
      .hg-character-sheet {
        color: #111 !important;
        background: #fff !important;
      }

      .hg-character-sheet {
        max-width: none;
        font-size: 10pt;
      }

      .hg-sheet-no-print,
      .hg-sheet-screen-panel {
        display: none !important;
      }

      .hg-sheet-print-only {
        display: grid !important;
        gap: 12px;
      }

      .hg-character-sheet-header,
      .hg-sheet-stat-card,
      .hg-sheet-card,
      .hg-sheet-callout,
      .hg-sheet-level-order li,
      .hg-sheet-resource-row,
      .hg-sheet-container-card,
      .hg-sheet-inventory-item,
      .hg-sheet-inventory-facts > div,
      .hg-sheet-currency-grid > div,
      .hg-sheet-slot-grid > div {
        color: #111 !important;
        border-color: #777 !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .hg-sheet-container-card > .hg-sheet-container-body,
      .hg-sheet-item-details > p {
        display: block !important;
      }

      .hg-sheet-card,
      .hg-sheet-stat-card,
      .hg-sheet-callout,
      .hg-sheet-action-section,
      .hg-sheet-action-card,
      .hg-sheet-action-resource,
      .hg-sheet-feature-card,
      .hg-sheet-feature-resource,
      .hg-sheet-container-card,
      .hg-sheet-inventory-item,
      .hg-sheet-spell-library,
      .hg-sheet-spell-card,
      .hg-sheet-resource-row,
      .hg-sheet-level-order li,
      .hg-sheet-table tr {
        break-inside: avoid;
      }

      .hg-character-sheet-heading h1,
      .hg-sheet-card h2,
      .hg-sheet-stat-card strong,
      .hg-sheet-list strong,
      .hg-sheet-definition-list dd,
      .hg-sheet-table,
      .hg-sheet-level-order strong,
      .hg-sheet-action-card > header strong,
      .hg-sheet-action-facts dd,
      .hg-sheet-action-resource strong,
      .hg-sheet-feature-card > header strong,
      .hg-sheet-feature-choices strong,
      .hg-sheet-feature-resource strong,
      .hg-sheet-container-card > summary strong,
      .hg-sheet-inventory-item > header strong,
      .hg-sheet-inventory-facts dd,
      .hg-sheet-spell-card > header strong,
      .hg-sheet-spell-facts dd,
      .hg-sheet-resource-row strong {
        color: #111 !important;
      }

      .hg-character-sheet-heading p,
      .hg-sheet-list span,
      .hg-sheet-list small,
      .hg-sheet-muted,
      .hg-sheet-definition-list dt,
      .hg-sheet-stat-card span,
      .hg-sheet-stat-card small,
      .hg-sheet-resource-row span,
      .hg-sheet-resource-row small,
      .hg-sheet-action-card > header div span,
      .hg-sheet-action-summary,
      .hg-sheet-action-empty,
      .hg-sheet-action-description p,
      .hg-sheet-action-resource span,
      .hg-sheet-feature-card > header span,
      .hg-sheet-feature-summary,
      .hg-sheet-feature-choices,
      .hg-sheet-feature-resource span,
      .hg-sheet-feature-description p,
      .hg-sheet-container-card > summary small,
      .hg-sheet-inventory-item > header small,
      .hg-sheet-inventory-facts dt,
      .hg-sheet-item-details p,
      .hg-sheet-spell-card > header > div:first-child span,
      .hg-sheet-spell-summary,
      .hg-sheet-spell-empty,
      .hg-sheet-spell-description p,
      .hg-sheet-level-order span,
      .hg-sheet-selected-rule span {
        color: #333 !important;
      }

      .hg-sheet-two-column,
      .hg-sheet-card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hg-sheet-table-wrap {
        overflow: visible;
      }

      .hg-sheet-table {
        min-width: 0;
      }
    }
  `;

  document.head.appendChild(style);
}

function resolveRoot(rootOption) {
  if (typeof document === "undefined") {
    return null;
  }

  const value = typeof rootOption === "function"
    ? rootOption()
    : rootOption;

  if (typeof value === "string") {
    return document.querySelector(value);
  }

  if (value && typeof value === "object" && "innerHTML" in value) {
    return value;
  }

  return null;
}

export function createCharacterSheetJson(character) {
  const snapshot = cloneSnapshot(
    isRecord(character)
      ? character
      : {}
  );

  if (!cleanText(snapshot.sheetType)) {
    snapshot.sheetType = "character";
  }

  return JSON.stringify(snapshot, null, 2);
}

function downloadCharacterSheetJson(character) {
  const json = createCharacterSheetJson(character);

  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof Blob === "undefined"
  ) {
    return json;
  }

  const blob = new Blob(
    [json],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename = normalizeKey(
    getName(character)
  ) || "character";

  anchor.href = url;
  anchor.download = `${filename}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return json;
}

export function createCharacterSheetView(options = {}) {
  const deps = {
    root: options.root || null,
    getCharacter: typeof options.getCharacter === "function"
      ? options.getCharacter
      : () => null,
    setStatus: typeof options.setStatus === "function"
      ? options.setStatus
      : () => {},
    onClose: typeof options.onClose === "function"
      ? options.onClose
      : () => {},
    onEdit: typeof options.onEdit === "function"
      ? options.onEdit
      : () => false,
    onDuplicate: typeof options.onDuplicate === "function"
      ? options.onDuplicate
      : () => false,
    onDelete: typeof options.onDelete === "function"
      ? options.onDelete
      : () => false,
    onGameplayAction:
      typeof options.onGameplayAction === "function"
        ? options.onGameplayAction
        : () => false,
    getSheetContext: typeof options.getSheetContext === "function"
      ? options.getSheetContext
      : () => ({}),
    onAdjustClassResource:
      typeof options.onAdjustClassResource === "function"
        ? options.onAdjustClassResource
        : () => false,
    onAdjustFeatResource:
      typeof options.onAdjustFeatResource === "function"
        ? options.onAdjustFeatResource
        : () => false,
    onAdjustHitDie:
      typeof options.onAdjustHitDie === "function"
        ? options.onAdjustHitDie
        : () => false,
    onAdjustSpellSlot:
      typeof options.onAdjustSpellSlot === "function"
        ? options.onAdjustSpellSlot
        : () => false,
    onRest: typeof options.onRest === "function"
      ? options.onRest
      : () => false,
    confirmRest:
      typeof options.confirmRest === "function"
        ? options.confirmRest
        : (message) => {
            return (
              typeof window === "undefined" ||
              typeof window.confirm !== "function" ||
              window.confirm(message)
            );
          },
    onExportJson: typeof options.onExportJson === "function"
      ? options.onExportJson
      : downloadCharacterSheetJson,
    onPrint: typeof options.onPrint === "function"
      ? options.onPrint
      : () => {
        if (
          typeof window !== "undefined" &&
          typeof window.print === "function"
        ) {
          window.print();
          return true;
        }

        return false;
      },
    onSyncLinkedToken:
      typeof options.onSyncLinkedToken === "function"
        ? options.onSyncLinkedToken
        : () => false
  };

  const state = {
    root: null,
    character: {},
    activeTab: "actions",
    inventorySearch: "",
    inventoryFilters: [],
    spellSearch: "",
    spellFilters: [],
    isOpen: false,
    isSaving: false
  };

  function renderCharacterSheetHtml(
    character = state.character,
    renderOptions = {}
  ) {
    const safeCharacter = isRecord(character) ? character : {};
    const presentation =
      buildCharacterSheetPresentation(
        safeCharacter
      );
    const classEntries = getClassEntries(safeCharacter);
    const totalLevel = getTotalLevel(safeCharacter, classEntries);
    const proficiencyBonus = getProficiencyBonus(safeCharacter, totalLevel);
    const passivePerception = getPassivePerception(
      safeCharacter,
      proficiencyBonus
    );
    const rawRequestedTab = firstText(
      renderOptions.activeTab,
      state.activeTab,
      "actions"
    ).toLowerCase();
    const requestedTab =
      rawRequestedTab === "spell"
        ? "spells"
        : rawRequestedTab === "story"
          ? "description"
          : rawRequestedTab;
    const hasSpellContent =
      characterHasSpellContent(
        safeCharacter
      );
    const tabOptions = [
      ["actions", "Actions"],
      ["abilities", "Abilities"],
      ["inventory", "Inventory"],
      ["features", "Features"],
      ...(
        hasSpellContent
          ? [["spells", "Spells"]]
          : []
      ),
      ["description", "Description"]
    ];
    const tabs = tabOptions.map(
      ([id]) => id
    );
    const activeTab = tabs.includes(
      requestedTab
    )
      ? requestedTab
      : "actions";
    const spellSearch =
      renderOptions.spellSearch ===
        undefined
        ? state.spellSearch
        : cleanText(
            renderOptions.spellSearch
          );
    const spellFilters =
      renderOptions.spellFilters ===
        undefined
        ? state.spellFilters
        : asArray(
            renderOptions.spellFilters
          );
    const inventorySearch =
      renderOptions.inventorySearch ===
        undefined
        ? state.inventorySearch
        : cleanText(
            renderOptions
              .inventorySearch
          );
    const inventoryFilters =
      renderOptions.inventoryFilters ===
        undefined
        ? state.inventoryFilters
        : asArray(
            renderOptions
              .inventoryFilters
          );
    const portraitUrl =
      presentation.portraitUrl;
    const classLine =
      presentation.classLine;
    const initial =
      presentation.initial;
    const mainSummary = {
      proficiencyBonus,
      passivePerception
    };
    const dependencyContext =
      deps.getSheetContext();
    const sheetContext = {
      ...(
        isRecord(dependencyContext)
          ? dependencyContext
          : {}
      ),
      ...(
        isRecord(renderOptions.sheetContext)
          ? renderOptions.sheetContext
          : {}
      )
    };
    const savedCharacterId = firstText(
      sheetContext.characterId,
      safeCharacter.id,
      safeCharacter.docId,
      safeCharacter.firestoreDocumentId
    );
    const canTrack = Boolean(
      savedCharacterId
    );
    mainSummary.canTrack = canTrack;
    const saveStatus = !savedCharacterId
      ? "Preview only \u2014 save this character to track gameplay"
      : state.isSaving
        ? "Saving\u2026"
        : sheetContext.dirty === true
          ? "Unsaved changes"
          : "Saved";
    const panel = requestedTab === "main"
      ? renderMainPanel(
          safeCharacter,
          mainSummary
        )
      : {
      actions: () => renderActionsPanel(
        safeCharacter,
        mainSummary
      ),
      abilities: () => renderAbilitiesPanel(
        safeCharacter,
        mainSummary
      ),
      inventory: () => renderInventoryPanel(
        safeCharacter,
        mainSummary,
        {
          search: inventorySearch,
          filters: inventoryFilters
        }
      ),
      features: () => renderFeaturesPanel(
        safeCharacter,
        mainSummary.canTrack
      ),
      spells: () => renderSpellPanel(
        safeCharacter,
        {
          search: spellSearch,
          filters: spellFilters
        }
      ),
      description: () => renderStoryPanel(
        safeCharacter
      )
    }[activeTab]();
    const returnLabel = firstText(
      sheetContext.returnLabel,
      "Back to Library"
    );

    return `
      <div class="hg-character-sheet" data-character-sheet-view="true">
        <header class="hg-character-sheet-header">
          ${portraitUrl
            ? `<img class="hg-character-sheet-portrait" src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(`${presentation.name} portrait`)}">`
            : `<div class="hg-character-sheet-portrait-placeholder" aria-hidden="true">${escapeHtml(initial)}</div>`}

          <div class="hg-character-sheet-heading">
            <h1>${escapeHtml(presentation.name)}</h1>
            <p class="hg-sheet-class-line">${escapeHtml(classLine)}</p>
            <p>
              Level ${totalLevel}
              &middot; ${escapeHtml(presentation.speciesName)}
              &middot; ${escapeHtml(presentation.backgroundName)}
            </p>
            <p
              class="hg-sheet-sync-status"
              data-linked-token-status="${savedCharacterId ? (sheetContext.dirty === true ? "dirty" : "ready") : "unsaved"}"
              data-sheet-save-status="${savedCharacterId ? (state.isSaving ? "saving" : sheetContext.dirty === true ? "dirty" : "saved") : "preview"}"
            >${escapeHtml(saveStatus)}</p>
          </div>

          <div class="hg-character-sheet-toolbar hg-sheet-no-print">
            <button
              type="button"
              data-character-sheet-action="short-rest"
            >Short Rest</button>
            <button
              type="button"
              data-character-sheet-action="long-rest"
            >Long Rest</button>
            <button
              type="button"
              data-character-sheet-action="edit"
            >Edit Character</button>
            <details class="hg-sheet-more-menu">
              <summary>More</summary>
              <div>
                <button
                  type="button"
                  data-character-sheet-action="sync-linked-token"
                  ${savedCharacterId ? "" : "disabled"}
                >Save Now</button>
                <button
                  type="button"
                  data-character-sheet-action="export-json"
                >Export JSON</button>
                <button
                  type="button"
                  data-character-sheet-action="print"
                >Print</button>
                <button
                  type="button"
                  data-character-sheet-action="duplicate"
                  ${savedCharacterId ? "" : "disabled"}
                >Duplicate</button>
                <button
                  type="button"
                  class="hg-sheet-danger-button"
                  data-character-sheet-action="delete"
                  ${savedCharacterId ? "" : "disabled"}
                >Delete</button>
              </div>
            </details>
            <button
              type="button"
              data-character-sheet-action="close"
            >${escapeHtml(returnLabel)}</button>
          </div>
        </header>

        ${canTrack ? "" : `
          <div class="hg-sheet-callout hg-sheet-no-print" role="status">
            This is a preview. Save the character before using HP, rests, slots, resources, conditions, or equipment controls.
          </div>
        `}

        <nav class="hg-character-sheet-tabs hg-sheet-no-print" aria-label="Character sheet sections">
          ${tabOptions.map(([id, label]) => `
            <button
              type="button"
              class="hg-character-sheet-tab ${activeTab === id ? "active" : ""}"
              data-character-sheet-action="tab"
              data-character-sheet-tab="${id}"
              aria-selected="${activeTab === id ? "true" : "false"}"
            >
              ${label}
            </button>
          `).join("")}
        </nav>

        <div class="hg-sheet-screen-panel">
          ${panel}
        </div>

        <div class="hg-sheet-print-only" aria-hidden="true">
          ${renderActionsPanel(safeCharacter, {
            ...mainSummary,
            canTrack: false
          })}
          ${renderAbilitiesPanel(safeCharacter, mainSummary)}
          ${renderInventoryPanel(safeCharacter, {
            ...mainSummary,
            canTrack: false
          })}
          ${renderFeaturesPanel(
            safeCharacter,
            false
          )}
          ${renderStoryPanel(safeCharacter)}
          ${hasSpellContent
            ? renderSpellPanel(
                safeCharacter
              )
            : ""}
        </div>
      </div>
    `;
  }

  function render() {
    if (!state.isOpen) {
      return "";
    }

    state.root = resolveRoot(deps.root) || state.root;

    if (!state.root) {
      deps.setStatus("Character sheet could not open because its display area is unavailable.");
      return "";
    }

    const html = renderCharacterSheetHtml(state.character, {
      activeTab: state.activeTab,
      inventorySearch:
        state.inventorySearch,
      inventoryFilters:
        state.inventoryFilters,
      spellSearch: state.spellSearch,
      spellFilters:
        state.spellFilters
    });

    state.root.innerHTML = html;
    return html;
  }

  function refreshCharacterSnapshot(result) {
    const source = isRecord(result)
      ? result
      : deps.getCharacter() || state.character;

    state.character = cloneSnapshot(source);
    return render();
  }

  function completeTrackedAction(result, successMessage) {
    state.isSaving = false;

    if (result === false) {
      deps.setStatus("That character-sheet action could not be completed.");
      render();
      return false;
    }

    refreshCharacterSnapshot(result);

    if (successMessage) {
      deps.setStatus(successMessage);
    }

    return true;
  }

  function runTrackedAction(action, successMessage) {
    try {
      const result = action();

      if (
        result &&
        typeof result.then === "function"
      ) {
        state.isSaving = true;
        render();

        result
          .then((value) => {
            completeTrackedAction(
              value,
              successMessage
            );
          })
          .catch((error) => {
            state.isSaving = false;
            console.error(
              "Character-sheet action failed.",
              error
            );
            deps.setStatus(
              error?.message ||
              "The character-sheet action failed."
            );
            render();
          });

        return true;
      }

      return completeTrackedAction(
        result,
        successMessage
      );
    } catch (error) {
      console.error(
        "Character-sheet action failed.",
        error
      );
      deps.setStatus(
        error?.message ||
        "The character-sheet action failed."
      );
      return false;
    }
  }

  function handleClick(event) {
    const button = event.target.closest("[data-character-sheet-action]");

    if (!button || !state.root?.contains(button)) {
      return;
    }

    const action = button.dataset.characterSheetAction;

    if (action === "close") {
      close();
      return;
    }

    if (action === "tab") {
      const tab = cleanText(button.dataset.characterSheetTab).toLowerCase();

      if ([
        "actions",
        "abilities",
        "inventory",
        "features",
        ...(
          characterHasSpellContent(
            state.character
          )
            ? ["spells"]
            : []
        ),
        "description"
      ].includes(tab)) {
        state.activeTab = tab;
        render();
      }

      return;
    }

    if (
      action ===
      "toggle-spell-filter"
    ) {
      const filter = normalizeKey(
        button.dataset.spellFilter
      );
      const allowedFilters = new Set(
        SPELL_FILTER_OPTIONS.map(
          ([id]) => id
        )
      );

      if (!allowedFilters.has(filter)) {
        return;
      }

      state.spellFilters =
        state.spellFilters.includes(
          filter
        )
          ? state.spellFilters.filter(
              (entry) => {
                return entry !== filter;
              }
            )
          : [
              ...state.spellFilters,
              filter
            ];
      render();
      return;
    }

    if (
      action ===
      "toggle-inventory-filter"
    ) {
      const filter = normalizeKey(
        button.dataset.inventoryFilter
      );
      const allowedFilters = new Set(
        INVENTORY_FILTER_OPTIONS.map(
          ([id]) => id
        )
      );

      if (!allowedFilters.has(filter)) {
        return;
      }

      state.inventoryFilters =
        state.inventoryFilters.includes(
          filter
        )
          ? state.inventoryFilters.filter(
              (entry) => {
                return entry !== filter;
              }
            )
          : [
              ...state.inventoryFilters,
              filter
            ];
      render();
      return;
    }

    if ([
      "damage",
      "heal",
      "set-current-hp",
      "set-temp-hp"
    ].includes(action)) {
      const input = state.root.querySelector(
        '[data-character-sheet-input="hp-amount"]'
      );

      runTrackedAction(
        () => deps.onGameplayAction({
          type: action,
          amount: finiteNumber(input?.value, 0)
        }),
        ""
      );
      return;
    }

    if (action === "toggle-inspiration") {
      runTrackedAction(
        () => deps.onGameplayAction({
          type: "toggle-inspiration"
        }),
        ""
      );
      return;
    }

    if (action === "adjust-death-save") {
      runTrackedAction(
        () => deps.onGameplayAction({
          type: "adjust-death-save",
          kind: cleanText(
            button.dataset.deathSaveKind
          ),
          delta: finiteNumber(
            button.dataset.delta,
            0
          )
        }),
        ""
      );
      return;
    }

    if (action === "reset-death-saves") {
      runTrackedAction(
        () => deps.onGameplayAction({
          type: "reset-death-saves"
        }),
        ""
      );
      return;
    }

    if (
      action === "toggle-condition" ||
      action === "add-standard-condition" ||
      action === "add-custom-condition"
    ) {
      const condition = action === "toggle-condition"
        ? cleanText(button.dataset.condition)
        : cleanText(
            state.root.querySelector(
              action === "add-standard-condition"
                ? '[data-character-sheet-input="standard-condition"]'
                : '[data-character-sheet-input="custom-condition"]'
            )?.value
          );

      runTrackedAction(
        () => deps.onGameplayAction({
          type: "toggle-condition",
          condition
        }),
        ""
      );
      return;
    }

    if (
      action === "toggle-item-equipped" ||
      action === "toggle-item-attuned"
    ) {
      runTrackedAction(
        () => deps.onGameplayAction({
          type: action,
          itemId: cleanText(
            button.dataset.itemId
          ),
          itemIndex: finiteNumber(
            button.dataset.itemIndex,
            -1
          )
        }),
        ""
      );
      return;
    }

    if (action === "adjust-class-resource") {
      runTrackedAction(
        () => deps.onAdjustClassResource(
          cleanText(button.dataset.resourceId),
          finiteNumber(button.dataset.delta, 0)
        ),
        "Class resource updated from the character sheet."
      );
      return;
    }

    if (action === "adjust-feat-resource") {
      runTrackedAction(
        () => deps.onAdjustFeatResource(
          cleanText(button.dataset.resourceId),
          finiteNumber(button.dataset.delta, 0)
        ),
        "Feat resource updated from the character sheet."
      );
      return;
    }

    if (action === "adjust-hit-die") {
      runTrackedAction(
        () => deps.onAdjustHitDie(
          cleanText(button.dataset.hitDieId),
          finiteNumber(button.dataset.delta, 0)
        ),
        "Hit Die usage updated from the character sheet."
      );
      return;
    }

    if (action === "adjust-spell-slot") {
      runTrackedAction(
        () => deps.onAdjustSpellSlot(
          cleanText(button.dataset.slotKind, "normal"),
          finiteNumber(button.dataset.slotLevel, 0),
          finiteNumber(button.dataset.delta, 0),
          cleanText(button.dataset.slotSourceId)
        ),
        "Spell-slot usage updated from the character sheet."
      );
      return;
    }

    if (
      action === "short-rest" ||
      action === "long-rest"
    ) {
      const restType = action === "short-rest"
        ? "shortRest"
        : "longRest";

      const confirmed =
        deps.confirmRest(
          `Take a ${action === "short-rest" ? "short" : "long"} rest and restore every matching resource?`
        );

      if (confirmed) {
        runTrackedAction(
          () => deps.onRest(restType),
          `${action === "short-rest" ? "Short" : "Long"} rest completed.`
        );
      }
      return;
    }

    if (action === "sync-linked-token") {
      runTrackedAction(
        () => deps.onSyncLinkedToken(
          state.character
        ),
        "Character saved and linked-token synchronization completed."
      );
      return;
    }

    if (action === "export-json") {
      deps.onExportJson(state.character);
      deps.setStatus("Character JSON export prepared.");
      return;
    }

    if (action === "edit") {
      deps.onEdit(state.character);
      return;
    }

    if (action === "duplicate") {
      deps.onDuplicate(state.character);
      return;
    }

    if (action === "delete") {
      deps.onDelete(state.character);
      return;
    }

    if (action === "print") {
      deps.onPrint(state.character);
      deps.setStatus("Print-friendly character sheet opened.");
    }
  }

  function handleInput(event) {
    const input = event.target.closest(
      [
        '[data-character-sheet-input="spell-search"]',
        '[data-character-sheet-input="inventory-search"]'
      ].join(", ")
    );

    if (
      !input ||
      !state.root?.contains(input)
    ) {
      return;
    }

    const inputKind = cleanText(
      input.dataset.characterSheetInput
    );

    if (
      inputKind ===
      "inventory-search"
    ) {
      state.inventorySearch =
        cleanText(input.value);
    } else {
      state.spellSearch =
        cleanText(input.value);
    }
    render();

    const replacement =
      state.root.querySelector(
        `[data-character-sheet-input="${inputKind}"]`
      );

    if (replacement) {
      replacement.focus();
      const cursor =
        replacement.value.length;
      replacement.setSelectionRange?.(
        cursor,
        cursor
      );
    }
  }

  function init() {
    ensureStyles();

    const nextRoot = resolveRoot(deps.root);

    if (state.root && state.root !== nextRoot) {
      state.root.removeEventListener("click", handleClick);
      state.root.removeEventListener("input", handleInput);
    }

    state.root = nextRoot;

    if (state.root) {
      state.root.removeEventListener("click", handleClick);
      state.root.removeEventListener("input", handleInput);
      state.root.addEventListener("click", handleClick);
      state.root.addEventListener("input", handleInput);
    }

    return api;
  }

  function open(character) {
    const source = character || deps.getCharacter() || {};

    // Snapshotting is deliberate: viewing and tab changes can never mutate
    // the live Character Creator draft passed by the caller.
    state.character = cloneSnapshot(source);
    state.activeTab = "actions";
    state.inventorySearch = "";
    state.inventoryFilters = [];
    state.spellSearch = "";
    state.spellFilters = [];
    state.isOpen = true;

    init();
    const html = render();

    if (html) {
      deps.setStatus("Character sheet opened.");
    }

    return state.character;
  }

  function close() {
    state.isOpen = false;

    if (state.root) {
      state.root.innerHTML = "";
    }

    deps.onClose();
    return state.character;
  }

  const api = {
    init,
    open,
    close,
    render,
    renderCharacterSheetHtml,
    refresh() {
      return refreshCharacterSnapshot(
        deps.getCharacter()
      );
    },
    getJson(character = state.character) {
      return createCharacterSheetJson(character);
    },
    exportJson(character = state.character) {
      return deps.onExportJson(character);
    }
  };

  return api;
}
