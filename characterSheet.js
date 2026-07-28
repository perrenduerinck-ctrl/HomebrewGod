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
        value.notes
      );
      const description = firstText(
        value.description,
        value.fullDescription
      );

      return {
        id: firstText(value.id, `${fallbackPrefix}-${index + 1}`),
        name: firstText(value.name, value.label, titleFromId(value.id, "Unnamed")),
        summary: firstText(summary, description),
        description:
          description && description !== summary
            ? description
            : "",
        choices: firstText(value.choicesText),
        source: firstText(
          value.sourceLabel,
          value.sourceName,
          value.source
        )
      };
    }

    return {
      id: `${fallbackPrefix}-${index + 1}`,
      name: firstText(value, "Unnamed"),
      summary: "",
      description: "",
      choices: "",
      source: ""
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
    cleanText(entry?.summary),
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
    summary: details.join(". "),
    source: cleanText(entry?.featName)
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
        ? [`${titleFromId(key)}: ${values.join(", ")}`]
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
      choices: firstText(
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

function getFeatureGroups(character) {
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

  return [
    {
      title: "Class Features",
      entries: normalizeContentEntries(
        baseClassFeatures,
        "class-feature"
      )
    },
    {
      title: "Subclass Features",
      entries: normalizeContentEntries(
        subclassFeatures,
        "subclass-feature"
      )
    },
    {
      title: "Species Traits",
      entries: normalizeContentEntries(
        character?.features?.speciesTraits?.length
          ? character.features.speciesTraits
          : character?.species?.traits,
        "species-trait"
      )
    },
    {
      title: "Background Features",
      entries: normalizeContentEntries(
        character?.features?.backgroundFeatures,
        "background-feature"
      )
    },
    {
      title: "Custom Features",
      entries: normalizeContentEntries(
        character?.features?.customFeatures,
        "custom-feature"
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

function renderEquipment(character, options = {}) {
  const items = asArray(character?.equipment?.items);
  const interactive = options.interactive === true;

  if (!items.length) {
    return `<p class="hg-sheet-muted">No equipment is recorded yet.</p>`;
  }

  const itemById = new Map(
    items.map((item) => [cleanText(item?.id), item])
  );

  return `
    <div class="hg-sheet-table-wrap">
      <table class="hg-sheet-table hg-sheet-equipment-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty.</th>
            <th>Weight</th>
            <th>Status / Location</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, itemIndex) => {
            const container = itemById.get(cleanText(item?.containerId));
            const statuses = [
              item?.equipped ? "Equipped" : "",
              item?.attuned ? "Attuned" : "",
              item?.isContainer ? "Container" : "",
              container ? `Inside ${firstText(container.name, "container")}` : "",
              item?.notes
            ].map((value) => cleanText(value)).filter(Boolean);
            const weight = optionalNumber(item?.weight);

            return `
              <tr>
                <td>
                  <details class="hg-sheet-item-details">
                    <summary>
                      <strong>${escapeHtml(firstText(item?.name, "Unnamed Item"))}</strong>
                      <small>${escapeHtml(titleFromId(item?.category, "Item"))}</small>
                    </summary>
                    <p>${escapeHtml(firstText(item?.notes, "No item notes."))}</p>
                  </details>
                </td>
                <td>${clampInteger(item?.quantity, 1, 1)}</td>
                <td>${weight === null ? "\u2014" : `${escapeHtml(weight)} lb.`}</td>
                <td>
                  <span>${escapeHtml(statuses.join(", ") || "Carried")}</span>
                  ${interactive ? `
                    <span class="hg-sheet-inline-actions hg-sheet-no-print">
                      ${item?.isContainer ? "" : `
                        <button
                          type="button"
                          data-character-sheet-action="toggle-item-equipped"
                          data-item-id="${escapeHtml(cleanText(item?.id))}"
                          data-item-index="${itemIndex}"
                          ${cleanText(item?.containerId) ? "disabled" : ""}
                        >${item?.equipped ? "Unequip" : "Equip"}</button>
                      `}
                      ${item?.isMagical && item?.requiresAttunement ? `
                        <button
                          type="button"
                          data-character-sheet-action="toggle-item-attuned"
                          data-item-id="${escapeHtml(cleanText(item?.id))}"
                          data-item-index="${itemIndex}"
                        >${item?.attuned ? "Unattune" : "Attune"}</button>
                      ` : ""}
                    </span>
                  ` : ""}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
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
          ${renderContentList(featureEntries)}
        </article>
      ` : ""}

      ${defenseEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Defenses</h2>
          ${renderContentList(defenseEntries)}
        </article>
      ` : ""}

      ${senseEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Senses &amp; Communication</h2>
          ${renderContentList(senseEntries)}
        </article>
      ` : ""}

      ${elementalEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Elemental Adept</h2>
          ${renderContentList(elementalEntries)}
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
          ${renderContentList(actionEntries)}
        </article>
      ` : ""}

      ${healingEntries.length ? `
        <article class="hg-sheet-card">
          <h2>Feat Healing</h2>
          ${renderContentList(healingEntries)}
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
  const featureGroups = getFeatureGroups(character);
  const feats = getFeatEntries(character);
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

      <div class="hg-sheet-card-grid hg-sheet-feature-grid">
        ${featureGroups.map((group) => `
          <article class="hg-sheet-card">
            <h2>${escapeHtml(group.title)}</h2>
            ${renderContentList(group.entries)}
          </article>
        `).join("")}

        <article class="hg-sheet-card">
          <h2>Feats</h2>
          ${renderContentList(feats, "No feats selected.")}
        </article>
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
  const classResources = asArray(
    character?.classMechanics?.resources
  );
  const featResources = asArray(
    character?.featMechanics?.resources
  ).filter((entry) => {
    return entry?.kind !== "featSpell";
  });

  return `
    <section class="hg-sheet-panel" aria-label="Actions">
      ${renderCombatStats(character, summary)}
      <div class="hg-sheet-card-grid">
        ${renderHitPointControls(character, summary.canTrack)}
        ${renderConditions(character, summary.canTrack)}
        <article class="hg-sheet-card hg-sheet-wide-card">
          <h2>Actions &amp; Attacks</h2>
          <p class="hg-sheet-section-kicker">Weapons, natural weapons, spell attacks, and special actions</p>
          ${renderAttackTable(character, summary.proficiencyBonus)}
        </article>
        <article class="hg-sheet-card">
          <h2>Class Resources</h2>
          ${renderTrackedResources(
            classResources,
            "class",
            "No limited class resources are recorded."
          )}
        </article>
        <article class="hg-sheet-card">
          <h2>Feat &amp; Other Resources</h2>
          ${renderTrackedResources(
            featResources,
            "feat",
            "No limited feat resources are recorded."
          )}
        </article>
        <article class="hg-sheet-card">
          <h2>Hit Dice</h2>
          ${renderHitDiceByClass(character)}
        </article>
        <article class="hg-sheet-card">
          <h2>Quick Reminders</h2>
          ${renderContentList(
            getManualSituationalEntries(character),
            "No situational reminders are recorded."
          )}
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
      const weight = optionalNumber(item?.weight);
      const quantity = clampInteger(
        item?.quantity,
        1,
        1
      );

      return weight === null
        ? total
        : total + (weight * quantity);
    }, 0);
}

function renderInventoryPanel(character, summary) {
  const strength = getAbilityScore(
    character,
    "str"
  );
  const capacity = Math.max(
    0,
    Math.round(strength * 15)
  );
  const weight = getInventoryWeight(character);
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
          <strong>${capacity} lb.</strong>
        </article>
        <article class="hg-sheet-stat-card">
          <span>Encumbrance</span>
          <strong class="hg-sheet-stat-text">${weight > capacity ? "Over capacity" : "Within capacity"}</strong>
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
          interactive: summary.canTrack
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

function renderFeaturesPanel(character) {
  const featureGroups = getFeatureGroups(
    character
  );
  const feats = getFeatEntries(character);

  return `
    <section class="hg-sheet-panel" aria-label="Features">
      ${renderClassProgression(character)}
      <div class="hg-sheet-card-grid hg-sheet-feature-grid">
        ${featureGroups.map((group) => `
          <article class="hg-sheet-card">
            <h2>${escapeHtml(group.title)}</h2>
            ${renderContentList(group.entries)}
          </article>
        `).join("")}
        <article class="hg-sheet-card">
          <h2>Feats</h2>
          ${renderContentList(feats, "No feats selected.")}
        </article>
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

function collectSpellIds(source) {
  return {
    cantrips: asArray(source?.cantripIds),
    known: asArray(source?.knownSpellIds),
    prepared: asArray(source?.preparedSpellIds),
    spellbook: asArray(source?.spellbookSpellIds),
    alwaysPrepared: asArray(source?.alwaysPreparedSpellIds),
    arcanum: isRecord(source?.mysticArcanumSpellIds)
      ? Object.values(source.mysticArcanumSpellIds)
      : []
  };
}

function renderSpellNameList(values, fallback = "None recorded") {
  const names = asArray(values)
    .map((value) => {
      if (isRecord(value)) {
        return firstText(value.name, titleFromId(value.id, "Spell"));
      }

      return titleFromId(value, "Spell");
    })
    .filter(Boolean);

  return names.length ? names.join(", ") : fallback;
}

function renderSpellSource(source, fallbackKey) {
  const spells = collectSpellIds(source);
  const classLabel = firstText(
    source?.className,
    titleFromId(source?.classId || fallbackKey, "Spellcasting Source")
  );
  const subclass = firstText(source?.subclassName);

  return `
    <article class="hg-sheet-card">
      <h2>${escapeHtml(`${classLabel}${subclass ? ` \u2014 ${subclass}` : ""}`)}</h2>
      ${renderDefinitionList([
        ["Spellcasting Ability", titleFromId(source?.spellcastingAbility, "Not recorded")],
        ["Spell Save DC", optionalNumber(source?.spellSaveDc) === null ? "Not recorded" : String(source.spellSaveDc)],
        ["Spell Attack Bonus", optionalNumber(source?.spellAttackBonus) === null ? "Not recorded" : formatModifier(source.spellAttackBonus)],
        ["Cantrips", renderSpellNameList(spells.cantrips)],
        ["Known", renderSpellNameList(spells.known)],
        ["Prepared", renderSpellNameList([...spells.prepared, ...spells.alwaysPrepared])],
        ["Spellbook", renderSpellNameList(spells.spellbook)],
        ["Mystic Arcanum", renderSpellNameList(spells.arcanum)]
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

function renderSpellPanel(character) {
  const magic = isRecord(character?.magic) ? character.magic : {};
  const classSources = isRecord(magic.classSources)
    ? Object.entries(magic.classSources)
    : [];
  const innate = normalizeContentEntries(magic.innateSpells, "innate-spell");
  const custom = normalizeContentEntries(magic.customSpells, "custom-spell");
  const globalKnown = asArray(magic.knownSpellIds);
  const globalPrepared = asArray(magic.preparedSpellIds);
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
          ? classSources.map(([key, source]) => renderSpellSource(source, key)).join("")
          : `
            <article class="hg-sheet-card">
              <h2>Spellcasting</h2>
              ${renderDefinitionList([
                ["Ability", titleFromId(magic.spellcastingAbility, "Not recorded")],
                ["Save DC", optionalNumber(magic.spellSaveDc) === null ? "Not recorded" : String(magic.spellSaveDc)],
                ["Attack Bonus", optionalNumber(magic.spellAttackBonus) === null ? "Not recorded" : formatModifier(magic.spellAttackBonus)],
                ["Known Spells", renderSpellNameList(globalKnown)],
                ["Prepared Spells", renderSpellNameList(globalPrepared)]
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
          <h2>Innate Spells</h2>
          ${renderContentList(innate, "No innate spells recorded.")}
        </article>

        <article class="hg-sheet-card">
          <h2>Feat Spells</h2>
          ${renderFeatSpellResources(character)}
        </article>

        <article class="hg-sheet-card">
          <h2>Custom Spells</h2>
          ${renderContentList(custom, "No custom spells recorded.")}
        </article>

        ${cleanText(magic.notes) ? `
          <article class="hg-sheet-card">
            <h2>Spell Notes</h2>
            <p class="hg-sheet-preserve-lines">${escapeHtml(magic.notes)}</p>
          </article>
        ` : ""}
      </div>
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

    .hg-sheet-item-details summary {
      cursor: pointer;
    }

    .hg-sheet-item-details summary strong,
    .hg-sheet-item-details summary small {
      display: block;
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

      .hg-sheet-definition-list > div {
        grid-template-columns: 1fr;
        gap: 3px;
      }

      .hg-sheet-resource-row {
        grid-template-columns: 1fr;
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
      .hg-sheet-currency-grid > div,
      .hg-sheet-slot-grid > div {
        color: #111 !important;
        border-color: #777 !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .hg-sheet-card,
      .hg-sheet-stat-card,
      .hg-sheet-callout,
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
    const requestedTab = firstText(
      renderOptions.activeTab,
      state.activeTab,
      "actions"
    ).toLowerCase();
    const tabs = [
      "actions",
      "abilities",
      "inventory",
      "features",
      "spells",
      "description"
    ];
    const activeTab = tabs.includes(requestedTab)
      ? requestedTab
      : requestedTab === "spell"
        ? "spells"
        : requestedTab === "story"
          ? "description"
          : "actions";
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
        mainSummary
      ),
      features: () => renderFeaturesPanel(
        safeCharacter
      ),
      spells: () => renderSpellPanel(
        safeCharacter
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
          ${[
            ["actions", "Actions"],
            ["abilities", "Abilities"],
            ["inventory", "Inventory"],
            ["features", "Features"],
            ["spells", "Spells"],
            ["description", "Description"]
          ].map(([id, label]) => `
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
          ${renderFeaturesPanel(safeCharacter)}
          ${renderStoryPanel(safeCharacter)}
          ${renderSpellPanel(safeCharacter)}
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
      activeTab: state.activeTab
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
        "spells",
        "description"
      ].includes(tab)) {
        state.activeTab = tab;
        render();
      }

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

  function init() {
    ensureStyles();

    const nextRoot = resolveRoot(deps.root);

    if (state.root && state.root !== nextRoot) {
      state.root.removeEventListener("click", handleClick);
    }

    state.root = nextRoot;

    if (state.root) {
      state.root.removeEventListener("click", handleClick);
      state.root.addEventListener("click", handleClick);
    }

    return api;
  }

  function open(character) {
    const source = character || deps.getCharacter() || {};

    // Snapshotting is deliberate: viewing and tab changes can never mutate
    // the live Character Creator draft passed by the caller.
    state.character = cloneSnapshot(source);
    state.activeTab = "actions";
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
