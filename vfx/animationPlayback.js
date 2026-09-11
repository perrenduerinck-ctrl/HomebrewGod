const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function animationFrames(d) {
  let frames = d.frames.sequence.length ? [...d.frames.sequence] : Array.from({ length: d.frames.count }, (_, i) => i + d.frames.start);
  if (frames.some(n => !Number.isInteger(n) || n < 0 || n >= d.grid.columns * d.grid.rows)) throw new Error("Custom frame sequence contains a cell outside the sheet.");
  if (d.frames.reverse) frames.reverse();
  if (d.playback === "pingpong" && frames.length > 2) frames = [...frames, ...frames.slice(1, -1).reverse()];
  return frames;
}
export function chooseAnimationVariation(d, random = Math.random) {
  const signed = amount => amount ? (clamp(Number(random()) || 0, 0, 1) * 2 - 1) * amount : 0;
  return Object.freeze({ rotation: signed(d.variation.rotation), scale: 1 + signed(d.variation.scale),
    offsetX: signed(d.variation.offsetX), offsetY: signed(d.variation.offsetY), speed: 1 + signed(d.variation.speed) });
}
export function projectileEndpoints(d, source, target) {
  const dx = target.x - source.x, dy = target.y - source.y, distance = Math.hypot(dx, dy), ux = distance ? dx / distance : 1, uy = distance ? dy / distance : 0;
  const totalOffset = d.projectile.startOffset + d.projectile.endOffset;
  const ratio = totalOffset > distance ? distance / Math.max(1, totalOffset) : 1;
  return { source: { x: source.x + ux * d.projectile.startOffset * ratio, y: source.y + uy * d.projectile.startOffset * ratio },
    target: { x: target.x - ux * d.projectile.endOffset * ratio, y: target.y - uy * d.projectile.endOffset * ratio }, distance: Math.max(0, distance - totalOffset) };
}
export function animationTiming(d, variation, source, target, limit) {
  const speed = d.timing.speed * variation.speed;
  const frames = animationFrames(d), cycle = frames.length * 1000 / (d.fps * speed);
  const repeating = ["loop", "pingpong"].includes(d.playback);
  let indefinite = d.playback === "hold" || d.placement.persist || repeating && d.timing.loopCount === 0;
  const travel = d.behavior === "projectile" ? Math.max(1, projectileEndpoints(d, source, target).distance / (d.projectile.speed * speed) * 1000) : 0;
  let active = travel || cycle * (repeating ? Math.max(1, d.timing.loopCount) : 1);
  if (travel) indefinite = false;
  if (d.placement.duration > 0) { active = d.placement.duration * 1000; indefinite = false; }
  if (limit !== undefined) {
    if (!Number.isFinite(Number(limit)) || Number(limit) <= 0 || Number(limit) > 60000) throw new Error("Loop duration must be between 1 and 60000 milliseconds.");
    if (indefinite) { active = Number(limit); indefinite = false; }
    else if (travel || d.placement.duration) active = Math.min(active, Number(limit));
  }
  const duration = active + d.timing.endDelay * 1000;
  if (!indefinite && duration > 60000) throw new Error("Animation playback must finish within 60 seconds. Increase speed or reduce frames, loops or delays.");
  return { frames, speed, cycle, travel: Math.min(travel, active), active, duration: Math.min(60000, duration), indefinite };
}
export function sampleAnimation(d, elapsed, { source, target, map }, variation, timing) {
  const progress = timing.travel ? clamp(elapsed / timing.travel, 0, 1) : 0;
  let point = d.placement.spawnAt === "source" ? source : d.placement.spawnAt === "target" ? target : d.placement.spawnAt === "between"
    ? { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 } : map;
  const endpoint = projectileEndpoints(d, source, target);
  if (d.behavior === "projectile") point = {
    x: endpoint.source.x + (endpoint.target.x - endpoint.source.x) * progress,
    y: endpoint.source.y + (endpoint.target.y - endpoint.source.y) * progress - (endpoint.distance ? 4 * d.projectile.arcHeight * progress * (1 - progress) : 0)
  };
  if (d.behavior === "beam") point = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  if (["source-to-target", "source-toward-target"].includes(d.placement.spawnAt) && !["projectile", "beam"].includes(d.behavior)) {
    const distance = Math.hypot(target.x - source.x, target.y - source.y), offset = d.placement.spawnAt === "source-toward-target" ? Math.min(distance, d.placement.towardOffset) : 0;
    point = { x: source.x + (distance ? (target.x - source.x) * offset / distance : 0), y: source.y + (distance ? (target.y - source.y) * offset / distance : 0) };
  }
  let dx = target.x - source.x, dy = target.y - source.y;
  if (d.behavior === "projectile" && timing.travel && (dx || dy)) dy -= 4 * d.projectile.arcHeight * (1 - 2 * progress);
  const facing = Math.atan2(dy, dx) * 180 / Math.PI;
  const sourceAngle = { right: 0, down: 90, left: 180, up: -90 }[d.direction.sourceDirection];
  const directed = d.direction.mode === "face-target" || d.direction.mode === "face-away" || ["projectile", "beam", "melee"].includes(d.behavior);
  const rotation = d.rotation + variation.rotation + (directed && (dx || dy) ? facing - sourceAngle + (d.direction.mode === "face-away" ? 180 : 0) : 0) + d.motionEffects.spin * elapsed / 1000;
  const pulse = (1 - Math.cos(elapsed / (d.motionEffects.pulsePeriod * 1000) * Math.PI * 2)) / 2;
  const fadeIn = d.appearance.fadeIn ? clamp(elapsed / (d.appearance.fadeIn * 1000), 0, 1) : 1;
  const fadeOut = d.appearance.fadeOut && !timing.indefinite ? clamp((timing.duration - elapsed) / (d.appearance.fadeOut * 1000), 0, 1) : 1;
  return { x: point.x + d.offsetX + variation.offsetX, y: point.y + d.offsetY + variation.offsetY,
    rotation, scale: d.scale * variation.scale * (1 + pulse * d.motionEffects.pulseScale),
    opacity: d.appearance.opacity * fadeIn * fadeOut * (1 - pulse * d.motionEffects.pulseOpacity), progress,
    distance: Math.hypot(target.x - source.x, target.y - source.y) };
}

export const ANIMATION_PRESETS = Object.freeze({
  explosion: { name: "Explosion", type: "Explosion", tags: ["explosion", "impact"], placement: { spawnAt: "target" } },
  slash: { name: "Melee Slash", type: "Melee Attack", tags: ["melee", "slash", "sword"], placement: { spawnAt: "source", followSource: true }, direction: { mode: "face-target" } },
  thrust: { name: "Melee Thrust", type: "Weapon Attack", tags: ["melee", "thrust", "spear"], placement: { spawnAt: "source", followSource: true }, direction: { mode: "face-target" } },
  projectile: { name: "Projectile", type: "Projectile", tags: ["ranged", "projectile"], behavior: "projectile", placement: { spawnAt: "source" }, direction: { mode: "face-target" } },
  beam: { name: "Beam", type: "Beam", tags: ["beam"], behavior: "beam", placement: { spawnAt: "between", followSource: true, followTarget: true }, direction: { mode: "face-target" } },
  aura: { name: "Aura", type: "Aura", tags: ["aura", "magic"], playback: "loop", timing: { loopCount: 0 }, placement: { spawnAt: "source", followSource: true } },
  buff: { name: "Buff", type: "Buff", tags: ["buff", "status"], playback: "loop", timing: { loopCount: 0 }, placement: { spawnAt: "target", followTarget: true } },
  debuff: { name: "Debuff", type: "Debuff", tags: ["debuff", "status"], playback: "loop", timing: { loopCount: 0 }, placement: { spawnAt: "target", followTarget: true } },
  ground: { name: "Ground Effect", type: "Persistent Effect", tags: ["ground", "environment"], playback: "loop", timing: { loopCount: 0 }, placement: { spawnAt: "map", persist: true }, appearance: { opacity: .65 }, transform: { lockProportions: false, scaleY: .55 } },
  impact: { name: "Impact", type: "Impact", tags: ["impact"], placement: { spawnAt: "target" } },
  summon: { name: "Summon", type: "Summoning", tags: ["magic", "circle"], placement: { spawnAt: "target" }, appearance: { fadeIn: .15, fadeOut: .2 } }
});
