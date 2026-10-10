const BUSY_DISABLED_STATE = "creatorBusyWasDisabled";

export function setCreatorControlsBusy(root, busy) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("button, input, select, textarea").forEach((control) => {
    if (busy) {
      if (!(BUSY_DISABLED_STATE in control.dataset)) {
        control.dataset[BUSY_DISABLED_STATE] = control.disabled ? "1" : "0";
      }
      control.disabled = true;
      return;
    }
    if (BUSY_DISABLED_STATE in control.dataset) {
      control.disabled = control.dataset[BUSY_DISABLED_STATE] === "1";
      delete control.dataset[BUSY_DISABLED_STATE];
    }
  });
}
