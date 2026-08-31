// Experimental, presentation-only override. One texture / one animator contains
// the charge, line discharge and endpoint fade; no per-token effects are used.
import { LIGHTNING_BOLT_SOUND } from "./spellAudio.js?v=lightning-sound-20260830";
export const LIGHTNING_5X5_ASSET = "./assets/vfx/lightning/lightning-bolt-main-5x5.png";
export const LIGHTNING_5X5_DURATION = Math.ceil(25 / 24 * 1000);
export const LIGHTNING_5X5_SEQUENCE_ID = "lightning-bolt-5x5-test";

export const LIGHTNING_5X5_EFFECTS = Object.freeze([
  Object.freeze({ id: "lightning5-charge", kind: "procedural", className: "lightning5-charge",
    particles: Object.freeze({ count: 0 }) }),
  Object.freeze({ id: "lightning5-main", kind: "sprite", className: "lightning5-main",
    blendMode: "screen",
    sprite: Object.freeze({ src: LIGHTNING_5X5_ASSET, columns: 5, rows: 5,
      frameCount: 25, frameWidth: 160, frameHeight: 160, framesPerSecond: 24,
      fitDuration: true, loop: false, removeOnComplete: true }),
    configureElement({ document, element }) {
      const stage = document.createElement("div");
      stage.className = "hg-lightning5-stage";
      // Art points southwest. Rotate the artwork, then fit its horizontal axis
      // to the path. The outer renderer alone owns the map's aimed rotation.
      stage.style.setProperty("--lightning-art-rotation", "-135deg");
      stage.appendChild(element.querySelector(".hg-vfx-sprite"));
      element.appendChild(stage);
    }
  })
]);

export const LIGHTNING_5X5_SEQUENCE = Object.freeze({
  id: LIGHTNING_5X5_SEQUENCE_ID, label: "Lightning Bolt · 5×5 test", priority: 100,
  family: "line", match: { spellIds: ["lightning-bolt"] },
  sound: { ...LIGHTNING_BOLT_SOUND, delay: Math.round(LIGHTNING_5X5_DURATION * .2) },
  phases: {
    charge: { duration: 120, effects: [{ type: "lightning5-charge", anchor: "caster",
      duration: 120, scale: .45, fullOnly: true, particles: { count: 0 } }] },
    release: { duration: 0, effects: [] },
    travel: { duration: LIGHTNING_5X5_DURATION, effects: [{ type: "lightning5-main", anchor: "path",
      duration: LIGHTNING_5X5_DURATION, scale: 1, particles: { count: 0 },
      metadata: { test: "lightning-5x5", damageType: "lightning", spriteFrames: 25 } }] },
    impact: { duration: 0, effects: [] },
    aftermath: { duration: 0, effects: [] },
    cleanup: { duration: 0, effects: [] }
  }
});
