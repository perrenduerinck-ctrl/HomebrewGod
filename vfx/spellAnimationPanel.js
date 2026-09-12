import { ANIMATION_SLOTS, normalizeSpellAnimations, normalizeSpellAnimationReference } from "./animationReferences.js";
import { getAnimationSession } from "./animationWorkspace.js";
import { createBattleMapEffectEngine } from "./effectEngine.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { createAnimationSequenceController } from "./animationSequence.js";
import { createAnimationPreviewStage } from "./animationPreviewStage.js";

const title = slot => slot[0].toUpperCase() + slot.slice(1);
const optionalNumber = input => String(input?.value || "").trim() === "" ? null : Number(input.value);

export function openSpellAnimationPanel({ document = globalThis.document, animations = {}, name = "Spell" } = {}) {
  const { library, editor, isSoundEnabled, persistence } = getAnimationSession(document);
  const dialog = document.createElement("dialog");
  dialog.className = "hg-spell-animation-panel";
  dialog.setAttribute("aria-label", "Spell animations");
  dialog.innerHTML = `<div class="hg-spell-animation-heading"><div><span class="hg-animation-eyebrow">SPELL VFX SEQUENCE</span><h2>Spell animations</h2><p data-spell-animation-name></p></div><button type="button" data-spell-cancel aria-label="Close spell animations">Close</button></div>
    <p data-spell-animation-sync>Cast → Travel → Impact → Sustain → End. Empty stages are skipped.</p>
    <div class="hg-spell-animation-stage-flow" data-spell-animation-stages></div>
    <div class="hg-animation-stage-heading"><h3>Sequence Preview</h3><span>Drag Source and Target</span></div>
    <div class="hg-animation-preview hg-spell-animation-preview" data-spell-animation-preview data-background="grid">
      <div class="hg-animation-stage-line"></div>
      <button class="hg-animation-dummy hg-animation-source" data-spell-source type="button" aria-label="Source token, drag or use arrow keys"><span>S</span><small>Source</small></button>
      <button class="hg-animation-dummy hg-animation-target" data-spell-target type="button" aria-label="Target token, drag or use arrow keys"><span>T</span><small>Target</small></button>
    </div>
    <div class="hg-animation-preview-options"><label>Test distance<select data-spell-distance><option value="custom">Custom / drag anchors</option>${[5,10,30,60,120].map(value => `<option value="${value}">${value} ft</option>`).join("")}</select></label><button type="button" data-spell-swap>Swap Source / Target</button><button type="button" data-spell-reset>Reset anchors</button></div>
    <div class="hg-animation-buttons"><button type="button" class="hg-animation-primary" data-spell-play>▶ Preview all stages</button><button type="button" data-spell-stop>Stop preview</button><button type="button" data-spell-save>Use these stages</button></div>
    <p data-spell-animation-status role="status"></p>`;
  document.body.append(dialog);
  dialog.querySelector("[data-spell-animation-name]").textContent = name;
  const field = key => dialog.querySelector(`[data-spell-${key}]`);
  const status = message => { field("animation-status").textContent = message; };
  const draft = normalizeSpellAnimations(animations);
  const engine = createBattleMapEffectEngine({ surface: field("animation-preview") });
  const player = createAnimationPlayer({ engine, library, isSoundEnabled, onError: status });
  const sequence = createAnimationSequenceController({ player });
  const stage = createAnimationPreviewStage({
    surface: field("animation-preview"),
    source: field("source"),
    target: field("target"),
    swapButton: field("swap"),
    resetButton: field("reset"),
    distanceSelect: field("distance"),
    widthFeet: 150,
  });
  let closed = false, result = null, revision = 0;

  persistence?.load?.().then(state => {
    if (!closed && state?.message) field("animation-sync").textContent = `Cast → Travel → Impact → Sustain → End. ${state.message}`;
  });

  function syncDraftFromRow(row) {
    const slot = row?.dataset.spellAnimationSlot;
    if (!slot || !draft[slot]) return;
    const current = normalizeSpellAnimationReference(draft[slot]);
    // Only edited controls become overrides. Opening/saving a panel must not
    // clear base tint/flips/offsets or discard unexposed nested settings.
    current.overrides = structuredClone(row.initialOverrides || {});
    const control = key => row.querySelector(`[data-slot-${key}]`);
    const changed = key => {
      const node = control(key);
      return String(node.type === "checkbox" ? node.checked : node.value) !== node.dataset.initialValue;
    };
    for (const [key, property] of [["scale","scaleMultiplier"],["speed","speedMultiplier"],["opacity","opacityMultiplier"],["rotation","rotationOffset"],["offset-x","offsetX"],["offset-y","offsetY"],["projectile-speed","projectileSpeedMultiplier"]]) {
      if (changed(key)) current.overrides[property] = Number(control(key).value);
    }
    for (const [key, property] of [["flip-x","flipX"],["flip-y","flipY"]]) if (changed(key)) current.overrides[property] = control(key).checked;
    if (changed("tinted") || changed("tint")) current.overrides.tint = control("tinted").checked ? control("tint").value : null;
    for (const key of ["placement","direction"]) if (changed(key)) {
      const value = control(key).value;
      const nested = { ...current.overrides[key] };
      if (value) nested.mode = value; else delete nested.mode;
      if (Object.keys(nested).length) current.overrides[key] = nested; else delete current.overrides[key];
    }
    for (const [key, property] of [["fade-in","fadeIn"],["fade-out","fadeOut"]]) if (changed(key)) {
      const value = optionalNumber(control(key));
      const appearance = { ...current.overrides.appearance };
      if (value != null) appearance[property] = value; else delete appearance[property];
      if (Object.keys(appearance).length) current.overrides.appearance = appearance; else delete current.overrides.appearance;
    }
    draft[slot] = current;
  }

  function render() {
    const root = field("animation-stages");
    root.replaceChildren();
    ANIMATION_SLOTS.forEach((slot, index) => {
      const ref = normalizeSpellAnimationReference(draft[slot]);
      const animation = library.getAnimation(ref?.animationId);
      const row = document.createElement("section");
      row.className = "hg-spell-animation-stage-card";
      row.dataset.spellAnimationSlot = slot;
      row.dataset.empty = String(!ref);
      row.innerHTML = `<div class="hg-spell-animation-card-main"><div class="hg-spell-animation-thumb" data-slot-thumbnail aria-hidden="true"><span>${title(slot)[0]}</span></div><div><span class="hg-animation-eyebrow">${index + 1} · ${title(slot)}</span><h3 data-slot-name></h3><p data-slot-summary></p></div></div>
        <div class="hg-animation-buttons">${[["choose", ref ? "Replace" : "Choose / Find"],["preview","Preview"],["clear","Clear"],["remix","Duplicate / Remix"],["create","Create New"],["upload","Upload New"]].map(([key,label]) => `<button type="button" data-slot-action="${key}"${!ref && ["preview","clear","remix"].includes(key) ? " disabled" : ""}>${label}</button>`).join("")}</div>
        <details data-slot-overrides><summary>Edit Override</summary><div class="hg-spell-animation-overrides">
          <label>Scale ×<input type="number" data-slot-scale min="0.1" max="8" step="0.1" value="${ref?.overrides.scaleMultiplier ?? 1}"></label>
          <label>Speed ×<input type="number" data-slot-speed min="0.05" max="8" step="0.05" value="${ref?.overrides.speedMultiplier ?? 1}"></label>
          <label>Opacity ×<input type="number" data-slot-opacity min="0" max="1" step="0.05" value="${ref?.overrides.opacityMultiplier ?? 1}"></label>
          <label>Rotation offset<input type="number" data-slot-rotation min="-1080" max="1080" step="1" value="${ref?.overrides.rotationOffset ?? 0}"></label>
          <label>Offset X<input type="number" data-slot-offset-x min="-1000" max="1000" step="1" value="${ref?.overrides.offsetX ?? animation?.offsetX ?? 0}"></label>
          <label>Offset Y<input type="number" data-slot-offset-y min="-1000" max="1000" step="1" value="${ref?.overrides.offsetY ?? animation?.offsetY ?? 0}"></label>
          <label>Projectile speed ×<input type="number" data-slot-projectile-speed min="0.05" max="8" step="0.05" value="${ref?.overrides.projectileSpeedMultiplier ?? 1}"></label>
          <label>Fade in (seconds)<input type="number" data-slot-fade-in min="0" max="10" step="0.05" value="${ref?.overrides.appearance?.fadeIn ?? ""}"></label>
          <label>Fade out (seconds)<input type="number" data-slot-fade-out min="0" max="10" step="0.05" value="${ref?.overrides.appearance?.fadeOut ?? ""}"></label>
          <label>Placement<select data-slot-placement><option value="">Animation default</option>${["SOURCE","TARGET","SOURCE_TO_TARGET","SOURCE_TOWARD_TARGET","MIDPOINT","WORLD"].map(value => `<option value="${value}"${ref?.overrides.placement?.mode === value ? " selected" : ""}>${value.replaceAll("_", " ")}</option>`).join("")}</select></label>
          <label>Direction<select data-slot-direction><option value="">Animation default</option>${[["fixed","Fixed"],["face-target","Face target"],["face-away","Face away"],["token-facing","Token facing"]].map(([value,label]) => `<option value="${value}"${ref?.overrides.direction?.mode === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
          <label class="hg-animation-toggle"><input type="checkbox" data-slot-flip-x${ref?.overrides.flipX ? " checked" : ""}>Flip X</label><label class="hg-animation-toggle"><input type="checkbox" data-slot-flip-y${ref?.overrides.flipY ? " checked" : ""}>Flip Y</label>
          <label class="hg-animation-toggle"><input type="checkbox" data-slot-tinted${ref?.overrides.tint ? " checked" : ""}>Tint</label><input type="color" data-slot-tint value="${ref?.overrides.tint || "#ff5500"}">
        </div></details>`;
      row.querySelector("[data-slot-name]").textContent = animation?.name || (ref ? `Missing animation: ${ref.animationId}` : "No animation");
      row.querySelector("[data-slot-summary]").textContent = ref ? `${animation?.type || "Unavailable"} · ${ref.trigger || "afterPrevious"}` : "Optional stage · skipped";
      const thumbnail = row.querySelector("[data-slot-thumbnail]");
      if (animation?.sprite) {
        thumbnail.style.backgroundImage = `url(${JSON.stringify(animation.sprite).slice(1, -1)})`;
        thumbnail.classList.add("has-image");
      }
      root.append(row);
      row.initialOverrides = structuredClone(ref?.overrides || {});
      for (const [key, property] of [["flip-x","flipX"],["flip-y","flipY"]]) row.querySelector(`[data-slot-${key}]`).checked = ref?.overrides[property] ?? animation?.[property] ?? false;
      if (ref?.overrides.tint === undefined && animation?.appearance.tint) {
        row.querySelector("[data-slot-tinted]").checked = true;
        row.querySelector("[data-slot-tint]").value = animation.appearance.tint;
      }
      for (const node of row.querySelectorAll("input,select")) node.dataset.initialValue = String(node.type === "checkbox" ? node.checked : node.value);
      if (index < ANIMATION_SLOTS.length - 1) {
        const arrow = document.createElement("div");
        arrow.className = "hg-spell-animation-stage-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↓";
        root.append(arrow);
      }
    });
  }

  const context = extra => ({ ...stage.getContext({ debugPoints: true }), ...extra });
  const stop = () => { revision += 1; sequence.clear(); player.clear(); status("Preview stopped."); };

  field("animation-stages").addEventListener("input", event => syncDraftFromRow(event.target.closest("[data-spell-animation-slot]")));
  field("animation-stages").addEventListener("change", event => syncDraftFromRow(event.target.closest("[data-spell-animation-slot]")));
  field("animation-stages").addEventListener("click", async event => {
    const button = event.target.closest("[data-slot-action]");
    const row = event.target.closest("[data-spell-animation-slot]");
    if (!button || !row) return;
    const slot = row.dataset.spellAnimationSlot;
    const action = button.dataset.slotAction;
    try {
      stop();
      if (action === "clear") { delete draft[slot]; render(); status(`${title(slot)} cleared.`); return; }
      if (action === "preview") {
        if (!draft[slot]) throw new Error("Choose an animation for this stage first.");
        syncDraftFromRow(row);
        const current = revision;
        const stageDuration = slot === "sustain" ? { unit: "seconds", value: 2 } : null;
        const played = await sequence.playAnimationSequence(context({ animations: { [slot]: draft[slot] }, duration: stageDuration, maximumDuration: 3500 }));
        if (closed || current !== revision) played.cancel?.();
        else status(played.ok ? `${title(slot)} preview complete.` : played.message);
        return;
      }
      const id = await editor.openForSlot({ slot, mode: action, animationId: normalizeSpellAnimationReference(draft[slot])?.animationId });
      if (!closed && id) { draft[slot] = normalizeSpellAnimationReference({ animationId: id }); render(); status(`Animation assigned to ${slot}.`); }
    } catch (error) { status(error.message || "The animation stage could not be updated."); }
  });
  field("play").addEventListener("click", async () => {
    try {
      stop();
      const current = revision;
      const played = await sequence.playAnimationSequence(context({ animations: draft, duration: draft.sustain ? { unit: "seconds", value: 2 } : null, maximumDuration: 5000 }));
      if (closed || current !== revision) played.cancel?.();
      else status(played.ok ? "Sequence preview complete." : played.message);
    } catch (error) { status(error.message || "The sequence could not be previewed."); }
  });
  field("stop").addEventListener("click", stop);
  field("save").addEventListener("click", async () => {
    try {
      const current = ++revision;
      for (const row of field("animation-stages").querySelectorAll("[data-spell-animation-slot]")) syncDraftFromRow(row);
      const slots = normalizeSpellAnimations(draft, { strict: true });
      for (const value of Object.values(slots)) {
        const ref = normalizeSpellAnimationReference(value);
        await player.prepareAnimation(ref.animationId, ref.overrides);
      }
      if (closed || current !== revision) return;
      result = slots;
      dialog.close();
    } catch (error) { status(error.message || "The stages could not be saved."); }
  });
  field("cancel").addEventListener("click", () => dialog.close());
  const completion = new Promise(resolve => dialog.addEventListener("close", () => {
    closed = true;
    stop();
    stage.destroy();
    player.destroy();
    engine.destroy();
    dialog.remove();
    resolve(result);
  }, { once: true }));
  render();
  dialog.showModal();
  return completion;
}
