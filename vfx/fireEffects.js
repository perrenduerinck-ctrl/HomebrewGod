import { getVfxClipSet } from "./vfxAssetManifest.js?v=clip-vfx-20260902";

export const FIRE_EFFECT_IDS = Object.freeze([
  "fire-glow",
  "fire-embers",
  "fire-flames",
  "fire-smoke",
  "fire-explosion",
  "fire-impact-flash",
  "fire-shock-ring",
  "fire-debris-burst",
  "fire-trail",
  "fire-scorch"
]);

export const FIRE_OPTIONAL_ASSET_PATHS = Object.freeze({
  ember: "assets/vfx/fire/ember.webp",
  smoke: "assets/vfx/fire/smoke.webp",
  glow: "assets/vfx/fire/glow.webp",
  impact: "assets/vfx/fire/fire-impact.webp",
  impactSheet: "assets/vfx/fire/fire-impact-spritesheet.png",
  fireBoltProjectile: "assets/vfx/fire/fire-bolt-projectile.png",
  fireBoltImpact: "assets/vfx/fire/fire-bolt-impact.png",
  fireballProjectile: "assets/vfx/fire/fireball-projectile.png",
  scorch: "assets/vfx/fire/scorch.webp"
});

export const FIRE_SPRITE_EFFECT_ID =
  "fire-impact-sprite";
export const FIRE_BOLT_PROJECTILE_EFFECT_ID =
  "fire-bolt-projectile-sprite";
export const FIRE_BOLT_IMPACT_EFFECT_ID =
  "fire-bolt-impact-sprite";
export const FIREBALL_PROJECTILE_EFFECT_ID =
  "fireball-projectile-sprite";
export const FIREBALL_CLIP_EFFECT_ID =
  "fireball-clip-sprite";

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
  particles = {},
  blendMode = "normal"
}) {
  return deepFreeze({
    id,
    kind: "procedural",
    className,
    blendMode,
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
    id: "fire-impact-flash",
    className: "fire-impact-flash",
    blendMode: "screen",
    particles: { count: 0 }
  }),
  defineFireEffect({
    id: "fire-shock-ring",
    className: "fire-shock-ring",
    blendMode: "screen",
    particles: { count: 0 }
  }),
  defineFireEffect({
    id: "fire-debris-burst",
    className: "fire-debris-burst",
    particles: { count: 0 }
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
  }),
  deepFreeze({
    id: FIRE_BOLT_PROJECTILE_EFFECT_ID,
    kind: "sprite",
    className: FIRE_BOLT_PROJECTILE_EFFECT_ID,
    sprite: {
      src: `./${FIRE_OPTIONAL_ASSET_PATHS.fireBoltProjectile}`,
      frameWidth: 512,
      frameHeight: 192,
      frameCount: 1,
      columns: 1,
      rows: 1,
      framesPerSecond: 24,
      loops: 1,
      loop: false,
      removeOnComplete: false
    }
  }),
  deepFreeze({
    id: FIRE_BOLT_IMPACT_EFFECT_ID,
    kind: "sprite",
    className: FIRE_BOLT_IMPACT_EFFECT_ID,
    sprite: {
      src: `./${FIRE_OPTIONAL_ASSET_PATHS.fireBoltImpact}`,
      frameWidth: 512,
      frameHeight: 512,
      frameCount: 1,
      columns: 1,
      rows: 1,
      framesPerSecond: 24,
      loops: 1,
      loop: false,
      removeOnComplete: false
    }
  }),
  deepFreeze({
    id: FIREBALL_PROJECTILE_EFFECT_ID,
    kind: "sprite",
    className: FIREBALL_PROJECTILE_EFFECT_ID,
    sprite: {
      src: `./${FIRE_OPTIONAL_ASSET_PATHS.fireballProjectile}`,
      frameWidth: 1254,
      frameHeight: 1254,
      frameCount: 1,
      columns: 1,
      rows: 1,
      framesPerSecond: 24,
      loops: 1,
      loop: false,
      removeOnComplete: false
    }
  }),
  deepFreeze({
    id: FIREBALL_CLIP_EFFECT_ID,
    kind: "sprite",
    className: FIREBALL_CLIP_EFFECT_ID,
    blendMode: "screen",
    clips: getVfxClipSet("fireball"),
    initialClip: "travel",
    configureElement({ element, effect }) {
      element.dataset.clipSet = "fireball";
      element.dataset.initialClip = effect.clip || "travel";
    }
  })
]);

function effect(
  type,
  anchor,
  {
    duration,
    intensityOffset = 0,
    geometryScaleBasePixels = null,
    opacity = 1,
    particles = null,
    scale = 1,
    role = type,
    ...presentation
  } = {}
) {
  return {
    type,
    anchor,
    duration,
    intensityOffset,
    geometryScaleBasePixels,
    opacity,
    particles,
    scale,
    ...presentation,
    metadata: {
      damageType: "fire",
      role
    }
  };
}

function makeFireballCastingSequence() {
  // Each phase owns one visual responsibility. World travel remains code-driven.
  return deepFreeze({
    id: "fireball", label: "Fireball", priority: 100,
    match: { spellIds: ["fireball"], damageTypes: ["fire"], deliveryTypes: ["burst"] },
    phases: {
      charge: { duration: 300, effects: [
        effect(FIREBALL_CLIP_EFFECT_ID, "caster", { duration: 300,
          clip: "charge", scale: .62, particles: { count: 0 },
          role: "fireball-charge-clip", heightGlow: { enabled: true } }),
        { ...effect("fire-glow", "caster", { duration: 300, scale: .5,
          particles: { count: 0 }, role: "fireball-charge-glow" }), fullOnly: true }
      ] },
      release: { duration: 140, effects: [
        effect(FIREBALL_CLIP_EFFECT_ID, "caster", { duration: 140,
          clip: "release", scale: .78, particles: { count: 0 },
          role: "fireball-release-clip",
          impactPunch: { enabled: true, amount: .12, durationRatio: .55 } })
      ] },
      travel: { duration: 480, effects: [
        effect(FIREBALL_CLIP_EFFECT_ID, "path", { duration: 480,
          clip: "travel", scale: .5,
          particles: { count: 0 }, role: "fireball-projectile",
          preset: "projectile", layer: "airborne",
          motion: { type: "arc", maxZ: 88, arcPower: 1.22,
            easing: "fast-out", rotationMode: "direction" },
          shadow: { enabled: true, opacity: .58, fadeDistance: 210,
            shrinkDistance: 245, offsetX: 9, offsetY: 5 },
          heightScaling: { enabled: true, amount: .00235, maximum: 1.22 },
          heightGlow: { enabled: true },
          trail: { enabled: true, lifetime: 190, maxPoints: 14,
            spacing: 10, interval: 26, size: 18, opacity: .76, smoke: true } })
      ] },
      impact: { duration: 900, effects: [
        effect(FIREBALL_CLIP_EFFECT_ID, "target", { duration: 900,
          clip: "impact",
          geometryScaleBasePixels: 160, particles: { count: 0 },
          role: "fireball-impact-clip",
          impactPunch: { enabled: true, amount: .16, durationRatio: .18 } }),
        effect("fire-explosion", "target", { duration: 480, scale: 1.12,
          particles: { count: 4 }, role: "fireball-core-explosion",
          impactPunch: { enabled: true, amount: .12, durationRatio: .2 } }),
        effect("fire-debris-burst", "target", { duration: 560,
          particles: { count: 0 }, role: "fireball-debris",
          layer: "airborne", debris: { enabled: true, count: 10,
            speed: 115, gravity: 390, lifetime: 540, size: 6 } })
      ] },
      aftermath: { duration: 1400, effects: [
        effect(FIREBALL_CLIP_EFFECT_ID, "target", { duration: 750,
          clip: "aftermath", scale: 1, opacity: .72,
          particles: { count: 0 }, role: "fireball-aftermath-clip" }),
        effect("fire-embers", "target", { duration: 920, scale: 1.05,
          particles: { count: 8, distance: 54, size: 3 },
          role: "fireball-aftermath-embers" }),
        effect("fire-scorch", "target", { duration: 1380, scale: 1.25,
          opacity: .58, particles: { count: 0 }, role: "fireball-scorch",
          layer: "ground" })
      ] },
      cleanup: { duration: 0, effects: [] }
    }
  });
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

function makeFireBoltCastingSequence() {
  return deepFreeze({
    id: "fire-bolt",
    label: "Fire Bolt",
    priority: 100,
    match: {
      spellIds: ["fire-bolt"],
      damageTypes: ["fire"],
      deliveryTypes: ["projectile"]
    },
    phases: {
      charge: {
        duration: 240,
        effects: [
          effect("fire-glow", "caster", {
            duration: 340,
            scale: 0.56,
            role: "fire-bolt-charge"
          }),
          effect("fire-embers", "caster", {
            duration: 420,
            particles: { count: 5, distance: 26, size: 3 },
            scale: 0.58,
            role: "fire-bolt-charge-embers"
          })
        ]
      },
      release: {
        duration: 100,
        effects: [
          effect("fire-glow", "caster", {
            duration: 240,
            scale: 0.76,
            role: "fire-bolt-release"
          }),
          effect("fire-flames", "caster", {
            duration: 320,
            particles: { count: 6, distance: 28, size: 6 },
            scale: 0.58,
            role: "fire-bolt-release-flames"
          })
        ]
      },
      travel: {
        duration: 420,
        effects: [
          effect(FIRE_BOLT_PROJECTILE_EFFECT_ID, "path", {
            duration: 420,
            role: "fire-bolt-projectile"
          }),
          effect("fire-trail", "path", {
            duration: 420,
            scale: 0.62,
            role: "fire-bolt-trail"
          })
        ]
      },
      impact: {
        duration: 280,
        effects: [
          effect(FIRE_BOLT_IMPACT_EFFECT_ID, "target", {
            duration: 520,
            scale: 0.72,
            role: "fire-bolt-impact-sprite"
          }),
          effect("fire-explosion", "target", {
            duration: 420,
            particles: { count: 12, distance: 54, size: 5 },
            scale: 0.55,
            role: "fire-bolt-impact-fallback"
          }),
          effect("fire-flames", "target", {
            duration: 420,
            particles: { count: 8, distance: 34, size: 6 },
            scale: 0.58,
            role: "fire-bolt-impact-flames"
          })
        ]
      },
      aftermath: {
        duration: 920,
        effects: [
          effect("fire-embers", "target", {
            duration: 900,
            particles: { count: 12, distance: 52, size: 3 },
            scale: 0.7,
            role: "fire-bolt-ember-fade"
          })
        ]
      },
      cleanup: {}
    }
  });
}

export const FIRE_CASTING_SEQUENCE_DEFINITIONS = Object.freeze([
  makeFireBoltCastingSequence(),
  makeFireballCastingSequence(),
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
