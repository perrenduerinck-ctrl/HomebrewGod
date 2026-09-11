import { ANIMATION_SLOTS, normalizeSpellAnimations, normalizeSpellAnimationReference } from "./animationReferences.js";
import { getAnimationSession } from "./animationWorkspace.js";
import { createBattleMapEffectEngine } from "./effectEngine.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { createAnimationSequenceController } from "./animationSequence.js";

export function openSpellAnimationPanel({ document = globalThis.document, animations = {}, name = "Spell" } = {}) {
  const { library, editor, isSoundEnabled } = getAnimationSession(document);
  const dialog = document.createElement("dialog"); dialog.className = "hg-spell-animation-panel";
  dialog.setAttribute("aria-label", "Spell animations");
  dialog.innerHTML = `<h2>Spell animations</h2><p data-spell-animation-name></p><p>Create reusable effects for this spell. Uploaded animations are available until you reload. Export them from the animation library to keep a copy.</p>
    <div data-spell-animation-stages></div><label>Add Animation Stage<select data-spell-animation-add><option value="">Choose stage</option>${ANIMATION_SLOTS.map(s=>`<option value="${s}">${s}</option>`).join("")}</select></label>
    <div class="hg-animation-preview" data-spell-animation-preview data-background="grid" style="height:220px;position:relative">
      <button class="hg-animation-dummy" data-spell-source style="left:20%;top:50%" type="button">S</button><button class="hg-animation-dummy" data-spell-target style="left:80%;top:50%" type="button">T</button></div>
    <div class="hg-animation-buttons"><button type="button" data-spell-play>Preview all stages</button><button type="button" data-spell-stop>Stop</button><button type="button" data-spell-save>Use these stages</button><button type="button" data-spell-cancel>Cancel</button></div><p data-spell-animation-status role="status"></p>`;
  document.body.append(dialog); dialog.querySelector("[data-spell-animation-name]").textContent = name;
  const field = key => dialog.querySelector(`[data-spell-${key}]`), status = message => { field("animation-status").textContent = message; };
  const draft = normalizeSpellAnimations(animations), shown = new Set(Object.keys(draft).length ? Object.keys(draft) : ["impact"]);
  const engine = createBattleMapEffectEngine({ surface: field("animation-preview") }), player = createAnimationPlayer({ engine, library, isSoundEnabled, onError: status });
  const sequence = createAnimationSequenceController({ player }); let closed = false, result = null, revision = 0;
  function render() {
    const root = field("animation-stages"); root.replaceChildren();
    for (const slot of ANIMATION_SLOTS.filter(s => shown.has(s))) {
      const row = document.createElement("section"); row.dataset.spellAnimationSlot = slot;
      const ref = normalizeSpellAnimationReference(draft[slot]), animation = library.getAnimation(ref?.animationId);
      row.innerHTML = `<h3></h3><p data-slot-name></p><div class="hg-animation-buttons">${[["choose","Choose / Find in Library"],["preview","Preview"],["clear","Clear"],["remix","Duplicate / Remix"],["create","Create New"],["upload","Upload New"]].map(([key,label])=>`<button type="button" data-slot-action="${key}">${label}</button>`).join("")}</div>
        <details><summary>Spell-specific overrides</summary><label>Scale ×<input type="number" data-slot-scale min="0.1" max="8" step="0.1" value="1"></label><label>Speed ×<input type="number" data-slot-speed min="0.05" max="8" step="0.05" value="1"></label><label><input type="checkbox" data-slot-tinted>Tint</label><input type="color" data-slot-tint value="#ff5500"></details>`;
      row.querySelector("h3").textContent = slot[0].toUpperCase()+slot.slice(1);
      row.querySelector("[data-slot-name]").textContent = animation?.name || (ref ? `Missing Animation: ${ref.animationId}. Choose a replacement or Clear.` : "No animation");
      row.querySelector("[data-slot-scale]").value = ref?.overrides.scaleMultiplier ?? 1;
      row.querySelector("[data-slot-speed]").value = ref?.overrides.speedMultiplier ?? 1;
      row.querySelector("[data-slot-tinted]").checked = Boolean(ref?.overrides.tint);
      row.querySelector("[data-slot-tint]").value = ref?.overrides.tint || "#ff5500";
      root.append(row);
    }
  }
  const context = () => ({ source: field("source"), target: field("target"), grid: { pixelsPerFoot: field("animation-preview").clientWidth / 150 }, debugPoints: true });
  const stop = () => { revision++; sequence.clear(); player.clear(); };
  field("animation-add").addEventListener("change", event => { if (event.target.value) shown.add(event.target.value); event.target.value = ""; render(); });
  field("animation-stages").addEventListener("change", event => {
    const row = event.target.closest("[data-spell-animation-slot]"); if (!row || !draft[row.dataset.spellAnimationSlot]) return;
    const slot = row.dataset.spellAnimationSlot, ref = normalizeSpellAnimationReference(draft[slot]);
    ref.overrides = { ...ref.overrides, scaleMultiplier: Number(row.querySelector("[data-slot-scale]").value), speedMultiplier: Number(row.querySelector("[data-slot-speed]").value), tint: row.querySelector("[data-slot-tinted]").checked ? row.querySelector("[data-slot-tint]").value : null };
    draft[slot] = ref;
  });
  field("animation-stages").addEventListener("click", async event => {
    const button = event.target.closest("[data-slot-action]"), row = event.target.closest("[data-spell-animation-slot]"); if (!button || !row) return;
    const slot = row.dataset.spellAnimationSlot, action = button.dataset.slotAction;
    try {
      stop();
      if (action === "clear") { delete draft[slot]; render(); return; }
      if (action === "preview") { if (!draft[slot]) throw new Error("Choose an animation for this stage first."); const current = revision; const r = await sequence.playAnimationSequence({ ...context(), animations: { [slot]: draft[slot] } }); if (closed || current !== revision) r.cancel?.(); else if (!r.ok) status(r.message); return; }
      const id = await editor.openForSlot({ slot, mode: action, animationId: normalizeSpellAnimationReference(draft[slot])?.animationId });
      if (!closed && id) { draft[slot] = id; render(); status(`Animation assigned to ${slot}.`); }
    } catch (error) { status(error.message); }
  });
  field("play").addEventListener("click", async () => { stop(); const current = revision; const r = await sequence.playAnimationSequence({ ...context(), animations: draft }); if (closed || current !== revision) r.cancel?.(); else if (!r.ok) status(r.message); });
  field("stop").addEventListener("click", stop);
  field("save").addEventListener("click", async () => {
    try { const current = ++revision; const slots = normalizeSpellAnimations(draft, { strict: true });
      for (const value of Object.values(slots)) { const ref = normalizeSpellAnimationReference(value); await player.prepareAnimation(ref.animationId, ref.overrides); }
      if (closed || current !== revision) return; result = slots; dialog.close();
    } catch (error) { status(error.message); }
  });
  field("cancel").addEventListener("click", () => dialog.close());
  const completion = new Promise(resolve => dialog.addEventListener("close", () => { closed = true; stop(); player.destroy(); engine.destroy(); dialog.remove(); resolve(result); }, { once: true }));
  render(); dialog.showModal(); return completion;
}
