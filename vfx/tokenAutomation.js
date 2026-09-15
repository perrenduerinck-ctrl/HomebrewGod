function text(value, fallback = "", maximum = 240) {
  return String(value ?? fallback).trim().slice(0, maximum) || fallback;
}

function safeHttps(value) {
  const candidate = text(value, "", 2048);
  return !candidate || /^https:\/\//i.test(candidate)
    ? candidate
    : "";
}

/**
 * Converts declarative animation follow-ups into bounded host commands. This
 * module never writes tokens itself; the room authority owns create/update.
 */
export function normalizeTokenAutomation(value = {}) {
  const summon = value.summon && typeof value.summon === "object"
    ? {
        type: "summon-token",
        name: text(value.summon.name, "Summon", 120),
        imageUrl: safeHttps(value.summon.imageUrl),
        sizeCategory: ["tiny", "small", "medium", "large", "huge", "gargantuan"]
          .includes(text(value.summon.sizeCategory).toLowerCase())
            ? text(value.summon.sizeCategory).toLowerCase()
            : "medium",
        tokenType: ["player", "enemy", "npc", "object"]
          .includes(text(value.summon.tokenType).toLowerCase())
            ? text(value.summon.tokenType).toLowerCase()
            : "npc"
      }
    : null;
  const transform = value.transform && typeof value.transform === "object"
    ? {
        type: "transform-token",
        tokenId: text(value.transform.tokenId),
        name: text(value.transform.name, "", 120),
        imageUrl: safeHttps(value.transform.imageUrl),
        sizeCategory: text(value.transform.sizeCategory).toLowerCase()
      }
    : null;
  return { summon, transform };
}

export function createTokenAutomation({
  canMutate = () => false,
  createToken = null,
  updateToken = null,
  onRequest = () => {}
} = {}) {
  async function execute(value, context = {}) {
    const automation = normalizeTokenAutomation(value);
    const commands = [automation.summon, automation.transform].filter(Boolean);
    const results = [];

    for (const command of commands) {
      const target = context.target || context.targets?.[0] || {};
      const prepared = command.type === "summon-token"
        ? {
            ...command,
            x: Number(target.x ?? target.centerX ?? context.point?.x ?? 50),
            y: Number(target.y ?? target.centerY ?? context.point?.y ?? 50),
            sourceTokenId: text(context.source?.id || context.source?.tokenId)
          }
        : {
            ...command,
            tokenId: command.tokenId || text(target.id || target.tokenId)
          };
      onRequest(prepared, context);

      if (!canMutate(prepared, context)) {
        results.push({ ok: false, requested: true, reason: "authority-required", command: prepared });
        continue;
      }
      if (prepared.type === "summon-token" && typeof createToken === "function") {
        results.push({ ok: true, command: prepared, value: await createToken(prepared, context) });
      } else if (prepared.type === "transform-token" && typeof updateToken === "function") {
        results.push({ ok: true, command: prepared, value: await updateToken(prepared.tokenId, prepared, context) });
      } else {
        results.push({ ok: false, reason: "host-unavailable", command: prepared });
      }
    }

    return results;
  }

  return Object.freeze({ execute });
}
