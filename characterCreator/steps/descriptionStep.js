const DESCRIPTION_STEP_ACTIONS = Object.freeze([
  "set-portrait-url",
  "remove-portrait"
]);

export function createDescriptionStep(dependencies = {}) {
  const {
    $,
    SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES,
    SECTION11_UPLOADED_PORTRAIT_MAX_BYTES,
    applyCompatibilityAliases,
    beginCharacterBusyAction,
    beginnerNote,
    cleanString,
    createEmptyCharacter,
    deleteCharacterPortrait,
    endCharacterBusyAction,
    escapeHtml,
    getCreatorState,
    getRoomCode,
    getSafeCharacterName,
    isCharacterCreatorBusy,
    markDraftChanged,
    normalizeCharacterImageValue,
    renderCreatorView,
    safeDisplayString,
    safeNumber,
    setStatus,
    uploadCharacterPortrait,
    wizardField
  } = dependencies;

  const creatorState = getCreatorState();

  function getSection11Portrait(
    character = creatorState.draft
  ) {
    return normalizeCharacterImageValue(
      character?.identity?.image,
      character?.identity || {}
    );
  }

  function hasSection11PortraitUploadHook() {
    return (
      typeof uploadCharacterPortrait ===
      "function"
    );
  }

  function isSection11PortraitUrlAllowed(url) {
    const cleanUrl = cleanString(url);

    if (!cleanUrl) {
      return false;
    }

    if (/^data:image\//i.test(cleanUrl)) {
      return true;
    }

    try {
      const parsedUrl = new URL(
        cleanUrl,
        typeof window !== "undefined"
          ? window.location.href
          : "https://example.invalid/"
      );

      return (
        parsedUrl.protocol === "http:" ||
        parsedUrl.protocol === "https:"
      );
    } catch (error) {
      return false;
    }
  }

  function formatSection11PortraitBytes(bytes) {
    const size = safeNumber(bytes, 0);

    if (size >= 1024 * 1024) {
      return `${Math.round(size / 1024 / 1024)} MB`;
    }

    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  function isSection11PortraitFile(file) {
    if (!file) {
      return false;
    }

    const type = cleanString(file.type).toLowerCase();

    if (type.startsWith("image/")) {
      return true;
    }

    return /\.(avif|gif|jpe?g|png|webp)$/i.test(
      cleanString(file.name)
    );
  }

  function readSection11PortraitFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === "undefined") {
        reject(
          new Error(
            "Portrait file reading is not available in this browser."
          )
        );
        return;
      }

      const reader = new FileReader();

      reader.addEventListener("load", () => {
        resolve(cleanString(reader.result));
      });

      reader.addEventListener("error", () => {
        reject(
          reader.error ||
          new Error(
            "The selected portrait could not be read."
          )
        );
      });

      reader.readAsDataURL(file);
    });
  }

  function setSection11Portrait(imageData, options = {}) {
    const image = normalizeCharacterImageValue(imageData);

    if (!image.url) {
      setStatus("Choose a portrait image first.");
      return false;
    }

    if (!isSection11PortraitUrlAllowed(image.url)) {
      setStatus("Portrait must be an image URL.");
      return false;
    }

    if (
      !creatorState.draft.identity ||
      typeof creatorState.draft.identity !== "object"
    ) {
      creatorState.draft.identity = {
        ...createEmptyCharacter().identity
      };
    }

    creatorState.draft.identity.image = {
      url: image.url,
      publicId: image.publicId
    };

    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    if (options.status !== false) {
      setStatus(options.status || "Portrait updated.");
    }

    if (options.render !== false) {
      renderCreatorView();
    }

    return true;
  }

  function clearSection11Portrait(options = {}) {
    const current = getSection11Portrait();

    if (!current.url && !current.publicId) {
      if (options.status !== false) {
        setStatus("No portrait is selected.");
      }
      return false;
    }

    creatorState.draft.identity =
      creatorState.draft.identity ||
      { ...createEmptyCharacter().identity };

    creatorState.draft.identity.image = {
      url: "",
      publicId: ""
    };

    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    if (options.status !== false) {
      setStatus(options.status || "Portrait removed.");
    }

    if (options.render !== false) {
      renderCreatorView();
    }

    return true;
  }

  async function cleanupSection11PreviousPortrait(
    previousImage,
    nextImage = {}
  ) {
    const previousPublicId = cleanString(
      previousImage?.publicId
    );

    if (
      !previousPublicId ||
      previousPublicId === cleanString(nextImage?.publicId) ||
      typeof deleteCharacterPortrait !== "function"
    ) {
      return true;
    }

    try {
      await deleteCharacterPortrait(previousPublicId, {
        roomCode: getRoomCode(),
        characterId: creatorState.currentCharacterId,
        previousImage,
        nextImage
      });
      return true;
    } catch (error) {
      console.warn(
        "Could not remove previous character portrait:",
        error
      );
      return false;
    }
  }

  async function replaceSection11Portrait(
    imageData,
    statusMessage
  ) {
    const previousImage = getSection11Portrait();
    const nextImage = normalizeCharacterImageValue(imageData);
    const updated = setSection11Portrait(nextImage, {
      render: false,
      status: statusMessage || "Portrait updated."
    });

    if (!updated) {
      return false;
    }

    const cleanedUp = await cleanupSection11PreviousPortrait(
      previousImage,
      nextImage
    );

    if (!cleanedUp) {
      setStatus(
        "Portrait updated. Previous hosted image could not be removed."
      );
    }

    renderCreatorView();
    return true;
  }

  async function removeSection11Portrait() {
    const previousImage = getSection11Portrait();
    const removed = clearSection11Portrait({
      render: false,
      status: "Portrait removed."
    });

    if (!removed) {
      renderCreatorView();
      return false;
    }

    const cleanedUp = await cleanupSection11PreviousPortrait(
      previousImage,
      {}
    );

    if (!cleanedUp) {
      setStatus(
        "Portrait removed. Previous hosted image could not be removed."
      );
    }

    renderCreatorView();
    return true;
  }

  async function createSection11PortraitFromFile(file) {
    if (!file) {
      throw new Error("Choose a portrait image first.");
    }

    if (!isSection11PortraitFile(file)) {
      throw new Error("Portrait file must be an image.");
    }

    const hasUploadHook = hasSection11PortraitUploadHook();
    const maxBytes = hasUploadHook
      ? SECTION11_UPLOADED_PORTRAIT_MAX_BYTES
      : SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES;

    if (safeNumber(file.size, 0) > maxBytes) {
      throw new Error(
        hasUploadHook
          ? `Portrait image must be ${formatSection11PortraitBytes(maxBytes)} or smaller.`
          : `Portrait image must be ${formatSection11PortraitBytes(maxBytes)} or smaller without hosted uploads.`
      );
    }

    if (hasUploadHook) {
      const uploadResult = await uploadCharacterPortrait(file, {
        roomCode: getRoomCode(),
        characterId: creatorState.currentCharacterId,
        character: creatorState.draft,
        previousImage: getSection11Portrait()
      });
      const uploadedImage = normalizeCharacterImageValue(uploadResult);

      if (!uploadedImage.url) {
        throw new Error(
          "Portrait upload did not return an image URL."
        );
      }

      return uploadedImage;
    }

    const dataUrl = await readSection11PortraitFileAsDataUrl(file);
    return { url: dataUrl, publicId: "" };
  }

  async function uploadSection11PortraitFile(file) {
    if (!file) {
      return false;
    }

    if (!beginCharacterBusyAction("upload-portrait")) {
      return false;
    }

    try {
      const image = await createSection11PortraitFromFile(file);
      await replaceSection11Portrait(image, "Portrait updated.");
      return true;
    } catch (error) {
      setStatus(
        error?.message || "Portrait could not be uploaded."
      );

      if (typeof document !== "undefined") {
        renderCreatorView();
      }
      return false;
    } finally {
      endCharacterBusyAction("upload-portrait");
    }
  }

  function renderSection11PortraitPanel() {
    const portrait = getSection11Portrait();
    const imageUrl = cleanString(portrait.url);
    const publicId = cleanString(portrait.publicId);
    const isBusy = isCharacterCreatorBusy();
    const isUploading =
      creatorState.busyAction === "upload-portrait";

    return `
      <article class="hg-character-portrait-panel">
        <div class="hg-character-portrait-frame">
          ${
            imageUrl
              ? `
                <img
                  src="${escapeHtml(imageUrl)}"
                  alt="${escapeHtml(
                    getSafeCharacterName() || "Character portrait"
                  )}"
                >
              `
              : `
                <div class="hg-character-portrait-placeholder">
                  No portrait selected
                </div>
              `
          }
        </div>

        <div class="hg-character-portrait-controls">
          ${wizardField(
            "Portrait Image URL",
            "ccPortraitUrl",
            imageUrl,
            {
              placeholder: "https://example.com/portrait.png",
              extra: isBusy ? "disabled" : ""
            }
          )}

          <div class="hg-character-portrait-actions">
            <button
              type="button"
              data-cc-action="set-portrait-url"
              ${isBusy ? "disabled" : ""}
            >
              Use URL
            </button>

            <label class="fileButtonLabel">
              ${isUploading ? "Uploading..." : "Choose Image"}

              <input
                id="characterImageUploadInput"
                type="file"
                accept="image/*,.avif,.gif,.jpg,.jpeg,.png,.webp"
                data-cc-portrait-upload="true"
                ${isBusy ? "disabled" : ""}
              >
            </label>

            <button
              type="button"
              data-cc-action="remove-portrait"
              ${!imageUrl || isBusy ? "disabled" : ""}
            >
              Remove Portrait
            </button>
          </div>

          ${
            publicId
              ? `
                <div class="hg-character-portrait-meta">
                  Stored ID:
                  ${escapeHtml(publicId)}
                </div>
              `
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderDescriptionNameField() {
    return wizardField(
      "Character Name",
      "ccCharacterName",
      getSafeCharacterName(),
      {
        path: "identity.name",
        placeholder: "Character name"
      }
    );
  }

  function renderDescriptionAppearanceField() {
    return wizardField(
      "Appearance / Identity Notes",
      "ccAppearance",
      safeDisplayString(
        creatorState.draft.identity?.appearance
      ),
      {
        type: "textarea",
        path: "identity.appearance",
        placeholder: "Appearance, personality, identity notes...",
        wide: true
      }
    );
  }

  function renderDescriptionNotesField() {
    return wizardField(
      "General Notes",
      "ccGeneralNotes",
      safeDisplayString(creatorState.draft.notes),
      {
        type: "textarea",
        path: "notes",
        placeholder: "Anything that does not fit elsewhere...",
        wide: true
      }
    );
  }

  function renderDescriptionStoryFields() {
    const background = creatorState.draft.background || {};

    return `
      <hr>

      <h3>Personality and Story</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Personality Traits",
          "ccBackgroundTraits",
          safeDisplayString(background.traits),
          {
            type: "textarea",
            path: "background.traits",
            placeholder: "Habits, personality, mannerisms...",
            wide: true
          }
        )}

        ${wizardField(
          "Ideals",
          "ccBackgroundIdeals",
          safeDisplayString(background.ideals),
          {
            type: "textarea",
            path: "background.ideals",
            placeholder: "What principles guide this character?",
            wide: true
          }
        )}

        ${wizardField(
          "Bonds",
          "ccBackgroundBonds",
          safeDisplayString(background.bonds),
          {
            type: "textarea",
            path: "background.bonds",
            placeholder: "People, places, promises, or treasures...",
            wide: true
          }
        )}

        ${wizardField(
          "Flaws",
          "ccBackgroundFlaws",
          safeDisplayString(background.flaws),
          {
            type: "textarea",
            path: "background.flaws",
            placeholder: "Fears, weaknesses, or destructive habits...",
            wide: true
          }
        )}

        ${wizardField(
          "Backstory",
          "ccBackgroundBackstory",
          safeDisplayString(background.backstory),
          {
            type: "textarea",
            path: "background.backstory",
            placeholder: "Write the character's history...",
            wide: true
          }
        )}
      </div>
    `;
  }

  function renderStep() {
    return `
      ${beginnerNote(
        "Character Description",
        "Describe who your character is, their appearance and story, and optionally add a portrait."
      )}

      <div class="hg-character-field-grid">
        ${renderSection11PortraitPanel()}
        ${renderDescriptionNameField()}
        ${renderDescriptionAppearanceField()}
        ${renderDescriptionNotesField()}
      </div>

      ${renderDescriptionStoryFields()}
    `;
  }

  async function handleSection11SetPortraitUrl() {
    const input =
      typeof document !== "undefined"
        ? document.getElementById("ccPortraitUrl")
        : null;

    await replaceSection11Portrait(
      { url: input?.value || "", publicId: "" },
      "Portrait URL updated."
    );
  }

  async function handleSection11RemovePortrait() {
    await removeSection11Portrait();
  }

  async function handleSection11PortraitChange({ target } = {}) {
    if (target?.dataset?.ccPortraitUpload !== "true") {
      return false;
    }

    const file = target.files?.[0] || null;
    await uploadSection11PortraitFile(file);
    target.value = "";
    return true;
  }

  function handleStepClick(context) {
    switch (cleanString(context?.action)) {
      case "set-portrait-url":
        handleSection11SetPortraitUrl();
        return true;
      case "remove-portrait":
        handleSection11RemovePortrait();
        return true;
      default:
        return false;
    }
  }

  function handleStepInput() {
    return false;
  }

  function handleStepChange(context) {
    return handleSection11PortraitChange(context);
  }

  function getStepWarnings(character = creatorState.draft) {
    return getSafeCharacterName(character)
      ? []
      : ["Character name is missing."];
  }

  function validateStep(character = creatorState.draft) {
    const blockingErrors = getStepWarnings(character);
    return {
      valid: blockingErrors.length === 0,
      blockingErrors,
      reminders: []
    };
  }

  function normalizeStepData(character) {
    if (!character || typeof character !== "object") {
      return character;
    }

    character.identity =
      character.identity && typeof character.identity === "object"
        ? character.identity
        : { ...createEmptyCharacter().identity };
    character.background =
      character.background && typeof character.background === "object"
        ? character.background
        : {};
    character.identity.image = normalizeCharacterImageValue(
      character.identity.image,
      character.identity
    );
    return character;
  }

  function isStepComplete(character = creatorState.draft) {
    return getStepWarnings(character).length === 0;
  }

  return Object.freeze({
    id: "description",
    actions: DESCRIPTION_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      getSection11Portrait,
      hasSection11PortraitUploadHook,
      isSection11PortraitUrlAllowed,
      formatSection11PortraitBytes,
      isSection11PortraitFile,
      readSection11PortraitFileAsDataUrl,
      setSection11Portrait,
      clearSection11Portrait,
      cleanupSection11PreviousPortrait,
      replaceSection11Portrait,
      removeSection11Portrait,
      createSection11PortraitFromFile,
      uploadSection11PortraitFile,
      renderSection11PortraitPanel,
      renderDescriptionNameField,
      renderDescriptionAppearanceField,
      renderDescriptionNotesField,
      renderDescriptionStoryFields,
      handleSection11SetPortraitUrl,
      handleSection11RemovePortrait,
      handleSection11PortraitChange
    })
  });
}
