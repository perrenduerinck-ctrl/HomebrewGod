import { escapeHtml } from "./rendering.js";

export function renderMagicalSecretsPanels(
  rawFeatures = [],
  context = {}
) {
  const classOptions = Array.isArray(
    context.classOptions
  )
    ? context.classOptions
    : [];
  const features = rawFeatures
    .filter((feature) => {
      return (
        Array.isArray(feature?.effects)
          ? feature.effects
          : []
      ).some((effect) => {
        return effect?.type ===
          "magicalSecrets";
      });
    })
    .map((feature) => {
      const choiceKey =
        context.getChoiceKey?.(feature) ||
        feature.choiceKey ||
        feature.id ||
        "magical-secrets";
      const sourceEntry = classOptions
        .find((entry) => {
          return context.getSourceKey?.(entry) ===
            feature.classEntryId;
        });
      const selections =
        context.getSelections?.(feature) ||
        [];
      const spellNames = Object.fromEntries(
        selections.map((spellId) => {
          return [
            spellId,
            context.getSpellById?.(spellId)?.name ||
              spellId
          ];
        })
      );

      return {
        sourceId:
          `magical-secrets:${choiceKey}`,
        choiceKey,
        choiceCount:
          context.getChoiceCount?.(feature),
        selections,
        options:
          context.getOptions?.(feature) || [],
        spellNames,
        name: feature.name ||
          "Magical Secrets",
        className: feature.className ||
          "Bard",
        unlockLevel: feature.level,
        maximumSpellLevel:
          sourceEntry?.maxSpellLevel
      };
    });

  if (!features.length) {
    return "";
  }

  const panels = features.map((feature) => {
    const options = Array.isArray(feature.options)
      ? feature.options
      : [];
    const selections = Array.isArray(feature.selections)
      ? feature.selections
      : [];
    const allowedIds = new Set(
      options.map((option) => option.value)
    );
    const validSelections = selections.filter((spellId) => {
      return allowedIds.has(spellId);
    });
    const invalidSelections = selections.filter((spellId) => {
      return !allowedIds.has(spellId);
    });
    const choiceCount = Math.max(
      1,
      Number(feature.choiceCount) || 1
    );
    const remaining = Math.max(
      0,
      choiceCount - validSelections.length
    );

    return `
      <article
        class="hg-character-choice-card ${selections.length ? "selected" : ""}"
        data-cc-magical-secrets-source-id="${escapeHtml(feature.sourceId)}"
      >
        <h3>${escapeHtml(feature.name)}</h3>
        <p class="small">
          ${escapeHtml(feature.className || "Bard")}
          level ${Number(feature.unlockLevel) || 1} feature<br>
          Choose from the complete spell catalog, including spells outside
          the Bard list, up to spell level ${Number(feature.maximumSpellLevel) || 0}.
        </p>
        <p>
          <b>Selected:</b> ${validSelections.length} / ${choiceCount}
          &middot; <b>Remaining:</b> ${remaining}
        </p>
        ${invalidSelections.length ? `
          <div class="hg-character-warning">
            <b>Needs attention:</b>
            ${invalidSelections.map((spellId) => {
              return escapeHtml(
                feature.spellNames?.[spellId] || spellId
              );
            }).join(", ")}
            is no longer valid for this feature at the current Bard level.
            The selection is preserved until you replace or remove it.
          </div>
        ` : ""}
        <label class="hg-character-field">
          <span>${escapeHtml(feature.name)} spell choices</span>
          <select
            multiple
            size="10"
            data-cc-class-feature-select="true"
            data-feature-key="${escapeHtml(feature.choiceKey)}"
            data-choice-limit="${choiceCount}"
          >
            ${invalidSelections.map((spellId) => `
              <option value="${escapeHtml(spellId)}" selected disabled>
                ${escapeHtml(feature.spellNames?.[spellId] || spellId)} (currently unavailable)
              </option>
            `).join("")}
            ${options.map((option) => `
              <option
                value="${escapeHtml(option.value)}"
                ${selections.includes(option.value) ? "selected" : ""}
              >${escapeHtml(option.label)}</option>
            `).join("")}
          </select>
        </label>
        <p class="small">
          These spells count as Bard spells, use Charisma, are known, and may
          be cast with the Bard's normal spell slots.
        </p>
      </article>
    `;
  }).join("");

  return `
    <h3>Magical Secrets</h3>
    <p class="small">
      Each unlocked Magical Secrets feature is saved separately so leveling
      and Additional Magical Secrets do not overwrite one another.
    </p>
    <div class="hg-character-choice-grid" data-cc-magical-secrets-panel="true">
      ${panels}
    </div>
    <hr>
  `;
}
