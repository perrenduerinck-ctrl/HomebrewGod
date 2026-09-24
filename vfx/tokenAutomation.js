import {
  buildSummonPlacements,
  normalizeSummonAutomation
} from "./summonAutomation.js";

function text(value, fallback = "", maximum = 240) {
  return String(value ?? fallback).trim().slice(0, maximum) || fallback;
}

function safeHttps(value) {
  const candidate = text(value, "", 2048);
  return !candidate || /^https:\/\//i.test(candidate)
    ? candidate
    : "";
}

/** Converts declarative animation follow-ups into bounded host commands. */
export function normalizeTokenAutomation(value = {}) {
  const summon = value.summon && typeof value.summon === "object"
    ? normalizeSummonAutomation(value.summon)
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

/**
 * Executes bounded token commands through the room-authoritative host. The
 * automation module plans batches and placement but never writes Firestore.
 */
export function createTokenAutomation({
  canMutate = () => false,
  createToken = null,
  updateToken = null,
  requestPlacements = null,
  afterSummon = null,
  onRequest = () => {}
} = {}) {
  async function execute(value, context = {}) {
    const automation = normalizeTokenAutomation(value);
    const results = [];

    if (automation.summon) {
      const summon = automation.summon;
      let placements = summon.spawnLocation === "manual"
        ? []
        : buildSummonPlacements(summon, context);
      if (summon.spawnLocation === "manual") {
        placements = typeof requestPlacements === "function"
          ? await requestPlacements(summon, context)
          : [];
        if (!Array.isArray(placements) || placements.length !== summon.count) {
          results.push({
            ok: false,
            requested: true,
            reason: "placement-required",
            command: summon
          });
          return results;
        }
      }

      const created = [];
      for (const [index, placement] of placements.entries()) {
        const prepared = {
          ...summon,
          x: Number(placement.x),
          y: Number(placement.y),
          mapMode: placement.mapMode || null,
          tileKey: placement.tileKey ?? null,
          summonIndex: index,
          sourceTokenId: text(context.source?.id || context.source?.tokenId),
          casterOwnerUid: text(context.source?.ownerUid),
          effectId: text(context.effectId),
          createdByUid: text(context.createdByUid)
        };
        onRequest(prepared, context);
        if (!canMutate(prepared, context)) {
          results.push({ ok: false, requested: true, reason: "authority-required", command: prepared });
          continue;
        }
        if (typeof createToken !== "function") {
          results.push({ ok: false, reason: "host-unavailable", command: prepared });
          continue;
        }
        const value = await createToken(prepared, context);
        const result = { ok: true, command: prepared, value };
        results.push(result);
        created.push(result);
      }
      if (created.length && typeof afterSummon === "function") {
        try {
          await afterSummon(created, summon, context);
        } catch (error) {
          results.push({
            ok: false,
            reason: "initiative-unavailable",
            message: error?.message || "Summon initiative could not be applied.",
            command: summon
          });
        }
      }
    }

    if (automation.transform) {
      const target = context.target || context.targets?.[0] || {};
      const prepared = {
        ...automation.transform,
        tokenId: automation.transform.tokenId || text(target.id || target.tokenId),
        effectId: text(context.effectId),
        createdByUid: text(context.createdByUid),
        duration: context.duration || null
      };
      onRequest(prepared, context);
      if (!canMutate(prepared, context)) {
        results.push({ ok: false, requested: true, reason: "authority-required", command: prepared });
      } else if (typeof updateToken === "function") {
        results.push({
          ok: true,
          command: prepared,
          value: await updateToken(prepared.tokenId, prepared, context)
        });
      } else {
        results.push({ ok: false, reason: "host-unavailable", command: prepared });
      }
    }

    return results;
  }

  return Object.freeze({ execute });
}
