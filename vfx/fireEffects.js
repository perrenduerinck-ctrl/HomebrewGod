export const FIRE_EFFECT_IDS = Object.freeze([
  "fire-glow",
  "fire-embers",
  "fire-flames",
  "fire-smoke",
  "fire-explosion",
  "fire-trail",
  "fire-scorch"
]);

export const FIRE_OPTIONAL_ASSET_PATHS = Object.freeze({
  ember: "assets/vfx/fire/ember.webp",
  smoke: "assets/vfx/fire/smoke.webp",
  glow: "assets/vfx/fire/glow.webp",
  impact: "assets/vfx/fire/fire-impact.webp",
  impactSheet: "assets/vfx/fire/fire-impact-spritesheet.png",
  scorch: "assets/vfx/fire/scorch.webp"
});

export const FIRE_SPRITE_EFFECT_ID =
  "fire-impact-sprite";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function defineFireEffect({
  id,
  className,
  particles = {}
}) {
  return deepFreeze({
    id,
    kind: "procedural",
    className,
    particles
  });
}

export const FIRE_EFFECT_DEFINITIONS = Object.freeze([
  defineFireEffect({
    id: "fire-glow",
    className: "fire-glow",
    particles: {
      count: 4,
      distance: 14,
      size: 4,
      duration: 520,
      spread: 0.55
    }
  }),
  defineFireEffect({
    id: "fire-embers",
    className: "fire-embers",
    particles: {
      count: 16,
      distance: 68,
      size: 4,
      duration: 900,
      spread: 1
    }
  }),
  defineFireEffect({
    id: "fire-flames",
    className: "fire-flames",
    particles: {
      count: 14,
      distance: 42,
      size: 8,
      duration: 650,
      spread: 0.8
    }
  }),
  defineFireEffect({
    id: "fire-smoke",
    className: "fire-smoke",
    particles: {
      count: 10,
      distance: 52,
      size: 16,
      duration: 1500,
      spread: 0.75
    }
  }),
  defineFireEffect({
    id: "fire-explosion",
    className: "fire-explosion",
    particles: {
      count: 24,
      distance: 92,
      size: 6,
      duration: 780,
      spread: 1.15
    }
  }),
  defineFireEffect({
    id: "fire-trail",
    className: "fire-trail",
    particles: {
      count: 16,
      distance: 32,
      size: 4,
      duration: 620,
      spread: 0.7
    }
  }),
  defineFireEffect({
    id: "fire-scorch",
    className: "fire-scorch",
    particles: {
      count: 0
    }
  }),
  deepFreeze({
    id: FIRE_SPRITE_EFFECT_ID,
    kind: "sprite",
    className: FIRE_SPRITE_EFFECT_ID,
    sprite: {
      src: `./${FIRE_OPTIONAL_ASSET_PATHS.impactSheet}`,
      frameWidth: 160,
      frameHeight: 160,
      frameCount: 16,
      columns: 4,
      rows: 4,
      framesPerSecond: 18,
      loops: 1,
      loop: false,
      removeOnComplete: true
    }
  })
]);

function effect(
  type,
  anchor,
  {
    duration,
    intensityOffset = 0,
    opacity = 1,
    particles = null,
    scale = 1,
    role = type
  } = {}
) {
  return {
    type,
    anchor,
    duration,
    intensityOffset,
    opacity,
    particles,
    scale,
    metadata: {
      damageType: "fire",
      role
    }
  };
}

function makeFireCastingSequence({
  id,
  label,
  deliveryTypes = [],
  usePath = false,
  explosionScale = 0,
  impactScale = 1,
  priority = 300
}) {
  const travelAnchor = usePath ? "path" : "target";
  const impactEffects = [];

  if (explosionScale > 0) {
    impactEffects.push(effect(
      FIRE_SPRITE_EFFECT_ID,
      "target",
      {
        duration: 920,
        scale: explosionScale,
        role: "impact-sprite"
      }
    ));
    impactEffects.push(effect(
      "fire-explosion",
      "target",
      {
        duration: 520,
        scale: explosionScale,
        role: "impact-explosion"
      }
    ));
  }
  impactEffects.push(effect(
    "fire-flames",
    "target",
    {
      duration: 520,
      scale: impactScale,
      role: "impact-flames"
    }
  ));

  return deepFreeze({
    id,
    label,
    priority,
    match: {
      damageTypes: ["fire"],
      deliveryTypes
    },
    phases: {
      charge: {
        duration: 220,
        effects: [
          effect("fire-glow", "caster", {
            duration: 340,
            scale: 0.62,
            role: "charge-glow"
          }),
          effect("fire-embers", "caster", {
            duration: 460,
            particles: { count: 6, distance: 30, size: 3 },
            scale: 0.65,
            role: "charge-embers"
          })
        ]
      },
      release: {
        duration: 100,
        effects: [
          effect("fire-glow", "caster", {
            duration: 260,
            scale: 0.9,
            role: "release-glow"
          }),
          effect("fire-flames", "caster", {
            duration: 420,
            particles: { count: 8, distance: 34, size: 7 },
            scale: 0.72,
            role: "release-flames"
          })
        ]
      },
      travel: {
        duration: usePath ? 360 : 180,
        effects: [
          ...(usePath ? [effect("fire-trail", "path", {
            duration: 360,
            scale: 0.9,
            role: "projectile-trail"
          })] : []),
          effect("fire-flames", travelAnchor, {
            duration: usePath ? 360 : 260,
            particles: { count: 10, distance: 38, size: 7 },
            scale: usePath ? 0.55 : 0.9,
            role: usePath ? "travel-flames" : "forming-flames"
          })
        ]
      },
      impact: {
        duration: 280,
        effects: impactEffects
      },
      aftermath: {
        duration: 1400,
        effects: [
          effect("fire-embers", "target", {
            duration: 920,
            scale: impactScale,
            role: "aftermath-embers"
          }),
          effect("fire-smoke", "target", {
            duration: 1320,
            opacity: 0.72,
            scale: Math.max(0.8, impactScale),
            role: "aftermath-smoke"
          }),
          effect("fire-scorch", "target", {
            duration: 1380,
            opacity: 0.52,
            scale: Math.max(0.72, impactScale * 0.9),
            role: "aftermath-scorch"
          })
        ]
      },
      cleanup: {}
    }
  });
}

export const FIRE_CASTING_SEQUENCE_DEFINITIONS = Object.freeze([
  makeFireCastingSequence({
    id: "fire-projectile",
    label: "Fire Projectile",
    deliveryTypes: ["projectile"],
    usePath: true,
    explosionScale: 0.9,
    impactScale: 0.82
  }),
  makeFireCastingSequence({
    id: "fire-burst",
    label: "Fire Burst",
    deliveryTypes: ["burst"],
    usePath: true,
    explosionScale: 1.35,
    impactScale: 1.16
  }),
  makeFireCastingSequence({
    id: "fire-directional",
    label: "Directional Fire",
    deliveryTypes: ["beam", "cone", "line"],
    usePath: true,
    explosionScale: 0,
    impactScale: 1.08
  }),
  makeFireCastingSequence({
    id: "fire-impact",
    label: "Fire Impact",
    deliveryTypes: [],
    usePath: false,
    explosionScale: 1,
    impactScale: 0.94,
    priority: 250
  })
]);
