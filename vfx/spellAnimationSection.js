import { ANIMATION_SLOTS, normalizeSpellAnimations, normalizeSpellAnimationReference } from "./animationReferences.js";
import { resolveVfxAlphaSource } from "./alphaAssets.js";
const escape = text => String(text ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export const spellAnimationSummary = animations => ANIMATION_SLOTS.filter(slot => normalizeSpellAnimations(animations)[slot]).join(" → ") || "None";
export function animationThumbnail(animation) {
  if (!animation) return '<span class="hg-content-animation-thumb" aria-hidden="true">—</span>';
  const columns = animation.grid.columns, rows = animation.grid.rows, frame = Math.floor((animation.frames.start + animation.frames.end) / 2);
  const style = `background-image:url(${JSON.stringify(resolveVfxAlphaSource(animation.sprite))});background-size:${columns * 100}% ${rows * 100}%;background-position:${columns > 1 ? frame % columns / (columns - 1) * 100 : 0}% ${rows > 1 ? Math.floor(frame / columns) / (rows - 1) * 100 : 0}%`;
  return `<span class="hg-content-animation-thumb" aria-hidden="true" style="${escape(style)}"></span>`;
}
export function renderSpellAnimationSection({ animations = {}, library, spellId = "", editable = true } = {}) {
  const stages = normalizeSpellAnimations(animations);
  return `<section class="hg-content-animation-section" data-cc-animation-section="${escape(spellId)}"><h4>Animations</h4><p data-cc-animation-summary>${escape(spellAnimationSummary(stages))}</p><div class="hg-content-animation-stages">${ANIMATION_SLOTS.map(slot => {
    const ref = normalizeSpellAnimationReference(stages[slot]), animation = library?.getAnimation(ref?.animationId);
    return `<section class="hg-content-animation-stage" data-content-stage="${slot}">${animationThumbnail(animation)}<div><strong>${slot[0].toUpperCase() + slot.slice(1)}</strong><p data-content-animation-name>${escape(animation?.name || (ref ? "Missing: " + ref.animationId : "None"))}</p></div>${editable ? `<div class="hg-animation-buttons">${[["choose", ref ? "Change / Choose Existing" : "Choose Existing"], ["create", "Create New"], ["upload", "Upload"], ["remix", "Remix"], ["preview", "Preview"], ["clear", "Clear"]].map(([action, label]) => `<button type="button" data-cc-action="spell-animation-stage" data-spell-id="${escape(spellId)}" data-animation-slot="${slot}" data-animation-action="${action}"${!ref && ["remix", "preview", "clear"].includes(action) ? " disabled" : ""}>${label}</button>`).join("")}</div>` : ""}</section>`;
  }).join("")}</div><button type="button" data-cc-action="preview-spell-animations" data-spell-id="${escape(spellId)}">Preview Full Spell</button><button type="button" data-cc-action="edit-spell-animations"${spellId ? ` data-spell-id="${escape(spellId)}"` : ""}>Choose, create or upload animations</button><p class="small">Saved with this spell when you save the character draft. No global assignment save.</p></section>`;
}
