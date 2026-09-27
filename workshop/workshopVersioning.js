import { sanitizeStructuredContent } from "./workshopModel.js";

export function nextWorkshopVersion(current, mode = "new-version") {
  const version = Math.max(1, Math.trunc(Number(current) || 1));
  return mode === "new-version" ? version + 1 : version;
}

function flatten(value, prefix = "", output = new Map()) {
  if (value && typeof value === "object") {
    const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
    for (const [key, item] of entries) flatten(item, prefix ? `${prefix}.${key}` : String(key), output);
  } else output.set(prefix || "value", value);
  return output;
}

export function compareWorkshopVersions(previous, next) {
  const left = flatten(sanitizeStructuredContent(previous));
  const right = flatten(sanitizeStructuredContent(next));
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  return keys.filter((key) => !Object.is(left.get(key), right.get(key))).slice(0, 200).map((key) => ({
    path: key,
    before: left.has(key) ? left.get(key) : undefined,
    after: right.has(key) ? right.get(key) : undefined
  }));
}
