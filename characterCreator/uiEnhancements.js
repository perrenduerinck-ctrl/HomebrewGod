const CORE_STEPS = [
  ["class", "Class"],
  ["background", "Background"],
  ["species", "Species"],
  ["abilities", "Abilities"],
  ["equipment", "Equipment"]
];

const REQUIRED_STEPS =
  new Set([
    "basics",
    "class",
    "species",
    "abilities",
    "review",
    "save"
  ]);

export const UI_FILTER_DEBOUNCE_MS = 250;

const state = {
  spellQuery: "",
  selectedSpellsOnly: false,
  spellLevelIntent: new Map(),
  classQuery: ""
};

const installations =
  new WeakMap();

function clean(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function spellLevelLabel(level) {
  if (level === 0) {
    return "Cantrips";
  }

  const suffix =
    level === 1
      ? "st"
      : level === 2
        ? "nd"
        : level === 3
          ? "rd"
          : "th";

  return `${level}${suffix}-Level Spells`;
}

function getSpellLevel(card) {
  const label =
    clean(
      card.querySelector("p b")
        ?.textContent
    );

  if (label.includes("cantrip")) {
    return 0;
  }

  const match =
    label.match(/\d+/);

  return Math.max(
    0,
    Math.min(
      9,
      Number(match?.[0] || 0)
    )
  );
}

function isSelected(card) {
  return card.classList
    .contains("selected");
}

function addStatusBadge(card) {
  if (
    card.querySelector(
      ":scope > .hg-card-status"
    )
  ) {
    return;
  }

  const selected =
    isSelected(card);
  const unavailable =
    card.classList
      .contains("unavailable");

  if (!selected && !unavailable) {
    return;
  }

  const badge =
    document.createElement("span");

  badge.className =
    `hg-card-status${
      unavailable
        ? " unavailable"
        : ""
    }`;
  badge.textContent =
    unavailable
      ? "Unavailable"
      : "\u2713 Selected";
  badge.setAttribute(
    "aria-label",
    badge.textContent
  );

  const heading =
    card.querySelector(
      ":scope > h3"
    );

  heading?.insertAdjacentElement(
    "afterend",
    badge
  );
}

function compactCard(card) {
  if (
    card.dataset
      .hgCardEnhanced ===
      "true"
  ) {
    return;
  }

  card.dataset.hgCardEnhanced =
    "true";
  addStatusBadge(card);

  if (
    card.matches(
      "[data-cc-default-spell-option]"
    )
  ) {
    const fullDetails =
      card.querySelector(
        ":scope > p.small"
      );

    if (fullDetails) {
      const details =
        document.createElement(
          "details"
        );
      const summary =
        document.createElement(
          "summary"
        );

      details.className =
        "hg-compact-details";
      summary.textContent =
        "Spell Details";
      details.append(
        summary,
        fullDetails
      );

      const actions =
        card.querySelector(
          ":scope > .hg-character-card-actions"
        );

      card.insertBefore(
        details,
        actions || null
      );
    }

    return;
  }

  const paragraphs = [
    ...card.children
  ].filter((child) => {
    return (
      child.tagName === "P"
    );
  });

  const candidates =
    paragraphs.filter(
      (paragraph, index) => {
        const text =
          clean(
            paragraph.textContent
          );

        return (
          index > 0 &&
          text.length > 90 &&
          !/prerequisite|unavailable|pending|status/.test(
            text
          ) &&
          !paragraph.querySelector(
            "button,input,select,textarea"
          )
        );
      }
    );

  if (!candidates.length) {
    return;
  }

  const details =
    document.createElement(
      "details"
    );
  const summary =
    document.createElement(
      "summary"
    );

  details.className =
    "hg-compact-details";
  summary.textContent = "Details";
  details.append(summary);
  candidates.forEach((item) => {
    details.append(item);
  });

  const actions =
    card.querySelector(
      ":scope > .hg-character-card-actions"
    );

  card.insertBefore(
    details,
    actions || null
  );
}

function filterSpellViewer(viewer) {
  if (viewer.dataset.ccSpellPickerManaged === "true") {
    return;
  }

  const query =
    clean(
      viewer.querySelector(
        "#ccDefaultSpellSearch"
      )?.value ??
      state.spellQuery
    );
  const selectedOnly =
    viewer.querySelector(
      "[data-hg-selected-spells-only]"
    )?.checked ??
    state.selectedSpellsOnly;

  state.spellQuery = query;
  state.selectedSpellsOnly =
    selectedOnly;

  viewer.querySelectorAll(
    "[data-hg-spell-level]"
  ).forEach((group) => {
    const level =
      Number(
        group.dataset
          .hgSpellLevel
      );
    const cards = [
      ...group.querySelectorAll(
        "[data-cc-default-spell-option]"
      )
    ];
    let visible = 0;
    let selected = 0;

    cards.forEach((card) => {
      const cardSelected =
        isSelected(card);
      const queryMatch =
        !query ||
        clean(
          card.dataset
            .spellSearchText ||
          card.textContent
        ).includes(query);
      const matches =
        queryMatch &&
        (
          !selectedOnly ||
          cardSelected
        );

      card.hidden = !matches;
      visible += matches ? 1 : 0;
      selected +=
        cardSelected ? 1 : 0;
    });

    const count =
      group.querySelector(
        "[data-hg-spell-selected-count]"
      );

    if (count) {
      count.textContent =
        `${selected} selected`;
    }

    group.hidden = visible === 0;

    if (query || selectedOnly) {
      group.open = visible > 0;
    } else {
      const manualIntent =
        state.spellLevelIntent
          .get(level);

      group.open =
        manualIntent ===
          undefined
          ? selected > 0
          : manualIntent;
    }
  });
}

function enhanceSpellViewer(viewer) {
  if (viewer.dataset.ccSpellPickerManaged === "true") {
    return;
  }

  if (
    viewer.dataset
      .hgSpellEnhanced !==
      "true"
  ) {
    viewer.dataset.hgSpellEnhanced =
      "true";

    const search =
      viewer.querySelector(
        "#ccDefaultSpellSearch"
      );

    if (search) {
      search.value =
        state.spellQuery;
    }

    const toolbar =
      document.createElement("div");

    toolbar.className =
      "hg-ui-toolbar";
    toolbar.innerHTML = `
      <label class="hg-ui-check">
        <input
          type="checkbox"
          data-hg-selected-spells-only
          ${
            state.selectedSpellsOnly
              ? "checked"
              : ""
          }
        >
        Show selected only
      </label>
    `;

    search?.insertAdjacentElement(
      "afterend",
      toolbar
    );

    const originalGrid =
      viewer.querySelector(
        ":scope > .hg-character-choice-grid"
      );

    if (originalGrid) {
      const cards = [
        ...originalGrid.querySelectorAll(
          ":scope > [data-cc-default-spell-option]"
        )
      ];
      const levels =
        document.createElement("div");

      levels.className =
        "hg-spell-levels";

      Array.from(
        { length: 10 },
        (_, level) => {
          const group =
            document.createElement(
              "details"
            );
          const grid =
            document.createElement(
              "div"
            );

          group.className =
            "hg-spell-level";
          group.dataset.hgSpellLevel =
            String(level);
          group.innerHTML = `
            <summary>
              <span>${spellLevelLabel(level)}</span>
              <span
                class="hg-spell-level-count"
                data-hg-spell-selected-count
              >0 selected</span>
            </summary>
          `;
          grid.className =
            "hg-character-choice-grid";

          cards
            .filter((card) => {
              return (
                getSpellLevel(card) ===
                level
              );
            })
            .forEach((card) => {
              compactCard(card);
              grid.append(card);
            });

          group.append(grid);
          levels.append(group);
        }
      );

      originalGrid.replaceWith(
        levels
      );
    }
  }

  filterSpellViewer(viewer);
}

function filterClassGrid(grid) {
  const query =
    clean(
      grid.parentElement
        ?.querySelector(
          "[data-hg-class-search]"
        )?.value ??
      state.classQuery
    );

  state.classQuery = query;

  grid.querySelectorAll(
    ":scope > .hg-character-choice-card"
  ).forEach((card) => {
    card.hidden =
      Boolean(query) &&
      !isSelected(card) &&
      !clean(
        card.textContent
      ).includes(query);
  });
}

function enhanceClassGrid(root) {
  const chooseButton =
    root.querySelector(
      '[data-cc-action="choose-class"]'
    );
  const grid =
    chooseButton?.closest(
      ".hg-character-choice-grid"
    );

  if (!grid) {
    return;
  }

  if (
    grid.dataset.hgClassGrid !==
    "true"
  ) {
    grid.dataset.hgClassGrid =
      "true";

    const toolbar =
      document.createElement("div");

    toolbar.className =
      "hg-ui-toolbar";
    toolbar.innerHTML = `
      <label>
        Find a class
        <input
          type="search"
          data-hg-class-search
          value="${state.classQuery}"
          placeholder="Search class name or role..."
          autocomplete="off"
        >
      </label>
    `;
    grid.insertAdjacentElement(
      "beforebegin",
      toolbar
    );

    const selected =
      grid.querySelector(
        ".hg-character-choice-card.selected h3"
      )?.textContent?.trim();
    const current =
      root.querySelector(
        ".hg-character-current-choice"
      );

    if (
      current &&
      !current.querySelector(
        ".hg-class-next-choice"
      )
    ) {
      const next =
        document.createElement(
          "span"
        );

      next.className =
        "hg-class-next-choice";
      next.textContent =
        selected
          ? `${selected} selected. Next: set its level and complete highlighted class skills.`
          : "Next: choose a class.";
      current.append(next);
    }
  }

  filterClassGrid(grid);
}

function filterFeatPanel(panel) {
  const query =
    clean(
      panel.querySelector(
        'input[type="search"]'
      )?.value
    );
  const filter =
    panel.querySelector(
      "[data-hg-feat-filter]"
    )?.value || "all";

  panel.querySelectorAll(
    "[data-cc-feat-option], [data-hg-default-feat-option]"
  ).forEach((card) => {
    const selected =
      isSelected(card);
    const unavailable =
      card.classList
        .contains("unavailable");
    const text =
      clean(
        card.dataset
          .featSearchText ||
        card.textContent
      );
    const categoryMatch =
      filter === "all" ||
      (
        filter === "available" &&
        !unavailable
      ) ||
      (
        filter === "selected" &&
        selected
      ) ||
      (
        filter === "prerequisites" &&
        /prerequisite/.test(text)
      );

    card.hidden =
      !(
        (
          !query ||
          text.includes(query)
        ) &&
        categoryMatch
      );
  });
}

function addFeatFilter(panel) {
  if (
    panel.querySelector(
      "[data-hg-feat-filter]"
    )
  ) {
    return;
  }

  const toolbar =
    panel.querySelector(
      ".hg-feat-picker-toolbar"
    ) ||
    panel.querySelector(
      ".hg-ui-toolbar"
    );

  if (!toolbar) {
    return;
  }

  const label =
    document.createElement("label");

  label.innerHTML = `
    Show
    <select data-hg-feat-filter>
      <option value="all">All feats</option>
      <option value="available">Available</option>
      <option value="selected">Selected</option>
      <option value="prerequisites">With prerequisites</option>
    </select>
  `;
  toolbar.append(label);
}

function enhanceFeatGrids(root) {
  root.querySelectorAll(
    "[data-cc-asi-feat-picker]"
  ).forEach((panel) => {
    addFeatFilter(panel);
    filterFeatPanel(panel);
  });

  root.querySelectorAll(
    '[data-cc-action="toggle-default-feat"]'
  ).forEach((button) => {
    const card =
      button.closest(
        ".hg-character-choice-card"
      );
    const grid =
      card?.closest(
        ".hg-character-choice-grid"
      );

    if (!card || !grid) {
      return;
    }

    if (
      grid.matches(
        "[data-cc-default-feat-results]"
      )
    ) {
      return;
    }

    card.dataset
      .hgDefaultFeatOption =
        "true";

    if (
      grid.dataset
        .hgDefaultFeatGrid !==
        "true"
    ) {
      grid.dataset
        .hgDefaultFeatGrid =
          "true";

      const toolbar =
        document.createElement("div");

      toolbar.className =
        "hg-ui-toolbar";
      toolbar.innerHTML = `
        <label>
          Find a feat
          <input
            type="search"
            data-hg-feat-search
            placeholder="Search feat name or summary..."
            autocomplete="off"
          >
        </label>
      `;
      grid.insertAdjacentElement(
        "beforebegin",
        toolbar
      );
      addFeatFilter(
        grid.parentElement
      );
    }

    filterFeatPanel(
      grid.parentElement
    );
  });
}

function enhanceMulticlass(root) {
  const select =
    root.querySelector(
      "#ccMulticlassAddClass"
    );

  if (!select) {
    return;
  }

  const panel =
    select.closest(
      ".hg-character-step-panel"
    ) || root;

  if (
    panel.dataset
      .hgMulticlassEnhanced ===
      "true"
  ) {
    return;
  }

  panel.dataset.hgMulticlassEnhanced =
    "true";

  const controls =
    select.closest(
      ".hg-character-field-grid"
    );
  const note =
    controls?.previousElementSibling
      ?.matches(
        ".hg-character-beginner-note"
      )
      ? controls.previousElementSibling
      : null;
  const status =
    controls?.nextElementSibling
      ?.matches(
        "#ccMulticlassAddStatus"
      )
      ? controls.nextElementSibling
      : null;

  if (!controls) {
    return;
  }

  const dialog =
    document.createElement("dialog");
  const header =
    document.createElement("div");
  const body =
    document.createElement("div");

  dialog.className =
    "hg-multiclass-dialog";
  dialog.dataset
    .hgMulticlassDialog = "true";
  header.className =
    "hg-multiclass-dialog-header";
  header.innerHTML = `
    <h3>Add Another Class</h3>
    <button
      type="button"
      data-hg-ui-action="close-multiclass"
      aria-label="Close multiclass selection"
    >Close</button>
  `;
  body.className =
    "hg-multiclass-dialog-body";

  if (note) {
    body.append(note);
  }

  body.append(controls);

  if (status) {
    body.append(status);
  }

  dialog.append(header, body);
  panel.append(dialog);

  const summary = [
    ...panel.querySelectorAll(
      ".hg-character-current-choice"
    )
  ].find((entry) => {
    return !entry.closest("dialog");
  });
  const openButton =
    document.createElement("button");

  openButton.type = "button";
  openButton.className =
    "hg-open-multiclass";
  openButton.dataset.hgUiAction =
    "open-multiclass";
  openButton.textContent =
    "Add Another Class";
  openButton.disabled =
    select.disabled;

  (
    summary ||
    panel.firstElementChild
  )?.append(openButton);
}

function enhanceCoreProgress(root) {
  const rail =
    root.querySelector(
      ".hg-character-step-rail"
    );
  const track =
    root.querySelector(
      ".hg-character-progress-track"
    );

  if (!rail || !track) {
    return;
  }

  let progress =
    root.querySelector(
      ".hg-core-progress"
    );

  if (!progress) {
    progress =
      document.createElement("nav");
    progress.className =
      "hg-core-progress";
    progress.setAttribute(
      "aria-label",
      "Core character creation steps"
    );
    track.insertAdjacentElement(
      "afterend",
      progress
    );
  }

  const html =
    CORE_STEPS.map(
      ([stepId, label]) => {
        const source =
          rail.querySelector(
            `[data-step-id="${stepId}"]`
          );
        const complete =
          source?.classList
            .contains("complete");
        const active =
          source?.classList
            .contains("active");

        return `
          <button
            type="button"
            class="${
              complete
                ? "complete"
                : ""
            } ${
              active
                ? "active"
                : ""
            }"
            data-cc-action="go-step"
            data-step-id="${stepId}"
            aria-current="${
              active
                ? "step"
                : "false"
            }"
          >
            ${label}
          </button>
        `;
      }
    ).join("");

  if (progress.innerHTML !== html) {
    progress.innerHTML = html;
  }
}

function enhanceStickyActions(root) {
  const rail =
    root.querySelector(
      ".hg-character-step-rail"
    );
  const footer =
    root.querySelector(
      ".hg-character-step-footer"
    );
  const active =
    rail?.querySelector(
      ".hg-character-step-button.active"
    );

  if (!footer || !active) {
    return;
  }

  const stepId =
    active.dataset.stepId || "";
  const complete =
    active.classList
      .contains("complete");
  const required =
    REQUIRED_STEPS.has(stepId);
  const previous =
    footer.querySelector(
      '[data-cc-action="previous-step"]'
    );
  const next =
    footer.querySelector(
      '[data-cc-action="next-step"], [data-cc-action="finalize-character"]'
    );
  let missing =
    footer.querySelector(
      "[data-hg-step-missing]"
    );

  if (!missing) {
    missing =
      document.createElement("p");
    missing.className =
      "hg-step-missing";
    missing.dataset
      .hgStepMissing = "true";
    footer.prepend(missing);
  }

  const message =
    required && !complete
      ? "Complete the required choices marked on this step to continue."
      : "";

  missing.textContent = message;
  missing.hidden = !message;

  if (
    previous &&
    previous.textContent.trim() !==
      "Back"
  ) {
    previous.textContent = "Back";
  }

  if (!next) {
    return;
  }

  const finish =
    stepId === "save";

  next.dataset.ccAction =
    finish
      ? "finalize-character"
      : "next-step";
  next.textContent =
    finish
      ? "Finish Character"
      : "Continue";
  next.disabled =
    required && !complete;
  next.title = message;
  next.setAttribute(
    "aria-describedby",
    message
      ? "hgStepMissingMessage"
      : ""
  );
  missing.id =
    "hgStepMissingMessage";
}

function enhanceCards(root) {
  root.querySelectorAll(
    ".hg-character-choice-card"
  ).forEach(compactCard);
}

function enhance(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll(
    "[data-cc-default-spell-viewer]"
  ).forEach(enhanceSpellViewer);
  enhanceClassGrid(root);
  enhanceFeatGrids(root);
  enhanceMulticlass(root);
  enhanceCards(root);
  enhanceCoreProgress(root);
  enhanceStickyActions(root);
}

function loadStyles(doc) {
  if (
    doc.getElementById(
      "characterCreatorUiEnhancements"
    )
  ) {
    return;
  }

  const link =
    doc.createElement("link");

  link.id =
    "characterCreatorUiEnhancements";
  link.rel = "stylesheet";
  link.href = new URL(
    "./uiEnhancements.css?v=creator-ui-20260729",
    import.meta.url
  ).href;
  doc.head.append(link);
}

export function enhanceCharacterCreatorUi(
  root =
    typeof document !==
      "undefined"
      ? document.querySelector(
          "#characterWizardRoot"
        )
      : null
) {
  enhance(root);
  return root;
}

export function installCharacterCreatorUiEnhancements(
  doc =
    typeof document !==
      "undefined"
      ? document
      : null
) {
  if (!doc) {
    return null;
  }

  if (installations.has(doc)) {
    const existing =
      installations.get(doc);
    existing.enhance();
    return existing;
  }

  loadStyles(doc);

  let scheduled = false;
  const run = () => {
    scheduled = false;
    enhance(
      doc.querySelector(
        "#characterWizardRoot"
      )
    );
  };
  const schedule = () => {
    if (scheduled) {
      return;
    }

    scheduled = true;
    (
      doc.defaultView
        ?.requestAnimationFrame ||
      ((callback) => {
        return setTimeout(
          callback,
          0
        );
      })
    )(run);
  };

  const observer =
    new MutationObserver(schedule);

  observer.observe(
    doc.body ||
    doc.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  let filterTimerId = null;
  const pendingFilterTasks = new Map();
  const runPendingFilters = () => {
    filterTimerId = null;
    const tasks = [
      ...pendingFilterTasks.values()
    ];
    pendingFilterTasks.clear();
    tasks.forEach((task) => task());
  };
  const scheduleFilter = (key, task) => {
    pendingFilterTasks.set(key, task);

    if (
      filterTimerId &&
      typeof clearTimeout === "function"
    ) {
      clearTimeout(filterTimerId);
    }

    filterTimerId = setTimeout(
      runPendingFilters,
      UI_FILTER_DEBOUNCE_MS
    );
  };

  const onInput = (event) => {
    const target =
      event.target;

    if (
      target?.id ===
      "ccDefaultSpellSearch"
    ) {
      state.spellQuery =
        target.value;
      const viewer = target.closest(
        "[data-cc-default-spell-viewer]"
      );

      scheduleFilter("spells", () => {
        if (
          viewer &&
          viewer.isConnected !== false
        ) {
          filterSpellViewer(viewer);
        }
      });
      return;
    }

    if (
      target?.matches?.(
        "[data-hg-selected-spells-only]"
      )
    ) {
      state.selectedSpellsOnly =
        target.checked;
      const viewer = target.closest(
        "[data-cc-default-spell-viewer]"
      );

      if (viewer) {
        filterSpellViewer(viewer);
      }
      return;
    }

    if (
      target?.matches?.(
        "[data-hg-class-search]"
      )
    ) {
      state.classQuery =
        target.value;
      const root = doc.querySelector(
        "#characterWizardRoot"
      );

      scheduleFilter("classes", () => {
        root?.querySelectorAll(
          "[data-hg-class-grid]"
        ).forEach(filterClassGrid);
      });
      return;
    }

    if (
      target?.matches?.(
        "[data-hg-feat-search]"
      )
    ) {
      const panel = target.closest(
        ".hg-character-step-panel"
      );

      scheduleFilter("feats", () => {
        if (
          panel &&
          panel.isConnected !== false
        ) {
          filterFeatPanel(panel);
        }
      });
      return;
    }

    if (
      target?.matches?.(
        "[data-hg-feat-filter]"
      )
    ) {
      const panel = target.closest(
        ".hg-character-step-panel"
      );

      if (panel) {
        filterFeatPanel(panel);
      }
    }
  };

  const onClick = (event) => {
    const spellSummary =
      event.target?.closest?.(
        "[data-hg-spell-level] > summary"
      );

    if (spellSummary) {
      const group =
        spellSummary.parentElement;
      const level =
        Number(
          group?.dataset
            ?.hgSpellLevel
        );

      if (
        group &&
        Number.isInteger(level)
      ) {
        state.spellLevelIntent
          .set(
            level,
            !group.open
          );
      }
    }

    const remove =
      event.target?.closest?.(
        '[data-cc-action="remove-multiclass-class"]'
      );

    if (
      remove &&
      !doc.defaultView.confirm(
        "Remove this class? Other class selections will be preserved."
      )
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const action =
      event.target?.closest?.(
        "[data-hg-ui-action]"
      )?.dataset?.hgUiAction;

    if (!action) {
      return;
    }

    const dialog =
      event.target.closest(
        ".hg-character-step-panel"
      )?.querySelector(
        "[data-hg-multiclass-dialog]"
      );

    if (
      action ===
      "open-multiclass"
    ) {
      if (
        typeof dialog?.showModal ===
        "function"
      ) {
        dialog.showModal();
      } else if (dialog) {
        dialog.setAttribute(
          "open",
          ""
        );
      }
    }

    if (
      action ===
      "close-multiclass"
    ) {
      if (
        typeof dialog?.close ===
        "function"
      ) {
        dialog.close();
      } else {
        dialog?.removeAttribute(
          "open"
        );
      }
    }
  };

  doc.addEventListener(
    "input",
    onInput,
    true
  );
  doc.addEventListener(
    "change",
    onInput,
    true
  );
  doc.addEventListener(
    "click",
    onClick,
    true
  );

  const installation = {
    enhance: run,
    disconnect() {
      observer.disconnect();
      if (
        filterTimerId &&
        typeof clearTimeout === "function"
      ) {
        clearTimeout(filterTimerId);
      }
      filterTimerId = null;
      pendingFilterTasks.clear();
      doc.removeEventListener(
        "input",
        onInput,
        true
      );
      doc.removeEventListener(
        "change",
        onInput,
        true
      );
      doc.removeEventListener(
        "click",
        onClick,
        true
      );
      installations.delete(doc);
    }
  };

  installations.set(
    doc,
    installation
  );
  run();

  return installation;
}

if (
  typeof document !==
  "undefined"
) {
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        installCharacterCreatorUiEnhancements(
          document
        );
      },
      {
        once: true
      }
    );
  } else {
    installCharacterCreatorUiEnhancements(
      document
    );
  }
}
