// Owner-supplied buff/debuff atlases. These are presentation-only effects;
// applying one never mutates conditions, rolls, hit points, or combat rules.
const asset = (path) => `${path}?v=restored-20260902`;
export const STATUS_SPRITE_ASSETS = Object.freeze({
  debuff: Object.freeze({
    poison: asset("./assets/vfx/status/debuffs/poison.png"),
    chill: asset("./assets/vfx/status/debuffs/chill.png"),
    silence: asset("./assets/vfx/status/debuffs/silence.png"),
    sleep: asset("./assets/vfx/status/debuffs/sleep.png"),
    confusion: asset("./assets/vfx/status/debuffs/confusion.png"),
    "hostile-flame": asset("./assets/vfx/status/debuffs/hostile-flame.png"),
    "ominous-eye": asset("./assets/vfx/status/debuffs/ominous-eye.png"),
    "power-down": asset("./assets/vfx/status/debuffs/power-down.png"),
    entangle: asset("./assets/vfx/status/debuffs/entangle.png"),
    shock: asset("./assets/vfx/status/debuffs/shock.png")
  }),
  buff: Object.freeze({
    blessing: asset("./assets/vfx/status/buffs/blessing.png"),
    haste: asset("./assets/vfx/status/buffs/haste.png"),
    shield: asset("./assets/vfx/status/buffs/shield.png"),
    regeneration: asset("./assets/vfx/status/buffs/regeneration.png"),
    "elemental-ward": asset("./assets/vfx/status/buffs/elemental-ward.png"),
    "radiant-weapon": asset("./assets/vfx/status/buffs/radiant-weapon.png"),
    barrier: asset("./assets/vfx/status/buffs/barrier.png"),
    truesight: asset("./assets/vfx/status/buffs/truesight.png"),
    armor: asset("./assets/vfx/status/buffs/armor.png"),
    "power-up": asset("./assets/vfx/status/buffs/power-up.png")
  })
});

// The buff sheets use full-bleed square cells with a narrow drawn grid. The
// debuff sheets use rounded cards with wider gutters. The animator crops only
// at runtime so the supplied pixels remain untouched on disk.
export const STATUS_ATLAS_BOUNDS = Object.freeze({
  buff: Object.freeze({
    columns: Object.freeze([6, 254, 502, 750, 998, 1247]),
    rows: Object.freeze([6, 254, 502, 750, 998, 1247]),
    inset: 5
  }),
  debuff: Object.freeze({
    columns: Object.freeze([0, 251, 502, 752, 1003, 1254]),
    rows: Object.freeze([0, 251, 502, 752, 1003, 1254]),
    inset: 18
  })
});

function defineStatusEffect(group, name, src) {
  return Object.freeze({
    id: `status-${group}-${name}`,
    kind: "sprite",
    className: "status-sprite",
    blendMode: "screen",
    sprite: Object.freeze({
      src,
      columns: 5,
      rows: 5,
      frameCount: 25,
      frameWidth: 160,
      frameHeight: 160,
      startFrame: 0,
      endFrame: 24,
      framesPerSecond: 20,
      fitDuration: true,
      loop: false,
      removeOnComplete: true,
      atlas: Object.freeze({
        width: 1254,
        height: 1254,
        ...STATUS_ATLAS_BOUNDS[group]
      })
    }),
    configureElement({ element }) {
      element.dataset.statusGroup = group;
      element.dataset.statusSprite = name;
    }
  });
}

export const STATUS_EFFECT_DEFINITIONS = Object.freeze(
  Object.entries(STATUS_SPRITE_ASSETS).flatMap(([group, assets]) =>
    Object.entries(assets).map(([name, src]) => defineStatusEffect(group, name, src)))
);

export function getStatusSpritePaths(effectIds = []) {
  const ids = new Set(effectIds);
  return STATUS_EFFECT_DEFINITIONS.filter(effect => ids.has(effect.id))
    .map(effect => effect.sprite.src);
}
