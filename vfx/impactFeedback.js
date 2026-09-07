const freeze = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const IMPACT_FEEDBACK = freeze({
  small: { impactPunch: { enabled: true, amount: .06, durationRatio: .2 }, shake: false,
    hitStopMs: 0, flash: .08, ring: false, particles: 2 },
  medium: { impactPunch: { enabled: true, amount: .12, durationRatio: .18 },
    shake: { enabled: true, amplitude: 1.4, duration: 90 }, hitStopMs: 0, flash: .12, ring: true, particles: 4 },
  heavy: { impactPunch: { enabled: true, amount: .18, durationRatio: .18 },
    shake: { enabled: true, amplitude: 3, duration: 130 }, hitStopMs: 45, flash: .18, ring: true, particles: 7 },
  massive: { impactPunch: { enabled: true, amount: .24, durationRatio: .2 },
    shake: { enabled: true, amplitude: 4.5, duration: 180 }, hitStopMs: 70, flash: .24, ring: true, particles: 10 }
});

const SHOWCASE = Object.freeze({ fireball: "heavy", "thunderwave": "medium",
  "lightning-bolt": "medium", shatter: "medium", "meteor-swarm": "massive",
  earthquake: "massive", "destructive-wave": "heavy" });

export function getProfileImpactFeedback(profile, level) {
  const explicit = SHOWCASE[profile.spellId];
  const warranted = explicit || level >= 3 && profile.damageType &&
    ["burst", "ground-effect", "projectile-impact", "target-impact"].includes(profile.family) &&
    profile.screenShakeIntensity > 0;
  if (!warranted) return null;
  const name = explicit || (profile.screenShakeIntensity >= .75 ? "massive"
    : profile.screenShakeIntensity >= .4 ? "heavy" : "medium");
  const feedback = IMPACT_FEEDBACK[name];
  return { ...feedback, name, shake: { ...feedback.shake,
    amplitude: profile.screenShakeIntensity > 0 ? 6 * profile.screenShakeIntensity : feedback.shake.amplitude } };
}

export const VFX_AFTERMATH = freeze({
  fire: [ ["fire-smoke", "airborne"], ["fire-embers", "airborne"], ["fire-scorch", "ground"] ],
  cold: [ ["profile-mist", "ground"], ["profile-shard", "airborne"], ["profile-ground", "ground"] ],
  lightning: [ ["profile-sparkles", "airborne"], ["profile-ground", "ground"] ],
  acid: [ ["profile-splash", "airborne"], ["profile-ground", "ground"] ],
  poison: [ ["profile-mist", "ground"] ], necrotic: [ ["profile-mist", "airborne"] ],
  radiant: [ ["profile-sparkles", "airborne"] ], force: [ ["profile-ripple", "ground"] ]
});
