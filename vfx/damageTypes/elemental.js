import {
  defineDamageTypeVisual
} from "./registry.js";

const ELEMENTAL_INTENSITY = Object.freeze({
  particleCount: [0.55, 0.8, 1, 1.4, 1.85],
  glowStrength: [0.6, 0.8, 1, 1.3, 1.65],
  impactScale: [0.65, 0.82, 1, 1.3, 1.7],
  trailDensity: [0.55, 0.78, 1, 1.25, 1.5],
  aftermathDuration: [0.45, 0.7, 1, 1.35, 1.8],
  feedbackStrength: [0.2, 0.45, 0.7, 1, 1.3]
});

export const ELEMENTAL_DAMAGE_TYPE_VISUALS = Object.freeze([
  defineDamageTypeVisual({
    id: "fire",
    label: "Fire",
    family: "elemental",
    palette: {
      primary: "#ff6b1a",
      secondary: "#ffd166",
      glow: "#ff3d00",
      aftermath: "#3b2418"
    },
    particleStyle: {
      style: "embers",
      behavior: "buoyant-rise",
      count: 18,
      size: 5,
      distance: 68,
      duration: 900
    },
    glowBehavior: {
      style: "hot-radial",
      strength: 1.2,
      pulse: true
    },
    impactBehavior: {
      style: "flame-explosion",
      scale: 1.15,
      duration: 720
    },
    trailBehavior: {
      style: "ember-stream",
      density: 0.72,
      width: 1.2,
      fadeDuration: 620
    },
    aftermathBehavior: {
      style: "smoke-and-scorch",
      opacity: 0.5,
      duration: 4200,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "warm-flash",
      cameraEffect: "impact-pulse",
      strength: 0.24
    },
    intensityScaling: ELEMENTAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "cold",
    label: "Cold",
    family: "elemental",
    palette: {
      primary: "#8fe8ff",
      secondary: "#e6fbff",
      glow: "#40c9ff",
      aftermath: "#bdefff"
    },
    particleStyle: {
      style: "ice-shards",
      behavior: "shatter-and-drift",
      count: 15,
      size: 5,
      distance: 58,
      duration: 1050
    },
    glowBehavior: {
      style: "frost-halo",
      strength: 1,
      pulse: false
    },
    impactBehavior: {
      style: "ice-shatter",
      scale: 1.05,
      duration: 780
    },
    trailBehavior: {
      style: "frost-mist",
      density: 0.58,
      width: 1.3,
      fadeDuration: 800
    },
    aftermathBehavior: {
      style: "frost-patch",
      opacity: 0.48,
      duration: 3800,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "cool-flash",
      cameraEffect: "subtle-pulse",
      strength: 0.16
    },
    intensityScaling: ELEMENTAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "lightning",
    label: "Lightning",
    family: "elemental",
    palette: {
      primary: "#77e6ff",
      secondary: "#fff58a",
      glow: "#39bfff",
      aftermath: "#69758d"
    },
    particleStyle: {
      style: "electric-sparks",
      behavior: "jitter-and-branch",
      count: 20,
      size: 3,
      distance: 82,
      duration: 520
    },
    glowBehavior: {
      style: "electric-strobe",
      strength: 1.35,
      pulse: true
    },
    impactBehavior: {
      style: "arc-flash",
      scale: 1.05,
      duration: 420
    },
    trailBehavior: {
      style: "branching-arc",
      density: 0.82,
      width: 0.75,
      fadeDuration: 280
    },
    aftermathBehavior: {
      style: "fading-sparks",
      opacity: 0.45,
      duration: 1500,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "sharp-flash",
      cameraEffect: "tiny-shake",
      strength: 0.22
    },
    intensityScaling: ELEMENTAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "thunder",
    label: "Thunder",
    family: "elemental",
    palette: {
      primary: "#b7c5ff",
      secondary: "#f1f5ff",
      glow: "#8093ff",
      aftermath: "#8c93a8"
    },
    particleStyle: {
      style: "pressure-rings",
      behavior: "radial-wave",
      count: 10,
      size: 7,
      distance: 96,
      duration: 650
    },
    glowBehavior: {
      style: "sonic-halo",
      strength: 0.75,
      pulse: true
    },
    impactBehavior: {
      style: "concussive-shockwave",
      scale: 1.25,
      duration: 620
    },
    trailBehavior: {
      style: "air-ripple",
      density: 0.35,
      width: 1.8,
      fadeDuration: 360
    },
    aftermathBehavior: {
      style: "dust-ring",
      opacity: 0.32,
      duration: 1300,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "impact-pulse",
      cameraEffect: "short-shake",
      strength: 0.34
    },
    intensityScaling: ELEMENTAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "acid",
    label: "Acid",
    family: "elemental",
    palette: {
      primary: "#9ee43f",
      secondary: "#e4ff76",
      glow: "#73c91f",
      aftermath: "#40521f"
    },
    particleStyle: {
      style: "caustic-droplets",
      behavior: "ballistic-splatter",
      count: 16,
      size: 6,
      distance: 54,
      duration: 980
    },
    glowBehavior: {
      style: "caustic-glow",
      strength: 0.9,
      pulse: false
    },
    impactBehavior: {
      style: "corrosive-splash",
      scale: 1.05,
      duration: 760
    },
    trailBehavior: {
      style: "dripping-stream",
      density: 0.62,
      width: 1.15,
      fadeDuration: 700
    },
    aftermathBehavior: {
      style: "sizzling-puddle",
      opacity: 0.46,
      duration: 4600,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "sickly-pulse",
      cameraEffect: "subtle-pulse",
      strength: 0.15
    },
    intensityScaling: ELEMENTAL_INTENSITY
  }),
  defineDamageTypeVisual({
    id: "poison",
    label: "Poison",
    family: "elemental",
    palette: {
      primary: "#8bd450",
      secondary: "#c4ef78",
      glow: "#6abf3a",
      aftermath: "#425d32"
    },
    particleStyle: {
      style: "toxic-spores",
      behavior: "swirl-and-rise",
      count: 14,
      size: 7,
      distance: 60,
      duration: 1300
    },
    glowBehavior: {
      style: "toxic-haze",
      strength: 0.72,
      pulse: false
    },
    impactBehavior: {
      style: "poison-puff",
      scale: 1.08,
      duration: 900
    },
    trailBehavior: {
      style: "vapor-ribbon",
      density: 0.54,
      width: 1.45,
      fadeDuration: 920
    },
    aftermathBehavior: {
      style: "lingering-cloud",
      opacity: 0.4,
      duration: 5200,
      persistent: false
    },
    preferredFeedback: {
      screenEffect: "sickly-vignette",
      cameraEffect: "none",
      strength: 0.1
    },
    intensityScaling: ELEMENTAL_INTENSITY
  })
]);
