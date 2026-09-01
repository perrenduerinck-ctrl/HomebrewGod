export const MAX_EFFECT_TIMELINE_EVENTS = 32;

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const clean = (value) => String(value || "").trim().toLowerCase();

export function normalizeEffectTimeline(events = [], duration = 0) {
  const safeDuration = Math.max(0, finiteNumber(duration) ?? 0);
  return Object.freeze(
    (Array.isArray(events) ? events : [])
      .slice(0, MAX_EFFECT_TIMELINE_EVENTS)
      .map((event, index) => {
        const atMilliseconds = finiteNumber(event?.atMilliseconds ?? event?.atMs);
        const progress = atMilliseconds === null
          ? clamp(finiteNumber(event?.at ?? event?.progress) ?? 0, 0, 1)
          : clamp(atMilliseconds / Math.max(1, safeDuration), 0, 1);
        const type = clean(event?.type || (event?.effect ? "spawn" : "marker"));
        return Object.freeze({
          id: clean(event?.id) || `event-${index + 1}`,
          type,
          progress,
          atMilliseconds: Math.round(progress * safeDuration),
          layer: clean(event?.layer),
          effect: event?.effect && typeof event.effect === "object"
            ? Object.freeze({ ...event.effect })
            : null,
          metadata: Object.freeze({ ...(event?.metadata || {}) })
        });
      })
      .sort((left, right) => (
        left.atMilliseconds - right.atMilliseconds
      ))
  );
}
