// User-supplied art is shared by spell-specific, presentation-only sequences.
// Single images are oriented in CSS; sheets are 4x4, read left-to-right.
const asset = (name) => `./assets/vfx/cantrips/${name}.png`;

function sprite(id, file, { sheet = false, className, angle = 0, tipX = 50, tipY = 50 } = {}) {
  return Object.freeze({
    id,
    kind: "sprite",
    className: className || (sheet ? "cantrip-impact-sprite" : "cantrip-projectile-sprite"),
    sprite: Object.freeze({
      src: asset(file),
      frameWidth: sheet ? 160 : 256,
      frameHeight: sheet ? 160 : 256,
      frameCount: sheet ? 16 : 1,
      columns: sheet ? 4 : 1,
      rows: sheet ? 4 : 1,
      framesPerSecond: 20,
      loops: 1,
      loop: false,
      removeOnComplete: sheet
    }),
    configureElement({ element }) {
      element.style.setProperty("--hg-vfx-art-angle", `${angle}deg`);
      element.style.setProperty("--hg-vfx-tip-x", `${tipX}%`);
      element.style.setProperty("--hg-vfx-tip-y", `${tipY}%`);
    }
  });
}

export const CANTRIP_EFFECT_DEFINITIONS = Object.freeze([
  sprite("frost-projectile-sprite", "frost-projectile", { angle: 32, tipX: 97, tipY: 20 }),
  sprite("force-projectile-sprite", "force-projectile", { angle: 45, tipX: 94, tipY: 14 }),
  sprite("frost-impact-sprite", "frost-impact", { sheet: true }),
  sprite("force-impact-sprite", "force-impact", { sheet: true }),
  sprite("lightning-impact-sprite", "lightning-impact", { sheet: true }),
  sprite("radiant-impact-sprite", "radiant-impact", { sheet: true }),
  sprite("radiant-strike-sprite", "radiant-projectile", {
    className: "cantrip-radiant-strike", angle: 135, tipX: 94, tipY: 9
  })
]);

function effect(type, anchor, duration, scale = 1, extra = {}) {
  return { type, anchor, duration, scale, ...extra };
}

function sequence({ id, label, damageType, projectile, impact, targetOnly = false }) {
  return Object.freeze({
    id, label, priority: 100,
    match: { spellIds: [id], damageTypes: [damageType] },
    phases: {
      charge: {
        duration: 160,
        effects: [effect("procedural-pulse", targetOnly ? "target" : "caster", 220, 0.35)]
      },
      release: { duration: 80, effects: [] },
      travel: {
        duration: projectile ? 460 : 0,
        effects: projectile ? [effect(projectile, "path", 460)] : []
      },
      impact: {
        duration: 800,
        effects: [
          effect(impact, "target", 800, 0.85),
          ...(id === "sacred-flame"
            ? [effect("radiant-impact-sprite", "target", 800, 0.85, { metadata: { role: "landing" } })] : []),
          effect("procedural-pulse", "target", 400, 0.65, {
            opacity: 0.6, particles: { count: 5, distance: 28, size: 3 }
          })
        ]
      },
      aftermath: { duration: 120, effects: [] },
      cleanup: {}
    }
  });
}

export const CANTRIP_CASTING_SEQUENCE_DEFINITIONS = Object.freeze([
  sequence({ id: "ray-of-frost", label: "Ray of Frost", damageType: "cold",
    projectile: "frost-projectile-sprite", impact: "frost-impact-sprite" }),
  sequence({ id: "eldritch-blast", label: "Eldritch Blast", damageType: "force",
    projectile: "force-projectile-sprite", impact: "force-impact-sprite" }),
  sequence({ id: "frostbite", label: "Frostbite", damageType: "cold",
    impact: "frost-impact-sprite", targetOnly: true }),
  sequence({ id: "shocking-grasp", label: "Shocking Grasp", damageType: "lightning",
    impact: "lightning-impact-sprite" }),
  sequence({ id: "sacred-flame", label: "Sacred Flame", damageType: "radiant",
    impact: "radiant-strike-sprite", targetOnly: true })
]);

export function getCantripSpritePaths(spellId) {
  const definition = CANTRIP_CASTING_SEQUENCE_DEFINITIONS.find((entry) => entry.id === spellId);
  const types = new Set(Object.values(definition?.phases || {})
    .flatMap((phase) => phase.effects || []).map((entry) => entry.type));
  return CANTRIP_EFFECT_DEFINITIONS.filter((entry) => types.has(entry.id))
    .map((entry) => entry.sprite.src);
}

const assetLoads = new Map();
export function preloadCantripSprites(spellId) {
  if (typeof Image !== "function") return Promise.resolve();
  return Promise.all(getCantripSpritePaths(spellId).map((src) => {
    if (!assetLoads.has(src)) {
      assetLoads.set(src, new Promise((resolve) => {
        const image = new Image();
        const timer = setTimeout(resolve, 3000);
        const finish = () => { clearTimeout(timer); resolve(); };
        image.onerror = finish;
        image.onload = () => {
          if (typeof image.decode === "function") image.decode().then(finish, finish);
          else finish();
        };
        image.src = src;
      }));
    }
    return assetLoads.get(src);
  }));
}
