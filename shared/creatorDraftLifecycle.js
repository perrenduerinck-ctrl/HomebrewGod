function safeClone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function serialized(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "";
  }
}

export function createCreatorDraftLifecycle({
  root,
  creatorId,
  getUserId = () => "",
  getDraft,
  applyDraft,
  requestConfirmation,
  onStatus = () => {},
  debounceMs = 180
} = {}) {
  const view = root?.ownerDocument?.defaultView || globalThis;
  const localStorage = view?.localStorage;
  const sessionStorage = view?.sessionStorage;
  const cleanCreatorId = String(creatorId || "creator").replace(/[^a-z0-9-]/gi, "-");
  const sessionKey = `homebrew-god:creator-tab:${cleanCreatorId}`;
  let tabId = "";
  let baseline = "";
  let baselineDraft = null;
  let timer = null;

  try {
    tabId = sessionStorage?.getItem(sessionKey) || "";
    if (!tabId) {
      tabId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage?.setItem(sessionKey, tabId);
    }
  } catch {
    tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const storageKey = () => {
    const uid = String(getUserId() || "signed-out").replace(/[^a-z0-9_-]/gi, "-");
    return `homebrew-god:creator-draft:v1:${cleanCreatorId}:${uid}:${tabId}`;
  };

  function hasChanges() {
    return Boolean(baseline) && serialized(getDraft?.()) !== baseline;
  }

  function clearBackup() {
    if (timer) view.clearTimeout(timer);
    timer = null;
    try { localStorage?.removeItem(storageKey()); } catch {}
  }

  function saveBackup() {
    timer = null;
    if (!hasChanges()) {
      clearBackup();
      return;
    }
    try {
      localStorage?.setItem(storageKey(), JSON.stringify({
        creatorId: cleanCreatorId,
        accountUid: String(getUserId() || ""),
        savedAtMillis: Date.now(),
        draft: safeClone(getDraft())
      }));
    } catch {
      onStatus("Unsaved changes are still in this tab, but local draft recovery is unavailable.");
    }
  }

  function markChanged() {
    if (timer) view.clearTimeout(timer);
    timer = view.setTimeout(saveBackup, debounceMs);
  }

  function markClean() {
    baselineDraft = safeClone(getDraft?.());
    baseline = serialized(baselineDraft);
    clearBackup();
  }

  function recover() {
    try {
      const raw = localStorage?.getItem(storageKey());
      if (!raw) return false;
      const record = JSON.parse(raw);
      if (
        record?.creatorId !== cleanCreatorId ||
        record?.accountUid !== String(getUserId() || "") ||
        !record?.draft
      ) {
        return false;
      }
      applyDraft?.(safeClone(record.draft));
      onStatus("Recovered unsaved changes from this tab.");
      return true;
    } catch {
      return false;
    }
  }

  async function confirmReplacement(
    actionLabel = "replace this draft",
    { restoreBaseline = false } = {}
  ) {
    if (!hasChanges()) return true;
    const confirmed = await requestConfirmation(
      `Discard your unsaved changes and ${actionLabel}?`,
      {
        title: "Unsaved changes",
        confirmLabel: "Discard changes"
      }
    );
    if (confirmed) {
      clearBackup();
      if (restoreBaseline) {
        applyDraft?.(safeClone(baselineDraft));
        markClean();
      }
    }
    return confirmed === true;
  }

  const handleEdit = () => markChanged();
  const handleClick = () => {
    const enqueue = view?.queueMicrotask || globalThis.queueMicrotask;
    enqueue(markChanged);
  };
  root?.addEventListener?.("input", handleEdit);
  root?.addEventListener?.("change", handleEdit);
  root?.addEventListener?.("click", handleClick);
  view?.addEventListener?.("pagehide", saveBackup);

  return Object.freeze({
    hasChanges,
    markChanged,
    markClean,
    recover,
    clearBackup,
    confirmReplacement,
    destroy() {
      if (timer) view.clearTimeout(timer);
      root?.removeEventListener?.("input", handleEdit);
      root?.removeEventListener?.("change", handleEdit);
      root?.removeEventListener?.("click", handleClick);
      view?.removeEventListener?.("pagehide", saveBackup);
    }
  });
}
