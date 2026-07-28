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
                <span>${escapeHtml(`${entry.className} ${entry.classLevel}${entry.subclassName ? ` â€” ${entry.subclassName}` : ""}`)}</span>
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

function rendeã]µòÚ$z{-®éÜj×°¢6öç7B6fVD6†&7FW$–BÒf—'7EFW‡B€¢6†VWD6öçFW‡Bæ6†&7FW$–BÀ¢6fT6†&7FW"æ–BÀ¢6fT6†&7FW"æFö4–BÀ¢6fT6†&7FW"æf—&W7F÷&TFö7VÖVçD–@¢“°¢6öç7B6åG&6²Ò&ööÆVâ€¢6fVD6†&7FW$–@¢“°¢Ö–å7VÖÖ'’æ6åG&6²Ò6åG&6³°¢6öç7B6fU7FGW2Ò6fVD6†&7FW$–@¢ò%&Wf–WröæÇ’ÇS#B6fRF†—26†&7FW"FòG&6²vÖWÆ’ ¢¢7FFRæ—56f–æp¢ò%6f–æuÇS##b ¢¢6†VWD6öçFW‡BæF—'G’ÓÓÒG'VP¢ò%Vç6fVB6†ævW2 ¢¢%6fVB#°¢6öç7BæVÂÒ&WVW7FVEF"ÓÓÒ&Ö–â ¢ò&VæFW$Ö–åæVÂ€¢6fT6†&7FW"À¢Ö–å7VÖÖ'¢¢¢°¢7F–öç3¢‚’Óâ&VæFW$7F–öç5æVÂ€¢6fT6†&7FW"À¢Ö–å7VÖÖ'¢’À¢&–Æ—F–W3¢‚’Óâ&VæFW$&–Æ—F–W5æVÂ€¢6fT6†&7FW"À¢Ö–å7VÖÖ'¢’À¢–çfVçF÷'“¢‚’Óâ&VæFW$–çfVçF÷'•æVÂ€¢6fT6†&7FW"À¢Ö–å7VÖÖ'¢’À¢fVGW&W3¢‚’Óâ&VæFW$fVGW&W5æVÂ€¢6fT6†&7FW ¢’À¢7VÆÇ3¢‚’Óâ&VæFW%7VÆÅæVÂ€¢6fT6†&7FW ¢’À¢FW67&—F–öã¢‚’Óâ&VæFW%7F÷'•æVÂ€¢6fT6†&7FW ¢¢Õ¶7F—fUF%Ò‚“°¢6öç7B&WGW&äÆ&VÂÒf—'7EFW‡B€¢6†VWD6öçFW‡Bç&WGW&äÆ&VÂÀ¢$&6²FòÆ–'&'’ ¢“° ¢&WGW&â ¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWB"FFÖ6†&7FW"×6†VWB×f–WsÒ'G'VR#à¢Æ†VFW"6Æ73Ò&†rÖ6†&7FW"×6†VWBÖ†VFW"#à¢G·÷'G&—EW&À¢òÆ–Ör6Æ73Ò&†rÖ6†&7FW"×6†VWB×÷'G&—B"7&3Ò"G¶W66T‡FÖÂ‡÷'G&—EW&Â—Ò"ÇCÒ"G¶W66T‡FÖÂ†G·&W6VçFF–öâææÖWÒ÷'G&—F—Ò#æ ¢¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWB×÷'G&—B×Æ6V†öÆFW""&–Ö†–FFVãÒ'G'VR#âG¶W66T‡FÖÂ†–æ—F–Â—ÓÂöF—cæĞ ¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWBÖ†VF–ær#à¢ÆƒâG¶W66T‡FÖÂ‡&W6VçFF–öâææÖR—ÓÂöƒà¢Ç6Æ73Ò&†r×6†VWBÖ6Æ72ÖÆ–æR#âG¶W66T‡FÖÂ†6Æ74Æ–æR—ÓÂ÷à¢Çà¢ÆWfVÂG·F÷FÄÆWfVÇĞ¢fÖ–FF÷C²G¶W66T‡FÖÂ‡&W6VçFF–öâç7V6–W4æÖR—Ğ¢fÖ–FF÷C²G¶W66T‡FÖÂ‡&W6VçFF–öâæ&6¶w&÷VæDæÖR—Ğ¢Â÷à¢Ç ¢6Æ73Ò&†r×6†VWB×7–æ2×7FGW2 ¢FFÖÆ–æ¶VB×Fö¶Vâ×7FGW3Ò"G·6fVD6†&7FW$–Bò‡6†VWD6öçFW‡BæF—'G’ÓÓÒG'VRò&F—'G’"¢'&VG’"’¢'Vç6fVB'Ò ¢FF×6†VWB×6fR×7FGW3Ò"G·6fVD6†&7FW$–Bò‡7FFRæ—56f–ærò'6f–ær"¢6†VWD6öçFW‡BæF—'G’ÓÓÒG'VRò&F—'G’"¢'6fVB"’¢'&Wf–Wr'Ò ¢âG¶W66T‡FÖÂ‡6fU7FGW2—ÓÂ÷à¢ÂöF—cà ¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×6†VWB×FööÆ&"†r×6†VWBÖæò×&–çB#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ'6†÷'B×&W7B ¢å6†÷'B&W7CÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&Æöær×&W7B ¢äÆöær&W7CÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&VF—B ¢äVF—B6†&7FW#Âö'WGFöãà¢ÆFWF–Ç26Æ73Ò&†r×6†VWBÖÖ÷&RÖÖVçR#à¢Ç7VÖÖ'“äÖ÷&SÂ÷7VÖÖ'“à¢ÆF—cà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ'7–æ2ÖÆ–æ¶VB×Fö¶Vâ ¢G·6fVD6†&7FW$–Bò""¢&F—6&ÆVB'Ğ¢å6fRæ÷sÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&W‡÷'BÖ§6öâ ¢äW‡÷'B¥4ôãÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ'&–çB ¢å&–çCÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&GWÆ–6FR ¢G·6fVD6†&7FW$–Bò""¢&F—6&ÆVB'Ğ¢äGWÆ–6FSÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ73Ò&†r×6†VWBÖFævW"Ö'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&FVÆWFR ¢G·6fVD6†&7FW$–Bò""¢&F—6&ÆVB'Ğ¢äFVÆWFSÂö'WGFöãà¢ÂöF—cà¢ÂöFWF–Ç3à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ&6Æ÷6R ¢âG¶W66T‡FÖÂ‡&WGW&äÆ&VÂ—ÓÂö'WGFöãà¢ÂöF—cà¢Âö†VFW#à ¢G¶6åG&6²ò""¢ ¢ÆF—b6Æ73Ò&†r×6†VWBÖ6ÆÆ÷WB†r×6†VWBÖæò×&–çB"&öÆSÒ'7FGW2#à¢F†—2—2&Wf–Wrâ6fRF†R6†&7FW"&Vf÷&RW6–ær…Â&W7G2Â6Æ÷G2Â&W6÷W&6W2Â6öæF—F–öç2Â÷"WV—ÖVçB6öçG&öÇ2à¢ÂöF—cà¢Ğ ¢Ææb6Æ73Ò&†rÖ6†&7FW"×6†VWB×F'2†r×6†VWBÖæò×&–çB"&–ÖÆ&VÃÒ$6†&7FW"6†VWB6V7F–öç2#à¢Gµ°¢²&7F–öç2"Â$7F–öç2%ÒÀ¢²&&–Æ—F–W2"Â$&–Æ—F–W2%ÒÀ¢²&–çfVçF÷'’"Â$–çfVçF÷'’%ÒÀ¢²&fVGW&W2"Â$fVGW&W2%ÒÀ¢²'7VÆÇ2"Â%7VÆÇ2%ÒÀ¢²&FW67&—F–öâ"Â$FW67&—F–öâ%Ğ¢ÒæÖ‚…¶–BÂÆ&VÅÒ’Óâ ¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ73Ò&†rÖ6†&7FW"×6†VWB×F"G¶7F—fUF"ÓÓÒ–Bò&7F—fR"¢"'Ò ¢FFÖ6†&7FW"×6†VWBÖ7F–öãÒ'F" ¢FFÖ6†&7FW"×6†VWB×F#Ò"G¶–GÒ ¢&–×6VÆV7FVCÒ"G¶7F—fUF"ÓÓÒ–Bò'G'VR"¢&fÇ6R'Ò ¢à¢G¶Æ&VÇĞ¢Âö'WGFöãà¢’æ¦ö–â‚""—Ğ¢Âöæcà ¢ÆF—b6Æ73Ò&†r×6†VWB×67&VVâ×æVÂ#à¢G·æVÇĞ¢ÂöF—cà ¢ÆF—b6Æ73Ò&†r×6†VWB×&–çBÖöæÇ’"&–Ö†–FFVãÒ'G'VR#à¢G·&VæFW$7F–öç5æVÂ‡6fT6†&7FW"Â°¢ââæÖ–å7VÖÖ'’À¢6åG&6³¢fÇ6P¢Ò—Ğ¢G·&VæFW$&–Æ—F–W5æVÂ‡6fT6†&7FW"ÂÖ–å7VÖÖ'’—Ğ¢G·&VæFW$–çfVçF÷'•æVÂ‡6fT6†&7FW"Â°¢ââæÖ–å7VÖÖ'’À¢6åG&6³¢fÇ6P¢Ò—Ğ¢G·&VæFW$fVGW&W5æVÂ‡6fT6†&7FW"—Ğ¢G·&VæFW%7F÷'•æVÂ‡6fT6†&7FW"—Ğ¢G·&VæFW%7VÆÅæVÂ‡6fT6†&7FW"—Ğ¢ÂöF—cà¢ÂöF—cà¢°¢Ğ ¢gVæ7F–öâ&VæFW"‚’°¢–b‚7FFRæ—4÷Vâ’°¢&WGW&â"#°¢Ğ ¢7FFRç&ö÷BÒ&W6öÇfU&ö÷B†FW2ç&ö÷B’ÇÂ7FFRç&ö÷C° ¢–b‚7FFRç&ö÷B’°¢FW2ç6WE7FGW2‚$6†&7FW"6†VWB6÷VÆBæ÷B÷Vâ&V6W6R—G2F—7Æ’&V—2Væf–Æ&ÆRâ"“°¢&WGW&â"#°¢Ğ ¢6öç7B‡FÖÂÒ&VæFW$6†&7FW%6†VWD‡FÖÂ‡7FFRæ6†&7FW"Â°¢7F—fUF#¢7FFRæ7F—fUF ¢Ò“° ¢7FFRç&ö÷Bæ–ææW$…DÔÂÒ‡FÖÃ°¢&WGW&â‡FÖÃ°¢Ğ ¢gVæ7F–öâ&Vg&W6„6†&7FW%6æ6†÷B‡&W7VÇB’°¢6öç7B6÷W&6RÒ—5&V6÷&B‡&W7VÇB¢ò&W7VÇ@¢¢FW2ævWD6†&7FW"‚’ÇÂ7FFRæ6†&7FW#° ¢7FFRæ6†&7FW"Ò6ÆöæU6æ6†÷B‡6÷W&6R“°¢&WGW&â&VæFW"‚“°¢Ğ ¢gVæ7F–öâ6ö×ÆWFUG&6¶VD7F–öâ‡&W7VÇBÂ7V66W74ÖW76vR’°¢7FFRæ—56f–ærÒfÇ6S° ¢–b‡&W7VÇBÓÓÒfÇ6R’°¢FW2ç6WE7FGW2‚%F†B6†&7FW"×6†VWB7F–öâ6÷VÆBæ÷B&R6ö×ÆWFVBâ"“°¢&VæFW"‚“°¢&WGW&âfÇ6S°¢Ğ ¢&Vg&W6„6†&7FW%6æ6†÷B‡&W7VÇB“° ¢–b‡7V66W74ÖW76vR’°¢FW2ç6WE7FGW2‡7V66W74ÖW76vR“°¢Ğ ¢&WGW&âG'VS°¢Ğ ¢gVæ7F–öâ'VåG&6¶VD7F–öâ†7F–öâÂ7V66W74ÖW76vR’°¢G'’°¢6öç7B&W7VÇBÒ7F–öâ‚“° ¢–b€¢&W7VÇBb`¢G—Vöb&W7VÇBçF†VâÓÓÒ&gVæ7F–öâ ¢’°¢7FFRæ—56f–ærÒG'VS°¢&VæFW"‚“° ¢&W7VÇ@¢çF†Vâ‚‡fÇVR’Óâ°¢6ö×ÆWFUG&6¶VD7F–öâ€¢fÇVRÀ¢7V66W74ÖW76vP¢“°¢Ò¢æ6F6‚‚†W'&÷"’Óâ°¢7FFRæ—56f–ærÒfÇ6S°¢6öç6öÆRæW'&÷"€¢$6†&7FW"×6†VWB7F–öâf–ÆVBâ"À¢W'&÷ ¢“°¢FW2ç6WE7FGW2€¢W'&÷#òæÖW76vRÇÀ¢%F†R6†&7FW"×6†VWB7F–öâf–ÆVBâ ¢“°¢&VæFW"‚“°¢Ò“° ¢&WGW&âG'VS°¢Ğ ¢&WGW&â6ö×ÆWFUG&6¶VD7F–öâ€¢&W7VÇBÀ¢7V66W74ÖW76vP¢“°¢Ò6F6‚†W'&÷"’°¢6öç6öÆRæW'&÷"€¢$6†&7FW"×6†VWB7F–öâf–ÆVBâ"À¢W'&÷ ¢“°¢FW2ç6WE7FGW2€¢W'&÷#òæÖW76vRÇÀ¢%F†R6†&7FW"×6†VWB7F–öâf–ÆVBâ ¢“°¢&WGW&âfÇ6S°¢Ğ¢Ğ ¢gVæ7F–öâ†æFÆT6Æ–6²†WfVçB’°¢6öç7B'WGFöâÒWfVçBçF&vWBæ6Æ÷6W7B‚%¶FFÖ6†&7FW"×6†VWBÖ7F–öåÒ"“° ¢–b‚'WGFöâÇÂ7FFRç&ö÷Còæ6öçF–ç2†'WGFöâ’’°¢&WGW&ã°¢Ğ ¢6öç7B7F–öâÒ'WGFöâæFF6WBæ6†&7FW%6†VWD7F–öã° ¢–b†7F–öâÓÓÒ&6Æ÷6R"’°¢6Æ÷6R‚“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ'F""’°¢6öç7BF"Ò6ÆVåFW‡B†'WGFöâæFF6WBæ6†&7FW%6†VWEF"’çFôÆ÷vW$66R‚“° ¢–b…°¢&7F–öç2"À¢&&–Æ—F–W2"À¢&–çfVçF÷'’"À¢&fVGW&W2"À¢'7VÆÇ2"À¢&FW67&—F–öâ ¢Òæ–æ6ÇVFW2‡F"’’°¢7FFRæ7F—fUF"ÒF#°¢&VæFW"‚“°¢Ğ ¢&WGW&ã°¢Ğ ¢–b…°¢&FÖvR"À¢&†VÂ"À¢'6WBÖ7W'&VçBÖ‡"À¢'6WB×FV×Ö‡ ¢Òæ–æ6ÇVFW2†7F–öâ’’°¢6öç7B–çWBÒ7FFRç&ö÷BçVW'•6VÆV7F÷"€¢u¶FFÖ6†&7FW"×6†VWBÖ–çWCÒ&‡ÖÖ÷VçB%Òp¢“° ¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöävÖWÆ”7F–öâ‡°¢G—S¢7F–öâÀ¢Ö÷VçC¢f–æ—FTçVÖ&W"†–çWCòçfÇVRÂ¢Ò’À¢" ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ'FövvÆRÖ–ç7—&F–öâ"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöävÖWÆ”7F–öâ‡°¢G—S¢'FövvÆRÖ–ç7—&F–öâ ¢Ò’À¢" ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&F§W7BÖFVF‚×6fR"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöävÖWÆ”7F–öâ‡°¢G—S¢&F§W7BÖFVF‚×6fR"À¢¶–æC¢6ÆVåFW‡B€¢'WGFöâæFF6WBæFVF…6fT¶–æ@¢’À¢FVÇF¢f–æ—FTçVÖ&W"€¢'WGFöâæFF6WBæFVÇFÀ¢ ¢¢Ò’À¢" ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ'&W6WBÖFVF‚×6fW2"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöävÖWÆ”7F–öâ‡°¢G—S¢'&W6WBÖFVF‚×6fW2 ¢Ò’À¢" ¢“°¢&WGW&ã°¢Ğ ¢–b€¢7F–öâÓÓÒ'FövvÆRÖ6öæF—F–öâ"ÇÀ¢7F–öâÓÓÒ&FB×7FæF&BÖ6öæF—F–öâ"ÇÀ¢7F–öâÓÓÒ&FBÖ7W7FöÒÖ6öæF—F–öâ ¢’°¢6öç7B6öæF—F–öâÒ7F–öâÓÓÒ'FövvÆRÖ6öæF—F–öâ ¢ò6ÆVåFW‡B†'WGFöâæFF6WBæ6öæF—F–öâ¢¢6ÆVåFW‡B€¢7FFRç&ö÷BçVW'•6VÆV7F÷"€¢7F–öâÓÓÒ&FB×7FæF&BÖ6öæF—F–öâ ¢òu¶FFÖ6†&7FW"×6†VWBÖ–çWCÒ'7FæF&BÖ6öæF—F–öâ%Òp¢¢u¶FFÖ6†&7FW"×6†VWBÖ–çWCÒ&7W7FöÒÖ6öæF—F–öâ%Òp¢“òçfÇVP¢“° ¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöävÖWÆ”7F–öâ‡°¢G—S¢'FövvÆRÖ6öæF—F–öâ"À¢6öæF—F–öà¢Ò’À¢" ¢“°¢&WGW&ã°¢Ğ ¢–b€¢7F–öâÓÓÒ'FövvÆRÖ—FVÒÖWV—VB"ÇÀ¢7F–öâÓÓÒ'FövvÆRÖ—FVÒÖGGVæVB ¢’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöävÖWÆ”7F–öâ‡°¢G—S¢7F–öâÀ¢—FVÔ–C¢6ÆVåFW‡B€¢'WGFöâæFF6WBæ—FVÔ–@¢’À¢—FVÔ–æFWƒ¢f–æ—FTçVÖ&W"€¢'WGFöâæFF6WBæ—FVÔ–æFW‚À¢Ó¢¢Ò’À¢" ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&F§W7BÖ6Æ72×&W6÷W&6R"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöäF§W7D6Æ75&W6÷W&6R€¢6ÆVåFW‡B†'WGFöâæFF6WBç&W6÷W&6T–B’À¢f–æ—FTçVÖ&W"†'WGFöâæFF6WBæFVÇFÂ¢’À¢$6Æ72&W6÷W&6RWFFVBg&öÒF†R6†&7FW"6†VWBâ ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&F§W7BÖfVB×&W6÷W&6R"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöäF§W7DfVE&W6÷W&6R€¢6ÆVåFW‡B†'WGFöâæFF6WBç&W6÷W&6T–B’À¢f–æ—FTçVÖ&W"†'WGFöâæFF6WBæFVÇFÂ¢’À¢$fVB&W6÷W&6RWFFVBg&öÒF†R6†&7FW"6†VWBâ ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&F§W7BÖ†—BÖF–R"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöäF§W7D†—DF–R€¢6ÆVåFW‡B†'WGFöâæFF6WBæ†—DF–T–B’À¢f–æ—FTçVÖ&W"†'WGFöâæFF6WBæFVÇFÂ¢’À¢$†—BF–RW6vRWFFVBg&öÒF†R6†&7FW"6†VWBâ ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&F§W7B×7VÆÂ×6Æ÷B"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöäF§W7E7VÆÅ6Æ÷B€¢6ÆVåFW‡B†'WGFöâæFF6WBç6Æ÷D¶–æBÂ&æ÷&ÖÂ"’À¢f–æ—FTçVÖ&W"†'WGFöâæFF6WBç6Æ÷DÆWfVÂÂ’À¢f–æ—FTçVÖ&W"†'WGFöâæFF6WBæFVÇFÂ’À¢6ÆVåFW‡B†'WGFöâæFF6WBç6Æ÷E6÷W&6T–B¢’À¢%7VÆÂ×6Æ÷BW6vRWFFVBg&öÒF†R6†&7FW"6†VWBâ ¢“°¢&WGW&ã°¢Ğ ¢–b€¢7F–öâÓÓÒ'6†÷'B×&W7B"ÇÀ¢7F–öâÓÓÒ&Æöær×&W7B ¢’°¢6öç7B&W7EG—RÒ7F–öâÓÓÒ'6†÷'B×&W7B ¢ò'6†÷'E&W7B ¢¢&Æöæu&W7B#° ¢6öç7B6öæf—&ÖVBĞ¢FW2æ6öæf—&Õ&W7B€¢F¶RG¶7F–öâÓÓÒ'6†÷'B×&W7B"ò'6†÷'B"¢&Æöær'Ò&W7BæB&W7F÷&RWfW'’ÖF6†–ær&W6÷W&6Sö ¢“° ¢–b†6öæf—&ÖVB’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöå&W7B‡&W7EG—R’À¢G¶7F–öâÓÓÒ'6†÷'B×&W7B"ò%6†÷'B"¢$Æöær'Ò&W7B6ö×ÆWFVBæ ¢“°¢Ğ¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ'7–æ2ÖÆ–æ¶VB×Fö¶Vâ"’°¢'VåG&6¶VD7F–öâ€¢‚’ÓâFW2æöå7–æ4Æ–æ¶VEFö¶Vâ€¢7FFRæ6†&7FW ¢’À¢$6†&7FW"6fVBæBÆ–æ¶VB×Fö¶Vâ7–æ6‡&öæ—¦F–öâ6ö×ÆWFVBâ ¢“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&W‡÷'BÖ§6öâ"’°¢FW2æöäW‡÷'D§6öâ‡7FFRæ6†&7FW"“°¢FW2ç6WE7FGW2‚$6†&7FW"¥4ôâW‡÷'B&W&VBâ"“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&VF—B"’°¢FW2æöäVF—B‡7FFRæ6†&7FW"“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&GWÆ–6FR"’°¢FW2æöäGWÆ–6FR‡7FFRæ6†&7FW"“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ&FVÆWFR"’°¢FW2æöäFVÆWFR‡7FFRæ6†&7FW"“°¢&WGW&ã°¢Ğ ¢–b†7F–öâÓÓÒ'&–çB"’°¢FW2æöå&–çB‡7FFRæ6†&7FW"“°¢FW2ç6WE7FGW2‚%&–çBÖg&–VæFÇ’6†&7FW"6†VWB÷VæVBâ"“°¢Ğ¢Ğ ¢gVæ7F–öâ–æ—B‚’°¢Vç7W&U7G–ÆW2‚“° ¢6öç7BæW‡E&ö÷BÒ&W6öÇfU&ö÷B†FW2ç&ö÷B“° ¢–b‡7FFRç&ö÷Bbb7FFRç&ö÷BÓÒæW‡E&ö÷B’°¢7FFRç&ö÷Bç&VÖ÷fTWfVçDÆ—7FVæW"‚&6Æ–6²"Â†æFÆT6Æ–6²“°¢Ğ ¢7FFRç&ö÷BÒæW‡E&ö÷C° ¢–b‡7FFRç&ö÷B’°¢7FFRç&ö÷Bç&VÖ÷fTWfVçDÆ—7FVæW"‚&6Æ–6²"Â†æFÆT6Æ–6²“°¢7FFRç&ö÷BæFDWfVçDÆ—7FVæW"‚&6Æ–6²"Â†æFÆT6Æ–6²“°¢Ğ ¢&WGW&â“°¢Ğ ¢gVæ7F–öâ÷Vâ†6†&7FW"’°¢6öç7B6÷W&6RÒ6†&7FW"ÇÂFW2ævWD6†&7FW"‚’ÇÂ·Ó° ¢òò6æ6†÷GF–ær—2FVÆ–&W&FS¢f–Wv–æræBF"6†ævW26âæWfW"×WFFP¢òòF†RÆ—fR6†&7FW"7&VF÷"G&gB76VB'’F†R6ÆÆW"à¢7FFRæ6†&7FW"Ò6ÆöæU6æ6†÷B‡6÷W&6R“°¢7FFRæ7F—fUF"Ò&7F–öç2#°¢7FFRæ—4÷VâÒG'VS° ¢–æ—B‚“°¢6öç7B‡FÖÂÒ&VæFW"‚“° ¢–b†‡FÖÂ’°¢FW2ç6WE7FGW2‚$6†&7FW"6†VWB÷VæVBâ"“°¢Ğ ¢&WGW&â7FFRæ6†&7FW#°¢Ğ ¢gVæ7F–öâ6Æ÷6R‚’°¢7FFRæ—4÷VâÒfÇ6S° ¢–b‡7FFRç&ö÷B’°¢7FFRç&ö÷Bæ–ææW$…DÔÂÒ"#°¢Ğ ¢FW2æöä6Æ÷6R‚“°¢&WGW&â7FFRæ6†&7FW#°¢Ğ ¢6öç7B’Ò°¢–æ—BÀ¢÷VâÀ¢6Æ÷6RÀ¢&VæFW"À¢&VæFW$6†&7FW%6†VWD‡FÖÂÀ¢&Vg&W6‚‚’°¢&WGW&â&Vg&W6„6†&7FW%6æ6†÷B€¢FW2ævWD6†&7FW"‚¢“°¢ÒÀ¢vWD§6öâ†6†&7FW"Ò7FFRæ6†&7FW"’°¢&WGW&â7&VFT6†&7FW%6†VWD§6öâ†6†&7FW"“°¢ÒÀ¢W‡÷'D§6öâ†6†&7FW"Ò7FFRæ6†&7FW"’°¢&WGW&âFW2æöäW‡÷'D§6öâ†6†&7FW"“°¢Ğ¢Ó° ¢&WGW&â“°§Ğ 