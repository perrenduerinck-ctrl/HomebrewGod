import { MAX_ANIMATION_LAYERS, ANIMATION_LAYER_PLACEMENTS } from "./animationLayers.js";

const defaults = Object.freeze({ animationId: "", startDelay: 0, duration: 0, scale: 1, opacity: 1,
  offsetX: 0, offsetY: 0, rotation: 0, blendMode: "normal", placement: "inherit", followSource: false, followTarget: false });
const clone = value => JSON.parse(JSON.stringify(value));
const numeric = new Set(["startDelay", "duration", "scale", "opacity", "offsetX", "offsetY", "rotation"]);
const checks = new Set(["followSource", "followTarget"]);
const placementNames = Object.freeze({ inherit: "Use referenced animation", source: "Caster / Source", target: "Target", between: "Midpoint", map: "World / Map position", "source-to-target": "Source to target", "source-toward-target": "Source toward target" });

export function createAnimationLayerEditor({ container, library, chooseAnimation = () => {}, changed = () => {} } = {}) {
  if (!container) return { write() {}, read: () => [], setAnimation() {}, setStartDelay() {}, destroy() {} };
  let layers = [], destroyed = false;
  const listeners = [], on = (node, event, fn) => { node.addEventListener(event, fn); listeners.push(() => node.removeEventListener(event, fn)); };
  const toDraft = layer => ({ ...defaults, ...clone(layer || {}),
    startDelay: layer?.startDelay ?? (layer?.at === undefined ? 0 : Number(layer.at) / 1000),
    placement: typeof layer?.placement === "string" ? layer.placement : layer?.placement?.spawnAt || "inherit",
    followSource: layer?.followSource === true || layer?.placement?.followSource === true,
    followTarget: layer?.followTarget === true || layer?.placement?.followTarget === true });

  function fieldMarkup(key, label, attributes = "") {
    return `<label>${label}<input data-layer-field="${key}" ${attributes}></label>`;
  }
  function syncRow(row) {
    const layer = layers[Number(row.dataset.layerIndex)];
    if (!layer) return;
    for (const node of row.querySelectorAll("[data-layer-field]")) {
      const key = node.dataset.layerField;
      layer[key] = checks.has(key) ? node.checked : numeric.has(key) ? Number(node.value) : node.value;
    }
  }
  function render() {
    if (destroyed) return;
    const fragment = document.createDocumentFragment();
    layers.forEach((layer, index) => {
      const row = document.createElement("article"); row.className = "hg-animation-layer"; row.dataset.layerIndex = String(index);
      row.innerHTML = `<div class="hg-animation-layer-heading"><div><strong>Layer ${index + 1}</strong><span data-layer-name></span></div><div class="hg-animation-layer-actions">
        <button type="button" data-layer-action="up" aria-label="Move layer ${index + 1} up">↑</button><button type="button" data-layer-action="down" aria-label="Move layer ${index + 1} down">↓</button>
        <button type="button" data-layer-action="duplicate">Duplicate Layer</button><button type="button" data-layer-action="delete">Delete Layer</button></div></div>
        <div class="hg-animation-layer-picker"><code data-layer-id></code><button type="button" data-layer-action="choose">Choose from Animation Library</button></div>
        <div class="hg-animation-form-grid">${fieldMarkup("startDelay", "Start delay (seconds)", 'type="number" min="0" max="10" step="0.05"')}${fieldMarkup("duration", "Duration (0 = animation default)", 'type="number" min="0" max="60" step="0.05"')}
        ${fieldMarkup("scale", "Scale ×", 'type="number" min="0.1" max="8" step="0.1"')}${fieldMarkup("opacity", "Opacity", 'type="number" min="0" max="1" step="0.05"')}
        ${fieldMarkup("offsetX", "Offset X (px)", 'type="number" min="-10000" max="10000" step="1"')}${fieldMarkup("offsetY", "Offset Y (px)", 'type="number" min="-10000" max="10000" step="1"')}
        ${fieldMarkup("rotation", "Rotation (degrees)", 'type="number" min="-3600" max="3600" step="1"')}
        <label>Blend mode<select data-layer-field="blendMode"><option value="normal">Normal</option><option value="screen">Screen</option><option value="plus-lighter">Additive</option><option value="multiply">Multiply</option></select></label>
        <label>Placement<select data-layer-field="placement">${ANIMATION_LAYER_PLACEMENTS.map(value => `<option value="${value}">${placementNames[value]}</option>`).join("")}</select></label></div>
        <div class="hg-animation-layer-follow"><label class="hg-animation-toggle"><input data-layer-field="followSource" type="checkbox">Follow Source</label><label class="hg-animation-toggle"><input data-layer-field="followTarget" type="checkbox">Follow Target</label></div>`;
      const definition = library.getAnimation(layer.animationId);
      row.querySelector("[data-layer-name]").textContent = definition?.name || "No animation selected";
      row.querySelector("[data-layer-id]").textContent = layer.animationId || "Animation ID required";
      for (const node of row.querySelectorAll("[data-layer-field]")) {
        const key = node.dataset.layerField;
        if (checks.has(key)) node.checked = layer[key] === true; else node.value = layer[key];
      }
      row.querySelector('[data-layer-action="up"]').disabled = index === 0;
      row.querySelector('[data-layer-action="down"]').disabled = index === layers.length - 1;
      row.querySelector('[data-layer-action="duplicate"]').disabled = layers.length >= MAX_ANIMATION_LAYERS;
      fragment.appendChild(row);
    });
    container.querySelector("[data-animation-layer-list]").replaceChildren(fragment);
    container.querySelector("[data-animation-add-layer]").disabled = layers.length >= MAX_ANIMATION_LAYERS;
    container.querySelector("[data-animation-layer-count]").textContent = `${layers.length} / ${MAX_ANIMATION_LAYERS} layers`;
    container.querySelector("[data-animation-layer-empty]").hidden = layers.length > 0;
  }
  function syncAll() { for (const row of container.querySelectorAll("[data-layer-index]")) syncRow(row); }
  on(container, "input", event => { const row = event.target.closest("[data-layer-index]"); if (row) { syncRow(row); changed(); } });
  on(container, "change", event => { const row = event.target.closest("[data-layer-index]"); if (row) { syncRow(row); changed(); } });
  on(container, "click", event => {
    const add = event.target.closest("[data-animation-add-layer]");
    if (add) { if (layers.length < MAX_ANIMATION_LAYERS) { syncAll(); layers.push({ ...defaults }); render(); changed(); } return; }
    const button = event.target.closest("[data-layer-action]"), row = button?.closest("[data-layer-index]");
    if (!button || !row) return;
    syncAll(); const index = Number(row.dataset.layerIndex), action = button.dataset.layerAction;
    if (action === "choose") { chooseAnimation(index, layers[index].animationId); return; }
    if (action === "delete") layers.splice(index, 1);
    if (action === "duplicate" && layers.length < MAX_ANIMATION_LAYERS) layers.splice(index + 1, 0, clone(layers[index]));
    if (action === "up" && index > 0) [layers[index - 1], layers[index]] = [layers[index], layers[index - 1]];
    if (action === "down" && index < layers.length - 1) [layers[index + 1], layers[index]] = [layers[index], layers[index + 1]];
    render(); changed();
  });
  render();
  return {
    write(value) { layers = (Array.isArray(value) ? value : []).slice(0, MAX_ANIMATION_LAYERS).map(toDraft); render(); },
    read() { syncAll(); return clone(layers); },
    setAnimation(index, animationId) { if (!layers[index]) return; layers[index].animationId = animationId; render(); changed(); },
    setStartDelay(index, value, { notify = true } = {}) {
      if (!layers[index]) return;
      layers[index].startDelay = value;
      const node = container.querySelector(`[data-layer-index="${index}"] [data-layer-field="startDelay"]`);
      if (node) node.value = String(value);
      if (notify) changed();
    },
    destroy() { destroyed = true; listeners.forEach(remove => remove()); layers = []; }
  };
}
