import { NPC_ABILITY_KEYS, normalizeNpc, npcAbilityModifier } from "./npcModel.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const paragraph = (label, value) => value ? `<p><strong>${label}.</strong> ${escapeHtml(value)}</p>` : "";

export function renderNpcPreview(container, raw = {}) {
  if (!container) return null;
  const npc = normalizeNpc({ ...raw, name: raw.name || "Unnamed NPC" });
  const identity = [npc.species, npc.occupation, npc.alignment || npc.disposition].filter(Boolean).join(" · ") || "NPC";
  const abilities = NPC_ABILITY_KEYS.map((key) => `<div><strong>${key.toUpperCase()}</strong><span>${npc.combat.abilities[key]} (${npcAbilityModifier(npc.combat.abilities[key])})</span></div>`).join("");
  container.innerHTML = `<article class="npc-preview-card">
    <header>${npc.portraitUrl ? `<img src="${escapeHtml(npc.portraitUrl)}" alt="">` : `<span class="npc-preview-avatar" aria-hidden="true">🧙</span>`}<div><h3>${escapeHtml(npc.name)}</h3><p>${escapeHtml(identity)}</p>${npc.location ? `<small>${escapeHtml(npc.location)}</small>` : ""}</div></header>
    ${paragraph("Description", npc.description)}
    ${paragraph("Personality", npc.personality)}
    ${paragraph("Goals", npc.goals)}
    ${paragraph("Fears", npc.fears)}
    ${paragraph("Motivations", npc.motivations)}
    ${npc.faction ? paragraph("Faction", npc.faction) : ""}
    ${npc.combat.enabled ? `<section class="npc-preview-combat"><h4>Combat</h4><p><strong>Armor Class</strong> ${npc.combat.ac ?? "—"} · <strong>Hit Points</strong> ${npc.combat.hp ?? "—"} · <strong>Speed</strong> ${escapeHtml(npc.combat.speed || "—")}</p><div class="npc-preview-abilities">${abilities}</div>${npc.combat.actions.map((action) => `<div class="npc-preview-action"><strong>${escapeHtml(action.name)}.</strong> ${escapeHtml(action.description)} ${action.damage ? `<em>${escapeHtml(action.damage)}</em>` : ""}</div>`).join("")}</section>` : ""}
    ${npc.knowledge.length ? `<section><h4>Knowledge</h4>${npc.knowledge.filter((entry) => !entry.secret).map((entry) => `<p><strong>${escapeHtml(entry.title)}.</strong> ${escapeHtml(entry.description)}</p>`).join("")}</section>` : ""}
    ${npc.tags.length ? `<footer>${npc.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</footer>` : ""}
  </article>`;
  return npc;
}
