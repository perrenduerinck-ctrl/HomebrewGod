export function ensureWorkshopStyles(document = globalThis.document) {
  if (!document || document.getElementById("homebrewGodWorkshopStyles")) return;
  const link = document.createElement("link");
  link.id = "homebrewGodWorkshopStyles";
  link.rel = "stylesheet";
  link.href = new URL("./workshop.css", import.meta.url).href;
  document.head.append(link);
}
