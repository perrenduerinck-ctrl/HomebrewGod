export function createToolDrawer({ document, onClose = () => {} } = {}) {
  const root = document.createElement("aside");
  root.className = "hg-tool-drawer";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "false");
  root.innerHTML = `
    <header class="hg-tool-drawer-header">
      <h2 data-tool-drawer-title>Tool</h2>
      <button type="button" data-tool-drawer-close aria-label="Close tool drawer">×</button>
    </header>
    <div class="hg-tool-drawer-content" data-tool-drawer-content></div>
  `;
  document.body.append(root);
  const title = root.querySelector("[data-tool-drawer-title]");
  const content = root.querySelector("[data-tool-drawer-content]");
  const closeButton = root.querySelector("[data-tool-drawer-close]");
  let mounted = null;
  let placeholder = null;
  let restoreFocus = null;

  function restoreMountedElement() {
    if (!mounted) return;
    if (placeholder?.parentNode) placeholder.replaceWith(mounted);
    else mounted.remove();
    mounted.classList.remove("hg-tool-drawer-mounted");
    mounted = null;
    placeholder = null;
  }

  function close({ focus = true } = {}) {
    if (root.hidden) return;
    restoreMountedElement();
    root.hidden = true;
    document.body.classList.remove("hg-tool-drawer-open");
    onClose();
    if (focus) restoreFocus?.focus?.();
    restoreFocus = null;
  }

  function open({ element, label = "Tool", trigger = null } = {}) {
    if (!element) return false;
    close({ focus: false });
    restoreFocus = trigger || document.activeElement;
    title.textContent = label;
    if (element.isConnected) {
      placeholder = document.createComment(`Homebrew God tool: ${label}`);
      element.replaceWith(placeholder);
    }
    mounted = element;
    mounted.classList.add("hg-tool-drawer-mounted");
    if (mounted.tagName === "DETAILS") mounted.open = true;
    content.append(mounted);
    root.hidden = false;
    document.body.classList.add("hg-tool-drawer-open");
    closeButton.focus();
    return true;
  }

  closeButton.addEventListener("click", () => close());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !root.hidden) {
      event.preventDefault();
      close();
    }
  });

  return Object.freeze({
    root,
    open,
    close,
    get isOpen() { return !root.hidden; }
  });
}
