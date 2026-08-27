import {
  defineDamageTypeVisual
} from "./registry.js";

const MYSTIC_INTENSITY = Object.freeze({
  particleCount: [0.5, 0.75, 1, 1.32, 1.7],
  glowStrength: [0.58, 0.8, 1, 1.34, 1.72],
  impactScale: [0.68, 0.84, 1, 1.28, 1.65],
  trailDensity: [0.5, 0.74, 1, 1.22, 1.45],
  aftermathDuration: [0.5, 0.75, 1, 1.3, 1.65],
  feedbackStrength: [0.2, 0.42, 0.7, 1, 1.28]
});

export const MYSTIC_DAMAGE_TYPE_VISUALS = Object.freeze([
  defineDamageTypeVisual({
    id: "necrotic",
    label: "Necrotic",
    family: "mystic",
    palette: {
      primary: "#7052a3",
      secondary: "#c0a3df",
      glow: "#44296d",
      aftermath: "#241c2d"
    },
    particleStyle: {
      style: "black-ash",
      behavior: "inward-drain",
      count: 17,
      size: 6,
      distance: 62,
      duration: 1250
    },
    glowBehavior: {
      style: "void-bloom",
      strength: 1.05,
      pulse: true
    },
    impactBehavior: {
      style: "life-drain-collapse",
      scale: 1.08,
      duration: 900
    },
    trailBehavior: {
      style: "shadow-wisps",
      density: 0.64,
      width: 1.2,
      fadeDuration: 880
    },
    aftermathBehavior: {
      style: "withering-ash",
      opacity: 0.48,
      duration: 4100,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "dark-vignette-pulse",
      cameraEffect: "subtle-pulse",
      strength: 0.18
    },
    intensityScaling: MYSTIC_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "radiant",
    label: "Radiant",
    family: "mystic",
    palette: {
      primary: "#fff3a1",
      secondary: "#ffffff",
      glow: "#ffd75e",
      aftermath: "#e8dca1"
    },
    particleStyle: {
      style: "light-motes",
      behavior: "outward-rise",
      count: 18,
      size: 5,
      distance: 70,
      duration: 980
    },
    glowBehavior: {
      style: "divine-bloom",
      strength: 1.35,
      pulse: true
    },
    impactBehavior: {
      style: "radiant-flash",
      scale: 1.12,
      duration: 680
    },
    trailBehavior: {
      style: "light-streak",
      density: 0.66,
      width: 1.05,
      fadeDuration: 540
    },
    aftermathBehavior: {
      style: "lingering-rays",
      opacity: 0.42,
      duration: 2600,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "bright-flash",
      cameraEffect: "impact-pulse",
      strength: 0.2
    },
    intensityScaling: MYSTIC_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "psychic",
    label: "Psychic",
    family: "mystic",
    palette: {
      primary: "#ff6fe7",
      secondary: "#7ee7ff",
      glow: "#b151e5",
      aftermath: "#50345e"
    },
    particleStyle: {
      style: "glyph-fragments",
      behavior: "orbit-and-warp",
      count: 13,
      size: 6,
      distance: 66,
      duration: 1150
    },
    glowBehavior: {
      style: "chromatic-aura",
      strength: 1.02,
      pulse: true
    },
    impactBehavior: {
      style: "mind-ripple",
      scale: 1.1,
      duration: 820
    },
    trailBehavior: {
      style: "distortion-ribbon",
      density: 0.5,
      width: 1.5,
      fadeDuration: 760
    },
    aftermathBehavior: {
      style: "fading-glyphs",
      opacity: 0.38,
      duration: 2400,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "chromatic-pulse",
      cameraEffect: "micro-zoom",
      strength: 0.16
    },
    intensityScaling: MYSTIC_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "force",
    label: "Force",
    family: "mystic",
    palette: {
      primary: "#9d8cff",
      secondary: "#d9d2ff",
      glow: "#7561ff",
      aftermath: "#7d789a"
    },
    particleStyle: {
      style: "arcane-fragments",
      behavior: "outward-burst",
      count: 15,
      size: 5,
      distance: 72,
      duration: 720
    },
    glowBehavior: {
      style: "arcane-core",
      strength: 1.12,
      pulse: true
    },
    impactBehavior: {
      style: "concussive-sphere",
      scale: 1.12,
      duration: 640
    },
    trailBehavior: {
      style: "clean-energy-ribbon",
      density: 0.7,
      width: 1,
      fadeDuration: 480
    },
    aftermathBehavior: {
      style: "fading-ripples",
      opacity: 0.34,
      duration: 1600,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "impact-pulse",
      cameraEffect: "short-shake",
      strength: 0.22
    },
    intensityScaling: MYSTIC_INTENSITY
  })
]);
