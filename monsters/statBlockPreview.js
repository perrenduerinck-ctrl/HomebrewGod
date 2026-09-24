import { MONSTER_ABILITY_KEYS, MONSTER_ABILITY_LABELS, formatMonsterModifier } from "./monsterMath.js";

const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
const list = value => (Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/))
  .map(entry => text(entry?.name || entry?.value || entry))
  .filter(Boolean);

function node(document, tag, className = "", content = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = content;
  return element;
}

function appendDetail(document, root, label, value) {
  const row = node(document, "p", "monster-stat-detail");
  row.append(node(document, "strong", "", `${label} `), document.createTextNode(text(value, "—")));
  root.append(row);
}

function appendEntrySection(document, root, label, entries) {
  const section = node(document, "section", "monster-stat-section");
  section.dataset.statSection = label.toLowerCase().replaceAll(" ", "-");
  section.append(node(document, "h4", "", label));
  const normalized = Array.isArray(entries) ? entries : [];
  if (!normalized.length) {
    section.append(node(document, "p", "monster-stat-empty", "None"));
  } else {
    for (const entry of normalized) {
      const paragraph = node(document, "p", "monster-stat-entry");
      paragraph.append(node(document, "strong", "", `${text(entry?.name, "Feature")}. `),
        document.createTextNode(text(entry?.description)));
      section.append(paragraph);
    }
  }
  root.append(section);
}

export function renderMonsterStatBlock(container, monster = {}) {
  if (!container) return null;
  const document = container.ownerDocument || globalThis.document;
  const abilities = monster.abilities || {};
  container.replaceChildren();

  const article = node(document, "article", "monster-stat-block");
  article.dataset.monsterStatBlock = "true";
  const header = node(document, "header", "monster-stat-header");
  header.append(node(document, "h3", "", text(monster.name, "Unnamed Monster")));
  header.append(node(document, "p", "monster-stat-meta",
    `${text(monster.size, "Medium")} ${text(monster.type, "Monster")}, ${text(monster.alignment, "Unaligned")}`));
  article.append(header);

  const basics = node(document, "div", "monster-stat-basics");
  appendDetail(document, basics, "Armor Class", monster.ac);
  appendDetail(document, basics, "Hit Points", monster.hp);
  appendDetail(document, basics, "Speed", monster.speed);
  article.append(basics);

  const scores = node(document, "div", "monster-stat-abilities");
  for (const key of MONSTER_ABILITY_KEYS) {
    const score = Number.isFinite(Number(abilities[key])) ? Number(abilities[key]) : 10;
    const ability = node(document, "div", "monster-stat-ability");
    ability.append(node(document, "strong", "", MONSTER_ABILITY_LABELS[key]));
    ability.append(node(document, "span", "", `${score} (${formatMonsterModifier(score)})`));
    scores.append(ability);
  }
  article.append(scores);

  const details = node(document, "div", "monster-stat-details");
  appendDetail(document, details, "Saving Throws", list(monster.savingThrows).join(", "));
  appendDetail(document, details, "Skills", list(monster.skills).join(", "));
  appendDetail(document, details, "Damage Vulnerabilities", list(monster.damageVulnerabilities).join(", "));
  appendDetail(document, details, "Damage Resistances", list(monster.damageResistances).join(", "));
  appendDetail(document, details, "Damage Immunities", list(monster.damageImmunities).join(", "));
  appendDetail(document, details, "Condition Immunities", list(monster.conditionImmunities).join(", "));
  appendDetail(document, details, "Senses", list(monster.senses).join(", "));
  appendDetail(document, details, "Challenge", monster.cr);
  article.append(details);

  for (const [field, label] of [
    ["traits", "Traits"],
    ["actions", "Actions"],
    ["bonusActions", "Bonus Actions"],
    ["reactions", "Reactions"],
    ["legendaryActions", "Legendary Actions"],
    ["lairActions", "Lair Actions"]
  ]) appendEntrySection(document, article, label, monster[field]);

  container.append(article);
  return article;
}

export function ensureMonsterCreatorWorkspace({ screen, editor, document = screen?.ownerDocument || globalThis.document } = {}) {
  if (!screen || !editor) return null;
  let workspace = screen.querySelector("[data-monster-workspace]");
  if (!workspace) {
    workspace = node(document, "div", "monster-creator-workspace");
    workspace.dataset.monsterWorkspace = "true";
    editor.parentNode.insertBefore(workspace, editor);
    editor.classList.add("monster-editor-column");
    workspace.append(editor);
  }
  let preview = workspace.querySelector("[data-monster-stat-preview]");
  if (!preview) {
    const aside = node(document, "aside", "monster-preview-column");
    aside.setAttribute("aria-label", "Live Monster Stat Block Preview");
    const heading = node(document, "div", "monster-preview-heading");
    heading.append(node(document, "span", "", "LIVE PREVIEW"), node(document, "h3", "", "Monster Stat Block"));
    preview = node(document, "div", "monster-stat-preview");
    preview.dataset.monsterStatPreview = "true";
    aside.append(heading, preview); workspace.append(aside);
  }
  return preview;
}

export function createMonsterStatBlockPreview({ container } = {}) {
  return Object.freeze({
    render: monster => renderMonsterStatBlock(container, monster),
    clear: () => container?.replaceChildren()
  });
}
