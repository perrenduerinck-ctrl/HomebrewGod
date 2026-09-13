import { openSpellAnimationPanel } from "./spellAnimationPanel.js";
import { normalizeAttackAnimation, attackAnimationToSpellStages, spellStagesToAttackAnimation } from "./contentAnimationModel.js";
import { replaceAnimationReferences } from "./animationReferences.js";
import { getAnimationSession } from "./animationWorkspace.js";
const tracking = new WeakMap();
// Hosts can stop tracking when unloading their content editor. Replacement only
// edits that live attack draft; the host's normal content save remains required.
export function trackAttackAnimationReferences({ library, attack, onChange = () => {} }) {
  tracking.get(attack)?.();
  const stop = library.trackReferences("attack:" + (attack.id || crypto.randomUUID()), {
    name: attack.name || "Attack", get: () => attack,
    replace(oldId, newId) { replaceAnimationReferences(attack, oldId, newId); onChange(attack); },
  });
  tracking.set(attack, stop);
  return stop;
}
// Host content editor owns the normal save. This never creates a global binding.
export async function openAttackAnimationPanel({ attack, family = attack?.animation?.family || "melee", document = globalThis.document, onChange = () => {} } = {}) {
  if (!attack) throw new Error("Choose the attack being edited.");
  normalizeAttackAnimation({ family, stages: {} });
  trackAttackAnimationReferences({ library: getAnimationSession(document).library, attack, onChange });
  const stages = await openSpellAnimationPanel({ document, name: attack.name || "Attack", family, contentLabel: "Attack", animations: attackAnimationToSpellStages(attack.animation), slots: family === "melee" ? ["cast"] : ["cast", "travel", "impact"], stageLabels: family === "melee" ? { cast: "Attack" } : { cast: "Prepare", travel: "Projectile", impact: "Impact" }, saveLabel: "Use attack stages" });
  if (stages) { attack.animation = spellStagesToAttackAnimation(family, stages); onChange(attack); }
  return stages ? attack.animation : null;
}
export function attackAnimationSummary(attack) { const value = normalizeAttackAnimation(attack?.animation); return value ? Object.keys(value.stages).join(" → ") || "None" : "None"; }
