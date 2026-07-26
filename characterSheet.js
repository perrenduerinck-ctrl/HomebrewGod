// =====================================================
// HOMEBREW GOD - READ-ONLY CHARACTER SHEET VIEW
// Plain HTML/CSS/JS module. This module never mutates character data.
// =====================================================

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
      return {
        id: firstText(value.id, `${fallbackPrefix}-${index + 1}`),
        name: firstText(value.name, value.label, titleFromId(value.id, "Unnamed")),
        summary: firstText(value.summary, value.description, value.notes),
        source: firstText(value.source)
      };
    }

    return {
      id: `${fallbackPrefix}-${index + 1}`,
      name: firstText(value, "Unnamed"),
      summary: "",
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
          ${entry.source ? `<small>${escapeHtml(entry.source)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
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
        record.description,
        existing.summary
      ),
      source: firstText(record.source, existing.source)
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
  return [
    {
      title: "Class Features",
      entries: normalizeContentEntries(
        character?.features?.classFeatures,
        "class-feature"
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
    const key = firstText(attack.id, nor×N4êÚ$z{-®éÜj×v¢gƒ°¢Æ–vâÖ—FV×3¢6VçFW#°¢FF–æs¢‡ƒ°¢&÷&FW#¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã2“°¢&÷&FW"×&F—W3¢‡ƒ°¢&6¶w&÷VæC ¢&F–ÂÖw&F–VçB†6—&6ÆRBF÷ÆVgBÂ&v&ƒ“"Â"Â#SRÂã#"’ÂG&ç7&VçBCBR’À¢Æ–æV"Öw&F–VçBƒCVFVrÂ&v&ƒ‚Â#rÂSRÂã“‚’Â&v&ƒ‚Â"Â#rÂã“’’“°¢&÷‚×6†F÷s¢‡‚CG‚&v&ƒÂÂÂã2“°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×÷'G&—BÀ¢æ†rÖ6†&7FW"×6†VWB×÷'G&—B×Æ6V†öÆFW"°¢v–GFƒ¢ƒ‡ƒ°¢†V–v‡C¢ƒ‡ƒ°¢&÷&FW"×&F—W3¢gƒ°¢&÷&FW#¢‚6öÆ–B&v&ƒSÂs"Â#SRÂã3b“°¢&6¶w&÷VæC¢&v&ƒrÂÂ#rÂãs‚“°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×÷'G&—B°¢F—7Æ“¢&Æö6³°¢ö&¦V7BÖf—C¢6÷fW#°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×÷'G&—B×Æ6V†öÆFW"°¢F—7Æ“¢w&–C°¢Æ6RÖ—FV×3¢6VçFW#°¢6öÆ÷#¢6V#†Fc°¢föçB×6—¦S¢#‡ƒ°¢föçB×vV–v‡C¢ƒ°¢Ğ ¢æ†rÖ6†&7FW"×6†VWBÖ†VF–ær°¢Ö–â×v–GFƒ¢°¢Ğ ¢æ†rÖ6†&7FW"×6†VWBÖ†VF–ærƒ°¢Ö&v–ã¢Wƒ°¢föçB×6—¦S¢6Æ×ƒ#g‚ÂGgrÂC'‚“°¢Æ–æRÖ†V–v‡C¢ãS°¢Ğ ¢æ†rÖ6†&7FW"×6†VWBÖ†VF–ær°¢Ö&v–ã¢7‚°¢6öÆ÷#¢6&F3vVC°¢Ğ ¢æ†rÖ6†&7FW"×6†VWBÖ†VF–æræ†r×6†VWBÖ6Æ72ÖÆ–æR°¢6öÆ÷#¢6cFCƒ†#°¢föçB×vV–v‡C¢sS°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×F'2°¢F—7Æ“¢fÆWƒ°¢fÆW‚×w&¢w&°¢v¢‡ƒ°¢Ö&v–ã¢G‚°¢FF–æs¢‡ƒ°¢&÷&FW#¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã#"“°¢&÷&FW"×&F—W3¢Gƒ°¢&6¶w&÷VæC¢&v&ƒrÂÂ#rÂãƒ"“°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×F"°¢fÆWƒ¢3ƒ°¢Ö–â×v–GFƒ¢°¢&÷&FW#¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã#B’–×÷'FçC°¢&6¶w&÷VæC¢&v&ƒ#"Â3Âc"Âãƒ"’–×÷'FçC°¢6öÆ÷#¢6F&S6fb–×÷'FçC°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×F"æ7F—fR°¢&÷&FW"Ö6öÆ÷#¢3ƒs–6fb–×÷'FçC°¢&6¶w&÷VæC¢Æ–æV"Öw&F–VçBƒ3VFVrÂ3F#VfC‚Â3scF&#B’–×÷'FçC°¢6öÆ÷#¢6ffb–×÷'FçC°¢Ğ ¢æ†r×6†VWB×æVÂ°¢F—7Æ“¢w&–C°¢v¢Gƒ°¢Ğ ¢æ†r×6†VWB×7FBÖw&–B°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢&WVB†WFòÖf—BÂÖ–æÖ‚ƒCW‚Âg"’“°¢v¢ƒ°¢Ğ ¢æ†r×6†VWB×7FBÖ6&BÀ¢æ†r×6†VWBÖ6&BÀ¢æ†r×6†VWBÖ6ÆÆ÷WB°¢Ö–â×v–GFƒ¢°¢&÷&FW#¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã#"“°¢&÷&FW"×&F—W3¢Wƒ°¢&6¶w&÷VæC ¢&F–ÂÖw&F–VçB†6—&6ÆRBF÷ÆVgBÂ&v&ƒƒBÂ2Â#32Âã‚’ÂG&ç7&VçBSRR’À¢Æ–æV"Öw&F–VçBƒƒFVrÂ&v&ƒRÂ#"ÂCRÂã“‚’Â&v&ƒ‚Â"Â#bÂã“‚’“°¢&÷‚×6†F÷s¢‚#‡‚&v&ƒÂÂÂã#"“°¢Ğ ¢æ†r×6†VWB×7FBÖ6&B°¢F—7Æ“¢w&–C°¢Æ–vâÖ6öçFVçC¢6VçFW#°¢Ö–âÖ†V–v‡C¢ƒ°¢FF–æs¢7ƒ°¢FW‡BÖÆ–vã¢6VçFW#°¢Ğ ¢æ†r×6†VWB×7FBÖ6&B7âÀ¢æ†r×6†VWB×7FBÖ6&B6ÖÆÂ°¢6öÆ÷#¢6V#†Fc°¢föçB×6—¦S¢'ƒ°¢föçB×vV–v‡C¢sS°¢FW‡B×G&ç6f÷&Ó¢WW&66S°¢ÆWGFW"×76–æs¢ãSVVÓ°¢Ğ ¢æ†r×6†VWB×7FBÖ6&B7G&öær°¢Ö&v–â×F÷¢Wƒ°¢föçB×6—¦S¢#wƒ°¢Æ–æRÖ†V–v‡C¢ã°¢Ğ ¢æ†r×6†VWB×7FBÖ6&Bæ†r×6†VWB×7FB×FW‡B°¢föçB×6—¦S¢wƒ°¢Æ–æRÖ†V–v‡C¢ã3°¢FW‡B×G&ç6f÷&Ó¢æöæS°¢Ğ ¢æ†r×6†VWB×GvòÖ6öÇVÖâ°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢Ö–æÖ‚ƒ#s‚ÂãsVg"’Ö–æÖ‚ƒÂãSVg"“°¢v¢Gƒ°¢Æ–vâÖ—FV×3¢7F'C°¢Ğ ¢æ†r×6†VWB×GvòÖ6öÇVÖââF—b°¢F—7Æ“¢w&–C°¢Ö–â×v–GFƒ¢°¢v¢Gƒ°¢Ğ ¢æ†r×6†VWBÖ6&B°¢FF–æs¢Gƒ°¢Ğ ¢æ†r×6†VWBÖ6&Bƒ"°¢Ö&v–ã¢ƒ°¢6öÆ÷#¢6cFCƒ†#°¢föçB×6—¦S¢wƒ°¢ÆWGFW"×76–æs¢ã#VVÓ°¢Ğ ¢æ†r×6†VWBÖ6&B°¢Ö&v–ã¢°¢Æ–æRÖ†V–v‡C¢ãSS°¢Ğ ¢æ†r×6†VWBÖ6&BÖw&–B°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢&WVB†WFòÖf—BÂÖ–æÖ‚ƒ#S‚Âg"’“°¢v¢Gƒ°¢Ğ ¢æ†r×6†VWB×v–FRÖ6&B°¢w&–BÖ6öÇVÖã¢òÓ°¢Ğ ¢æ†r×6†VWBÖ&–Æ—G’Öw&–B°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢&WVBƒ2ÂÖ–æÖ‚ƒÂg"’“°¢v¢‡ƒ°¢Ğ ¢æ†r×6†VWBÖ&–Æ—G’Ö&÷‚°¢F—7Æ“¢w&–C°¢Æ6RÖ—FV×3¢6VçFW#°¢Ö–â×v–GFƒ¢°¢FF–æs¢‚Wƒ°¢&÷&FW#¢‚6öÆ–B&v&ƒSÂs"Â#SRÂã#R“°¢&÷&FW"×&F—W3¢'ƒ°¢&6¶w&÷VæC¢&v&ƒ‚Â2Â3Âãsb“°¢Ğ ¢æ†r×6†VWBÖ&–Æ—G’Ö&÷‚7âÀ¢æ†r×6†VWBÖ&–Æ—G’Ö&÷‚6ÖÆÂ°¢6öÆ÷#¢6V#†Fc°¢föçB×6—¦S¢ƒ°¢föçB×vV–v‡C¢ƒ°¢Ğ ¢æ†r×6†VWBÖ&–Æ—G’Ö&÷‚7G&öær°¢FF–æs¢7‚°¢föçB×6—¦S¢#7ƒ°¢Ğ ¢æ†r×6†VWBÖ6ö×7BÖÆ—7BÀ¢æ†r×6†VWB×6¶–ÆÂÖÆ—7B°¢F—7Æ“¢w&–C°¢v¢Gƒ°¢Ğ ¢æ†r×6†VWB×6¶–ÆÂ×&÷r°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢#‚Ö–æÖ‚ƒÂg"’WFó°¢v¢gƒ°¢Æ–vâÖ—FV×3¢6VçFW#°¢Ö–â×v–GFƒ¢°¢FF–æs¢g‚7ƒ°¢&÷&FW"Ö&÷GFöÓ¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã“°¢Ğ ¢æ†r×6†VWB×6¶–ÆÂ×&÷s¦Æ7BÖ6†–ÆB°¢&÷&FW"Ö&÷GFöÓ¢°¢Ğ ¢æ†r×6†VWB×6¶–ÆÂ×&÷r6ÖÆÂ°¢Ö&v–âÖÆVgC¢Wƒ°¢6öÆ÷#¢3“–63ƒ°¢föçB×6—¦S¢ƒ°¢Ğ ¢æ†r×6†VWB×&öbÖÖ&²°¢6öÆ÷#¢3–F#fc°¢FW‡BÖÆ–vã¢6VçFW#°¢Ğ ¢æ†r×6†VWBÖÆ—7B°¢F—7Æ“¢w&–C°¢v¢—ƒ°¢Ö&v–ã¢°¢FF–æs¢°¢Æ—7B×7G–ÆS¢æöæS°¢Ğ ¢æ†r×6†VWBÖÆ—7BÆ’°¢F—7Æ“¢w&–C°¢v¢7ƒ°¢FF–ærÖ&÷GFöÓ¢—ƒ°¢&÷&FW"Ö&÷GFöÓ¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã"“°¢Ğ ¢æ†r×6†VWBÖÆ—7BÆ“¦Æ7BÖ6†–ÆB°¢FF–ærÖ&÷GFöÓ¢°¢&÷&FW"Ö&÷GFöÓ¢°¢Ğ ¢æ†r×6†VWBÖÆ—7B7âÀ¢æ†r×6†VWBÖÆ—7B6ÖÆÂÀ¢æ†r×6†VWBÖ×WFVB°¢6öÆ÷#¢6V#†Fc°¢Æ–æRÖ†V–v‡C¢ãCS°¢Ğ ¢æ†r×6†VWBÖÆ—7B6ÖÆÂ°¢föçB×6—¦S¢ƒ°¢Ğ ¢æ†r×6†VWBÖFVf–æ—F–öâÖÆ—7B°¢F—7Æ“¢w&–C°¢v¢‡ƒ°¢Ö&v–ã¢°¢Ğ ¢æ†r×6†VWBÖFVf–æ—F–öâÖÆ—7BâF—b°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢Ö–æÖ‚ƒW‚Âãfg"’Ö–æÖ‚ƒÂãFg"“°¢v¢‡ƒ°¢FF–ærÖ&÷GFöÓ¢‡ƒ°¢&÷&FW"Ö&÷GFöÓ¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã"“°¢Ğ ¢æ†r×6†VWBÖFVf–æ—F–öâÖÆ—7BâF—c¦Æ7BÖ6†–ÆB°¢FF–ærÖ&÷GFöÓ¢°¢&÷&FW"Ö&÷GFöÓ¢°¢Ğ ¢æ†r×6†VWBÖFVf–æ—F–öâÖÆ—7BGB°¢6öÆ÷#¢3–V&Cƒ°¢föçB×6—¦S¢'ƒ°¢föçB×vV–v‡C¢sS°¢Ğ ¢æ†r×6†VWBÖFVf–æ—F–öâÖÆ—7BFB°¢Ö–â×v–GFƒ¢°¢Ö&v–ã¢°¢Ğ ¢æ†r×6†VWB×F&ÆR×w&°¢v–GFƒ¢S°¢Ö‚×v–GFƒ¢S°¢÷fW&fÆ÷r×ƒ¢WFó°¢&÷&FW#¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂãB“°¢&÷&FW"×&F—W3¢ƒ°¢Ğ ¢æ†r×6†VWB×F&ÆR°¢v–GFƒ¢S°¢Ö–â×v–GFƒ¢Scƒ°¢&÷&FW"Ö6öÆÆ6S¢6öÆÆ6S°¢Ğ ¢æ†r×6†VWB×F&ÆRF‚À¢æ†r×6†VWB×F&ÆRFB°¢FF–æs¢—ƒ°¢&÷&FW"Ö&÷GFöÓ¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã"“°¢FW‡BÖÆ–vã¢ÆVgC°¢fW'F–6ÂÖÆ–vã¢F÷°¢Ğ ¢æ†r×6†VWB×F&ÆRG#¦Æ7BÖ6†–ÆBFB°¢&÷&FW"Ö&÷GFöÓ¢°¢Ğ ¢æ†r×6†VWB×F&ÆRF‚°¢6öÆ÷#¢3–V&Cƒ°¢&6¶w&÷VæC¢&v&ƒrÂÂ#rÂãs"“°¢föçB×6—¦S¢ƒ°¢FW‡B×G&ç6f÷&Ó¢WW&66S°¢ÆWGFW"×76–æs¢ãCVVÓ°¢Ğ ¢æ†r×6†VWB×F&ÆRFB6ÖÆÂ°¢F—7Æ“¢&Æö6³°¢Ö&v–â×F÷¢'ƒ°¢6öÆ÷#¢3“–63ƒ°¢Ğ ¢æ†r×6†VWBÖ7W'&Væ7’Öw&–BÀ¢æ†r×6†VWB×6Æ÷BÖw&–B°¢F—7Æ“¢w&–C°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢&WVB†WFòÖf—BÂÖ–æÖ‚ƒs‚Âg"’“°¢v¢wƒ°¢Ğ ¢æ†r×6†VWBÖ7W'&Væ7’Öw&–BâF—bÀ¢æ†r×6†VWB×6Æ÷BÖw&–BâF—b°¢F—7Æ“¢w&–C°¢Æ6RÖ—FV×3¢6VçFW#°¢v¢'ƒ°¢Ö–â×v–GFƒ¢°¢FF–æs¢—‚Wƒ°¢&÷&FW#¢‚6öÆ–B&v&ƒ#rÂS2Â#SRÂã‚“°¢&÷&FW"×&F—W3¢ƒ°¢&6¶w&÷VæC¢&v&ƒrÂÂ#rÂãc‚“°¢Ğ ¢æ†r×6†VWBÖ7W'&Væ7’Öw&–B7âÀ¢æ†r×6†VWB×6Æ÷BÖw&–B7â°¢6öÆ÷#¢3–V&Cƒ°¢föçB×6—¦S¢ƒ°¢föçB×vV–v‡C¢sS°¢FW‡B×G&ç6f÷&Ó¢WW&66S°¢Ğ ¢æ†r×6†VWBÖ6ÆÆ÷WB°¢FF–æs¢'‚Gƒ°¢&÷&FW"Ö6öÆ÷#¢&v&ƒ#CBÂ#bÂ3’Âã3"“°¢6öÆ÷#¢6C†FVcƒ°¢Ğ ¢æ†r×6†VWB×&W6W'fRÖÆ–æW2°¢v†—FR×76S¢&R×w&°¢Ğ ¢ÖVF–†Ö‚×v–GFƒ¢ƒS‚’°¢æ†rÖ6†&7FW"×6†VWBÖ†VFW"°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢WFòÖ–æÖ‚ƒÂg"“°¢Ğ ¢æ†rÖ6†&7FW"×6†VWBÖ†VFW"â'WGFöâ°¢w&–BÖ6öÇVÖã¢òÓ°¢v–GFƒ¢S°¢Ğ ¢æ†r×6†VWB×GvòÖ6öÇVÖâ°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢g#°¢Ğ¢Ğ ¢ÖVF–†Ö‚×v–GFƒ¢Sc‚’°¢æ†rÖ6†&7FW"×6†VWBÖ†VFW"°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢g#°¢FF–æs¢7ƒ°¢FW‡BÖÆ–vã¢6VçFW#°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×÷'G&—BÀ¢æ†rÖ6†&7FW"×6†VWB×÷'G&—B×Æ6V†öÆFW"°¢v–GFƒ¢s‡ƒ°¢†V–v‡C¢s‡ƒ°¢Ö&v–ã¢WFó°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×F'2°¢÷6—F–öã¢7F–6·“°¢F÷¢°¢¢Ö–æFWƒ¢S°¢Ğ ¢æ†rÖ6†&7FW"×6†VWB×F"°¢fÆW‚Ö&6—3¢6Æ2ƒ32ã332RÒg‚“°¢FF–ærÖ–æÆ–æS¢g‚–×÷'FçC°¢Ğ ¢æ†r×6†VWB×7FBÖw&–B°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢&WVBƒ"ÂÖ–æÖ‚ƒÂg"’“°¢Ğ ¢æ†r×6†VWBÖ6&BÖw&–B°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢g#°¢Ğ ¢æ†r×6†VWBÖFVf–æ—F–öâÖÆ—7BâF—b°¢w&–B×FV×ÆFRÖ6öÇVÖç3¢g#°¢v¢7ƒ°¢Ğ¢Ğ¢° ¢Fö7VÖVçBæ†VBæVæD6†–ÆB‡7G–ÆR“°§Ğ ¦gVæ7F–öâ&W6öÇfU&ö÷B‡&ö÷D÷F–öâ’°¢–b‡G—VöbFö7VÖVçBÓÓÒ'VæFVf–æVB"’°¢&WGW&âçVÆÃ°¢Ğ ¢6öç7BfÇVRÒG—Vöb&ö÷D÷F–öâÓÓÒ&gVæ7F–öâ ¢ò&ö÷D÷F–öâ‚¢¢&ö÷D÷F–öã° ¢–b‡G—VöbfÇVRÓÓÒ'7G&–ær"’°¢&WGW&âFö7VÖVçBçVW'•6VÆV7F÷"‡fÇVR“°¢Ğ ¢–b‡fÇVRbbG—VöbfÇVRÓÓÒ&ö&¦V7B"bb&–ææW$…DÔÂ"–âfÇVR’°¢&WGW&âfÇVS°¢Ğ ¢&WGW&âçVÆÃ°§Ğ ¦W‡÷'BgVæ7F–öâ7&VFT6†&7FW%6†VWEf–Wr†÷F–öç2Ò·Ò’°¢6öç7BFW2Ò°¢&ö÷C¢÷F–öç2ç&ö÷BÇÂçVÆÂÀ¢vWD6†&7FW#¢G—Vöb÷F–öç2ævWD6†&7FW"ÓÓÒ&gVæ7F–öâ ¢ò÷F–öç2ævWD6†&7FW ¢¢‚’ÓâçVÆÂÀ¢6WE7FGW3¢G—Vöb÷F–öç2ç6WE7FGW2ÓÓÒ&gVæ7F–öâ ¢ò÷F–öç2ç6WE7FGW0¢¢‚’Óâ·ÒÀ¢öä6Æ÷6S¢G—Vöb÷F–öç2æöä6Æ÷6RÓÓÒ&gVæ7F–öâ ¢ò÷F–öç2æöä6Æ÷6P¢¢‚’Óâ·Ğ¢Ó° ¢6öç7B7FFRÒ°¢&ö÷C¢çVÆÂÀ¢6†&7FW#¢·ÒÀ¢7F—fUF#¢&Ö–â"À¢—4÷Vã¢fÇ6P¢Ó° ¢gVæ7F–öâ&VæFW$6†&7FW%6†VWD‡FÖÂ€¢6†&7FW"Ò7FFRæ6†&7FW"À¢&VæFW$÷F–öç2Ò·Ğ¢’°¢6öç7B6fT6†&7FW"Ò—5&V6÷&B†6†&7FW"’ò6†&7FW"¢·Ó°¢6öç7B6Æ74VçG&–W2ÒvWD6Æ74VçG&–W2‡6fT6†&7FW"“°¢6öç7BF÷FÄÆWfVÂÒvWEF÷FÄÆWfVÂ‡6fT6†&7FW"Â6Æ74VçG&–W2“°¢6öç7B&öf–6–Væ7”&öçW2ÒvWE&öf–6–Væ7”&öçW2‡6fT6†&7FW"ÂF÷FÄÆWfVÂ“°¢6öç7B76—fUW&6WF–öâÒvWE76—fUW&6WF–öâ€¢6fT6†&7FW"À¢&öf–6–Væ7”&öçW0¢“°¢6öç7B&WVW7FVEF"Òf—'7EFW‡B€¢&VæFW$÷F–öç2æ7F—fUF"À¢7FFRæ7F—fUF"À¢&Ö–â ¢’çFôÆ÷vW$66R‚“°¢6öç7B7F—fUF"Ò²&Ö–â"Â'7F÷'’"Â'7VÆÂ%Òæ–æ6ÇVFW2‡&WVW7FVEF"¢ò&WVW7FVEF ¢¢&Ö–â#°¢6öç7B÷'G&—EW&ÂÒ6fT–ÖvUW&Â€¢6fT6†&7FW#òæ–FVçF—G“òæ–ÖvSòçW&ÂÇÂ6fT6†&7FW#òæ–ÖvSòçW&À¢“°¢6öç7B6Æ74Æ–æRÒ6Æ74VçG&–W2æÖ†f÷&ÖD6Æ74VçG'’’æ¦ö–â‚"ò"“°¢6öç7B–æ—F–ÂÒvWDæÖR‡6fT6†&7FW"’æ6†$Bƒ’çFõWW$66R‚’ÇÂ#ò#°¢6öç7BæVÂÒ7F—fUF"ÓÓÒ'7F÷'’ ¢ò&VæFW%7F÷'•æVÂ‡6fT6†&7FW"¢¢7F—fUF"ÓÓÒ'7VÆÂ ¢ò&VæFW%7VÆÅæVÂ‡6fT6†&7FW"¢¢&VæFW$Ö–åæVÂ‡6fT6†&7FW"Â°¢&öf–6–Væ7”&öçW2À¢76—fUW&6WF–öà¢Ò“° ¢&WGW&â ¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWB"FFÖ6†&7FW"×6†VWB×f–WsÒ'G'VR#à¢Æ†VFW"6Æ73Ò&†rÖ6†&7FW"×6†VWBÖ†VFW"#à¢G·÷'G&—EW&À¢òÆ–Ör6Æ73Ò&†rÖ6†&7FW"×6†VWB×÷'G&—B"7&3Ò"G¶W66T‡FÖÂ‡÷'G&—EW&Â—Ò"ÇCÒ"G¶W66T‡FÖÂ†G¶vWDæÖR‡6fT6†&7FW"—Ò÷'G&—F—Ò#æ ¢¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWB×÷'G&—B×Æ6V†öÆFW""&–Ö†–FFVãÒ'G'VR#âG¶W66T‡FÖÂ†–æ—F–Â—ÓÂöF—cæĞ ¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWBÖ†VF–ær#à¢ÆƒâG¶W66T‡FÖÂ†vWDæÖR‡6fT6†&7FW"’—ÓÂöƒà¢Ç6Æ73Ò&†r×6†VWBÖ6Æ72ÖÆ–æR#âG¶W66T‡FÖÂ†6Æ74Æ–æR—ÓÂ÷à¢Çà¢ÆWfVÂG·F÷FÄÆWfVÇĞ¢fÖ–FF÷C²G¶W66T‡FÖÂ†vWE7V6–W4æÖR‡6fT6†&7FW"’—Ğ¢fÖ–FF÷C²G¶W66T‡FÖÂ†vWD&6¶w&÷VæDæÖR‡6fT6†&7FW"’—Ğ¢Â÷à¢ÂöF—cà ¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&6Æ÷6R ¢à¢&6²Fò7&VF÷ ¢Âö'WGFöãà¢Âö†VFW#à ¢Ææb6Æ73Ò&†rÖ6†&7FW"×6†VWB×F'2"&–ÖÆ&VÃÒ$6†&7FW"6†VWB6V7F–öç2#à¢Gµ°¢²&Ö–â"Â$Ö–â%ÒÀ¢²'7F÷'’"Â%7F÷'’%ÒÀ¢²'7VÆÂ"Â%7VÆÂ%Ğ¢ÒæÖ‚…¶–BÂÆ&VÅÒ’Óâ ¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ73Ò&†rÖ6†&7FW"×6†VWB×F"G¶7F—fUF"ÓÓÒ–Bò&7F—fR"¢"'Ò ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ'F" ¢FFÖ6†&7FW"×6†VWB×F#Ò"G¶–GÒ ¢&–×6VÆV7FVCÒ"G¶7F—fUF"ÓÓÒ–Bò'G'VR"¢&fÇ6R'Ò ¢à¢G¶Æ&VÇĞ¢Âö'WGFöãà¢’æ¦ö–â‚""—Ğ¢Âöæcà ¢G·æVÇĞ¢ÂöF—cà¢°¢Ğ ¢gVæ7F–öâ&VæFW"‚’°¢–b‚7FFRæ—4÷Vâ’°¢&WGW&â"#°¢Ğ ¢7FFRç&ö÷BÒ&W6öÇfU&ö÷B†FW2ç&ö÷B’ÇÂ7FFRç&ö÷C° ¢–b‚7FFRç&ö÷B’°¢FW2ç6WE7FGW2‚$6†&7FW"6†VWB6÷VÆBæ÷B÷Vâ&V6W6R—G2F—7Æ’&V—2Væf–Æ&ÆRâ"“°¢&WGW&â"#°¢Ğ ¢6öç7B‡FÖÂÒ&VæFW$6†&7FW%6†VWD‡FÖÂ‡7FFRæ6†&7FW"Â°¢7F—fUF#¢7FFRæ7F—fUF ¢Ò“° ¢7FFRç&ö÷Bæ–ææW$…DÔÂÒ‡FÖÃ°¢&WGW&â‡FÖÃ°¢Ğ ¢gVæ7F–öâ†æFÆT6Æ–6²†WfVçB’°¢6öç7B'WGFöâÒWfVçBçF&vWBæ6Æ÷6W7B‚%¶FFÖ6†&7FW"×6†VWBÖ7F–öåÒ"“° ¢–b‚'WGFöâÇÂ7FFRç&ö÷Còæ6öçF–ç2†'WGFöâ’’°¢&WGW&ã°¢Ğ ¢6öç7B7F–öâÒ'WGFöâæFF6WBæ6†&7FW%6†VWD7F–öã° ¢–b†7F–öâÓÓÒ&6Æ÷6R"’°¢6Æ÷6R‚“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ'F""’°¢6öç7BF"Ò6ÆVåFW‡B†'WGFöâæFF6WBæ6†&7FW%6†VWEF"’çFôÆ÷vW$66R‚“° ¢–b…²&Ö–â"Â'7F÷'’"Â'7VÆÂ%Òæ–æ6ÇVFW2‡F"’’°¢7FFRæ7F—fUF"ÒF#°¢&VæFW"‚“°¢Ğ¢Ğ¢Ğ ¢gVæ7F–öâ–æ—B‚’°¢Vç7W&U7G–ÆW2‚“° ¢6öç7BæW‡E&ö÷BÒ&W6öÇfU&ö÷B†FW2ç&ö÷B“° ¢–b‡7FFRç&ö÷Bbb7FFRç&ö÷BÓÒæW‡E&ö÷B’°¢7FFRç&ö÷Bç&VÖ÷fTWfVçDÆ—7FVæW"‚&6Æ–6²"Â†æFÆT6Æ–6²“°¢Ğ ¢7FFRç&ö÷BÒæW‡E&ö÷C° ¢–b‡7FFRç&ö÷B’°¢7FFRç&ö÷Bç&VÖ÷fTWfVçDÆ—7FVæW"‚&6Æ–6²"Â†æFÆT6Æ–6²“°¢7FFRç&ö÷BæFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â†æFÆT6Æ–6²“°¢Ğ ¢&WGW&â“°¢Ğ ¢gVæ7F–öâ÷Vâ†6†&7FW"’°¢6öç7B6÷W&6RÒ6†&7FW"ÇÂFW2ævWD6†&7FW"‚’ÇÂ·Ó° ¢òò6æ6†÷GF–ær—2FVÆ–&W&FS¢f–Wv–æræBF"6†ævW26âæWfW"×WFFP¢òòF†RÆ—fR6†&7FW"7&VF÷"G&gB76VB'’F†R6ÆÆW"à¢7FFRæ6†&7FW"Ò6ÆöæU6æ6†÷B‡6÷W&6R“°¢7FFRæ7F—fUF"Ò&Ö–â#°¢7FFRæ—4÷VâÒG'VS° ¢–æ—B‚“°¢6öç7B‡FÖÂÒ&VæFW"‚“° ¢–b†‡FÖÂ’°¢FW2ç6WE7FGW2‚%&VBÖöæÇ’6†&7FW"6†VWB÷VæVBâ"“°¢Ğ ¢&WGW&â7FFRæ6†&7FW#°¢Ğ ¢gVæ7F–öâ6Æ÷6R‚’°¢7FFRæ—4÷VâÒfÇ6S° ¢–b‡7FFRç&ö÷B’°¢7FFRç&ö÷Bæ–ææW$…DÔÂÒ"#°¢Ğ ¢FW2æöä6Æ÷6R‚“°¢&WGW&â7FFRæ6†&7FW#°¢Ğ ¢6öç7B’Ò°¢–æ—BÀ¢÷VâÀ¢6Æ÷6RÀ¢&VæFW"À¢&VæFW$6†&7FW%6†VWD‡FÖÀ¢Ó° ¢&WGW&â“°§Ğ