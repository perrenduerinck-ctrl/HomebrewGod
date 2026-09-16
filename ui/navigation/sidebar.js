import { visibleSidebarSections } from "./sidebarSections.js?v=foundation-milestone-20260915";

const STORAGE_KEY = "homebrewgod.sidebar.collapsed.v1";

function readCollapsed(storage) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

export function createSidebarNavigation({
  document,
  storage = globalThis.localStorage,
  onNavigate = () => {},
  onOpenTool = () => {}
} = {}) {
  const collapsed = readCollapsed(storage);
  const state = { role: "player", roomOpen: false, screen: "auth", visible: false };
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "hg-sidebar-toggle";
  toggle.setAttribute("aria-label", "Open navigation");
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "☰";

  const scrim = document.createElement("button");
  scrim.type = "button";
  scrim.className = "hg-sidebar-scrim";
  scrim.setAttribute("aria-label", "Close navigation");
  scrim.hidden = true;

  const root = document.createElement("nav");
  root.className = "hg-sidebar";
  root.id = "homebrewGodSidebar";
  root.setAttribute("aria-label", "Homebrew God navigation");
  root.hidden = true;
  root.innerHTML = `
    <div class="hg-sidebar-brand">
      <strong>Homebrew God</strong>
      <button type="button" data-sidebar-mobile-close aria-label="Close navigation">×</button>
    </div>
    <div class="hg-sidebar-sections" data-sidebar-sections></div>
  `;
  toggle.setAttribute("aria-controls", root.id);
  document.body.prepend(scrim);
  document.body.prepend(root);
  document.body.prepend(toggle);
  const sectionsRoot = root.querySelector("[data-sidebar-sections]");

  function saveCollapsed() {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify([...collapsed])); } catch {}
  }

  function closeMobile() {
    document.body.classList.remove("hg-sidebar-mobile-open");
    scrim.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function openMobile() {
    if (!state.visible) return;
    document.body.classList.add("hg-sidebar-mobile-open");
    scrim.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    root.querySelector("button")?.focus();
  }

  function render() {
    const sections = visibleSidebarSections(state);
    sectionsRoot.replaceChildren(...sections.map((section) => {
      const wrapper = document.createElement("section");
      wrapper.className = "hg-sidebar-section";
      const headingId = `hg-sidebar-${section.id}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hg-sidebar-section-toggle";
      button.dataset.sidebarSection = section.id;
      button.setAttribute("aria-controls", headingId);
      button.setAttribute("aria-expanded", String(!collapsed.has(section.id)));
      button.innerHTML = `<span>${section.label}</span><span aria-hidden="true">⌄</span>`;
      const list = document.createElement("div");
      list.id = headingId;
      list.className = "hg-sidebar-items";
      list.hidden = collapsed.has(section.id);
      for (const item of section.items) {
        const itemButton = document.createElement("button");
        itemButton.type = "button";
        itemButton.dataset.sidebarAction = item.action;
        itemButton.dataset.sidebarTarget = item.target;
        itemButton.textContent = item.label;
        if (item.action === "screen" && item.target === state.screen) {
          itemButton.setAttribute("aria-current", "page");
        }
        list.append(itemButton);
      }
      wrapper.append(button, list);
      return wrapper;
    }));
  }

  function setContext(next = {}) {
    Object.assign(state, next);
    state.visible = Boolean(state.roomOpen) && !["auth", "lobby"].includes(state.screen);
    root.hidden = !state.visible;
    toggle.hidden = !state.visible;
    document.body.classList.toggle("hg-app-shell-active", state.visible);
    if (!state.visible) closeMobile();
    render();
  }

  sectionsRoot.addEventListener("click", (event) => {
    const sectionButton = event.target.closest("[data-sidebar-section]");
    if (sectionButton) {
      const id = sectionButton.dataset.sidebarSection;
      const list = document.getElementById(sectionButton.getAttribute("aria-controls"));
      const willCollapse = sectionButton.getAttribute("aria-expanded") === "true";
      sectionButton.setAttribute("aria-expanded", String(!willCollapse));
      if (list) list.hidden = willCollapse;
      if (willCollapse) collapsed.add(id);
      else collapsed.delete(id);
      saveCollapsed();
      return;
    }
    const actionButton = event.target.closest("[data-sidebar-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.sidebarAction;
    const target = actionButton.dataset.sidebarTarget;
    if (action === "screen") onNavigate(target, actionButton);
    else if (action === "tool") onOpenTool(target, actionButton);
    closeMobile();
  });

  toggle.addEventListener("click", openMobile);
  scrim.addEventListener("click", closeMobile);
  root.querySelector("[data-sidebar-mobile-close]").addEventListener("click", closeMobile);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("hg-sidebar-mobile-open")) {
      event.preventDefault();
      closeMobile();
      toggle.focus();
    }
  });

  setContext(state);
  return Object.freeze({ root, toggle, setContext, openMobile, closeMobile });
}
