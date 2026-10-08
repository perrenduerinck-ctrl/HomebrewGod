export const JOURNAL_VISIBILITIES = Object.freeze([
  "shared",
  "personal",
  "dm"
]);

export const JOURNAL_CATEGORIES = Object.freeze([
  "Session Notes",
  "NPCs",
  "Quests",
  "Locations",
  "Lore",
  "Custom"
]);

export const JOURNAL_COLLECTIONS = Object.freeze({
  shared: "sharedJournal",
  personal: "personalJournal",
  dm: "dmJournal"
});

export const JOURNAL_LIMITS = Object.freeze({
  title: 160,
  category: 80,
  contentHtml: 50000,
  searchText: 50000
});

const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "P", "BR",
  "UL", "OL", "LI", "DIV", "H2", "H3", "BLOCKQUOTE"
]);

function cleanText(value, maximum) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, maximum);
}

function fallbackSanitize(html) {
  const withoutDangerousBlocks = String(html ?? "")
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?\s*>/gi, "");
  return withoutDangerousBlocks.replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi, (match, tagName) => {
    const upper = String(tagName).toUpperCase();
    if (!ALLOWED_TAGS.has(upper)) return "";
    return match.startsWith("</") ? `</${tagName}>` : `<${tagName}>`;
  });
}

export function sanitizeJournalHtml(value, documentRef = globalThis.document) {
  const source = cleanText(value, JOURNAL_LIMITS.contentHtml * 2);
  if (!documentRef?.createElement) {
    return fallbackSanitize(source).slice(0, JOURNAL_LIMITS.contentHtml);
  }

  const template = documentRef.createElement("template");
  template.innerHTML = source;
  const dangerous = template.content.querySelectorAll(
    "script,style,iframe,object,embed,link,meta"
  );
  dangerous.forEach((node) => node.remove());

  const elements = [...template.content.querySelectorAll("*")];
  elements.forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    [...element.attributes].forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });
  });

  return template.innerHTML.slice(0, JOURNAL_LIMITS.contentHtml);
}

export function journalPlainText(value) {
  return cleanText(
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim(),
    JOURNAL_LIMITS.searchText
  );
}

export function journalCollectionForVisibility(visibility) {
  return JOURNAL_COLLECTIONS[visibility] || JOURNAL_COLLECTIONS.personal;
}

export function normalizeJournalEntry(value = {}, context = {}) {
  const now = Number(context.now ?? Date.now());
  const requestedVisibility = JOURNAL_VISIBILITIES.includes(value.visibility)
    ? value.visibility
    : "personal";
  const visibility = requestedVisibility === "dm" && context.isDm !== true
    ? "personal"
    : requestedVisibility;
  const category = cleanText(
    value.category || "Session Notes",
    JOURNAL_LIMITS.category
  ) || "Session Notes";
  const contentHtml = sanitizeJournalHtml(value.contentHtml, context.document);
  const title = cleanText(value.title || "Untitled Note", JOURNAL_LIMITS.title).trim()
    || "Untitled Note";

  return {
    id: cleanText(value.id, 180),
    roomCode: cleanText(value.roomCode || context.roomCode, 32),
    ownerUid: cleanText(value.ownerUid || context.userId, 180),
    ownerName: cleanText(value.ownerName || context.userName || "Player", 160),
    title,
    category,
    visibility,
    contentHtml,
    searchText: cleanText(
      `${title} ${category} ${journalPlainText(contentHtml)}`.toLowerCase(),
      JOURNAL_LIMITS.searchText
    ),
    createdAtMillis: Number(value.createdAtMillis) || now,
    updatedAtMillis: Number(value.updatedAtMillis) || now,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null
  };
}

export function journalEntryMatches(entry, { search = "", category = "all" } = {}) {
  const normalizedSearch = String(search).trim().toLowerCase();
  const categoryMatches = category === "all" || entry.category === category;
  if (!categoryMatches) return false;
  if (!normalizedSearch) return true;
  return String(entry.searchText || `${entry.title} ${journalPlainText(entry.contentHtml)}`)
    .toLowerCase()
    .includes(normalizedSearch);
}

export function canMutateJournalEntry(entry, { userId = "", isDm = false } = {}) {
  if (!entry) return false;
  if (entry.visibility === "personal") return entry.ownerUid === userId;
  return isDm === true || entry.ownerUid === userId;
}
