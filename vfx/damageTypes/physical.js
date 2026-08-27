import {
  defineDamageTypeVisual
} from "./registry.js";

const PHYSICAL_INTENSITY = Object.freeze({
  particleCount: [0.45, 0.72, 1, 1.28, 1.6],
  glowStrength: [0.5, 0.72, 1, 1.2, 1.42],
  impactScale: [0.65, 0.84, 1, 1.3, 1.68],
  trailDensity: [0.45, 0.72, 1, 1.2, 1.4],
  aftermathDuration: [0.42, 0.7, 1, 1.25, 1.55],
  feedbackStrength: [0.25, 0.5, 0.75, 1, 1.3]
});

export const PHYSICAL_DAMAGE_TYPE_VISUALS = Object.freeze([
  defineDamageTypeVisual({
    id: "bludgeoning",
    label: "Bludgeoning",
    family: "physical",
    palette: {
      primary: "#b8a58c",
      secondary: "#e2d4bf",
      glow: "#d3c09f",
      aftermath: "#685d50"
    },
    particleStyle: {
      style: "debris",
      behavior: "ground-bounce",
      count: 14,
      size: 7,
      distance: 58,
      duration: 850
    },
    glowBehavior: {
      style: "dust-halo",
      strength: 0.38,
      pulse: false
    },
    impactBehavior: {
      style: "blunt-shockwave",
      scale: 1.15,
      duration: 580
    },
    trailBehavior: {
      style: "dust-wake",
      density: 0.34,
      width: 1.4,
      fadeDuration: 500
    },
    aftermathBehavior: {
      style: "settling-debris",
      opacity: 0.36,
      duration: 1700,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "impact-pulse",
      cameraEffect: "short-shake",
      strength: 0.32
    },
    intensityScaling: PHYSICAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "piercing",
    label: "Piercing",
    family: "physical",
    palette: {
      primary: "#d7dde8",
      secondary: "#ffffff",
      glow: "#b7c8e5",
      aftermath: "#7a8190"
    },
    particleStyle: {
      style: "sharp-fragments",
      behavior: "directional-spray",
      count: 10,
      size: 4,
      distance: 54,
      duration: 600
    },
    glowBehavior: {
      style: "point-gleam",
      strength: 0.58,
      pulse: false
    },
    impactBehavior: {
      style: "puncture-flash",
      scale: 0.78,
      duration: 420
    },
    trailBehavior: {
      style: "narrow-streak",
      density: 0.4,
      width: 0.45,
      fadeDuration: 360
    },
    aftermathBehavior: {
      style: "fading-fragments",
      opacity: 0.3,
      duration: 900,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "tiny-flash",
      cameraEffect: "subtle-pulse",
      strength: 0.12
    },
    intensityScaling: PHYSICAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "slashing",
    label: "Slashing",
    family: "physical",
    palette: {
      primary: "#e4e8ef",
      secondary: "#ffffff",
      glow: "#c4d3eb",
      aftermath: "#7c8492"
    },
    particleStyle: {
      style: "edge-sparks",
      behavior: "directional-slice",
      count: 11,
      size: 4,
      distance: 62,
      duration: 560
    },
    glowBehavior: {
      style: "edge-gleam",
      strength: 0.62,
      pulse: false
    },
    impactBehavior: {
      style: "slash-flash",
      scale: 0.92,
      duration: 460
    },
    trailBehavior: {
      style: "arc-streak",
      density: 0.46,
      width: 0.62,
      fadeDuration: 400
    },
    aftermathBehavior: {
      style: "fading-cuts",
      opacity: 0.3,
      duration: 1000,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "tiny-flash",
      cameraEffect: "subtle-pulse",
      strength: 0.14
    },
    intensityScaling: PHYSICAL_INTENSITY
  })
]);
