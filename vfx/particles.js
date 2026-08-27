export const MAX_PARTICLES_PER_EFFECT = 240;
export const MAX_REDUCED_PARTICLES = 24;

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

function randomBetween(
  minimum,
  maximum,
  random
) {
  return minimum +
    (maximum - minimum) * random();
}

export function normalizeParticleCount(
  value,
  {
    mode = "full",
    fallback = 0
  } = {}
) {
  if (mode === "off") return 0;
  const parsed = finiteNumber(value);
  const safe = Math.round(
    parsed ?? finiteNumber(fallback) ?? 0
  );
  return clamp(
    safe,
    0,
    mode === "reduced"
      ? MAX_REDUCED_PARTICLES
      : MAX_PARTICLES_PER_EFFECT
  );
}

export function createParticleDescriptors(
  options = {},
  {
    mode = "full",
    random = Math.random
  } = {}
) {
  const count = normalizeParticleCount(
    options.count,
    {
      mode,
      fallback: 0
    }
  );
  const distance = clamp(
    finiteNumber(options.distance) ?? 40,
    0,
    2000
  );
  const size = clamp(
    finiteNumber(options.size) ?? 5,
    1,
    200
  );
  const duration = clamp(
    finiteNumber(options.duration) ?? 700,
    16,
    10000
  );
  const spread = clamp(
    finiteNumber(options.spread) ?? 1,
    0,
    2
  );

  return Object.freeze(
    Array.from({ length: count }, (_, index) => {
      const angle = randomBetween(
        0,
        Math.PI * 2,
        random
      );
      const travel = distance * randomBetween(
        0.35,
        1,
        random
      ) * spread;
      return Object.freeze({
        index,
        x: Math.cos(angle) * travel,
        y: Math.sin(angle) * travel,
        size: size * randomBetween(
          0.55,
          1.45,
          random
        ),
        delay: randomBetween(
          0,
          duration * 0.18,
          random
        ),
        duration: duration * randomBetween(
          0.72,
          1.18,
          random
        ),
        opacity: randomBetween(
          0.55,
          1,
          random
        )
      });
    })
  );
}
