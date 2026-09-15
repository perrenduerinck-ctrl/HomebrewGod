import { openSpellAnimationPanel } from "./spellAnimationPanel.js";
import { getAnimationSession } from "./animationWorkspace.js";
import {
  inferCombatAnimationFamily,
  normalizeCombatAnimationAttachment
} from "./combatPresentationSystem.js";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function number(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Math.min(maximum, Math.max(minimum, Number.isFinite(parsed) ? parsed : fallback));
}

function stageSettings(family) {
  return family === "melee"
    ? {
        slots: ["cast"],
        labels: { cast: "Attack" }
      }
    : family === "ranged"
      ? {
          slots: ["cast", "travel", "impact"],
          labels: { cast: "Prepare", travel: "Projectile", impact: "Impact" }
        }
      : {
          slots: ["cast", "travel", "impact", "sustain", "end"],
          labels: {
            cast: "Cast / Start",
            travel: "Travel",
            impact: "Impact",
            sustain: "Sustain",
            end: "End"
          }
        };
}

function openCombatBehaviorPanel({ attachment, content, document }) {
  const { library } = getAnimationSession(document);
  const dialog = document.createElement("dialog");
  dialog.className = "hg-spell-animation-panel hg-combat-behavior-panel";
  dialog.setAttribute("aria-label", "Combat animation behavior");
  dialog.innerHTML = `<div class="hg-spell-animation-heading"><div><span class="hg-animation-eyebrow">COMBAT PRESENTATION</span><h2>Behavior and timing</h2><p data-combat-content-name></p></div><button type="button" data-combat-cancel aria-label="Close combat behavior">Close</button></div>
    <p>These settings stay on this action, item, spell, trap, or monster ability. They do not change the reusable animation artwork.</p>
    <div class="hg-spell-animation-overrides">
      <label>Targets<select data-combat-target-mode><option value="single">One selected target</option><option value="all">Every selected target</option><option value="chain">Chain across selected targets</option><option value="self">Source / self</option></select></label>
      <label>Duration<select data-combat-duration-unit><option value="none">No persistent duration</option><option value="manual">Until manually ended</option><option value="turns">Turns</option><option value="rounds">Rounds</option><option value="seconds">Campaign seconds</option><option value="minutes">Campaign minutes</option><option value="hours">Campaign hours</option></select></label>
      <label>Duration amount<input data-combat-duration-value type="number" min="0.001" max="1000000" step="1" value="1"></label>
      <label class="hg-animation-toggle"><input data-combat-concentration type="checkbox">Ends with concentration</label>
      <label>Required status<input data-combat-status maxlength="160" placeholder="Optional, such as poisoned"></label>
      <label>Movement path<select data-combat-motion-kind><option value="linear">Straight / normal</option><option value="curve">Curved projectile</option><option value="orbit">Orbit target</option><option value="follow">Follow moving target</option></select></label>
      <label>Curve amount<input data-combat-curvature type="number" min="-2" max="2" step="0.05" value="0.35"></label>
      <label>Orbit radius<input data-combat-radius type="number" min="4" max="2000" step="1" value="64"></label>
      <label>Orbit turns<input data-combat-turns type="number" min="0.25" max="8" step="0.25" value="1"></label>
      <label class="hg-animation-toggle"><input data-combat-camera-enabled type="checkbox">Camera effect</label>
      <label>Camera shake<input data-combat-camera-shake type="range" min="0" max="1" step="0.05" value="0"></label>
      <label>Camera zoom<input data-combat-camera-zoom type="number" min="0.5" max="2" step="0.05" value="1"></label>
      <label>Camera duration (ms)<input data-combat-camera-duration type="number" min="0" max="3000" step="10" value="240"></label>
      <label>After impact<select data-combat-automation-kind><option value="none">No token automation</option><option value="summon">Create summon token (DM)</option><option value="transform">Transform target token (DM)</option></select></label>
      <label>Token name<input data-combat-automation-name maxlength="120" placeholder="Optional name"></label>
      <label>Token image URL<input data-combat-automation-image type="url" maxlength="2048" placeholder="https://..."></label>
      <label>Token size<select data-combat-automation-size><option value="tiny">Tiny</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="huge">Huge</option><option value="gargantuan">Gargantuan</option></select></label>
    </div>
    <details><summary>Layered animation rendering</summary><p>Overlay up to eight extra stage animations. A delay staggers a layer without delaying gameplay.</p><div data-combat-layers></div><button type="button" data-combat-add-layer>Add animation layer</button></details>
    <div class="hg-animation-buttons"><button type="button" class="hg-animation-primary" data-combat-save>Save combat behavior</button><button type="button" data-combat-cancel>Cancel</button></div>
    <p data-combat-status-message role="status"></p>`;
  document.body.append(dialog);

  const field = key => dialog.querySelector(`[data-combat-${key}]`);
  field("content-name").textContent = content?.name || content?.label || "Combat action";
  field("target-mode").value = attachment.targetMode || "single";
  field("duration-unit").value = attachment.duration?.unit || "none";
  field("duration-value").value = attachment.duration?.value || 1;
  field("concentration").checked = attachment.duration?.concentration === true;
  field("status").value = attachment.duration?.status || "";
  field("motion-kind").value = attachment.motion?.kind || "linear";
  field("curvature").value = attachment.motion?.curvature ?? 0.35;
  field("radius").value = attachment.motion?.radius ?? 64;
  field("turns").value = attachment.motion?.turns ?? 1;
  field("camera-enabled").checked = Boolean(attachment.camera);
  field("camera-shake").value = attachment.camera?.shake || 0;
  field("camera-zoom").value = attachment.camera?.zoom || 1;
  field("camera-duration").value = attachment.camera?.durationMs || 240;
  const automationKind = attachment.automation?.summon
    ? "summon"
    : attachment.automation?.transform
      ? "transform"
      : "none";
  const automation = attachment.automation?.[automationKind] || {};
  field("automation-kind").value = automationKind;
  field("automation-name").value = automation.name || "";
  field("automation-image").value = automation.imageUrl || "";
  field("automation-size").value = automation.sizeCategory || "medium";

  function addLayerRow(value = {}) {
    const root = field("layers");
    if (root.children.length >= 8) return;
    const row = document.createElement("div");
    row.className = "hg-spell-animation-overrides";
    row.dataset.combatLayer = "true";
    row.savedStages = clone(value.stages || value.animations || {});
    row.savedLayerId = value.id || "";
    const slots = ["cast", "travel", "impact", "sustain", "end"];
    row.innerHTML = `${slots.map(slot => `<label>${slot[0].toUpperCase() + slot.slice(1)}<select data-layer-animation-slot="${slot}"></select></label>`).join("")}<label>Layer delay (ms)<input data-layer-delay type="number" min="0" max="10000" step="10" value="0"></label><button type="button" data-layer-remove>Remove layer</button>`;
    const savedStages = value.stages || value.animations || {};
    for (const slot of slots) {
      const animationSelect = row.querySelector(`[data-layer-animation-slot="${slot}"]`);
      animationSelect.append(new Option("None", ""));
      for (const animation of library.list()) {
        animationSelect.append(new Option(animation.name, animation.id));
      }
      const saved = savedStages[slot];
      const selectedAnimationId = typeof saved === "string"
        ? saved
        : saved?.animationId || "";
      if (
        selectedAnimationId &&
        ![...animationSelect.options].some(option => option.value === selectedAnimationId)
      ) {
        animationSelect.append(new Option(`Missing animation: ${selectedAnimationId}`, selectedAnimationId));
      }
      animationSelect.value = selectedAnimationId;
    }
    row.querySelector("[data-layer-delay]").value = value.delay || 0;
    row.querySelector("[data-layer-remove]").addEventListener("click", () => row.remove());
    root.append(row);
  }

  for (const layer of attachment.layers || []) {
    if (Object.keys(layer.stages || {}).length) addLayerRow(layer);
  }
  field("add-layer").addEventListener("click", () => addLayerRow());

  let result = null;
  let closed = false;
  const close = () => dialog.close();
  for (const button of dialog.querySelectorAll("[data-combat-cancel]")) {
    button.addEventListener("click", close);
  }
  field("save").addEventListener("click", () => {
    try {
      const durationUnit = field("duration-unit").value;
      const automationType = field("automation-kind").value;
      const automationValue = automationType === "none"
        ? null
        : {
            name: field("automation-name").value,
            imageUrl: field("automation-image").value,
            sizeCategory: field("automation-size").value
          };
      const layers = [...field("layers").querySelectorAll("[data-combat-layer]")]
        .map((row, index) => {
          const stages = Object.fromEntries(
            [...row.querySelectorAll("[data-layer-animation-slot]")]
              .map(select => [select.dataset.layerAnimationSlot, select.value])
              .filter(([, animationId]) => animationId)
              .map(([slot, animationId]) => {
                const saved = row.savedStages?.[slot];
                const savedId = typeof saved === "string" ? saved : saved?.animationId;
                return [
                  slot,
                  savedId === animationId ? clone(saved) : { animationId }
                ];
              })
          );
          return Object.keys(stages).length
            ? {
                id: row.savedLayerId || `layer-${index + 1}`,
                delay: number(row.querySelector("[data-layer-delay]").value, 0, 0, 10000),
                stages
              }
            : null;
        })
        .filter(Boolean);
      result = normalizeCombatAnimationAttachment({
        ...attachment,
        targetMode: field("target-mode").value,
        duration: durationUnit === "none"
          ? null
          : {
              unit: durationUnit,
              value: number(field("duration-value").value, 1, 0.001, 1000000),
              concentration: field("concentration").checked,
              status: field("status").value
            },
        motion: {
          kind: field("motion-kind").value,
          curvature: number(field("curvature").value, 0.35, -2, 2),
          radius: number(field("radius").value, 64, 4, 2000),
          turns: number(field("turns").value, 1, 0.25, 8)
        },
        camera: field("camera-enabled").checked
          ? {
              enabled: true,
              shake: number(field("camera-shake").value, 0, 0, 1),
              zoom: number(field("camera-zoom").value, 1, 0.5, 2),
              durationMs: number(field("camera-duration").value, 240, 0, 3000)
            }
          : null,
        automation: automationValue
          ? { [automationType]: automationValue }
          : null,
        layers
      });
      close();
    } catch (error) {
      field("status-message").textContent = error?.message || "Combat behavior could not be saved.";
    }
  });
  const completion = new Promise(resolve => dialog.addEventListener("close", () => {
    if (closed) return;
    closed = true;
    dialog.remove();
    resolve(result);
  }, { once: true }));
  dialog.showModal();
  return completion;
}

/** Opens the shared Source/Target sequence and behavior editor for every content type. */
export async function openCombatAnimationPanel({
  content,
  family = inferCombatAnimationFamily(content),
  document = globalThis.document,
  contentLabel = "Ability",
  onChange = () => {}
} = {}) {
  if (!content || typeof content !== "object") {
    throw new Error("Choose the action, item, trap or ability being edited.");
  }

  const current = normalizeCombatAnimationAttachment(content, { family });
  const settings = stageSettings(family);
  const stages = await openSpellAnimationPanel({
    document,
    name: content.name || content.label || contentLabel,
    family,
    contentLabel,
    animations: current?.stages || {},
    slots: settings.slots,
    stageLabels: settings.labels,
    saveLabel: `Continue ${contentLabel.toLowerCase()} setup`
  });
  if (!stages) return null;

  const attachment = normalizeCombatAnimationAttachment({
    ...(current || {}),
    family,
    stages
  }, { family });
  if (!attachment) {
    delete content.animation;
    onChange(content);
    return { removed: true };
  }
  const configured = await openCombatBehaviorPanel({
    attachment,
    content,
    document
  });
  if (!configured) return null;

  content.animation = clone(configured);
  onChange(content);
  return content.animation;
}
