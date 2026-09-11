import { ANIMATION_TYPES, ANIMATION_TAGS } from "./animationLibrary.js";
import { ANIMATION_PRESETS } from "./animationPlayback.js";

const select = (key, label, options) => `<label>${label}<select data-animation-${key}>${options.map(o => { const [value, text] = Array.isArray(o) ? o : [o, o]; return `<option value="${value}">${text}</option>`; }).join("")}</select></label>`;
const input = (key, label, min, max, step = 1, kind = "number") => `<label>${label}<span class="hg-animation-input-line"><input data-animation-${key} type="${kind}" min="${min}" max="${max}" step="${step}">${kind === "range" ? `<output data-animation-value-for="${key}"></output>` : ""}</span></label>`;
const toggle = (key, label, extra = "") => `<label class="hg-animation-toggle" ${extra}><input data-animation-${key} type="checkbox">${label}</label>`;
const group = body => `<div class="hg-animation-form-grid">${body}</div>`;
const section = (key, label, body, advanced = false, open = false) => `<details class="hg-animation-section" data-section="${key}" ${advanced ? "data-advanced" : ""} ${open ? "open" : ""}><summary>${label}</summary><div class="hg-animation-section-body">${body}</div></details>`;

// Input names retain the compact creator's public UI hooks. Percent controls
// are converted at the boundary; saved values are normalized fractions.
export const EDITOR_FIELDS = {
  name: ["name", "", "text"], "editor-type": ["type", "Other", "text"], tags: ["tags", [], "tags"], description: ["description", "", "text"],
  collections: ["collections", [], "tags"], "toward-offset": ["placement.towardOffset", 40], "visual-reach": ["placement.visualReach", 0], "fixed-map": ["placement.fixedToMap", false, "check"],
  "area-shape": ["area.shape", "point", "text"], "area-unit": ["area.unit", "ft", "text"], "area-radius": ["area.radius", 0], "area-width": ["area.width", 0], "area-length": ["area.length", 0],
  columns: ["grid.columns", 6], rows: ["grid.rows", 6], frames: ["frameCount", 36], start: ["frames.start", 0], end: ["frames.end", 35], reverse: ["frames.reverse", false, "check"],
  fps: ["fps", 24], scale: ["scale", 1], playback: ["playback", "once", "text"], speed: ["timing.speed", 1], loops: ["timing.loopCount", 1], "start-delay": ["timing.startDelay", 0], "end-delay": ["timing.endDelay", 0],
  lock: ["transform.lockProportions", true, "check"], "scale-x": ["transform.scaleX", 1], "scale-y": ["transform.scaleY", 1], "offset-x": ["offsetX", 0], "offset-y": ["offsetY", 0], "anchor-x": ["anchorX", .5], "anchor-y": ["anchorY", .5],
  rotation: ["rotation", 0], "flip-x": ["flipX", false, "check"], "flip-y": ["flipY", false, "check"], facing: ["direction.mode", "fixed", "text"], "source-direction": ["direction.sourceDirection", "right", "text"],
  spawn: ["placement.spawnAt", "map", "text"], "follow-source": ["placement.followSource", false, "check"], "follow-target": ["placement.followTarget", false, "check"], persist: ["placement.persist", false, "check"], duration: ["placement.duration", 0], behavior: ["behavior", "static", "text"],
  "travel-speed": ["projectile.speed", 300], "travel-start": ["projectile.startOffset", 0], "travel-end": ["projectile.endOffset", 0], arc: ["projectile.arcHeight", 0], thickness: ["beam.thickness", 24],
  opacity: ["appearance.opacity", 1, "percent"], "tint-strength": ["appearance.tintStrength", .5, "percent"], blend: ["appearance.blendMode", "normal", "text"], "fade-in": ["appearance.fadeIn", 0], "fade-out": ["appearance.fadeOut", 0],
  brightness: ["appearance.brightness", 1, "percent"], contrast: ["appearance.contrast", 1, "percent"], saturation: ["appearance.saturation", 1, "percent"], hue: ["appearance.hue", 0],
  spin: ["motionEffects.spin", 0], "pulse-scale": ["motionEffects.pulseScale", 0, "percent"], "pulse-opacity": ["motionEffects.pulseOpacity", 0, "percent"], "pulse-period": ["motionEffects.pulsePeriod", 1],
  "random-rotation": ["variation.rotation", 0], "random-scale": ["variation.scale", 0, "percent"], "random-x": ["variation.offsetX", 0], "random-y": ["variation.offsetY", 0], "random-speed": ["variation.speed", 0, "percent"],
  "sound-volume": ["sound.volume", .5, "percent"], "sound-frame": ["sound.startFrame", 0], "sound-rate": ["sound.playbackRate", 1]
};

export function animationFormMarkup() {
  return `<div class="hg-animation-edit-heading"><h3 data-animation-editor-title>Create animation</h3>${toggle("advanced-mode", "Advanced Settings")}</div>
    <div class="hg-animation-preset-bar">${select("preset", "Start with a preset", [["", "Choose a starting point"], ...Object.entries(ANIMATION_PRESETS).map(([key, p]) => [key, p.name])])}<button type="button" data-animation-apply-preset>Apply preset</button></div>
    ${section("basic", "Basic", group(`<label>Name<input data-animation-name maxlength="120" required placeholder="My new effect"></label>${select("editor-type", "Type", ANIMATION_TYPES)}`) +
      `<label>Tags<input data-animation-tags placeholder="sword, slash, melee, heavy" maxlength="1200"><small>Separate tags with commas. Custom tags are welcome.</small></label>
      <div class="hg-animation-tag-suggestions">${ANIMATION_TAGS.slice(0, 10).map(tag => `<button type="button" data-add-tag="${tag}">${tag}</button>`).join("")}</div>
      <label data-advanced>Collections<input data-animation-collections placeholder="My fire spells, Sword pack"><small>Comma-separated groups. An animation can belong to several.</small></label>
      <label data-advanced>Description<textarea data-animation-description maxlength="1000" rows="2" placeholder="What makes this effect useful?"></textarea></label>`, false, true)}
    ${section("sprite", "Sprite Sheet", `<div data-animation-upload-zone><label class="hg-animation-upload">Drop a sprite sheet here or choose a file<input data-animation-file type="file" accept="image/png,image/webp,image/jpeg"><small>PNG, WebP or JPEG · up to 8 MB</small></label><img data-animation-upload-thumbnail alt="Uploaded sprite sheet" hidden style="max-width:120px;max-height:100px"><button type="button" data-animation-replace-sprite>Replace Sprite</button></div><p data-animation-file-info class="hg-animation-hint"></p>
      ${group(select("grid", "Grid preset", [4,5,6,7,8].map(n => [n, `${n} × ${n}`]).concat([["custom", "Custom"]])) + input("frames", "Frames to play", 1, 240))}
      <div data-animation-custom-grid hidden>${group(input("columns", "Grid columns", 1, 240) + input("rows", "Grid rows", 1, 240))}</div>
      <div data-advanced>${group(input("start", "Starting frame (0-based)", 0, 57599) + input("end", "Ending frame (inclusive)", 0, 57599))}${toggle("reverse", "Reverse frame order")}
      <label>Custom frame sequence (optional)<input data-animation-sequence placeholder="0, 1, 2, 3, 5, 7, 9"><small>Leave empty to use the frame range above.</small></label></div>
      <div data-animation-sheet-stats class="hg-animation-sheet-stats" aria-live="polite">Upload a sheet to inspect its cells and transparency.</div>`, false, true)}
    ${section("playback", "Playback", group(input("fps", "FPS", 1, 60) + select("playback", "Playback mode", [["once", "Once"], ["loop", "Loop"], ["pingpong", "Ping Pong"], ["hold", "Hold Last Frame"]])) +
      `<div data-advanced>${group(input("speed", "Playback speed ×", .05, 8, .05) + input("loops", "Loop count (0 = Infinite)", 0, 100) + input("start-delay", "Start delay (seconds)", 0, 10, .05) + input("end-delay", "End delay (seconds)", 0, 10, .05))}</div>`, false, true)}
    ${section("size", "Size & Position", input("scale", "Uniform scale ×", .1, 8, .1) + `<div data-advanced>${toggle("lock", "Lock proportions")}
      <div data-animation-axis-scale>${group(input("scale-x", "Width scale ×", .1, 8, .1) + input("scale-y", "Height scale ×", .1, 8, .1))}</div>
      ${group(input("offset-x", "Offset X (px)", -10000, 10000) + input("offset-y", "Offset Y (px)", -10000, 10000))}
      <span class="hg-animation-field-label">Anchor / pivot</span><div class="hg-animation-pivots" role="group" aria-label="Anchor / pivot">${["Top Left", "Top", "Top Right", "Left", "Center", "Right", "Bottom Left", "Bottom", "Bottom Right"].map((name, i) => `<button type="button" data-anchor="${i % 3 / 2},${Math.floor(i / 3) / 2}" title="${name}" aria-label="${name}">◉</button>`).join("")}</div>
      ${group(select("spawn", "Spawn position", [["source", "Caster / Source"], ["target", "Target"], ["between", "Midpoint"], ["map", "World / Map position"], ["source-to-target", "Source to target"], ["source-toward-target", "Source toward target"]]) + select("behavior", "Animation behavior", [["static", "Static"], ["source-effect", "Source Effect"], ["target-effect", "Target Effect"], ["melee", "Melee"], ["projectile", "Projectile"], ["beam", "Beam"], ["aura", "Aura"], ["ground", "Ground Effect"], ["screen", "Screen Effect"], ["summon", "Summon"], ["attached", "Attached Effect"]]))}
      ${group(input("toward-offset", "Offset toward target (px)", 0, 1000) + input("visual-reach", "Visual reach (ft, optional)", 0, 1000))}${toggle("fixed-map", "Fixed to map")}
      ${group(select("area-shape", "Visual area", ["point", "circle", "cone", "line", "rectangle", "self"]) + select("area-unit", "Area units", ["ft", "px"]) + input("area-radius", "Radius (0 = manual size)", 0, 1000) + input("area-width", "Area width", 0, 1000) + input("area-length", "Area length", 0, 1000))}<p class="hg-animation-hint">Feet use the supplied map grid. Scale remains an additional multiplier.</p>
      ${toggle("follow-source", "Follow source")}${toggle("follow-target", "Follow target")}${toggle("persist", "Persist after animation")}
      ${input("duration", "Duration (seconds, 0 = automatic / until Stop)", 0, 60, .1)}
      <div data-animation-projectile-fields>${group(input("travel-speed", "Travel speed (px / second)", 10, 5000, 10) + input("arc", "Arc height (px)", -1000, 1000) + input("travel-start", "Start offset (px)", 0, 1000) + input("travel-end", "End offset (px)", 0, 1000))}<p class="hg-animation-hint">Projectiles face their travel direction. No physics or gameplay changes.</p></div>
      <div data-animation-beam-fields>${input("thickness", "Beam thickness (px)", 1, 512)}<p class="hg-animation-hint">The sprite stretches along its source direction to span both tokens.</p></div></div>`, false, true)}
    ${section("direction", "Direction", group(input("rotation", "Rotation (degrees)", -3600, 3600) + select("facing", "Auto face target", [["fixed", "Fixed"], ["face-target", "Face Target"]]) + select("source-direction", "Source direction in the artwork", [["up", "Up ↑"], ["right", "Right →"], ["down", "Down ↓"], ["left", "Left ←"]])) + toggle("flip-x", "Flip Horizontal") + toggle("flip-y", "Flip Vertical"), true)}
    ${section("visual", "Visual Effects", input("opacity", "Opacity %", 0, 100, 1, "range") + toggle("tint-enabled", "Tint") + `<div data-animation-tint-fields>${group('<label>Tint color<input data-animation-tint type="color" value="#6688ff"></label>' + input("tint-strength", "Tint strength %", 0, 100, 1, "range"))}</div>` +
      group(select("blend", 'Blend mode <span title="Changes how the animation mixes with the map underneath.">ⓘ</span>', [["normal", "Normal"], ["screen", "Screen"], ["plus-lighter", "Additive"], ["multiply", "Multiply"]]) + input("fade-in", "Fade in (seconds)", 0, 10, .05) + input("fade-out", "Fade out (seconds)", 0, 10, .05)), true)}
    ${section("advanced", "Advanced", `<h4>Numeric pivot</h4>${group(input("anchor-x", "Anchor X", 0, 1, .05) + input("anchor-y", "Anchor Y", 0, 1, .05))}
      <h4>Color adjustments</h4>${group(input("brightness", "Brightness %", 0, 400, 5, "range") + input("contrast", "Contrast %", 0, 400, 5, "range") + input("saturation", "Saturation %", 0, 400, 5, "range") + input("hue", "Hue rotation (degrees)", -360, 360, 1, "range"))}
      <h4>Motion</h4>${group(input("spin", "Spin ° / second (+ clockwise, − counterclockwise)", -1440, 1440, 10) + input("pulse-scale", "Scale pulse %", 0, 100) + input("pulse-opacity", "Opacity pulse %", 0, 100) + input("pulse-period", "Pulse period (seconds)", .1, 10, .1))}
      <h4>Random variation per playback</h4>${group(input("random-rotation", "Rotation ± degrees", 0, 180) + input("random-scale", "Scale ± %", 0, 90) + input("random-x", "Offset X ± px", 0, 1000) + input("random-y", "Offset Y ± px", 0, 1000) + input("random-speed", "Speed ± %", 0, 90))}`, true)}
    ${section("sound", "Sound · optional", `<label>Sound file<input data-animation-sound-file type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4"></label><p data-animation-sound-info class="hg-animation-hint">No sound</p><button type="button" data-animation-sound-clear>Remove sound</button>` + group(input("sound-volume", "Volume %", 0, 100, 1, "range") + input("sound-frame", "Start frame (0-based)", 0, 57599) + input("sound-rate", "Playback rate ×", .25, 4, .05)), true)}
    <div class="hg-animation-save-bar"><button data-animation-draft-preview type="button">Preview draft</button><button type="submit" class="hg-animation-primary">Save Animation</button><button data-animation-editor-cancel type="button">Cancel editing</button></div>`;
}

export function writeAnimationFields(field, animation) {
  for (const [key, [path, fallback, kind]] of Object.entries(EDITOR_FIELDS)) {
    const value = path.split(".").reduce((value, part) => value?.[part], animation) ?? fallback, node = field(key);
    if (kind === "check") node.checked = value === true;
    else node.value = kind === "percent" ? Math.round(value * 100) : kind === "tags" ? value.join(", ") : value;
  }
  field("tint-enabled").checked = Boolean(animation?.appearance?.tint); field("tint").value = animation?.appearance?.tint || "#6688ff";
  field("sequence").value = animation?.frames?.sequence?.join(", ") || "";
}
export function readAnimationFields(field) {
  const result = {};
  for (const [key, [path, , kind]] of Object.entries(EDITOR_FIELDS)) {
    const node = field(key), value = kind === "check" ? node.checked : kind === "text" || kind === "tags" ? node.value : Number(node.value) / (kind === "percent" ? 100 : 1);
    const parts = path.split("."), last = parts.pop(); let target = result;
    for (const part of parts) target = target[part] ||= {};
    target[last] = value;
  }
  result.appearance.tint = field("tint-enabled").checked ? field("tint").value : null;
  result.frames.sequence = field("sequence").value.trim() ? field("sequence").value.split(",").map(n => Number(n.trim())) : [];
  result.projectile.enabled = result.behavior === "projectile"; result.beam = { enabled: result.behavior === "beam", thickness: Number(field("thickness").value), stretchToTarget: true };
  return result;
}
