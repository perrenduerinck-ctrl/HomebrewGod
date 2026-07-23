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

  if (!rows.length) {
    return `<p class="hg-sheet-muted">No attacks are recorded yet.</p>`;
  }

  return `
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
  `;
}

function renderEquipment(character) {
  const items = asArray(character?.equipment?.items);

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
          ${items.map((item) => {
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
                  <strong>${escapeHtml(firstText(item?.name, "Unnamed Item"))}</strong>
                  <small>${escapeHtml(titleFromId(item?.category, "Item"))}</small>
                </td>
                <td>${clampInteger(item?.quantity, 1, 1)}</td>
                <td>${weight === null ? "\u2014" : `${escapeHtml(weight)} lb.`}</td>
                <td>${escapeHtml(statuses.join(", ") || "Carried")}</td>
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
          <span>${escapeHtml(denomination.toUpperCase())}</s…2634 tokens truncated…<h2>${escapeHtml(`${classLabel}${subclass ? ` \u2014 ${subclass}` : ""}`)}</h2>
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
          <div>
            <span>Level ${escapeHtml(level)}</span>
            <strong>${total - used} / ${total}</strong>
          </div>
        `;
      }).join("")}
    </div>
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

  return `
    <section class="hg-sheet-panel" aria-label="Spell character sheet">
      <div class="hg-sheet-callout">
        This is a read-only spell summary. Spell learning and preparation remain in the Character Creator.
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
          ${pactSlots ? `
            <p><strong>Pact Magic:</strong> ${pactSlots - pactUsed} / ${pactSlots} level ${clampInteger(magic?.pactMagic?.slotLevel, 0, 0)}</p>
          ` : ""}
        </article>

        <article class="hg-sheet-card">
          <h2>Innate Spells</h2>
          ${renderContentList(innate, "No innate spells recorded.")}
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

    @media (max-width: 850px) {
      .hg-character-sheet-header {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .hg-character-sheet-header > button {
        grid-column: 1 / -1;
        width: 100%;
      }

      .hg-sheet-two-column {
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
      }

      .hg-character-sheet-tab {
        flex-basis: calc(33.333% - 6px);
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
      : () => {}
  };

  const state = {
    root: null,
    character: {},
    activeTab: "main",
    isOpen: false
  };

  function renderCharacterSheetHtml(
    character = state.character,
    renderOptions = {}
  ) {
    const safeCharacter = isRecord(character) ? character : {};
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
      "main"
    ).toLowerCase();
    const activeTab = ["main", "story", "spell"].includes(requestedTab)
      ? requestedTab
      : "main";
    const portraitUrl = safeImageUrl(
      safeCharacter?.identity?.image?.url || safeCharacter?.image?.url
    );
    const classLine = classEntries.map(formatClassEntry).join(" / ");
    const initial = getName(safeCharacter).charAt(0).toUpperCase() || "?";
    const panel = activeTab === "story"
      ? renderStoryPanel(safeCharacter)
      : activeTab === "spell"
        ? renderSpellPanel(safeCharacter)
        : renderMainPanel(safeCharacter, {
          proficiencyBonus,
          passivePerception
        });

    return `
      <div class="hg-character-sheet" data-character-sheet-view="true">
        <header class="hg-character-sheet-header">
          ${portraitUrl
            ? `<img class="hg-character-sheet-portrait" src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(`${getName(safeCharacter)} portrait`)}">`
            : `<div class="hg-character-sheet-portrait-placeholder" aria-hidden="true">${escapeHtml(initial)}</div>`}

          <div class="hg-character-sheet-heading">
            <h1>${escapeHtml(getName(safeCharacter))}</h1>
            <p class="hg-sheet-class-line">${escapeHtml(classLine)}</p>
            <p>
              Level ${totalLevel}
              &middot; ${escapeHtml(getSpeciesName(safeCharacter))}
              &middot; ${escapeHtml(getBackgroundName(safeCharacter))}
            </p>
          </div>

          <button
            type="button"
            data-character-sheet-action="close"
          >
            Back to Creator
          </button>
        </header>

        <nav class="hg-character-sheet-tabs" aria-label="Character sheet sections">
          ${[
            ["main", "Main"],
            ["story", "Story"],
            ["spell", "Spell"]
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

        ${panel}
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

      if (["main", "story", "spell"].includes(tab)) {
        state.activeTab = tab;
        render();
      }
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
    state.activeTab = "main";
    state.isOpen = true;

    init();
    const html = render();

    if (html) {
      deps.setStatus("Read-only character sheet opened.");
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
    renderCharacterSheetHtml
  };

  return api;
}
