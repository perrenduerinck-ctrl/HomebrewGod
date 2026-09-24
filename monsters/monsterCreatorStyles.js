export function ensureMonsterCreatorStyles(document = globalThis.document) {
  if (!document?.head || document.getElementById("monsterCreatorModernStyles")) return;
  const link = document.createElement("link");
  link.id = "monsterCreatorModernStyles";
  link.rel = "stylesheet";
  link.href = new URL("./monsterCreator.css", import.meta.url).href;
  document.head.append(link);
}
