import {
  EFFECT_DURATION_MODES,
  EFFECT_MODIFIER_KINDS,
  EFFECT_MODIFIER_MODES,
  EFFECT_TYPES,
  normalizeEffectModifier
} from "./effectModel.js";
import { formatEffectDuration } from "./effectDuration.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const label = (value) => String(value || "").replace(/-/g, " ")
  .replace(/\b\w/g, (character) => character.toUpperCase());

function ensureStyles(document) {
  if (document.getElementById("gameplayEffectPanelStyles")) return;
  const link = document.createElement("link");
  link.id = "gameplayEffectPanelStyles";
  link.rel = "stylesheet";
  link.href = new URL("./effectPanel.css", import.meta.url).href;
  document.head.append(link);
}

export function createEffectPanel({
  root,
  registry,
  runtime,
  getTokens = () => [],
  getIsDm = () => false,
  getRoomCode = () => "",
  getUserId = () => "",
  getContext = () => ({}),
  getAnimationOptions = () => [],
  onApply = null,
  onRemove = null
} = {}) {
  if (!root || !registry?.list || !runtime?.getSnapshot) {
    throw new Error("Effects panel requires a root, registry, and runtime.");
  }
  const document = root.ownerDocument || globalThis.document;
  ensureStyles(document);
  let customModifiers = [];
  root.innerHTML = `
    <section class="hg-gameplay-effects">
      <div class="hg-effect-intro"><div><span>GAMEPLAY STATE</span><h3>Conditions, Buffs & Debuffs</h3><p>Rules remain authoritative. Visual effects are optional and cannot block changes.</p></div></div>
      <form data-effect-form>
        <div class="hg-effect-grid">
          <label>Effect<select data-effect-field="definitionId"><option value="__custom__">Custom effect</option></select></label>
          <label>Type<select data-effect-field="type">${EFFECT_TYPES.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
          <label class="hg-effect-wide">Name<input data-effect-field="name" maxlength="120" placeholder="Blessed, slowed, marked…"></label>
          <label>Target<select required data-effect-field="targetTokenId"></select></label>
          <label>Source<select data-effect-field="sourceId"><option value="">No source</option></select></label>
          <label>Duration<select data-effect-field="durationMode">${EFFECT_DURATION_MODES.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
          <label data-duration-value>Value<input data-effect-field="durationValue" type="number" min="1" max="9999" value="1"></label>
          <label data-duration-unit>World-time unit<select data-effect-field="durationUnit"><option>minutes</option><option>seconds</option><option>hours</option><option>days</option></select></label>
        </div>
        <details class="hg-effect-advanced"><summary>Custom modifiers and animation IDs</summary>
          <div class="hg-effect-modifier-builder">
            <label>Modifier<select data-effect-modifier="kind">${EFFECT_MODIFIER_KINDS.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
            <label>Mode<select data-effect-modifier="mode">${EFFECT_MODIFIER_MODES.map((value) => `<option value="${value}">${label(value)}</option>`).join("")}</select></label>
            <label>Value<input data-effect-modifier="value" type="number" value="0"></label>
            <label>Ability / damage type<input data-effect-modifier="qualifier" maxlength="40"></label>
            <button type="button" data-effect-action="add-modifier">Add modifier</button>
          </div>
          <div data-effect-modifier-list></div>
          <datalist data-effect-animation-list></datalist>
          <div class="hg-effect-grid">
            <label>Start animation<input list="gameplayEffectAnimationIds" data-effect-field="startAnimationId" maxlength="180"></label>
            <label>Sustain animation<input list="gameplayEffectAnimationIds" data-effect-field="sustainAnimationId" maxlength="180"></label>
            <label>End animation<input list="gameplayEffectAnimationIds" data-effect-field="endAnimationId" maxlength="180"></label>
          </div>
        </details>
        <button class="hg-effect-apply" type="submit">Apply Effect</button>
        <p class="hg-effect-status" role="status" data-effect-status></p>
      </form>
      <div class="hg-effect-list" data-gameplay-effect-list></div>
    </section>`;

  const form = root.querySelector("[data-effect-form]");
  const field = (name) => root.querySelector(`[data-effect-field="${name}"]`);
  const status = root.querySelector("[data-effect-status]");
  const modifierList = root.querySelector("[data-effect-modifier-list]");
  const definitionSelect = field("definitionId");
  const typeSelect = field("type");
  const nameInput = field("name");
  const targetSelect = field("targetTokenId");
  const sourceSelect = field("sourceId");

  const setStatus = (message) => { status.textContent = message || ""; };

  function renderModifierList() {
    modifierList.replaceChildren(...customModifiers.map((modifier, index) => {
      const item = document.createElement("span");
      item.className = "hg-effect-modifier-chip";
      item.textContent = `${label(modifier.kind)} · ${label(modifier.mode)}${modifier.value ? ` ${modifier.value}` : ""}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Remove modifier";
      remove.addEventListener("click", () => {
        customModifiers.splice(index, 1);
        renderModifierList();
      });
      item.append(remove);
      return item;
    }));
  }

  function refreshDefinitions() {
    const selected = definitionSelect.value;
    definitionSelect.innerHTML = '<option value="__custom__">Custom effect</option>' +
      registry.list().map((entry) =>
        `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("");
    definitionSelect.value = [...definitionSelect.options].some((option) => option.value === selected)
      ? selected
      : definitionSelect.options[0]?.value || "__custom__";
  }

  function refreshTokens() {
    const tokens = getTokens() || [];
    const selectedTarget = targetSelect.value;
    const selectedSource = sourceSelect.value;
    const options = tokens.map((token) =>
      `<option value="${escapeHtml(token.id || token.tokenId)}">${escapeHtml(token.name || "Token")}</option>`).join("");
    targetSelect.innerHTML = options || '<option value="">No tokens on this map</option>';
    sourceSelect.innerHTML = '<option value="">No source</option>' + options;
    if ([...targetSelect.options].some((option) => option.value === selectedTarget)) targetSelect.value = selectedTarget;
    if ([...sourceSelect.options].some((option) => option.value === selectedSource)) sourceSelect.value = selectedSource;
  }

  function refreshAnimations() {
    const list = root.querySelector("[data-effect-animation-list]");
    list.id = "gameplayEffectAnimationIds";
    const values = [
      "status-debuff-poison", "status-debuff-entangle", "status-debuff-sleep",
      "status-debuff-confusion", "status-debuff-shock", "status-buff-blessing",
      ...(getAnimationOptions() || []).map((entry) => entry.id || entry)
    ];
    list.innerHTML = [...new Set(values.filter(Boolean))]
      .map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
  }

  function updateDefinitionFields() {
    const definition = registry.get(definitionSelect.value);
    const custom = !definition;
    nameInput.readOnly = !custom;
    typeSelect.disabled = !custom;
    if (definition) {
      nameInput.value = definition.name;
      typeSelect.value = definition.type;
      field("startAnimationId").value = definition.animation.startAnimationId || "";
      field("sustainAnimationId").value = definition.animation.sustainAnimationId || "";
      field("endAnimationId").value = definition.animation.endAnimationId || "";
    } else {
      nameInput.value = "";
      typeSelect.value = "condition";
    }
  }

  function updateDurationFields() {
    const mode = field("durationMode").value;
    root.querySelector("[data-duration-value]").hidden =
      !["rounds", "turns", "world-time"].includes(mode);
    root.querySelector("[data-duration-unit]").hidden = mode !== "world-time";
  }

  function renderActive() {
    const list = root.querySelector("[data-gameplay-effect-list]");
    const records = runtime.getSnapshot();
    if (!records.length) {
      list.innerHTML = '<p class="small">No active gameplay effects.</p>';
      return;
    }
    const tokens = new Map((getTokens() || []).map((token) => [String(token.id || token.tokenId), token]));
    list.replaceChildren(...records.map((record) => {
      const item = document.createElement("article");
      item.className = "hg-gameplay-effect-card";
      const heading = document.createElement("div");
      heading.className = "hg-effect-card-heading";
      const icon = document.createElement("span");
      icon.className = "hg-effect-card-icon";
      icon.textContent = record.icon || "◆";
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = record.name;
      const detail = document.createElement("p");
      detail.textContent = `${tokens.get(record.targetTokenId)?.name || record.targetTokenId} · ${formatEffectDuration(record.duration)}`;
      copy.append(title, detail);
      heading.append(icon, copy);
      item.append(heading);
      if (record.modifiers.length) {
        const summary = document.createElement("small");
        summary.textContent = record.modifiers.map((modifier) =>
          `${label(modifier.kind)} ${label(modifier.mode)}`).join(" · ");
        item.append(summary);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.disabled = getIsDm() !== true;
      remove.addEventListener("click", async () => {
        try {
          if (onRemove) await onRemove(record);
          else runtime.removeEffect(record.id, "manual");
          setStatus(`${record.name} removed.`);
          renderActive();
        } catch (error) {
          setStatus(error?.message || "Effect could not be removed.");
        }
      });
      item.append(remove);
      return item;
    }));
  }

  function refresh() {
    refreshDefinitions();
    refreshTokens();
    refreshAnimations();
    renderActive();
    const controls = form.querySelectorAll("input, select, button");
    controls.forEach((control) => {
      control.disabled = getIsDm() !== true;
    });
    if (getIsDm() !== true) setStatus("Room members can inspect effects. Only the DM can change them.");
    updateDurationFields();
  }

  definitionSelect.addEventListener("change", updateDefinitionFields);
  field("durationMode").addEventListener("change", updateDurationFields);
  root.querySelector('[data-effect-action="add-modifier"]').addEventListener("click", () => {
    const kind = root.querySelector('[data-effect-modifier="kind"]').value;
    const mode = root.querySelector('[data-effect-modifier="mode"]').value;
    const value = root.querySelector('[data-effect-modifier="value"]').value;
    const qualifier = root.querySelector('[data-effect-modifier="qualifier"]').value;
    const modifier = normalizeEffectModifier({
      kind, mode, value,
      ...(kind === "saving-throw" || kind === "ability-check" ? { ability: qualifier } : {}),
      ...(kind.startsWith("damage-") ? { damageType: qualifier } : {})
    });
    if (modifier) customModifiers.push(modifier);
    renderModifierList();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getIsDm() !== true) return;
    try {
      const definition = registry.get(definitionSelect.value);
      const input = {
        definitionId: definition?.id || `custom:${Date.now()}`,
        name: nameInput.value,
        type: typeSelect.value,
        icon: definition?.icon || "◆",
        roomCode: getRoomCode(),
        createdByUid: getUserId(),
        sourceId: sourceSelect.value,
        targetTokenId: targetSelect.value,
        duration: {
          mode: field("durationMode").value,
          value: Number(field("durationValue").value) || 1,
          unit: field("durationUnit").value
        },
        modifiers: customModifiers,
        animation: {
          startAnimationId: field("startAnimationId").value,
          sustainAnimationId: field("sustainAnimationId").value,
          endAnimationId: field("endAnimationId").value
        }
      };
      const applied = onApply
        ? await onApply(input, getContext())
        : runtime.applyEffect(input, getContext());
      setStatus(`${applied.name} applied.`);
      customModifiers = [];
      renderModifierList();
      renderActive();
    } catch (error) {
      setStatus(error?.message || "Effect could not be applied.");
    }
  });

  refresh();
  updateDefinitionFields();
  return Object.freeze({
    refresh,
    renderActive,
    setVisualEffects(records = []) {
      const list = root.querySelector("[data-visual-effect-list]");
      if (!list) return;
      list.innerHTML = records.length
        ? records.map((record) => `<p><strong>${escapeHtml(record.contentName || "Visual effect")}</strong> <span>${escapeHtml(formatEffectDuration(record.duration))}</span></p>`).join("")
        : '<p class="small">No presentation-only effects.</p>';
    }
  });
}
