import { normalizeElevation } from "../battleMap/elevation.js";

const TYPES = Object.freeze(["player", "enemy", "npc", "object"]);
const SIZES = Object.freeze(["tiny", "small", "medium", "large", "huge", "gargantuan"]);
const text = (value) => String(value ?? "").trim();

function number(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === "" || value === null || value === undefined) throw new Error(`${label} is required.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
  if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return Math.round(parsed);
}

export function validateTokenEditorDraft(value = {}) {
  const name = text(value.name);
  const imageUrl = text(value.imageUrl);
  const type = text(value.type).toLowerCase();
  const sizeCategory = text(value.sizeCategory).toLowerCase();
  if (!name) throw new Error("Token name is required.");
  if (name.length > 120) throw new Error("Token name must be 120 characters or fewer.");
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error("Token image must use a secure HTTPS URL.");
  if (!TYPES.includes(type)) throw new Error("Choose a valid token type.");
  if (!SIZES.includes(sizeCategory)) throw new Error("Choose a valid token size.");
  const maxHp = number(value.maxHp, "Maximum HP", { min: 0, max: 1000000 });
  const currentHp = Math.min(maxHp || Number.MAX_SAFE_INTEGER, number(value.currentHp, "Current HP", { min: 0, max: 1000000 }));
  const armorClass = number(value.armorClass, "Armor Class", { min: 0, max: 1000 });
  const movementSpeed = number(value.movementSpeed, "Movement speed", { min: 0, max: 1000 });
  const elevation = normalizeElevation(number(value.elevation, "Elevation", { min: -1000, max: 1000 }));
  return Object.freeze({
    name,
    imageUrl,
    type,
    sizeCategory,
    creatureSize: sizeCategory,
    currentHp,
    maxHp,
    hp: Object.freeze({ current: currentHp, maximum: maxHp }),
    armorClass,
    ac: armorClass,
    elevation,
    elevationFeet: elevation,
    movementSpeed,
    baseSpeed: movementSpeed,
    display: Object.freeze({
      name: value.display?.name === true,
      hpBar: value.display?.hpBar === true,
      hpText: value.display?.hpText === true,
      ac: value.display?.ac === true,
      conditions: value.display?.conditions === true,
      initiative: value.display?.initiative === true
    })
  });
}

export function createTokenEditor({ mount = document.body } = {}) {
  const root = document.createElement("section");
  root.className = "hg-token-editor hidden";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "tokenEditorTitle");
  root.innerHTML = `
    <button class="hg-token-editor-backdrop" type="button" data-token-editor-cancel aria-label="Cancel token editing"></button>
    <form class="hg-token-editor-card" data-token-editor-form novalidate>
      <header><div><span>Battle map token</span><h2 id="tokenEditorTitle">Edit Token</h2></div><button type="button" data-token-editor-cancel aria-label="Cancel token editing">×</button></header>
      <div class="hg-token-editor-grid">
        <label><span>Name</span><input name="name" maxlength="120" required></label>
        <label><span>Secure image URL</span><input name="imageUrl" type="url" placeholder="https://…"></label>
        <label><span>Type</span><select name="type">${TYPES.map((value) => `<option value="${value}">${value}</option>`).join("")}</select></label>
        <label><span>Size</span><select name="sizeCategory">${SIZES.map((value) => `<option value="${value}">${value}</option>`).join("")}</select></label>
        <label><span>Current HP</span><input name="currentHp" type="number" min="0" max="1000000" required></label>
        <label><span>Maximum HP</span><input name="maxHp" type="number" min="0" max="1000000" required></label>
        <label><span>Armor Class</span><input name="armorClass" type="number" min="0" max="1000" required></label>
        <label><span>Movement speed (ft)</span><input name="movementSpeed" type="number" min="0" max="1000" required></label>
        <label><span>Elevation (ft)</span><input name="elevation" type="number" min="-1000" max="1000" required></label>
        <fieldset><legend>Visible on map</legend>
          <label><input name="displayName" type="checkbox"> Name</label>
          <label><input name="displayHpBar" type="checkbox"> HP bar</label>
          <label><input name="displayHpText" type="checkbox"> HP text</label>
          <label><input name="displayAc" type="checkbox"> AC</label>
          <label><input name="displayConditions" type="checkbox"> Conditions</label>
          <label><input name="displayInitiative" type="checkbox"> Initiative</label>
        </fieldset>
      </div>
      <p data-token-editor-status role="alert"></p>
      <footer><button type="button" data-token-editor-cancel>Cancel</button><button type="submit">Save Token</button></footer>
    </form>`;
  mount.appendChild(root);
  const form = root.querySelector("[data-token-editor-form]");
  const status = root.querySelector("[data-token-editor-status]");
  let resolveSession = null;

  const set = (name, value) => {
    const control = form.elements.namedItem(name);
    if (control.type === "checkbox") control.checked = value === true;
    else control.value = String(value ?? "");
  };
  const finish = (value) => {
    if (!resolveSession) return false;
    const resolve = resolveSession;
    resolveSession = null;
    root.classList.add("hidden");
    status.textContent = "";
    resolve(value);
    return true;
  };
  const cancel = () => finish(null);
  root.querySelectorAll("[data-token-editor-cancel]").forEach((button) => button.addEventListener("click", cancel));
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancel();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      finish(validateTokenEditorDraft({
        name: data.get("name"), imageUrl: data.get("imageUrl"), type: data.get("type"), sizeCategory: data.get("sizeCategory"),
        currentHp: data.get("currentHp"), maxHp: data.get("maxHp"), armorClass: data.get("armorClass"),
        movementSpeed: data.get("movementSpeed"), elevation: data.get("elevation"),
        display: {
          name: data.get("displayName") === "on", hpBar: data.get("displayHpBar") === "on",
          hpText: data.get("displayHpText") === "on", ac: data.get("displayAc") === "on",
          conditions: data.get("displayConditions") === "on", initiative: data.get("displayInitiative") === "on"
        }
      }));
    } catch (error) {
      status.textContent = error?.message || "Check the token fields and try again.";
    }
  });

  return Object.freeze({
    root,
    open(token = {}) {
      if (resolveSession) cancel();
      set("name", token.name || "Token");
      set("imageUrl", token.imageUrl || "");
      set("type", TYPES.includes(token.type) ? token.type : "object");
      set("sizeCategory", SIZES.includes(token.sizeCategory) ? token.sizeCategory : "medium");
      set("currentHp", token.currentHp ?? token.hp?.current ?? 0);
      set("maxHp", token.maxHp ?? token.hp?.maximum ?? 0);
      set("armorClass", token.armorClass ?? token.ac ?? 0);
      set("movementSpeed", token.movementSpeed ?? token.baseSpeed ?? 30);
      set("elevation", token.elevation ?? token.elevationFeet ?? 0);
      set("displayName", token.display?.name === true);
      set("displayHpBar", token.display?.hpBar === true);
      set("displayHpText", token.display?.hpText === true);
      set("displayAc", token.display?.ac === true);
      set("displayConditions", token.display?.conditions !== false);
      set("displayInitiative", token.display?.initiative === true);
      status.textContent = "Only this token document will be updated.";
      root.classList.remove("hidden");
      queueMicrotask(() => form.elements.namedItem("name")?.focus());
      return new Promise((resolve) => { resolveSession = resolve; });
    },
    cancel,
    destroy() { cancel(); root.remove(); }
  });
}
