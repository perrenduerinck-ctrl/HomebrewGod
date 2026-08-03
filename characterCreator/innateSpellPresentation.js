import { escapeHtml } from "./rendering.js";

function cleanText(value, fallback = "") {
  const text = String(
    value == null ? "" : value
  ).trim();

  return text || fallback;
}

function wholeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(0, Math.round(number))
    : fallback;
}

export function formatInnateSpellRecharge(value) {
  const recharge = cleanText(value);

  return {
    longRest: "Long rest",
    shortRest: "Short rest",
    shortOrLongRest: "Short or long rest",
    none: "No recharge needed"
  }[recharge] || cleanText(
    recharge
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]+/g, " "),
    "Not recorded"
  );
}

export function getInnateSpellUsageDetails(spell) {
  const record = spell && typeof spell === "object"
    ? spell
    : {};
  const maximumUses = wholeNumber(
    record.maximumUses,
    wholeNumber(record.freeCastUses, 0)
  );
  const currentUses = Math.min(
    maximumUses,
    wholeNumber(record.currentUses, maximumUses)
  );
  const atWill = record.atWill === true;

  return {
    atWill,
    maximumUses,
    currentUses,
    usageLabel: atWill
      ? "At will"
      : maximumUses > 0
        ? `${currentUses} / ${maximumUses} free cast${maximumUses === 1 ? "" : "s"} remaining`
        : "No separate free cast recorded",
    rechargeLabel: atWill
      ? "No recharge needed"
      : formatInnateSpellRecharge(record.recharge),
    slotCastingLabel:
      record.canUseSpellSlots === true
        ? "May also use normal spell slots"
        : "Does not use normal spell slots"
  };
}

export function renderInnateSpellCards(
  spells,
  {
    emptyMessage =
      "No innate spells are currently recorded."
  } = {}
) {
  const records = Array.isArray(spells)
    ? spells
    : [];

  if (!records.length) {
    return `
      <div class="hg-character-placeholder">
        ${escapeHtml(emptyMessage)}
      </div>
    `;
  }

  return records.map((spell) => {
    const level = wholeNumber(spell?.level, 0);
    const usage = getInnateSpellUsageDetails(spell);

    return `
      <article class="hg-character-choice-card selected">
        <h3>${escapeHtml(
          cleanText(spell?.name, "Unnamed Spell")
        )}</h3>
        <p>
          <b>${escapeHtml(
            level === 0 ? "Cantrip" : `Level ${level}`
          )}</b><br>
          <b>Source:</b> ${escapeHtml(
            cleanText(
              spell?.sourceLabel ||
              spell?.sourceName ||
              spell?.source ||
              spell?.innateSource,
              "Innate magic"
            )
          )}<br>
          <b>Spellcasting Ability:</b> ${escapeHtml(
            cleanText(
              spell?.spellcastingAbility,
              "None"
            ).toUpperCase()
          )}<br>
          <b>Free Casting:</b> ${escapeHtml(
            usage.usageLabel
          )}<br>
          <b>Recharge:</b> ${escapeHtml(
            usage.rechargeLabel
          )}<br>
          <b>Spell Slots:</b> ${escapeHtml(
            usage.slotCastingLabel
          )}
        </p>
        ${spell?.summary || spell?.description
          ? `<p class="small">${escapeHtml(
              spell.summary || spell.description
            )}</p>`
          : ""}
      </article>
    `;
  }).join("");
}
