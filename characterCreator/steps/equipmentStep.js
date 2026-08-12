const EQUIPMENT_STEP_ACTIONS = Object.freeze([
  "add-catalog-item",
  "add-custom-item",
  "skip-equipment",
  "toggle-contained-items",
  "open-container",
  "close-container",
  "move-item-out-container",
  "decrease-item-quantity",
  "increase-item-quantity",
  "toggle-item-equipped",
  "toggle-item-attuned",
  "remove-inventory-item",
  "resolve-container-removal"
]);

export function createEquipmentStep(
  dependencies = {}
) {
  const {
    ABILITY_DEFINITIONS,
    addSection15CatalogItem,
    addSection15CustomItem,
    beginnerNote,
    calculateCharacterCarryingCapacity,
    changeSection15Quantity,
    cleanString,
    getCharacterAttunementLimit,
    getCreatorState,
    getSection15AttunedItemCount,
    getSection15Inventory,
    getSection15InventoryCount,
    getSection15TotalWeight,
    getSection15UnknownWeightCount,
    markDraftChanged,
    moveSection15ItemToContainer,
    removeSection15Item,
    renderCreatorView,
    renderSection15Catalog,
    renderSection15Inventory,
    renderSection15OpenContainerPanel,
    safeDisplayString,
    safeNumber,
    setStatus,
    toggleSection15ItemState,
    updateSection15InventoryItem,
    wizardField,
    wizardSelect
  } = dependencies;

  const creatorState = getCreatorState();

  function renderStep() {
    const currency =
      creatorState.draft
        .equipment
        .currency;

    const inventoryCount =
      getSection15InventoryCount();

    const totalWeight =
      getSection15TotalWeight();

    const unknownWeightCount =
      getSection15UnknownWeightCount();

    const attunedCount =
      getSection15AttunedItemCount();
    const attunementLimit =
      getCharacterAttunementLimit(
        creatorState.draft
      );

    const carrying =
      calculateCharacterCarryingCapacity(
        creatorState.draft
      );

    const categories = [
      {
        value: "weapon",
        label: "Weapon"
      },
      {
        value: "armor",
        label: "Armor"
      },
      {
        value: "shield",
        label: "Shield"
      },
      {
        value: "adventuring-gear",
        label: "Adventuring Gear"
      },
      {
        value: "tool",
        label: "Tool"
      },
      {
        value: "consumable",
        label: "Consumable"
      },
      {
        value: "magic-item",
        label: "Magic Item"
      },
      {
        value: "treasure",
        label: "Treasure"
      },
      {
        value: "miscellaneous",
        label: "Miscellaneous"
      }
    ];

    const armorCategoryChoices = [
      {
        value: "",
        label: "No Armor Type"
      },
      {
        value: "light armor",
        label: "Light Armor"
      },
      {
        value: "medium armor",
        label: "Medium Armor"
      },
      {
        value: "heavy armor",
        label: "Heavy Armor"
      },
      {
        value: "shield",
        label: "Shield"
      }
    ];

    const attackAbilityChoices = [
      {
        value: "",
        label: "Auto"
      },
      ...ABILITY_DEFINITIONS.map((ability) => {
        return {
          value: ability.id,
          label: ability.name
        };
      })
    ];

    return `
      ${beginnerNote(
        "Equipment",
        "Equipment is your gear, weapons, armor, and money. Armor can change Armor Class, weapons affect attacks, and starting packages are the easiest choice for new players."
      )}

      <div class="hg-character-current-choice">
        <b>Total item count:</b>

        ${inventoryCount}

        <br>

        <b>Recorded weight:</b>

        ${Number(
          totalWeight.toFixed(2)
        )} lb.

        <br>

        <b>Carrying capacity:</b>

        ${Number(
          carrying.carryingCapacity
            .toFixed(2)
        )} lb.

        <br>

        <b>Push, drag, lift:</b>

        ${Number(
          carrying.pushDragLift
            .toFixed(2)
        )} lb.

        <br>

        <b>Unknown weights:</b>

        ${unknownWeightCount}

        <br>

        <b>Attunement:</b>

        ${attunedCount} / ${attunementLimit}
      </div>

      ${
        attunedCount >=
          attunementLimit
          ? `
            <div class="hg-character-warning">
              The attunement limit is reached.
            </div>
          `
          : ""
      }

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="skip-equipment"
        >
          No Starting Equipment
        </button>

        <button
          type="button"
          data-cc-action="toggle-contained-items"
        >
          ${
            creatorState.showContainedItems
              ? "Hide Contained Items"
              : "Show Contained Items"
          }
        </button>
      </div>

      <h3>Inventory</h3>

      <div class="hg-character-choice-grid">
        ${renderSection15Inventory()}
      </div>

      ${renderSection15OpenContainerPanel()}

      <hr>

      <h3>Equipment Catalog</h3>

      <p>
        Catalog entries are reusable templates. Adding one
        copies it into this character's inventory.
      </p>

      <div class="hg-character-choice-grid">
        ${renderSection15Catalog()}
      </div>

      <hr>

      <h3>Add Custom Item</h3>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Item Name",
          "ccNewItemName",
          "",
          {
            placeholder:
              "Crimson Moon Blade"
          }
        )}

        ${wizardSelect(
          "Category",
          "ccNewItemCategory",
          "miscellaneous",
          categories
        )}

        ${wizardField(
          "Quantity",
          "ccNewItemQuantity",
          1,
          {
            type: "number",
            valueType: "integer",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Weight Each",
          "ccNewItemWeight",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Optional",
            extra:
              'min="0" step="0.1"'
          }
        )}

        ${wizardField(
          "Container Capacity",
          "ccNewItemCapacityWeight",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Optional",
            extra:
              'min="0" step="0.1"'
          }
        )}

        ${wizardSelect(
          "Armor Type",
          "ccNewItemArmorCategory",
          "",
          armorCategoryChoices
        )}

        ${wizardField(
          "Base Armor Class",
          "ccNewItemBaseArmorClass",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Optional",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Dexterity Cap",
          "ccNewItemDexterityCap",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Medium armor usually 2",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Magic AC Bonus",
          "ccNewItemMagicalArmorBonus",
          0,
          {
            type: "number",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Weapon Type",
          "ccNewItemWeaponType",
          "",
          {
            placeholder:
              "simple melee, martial ranged..."
          }
        )}

        ${wizardSelect(
          "Attack Ability",
          "ccNewItemAttackAbility",
          "",
          attackAbilityChoices
        )}

        ${wizardField(
          "Damage Dice",
          "ccNewItemDamageDice",
          "",
          {
            placeholder:
              "1d8"
          }
        )}

        ${wizardField(
          "Versatile Dice",
          "ccNewItemVersatileDamageDice",
          "",
          {
            placeholder:
              "1d10"
          }
        )}

        ${wizardField(
          "Magic Attack Bonus",
          "ccNewItemMagicalAttackBonus",
          0,
          {
            type: "number",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Magic Damage Bonus",
          "ccNewItemMagicalDamageBonus",
          0,
          {
            type: "number",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Item Notes",
          "ccNewItemNotes",
          "",
          {
            type: "textarea",

            placeholder:
              "Properties, damage, armor class, effects...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <label>
          <input
            id="ccNewItemEquipped"
            type="checkbox"
          >

          Start equipped
        </label>

        <label>
          <input
            id="ccNewItemMagical"
            type="checkbox"
          >

          Magical
        </label>

        <label>
          <input
            id="ccNewItemRequiresAttunement"
            type="checkbox"
          >

          Requires attunement
        </label>

        <label>
          <input
            id="ccNewItemAttuned"
            type="checkbox"
          >

          Start attuned
        </label>

        <label>
          <input
            id="ccNewItemContainer"
            type="checkbox"
          >

          Container
        </label>

        <label>
          <input
            id="ccNewItemShield"
            type="checkbox"
          >

          Shield
        </label>

        <label>
          <input
            id="ccNewItemFinesse"
            type="checkbox"
          >

          Finesse
        </label>

        <label>
          <input
            id="ccNewItemRanged"
            type="checkbox"
          >

          Ranged
        </label>

        <label>
          <input
            id="ccNewItemThrown"
            type="checkbox"
          >

          Thrown
        </label>

        <label>
          <input
            id="ccNewItemProficient"
            type="checkbox"
          >

          Proficient
        </label>

        <button
          type="button"
          data-cc-action="add-custom-item"
        >
          Add Custom Item
        </button>
      </div>

      <hr>

      <h3>Currency</h3>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Copper Pieces",
          "ccCurrencyCp",
          currency.cp,
          {
            type: "number",
            path: "equipment.currency.cp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Silver Pieces",
          "ccCurrencySp",
          currency.sp,
          {
            type: "number",
            path: "equipment.currency.sp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Electrum Pieces",
          "ccCurrencyEp",
          currency.ep,
          {
            type: "number",
            path: "equipment.currency.ep",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Gold Pieces",
          "ccCurrencyGp",
          currency.gp,
          {
            type: "number",
            path: "equipment.currency.gp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Platinum Pieces",
          "ccCurrencyPp",
          currency.pp,
          {
            type: "number",
            path: "equipment.currency.pp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}
      </div>

      <hr>

      <h3>Inventory Notes</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Equipment Notes",
          "ccEquipmentNotes",

          safeDisplayString(
            creatorState.draft
              .equipment
              .notes
          ),

          {
            type: "textarea",
            path: "equipment.notes",

            placeholder:
              "Carrying details, containers, ammunition, treasure, debts...",

            wide: true
          }
        )}
      </div>
    `;
  }

  function findSection15ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function getSection15ActionIndex(
    ...values
  ) {
    const button =
      findSection15ActionElement(
        ...values
      );

    return Math.round(
      safeNumber(
        button?.dataset?.index,
        -1
      )
    );
  }

  function handleSection15AddCatalogItem(
    ...values
  ) {
    const button =
      findSection15ActionElement(
        ...values
      );

    const itemId =
      button?.dataset?.itemId ||
      "";

    if (
      addSection15CatalogItem(
        itemId
      )
    ) {
      setStatus(
        "Catalog item added to inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15AddCustomItem() {
    if (
      addSection15CustomItem()
    ) {
      setStatus(
        "Custom item added to inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15SkipEquipment() {
    creatorState.draft
      .equipment
      .startingPackageId = "none";

    markDraftChanged();

    setStatus(
      "Starting equipment skipped."
    );

    renderCreatorView();
  }

  function handleSection15ToggleContainedItems() {
    creatorState.showContainedItems =
      creatorState.showContainedItems !== true;

    setStatus(
      creatorState.showContainedItems
        ? "Contained items are shown in the main inventory."
        : "Contained items are hidden from the main inventory."
    );

    renderCreatorView();
  }

  function handleSection15OpenContainer(
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    const item =
      getSection15Inventory()[index];

    if (
      !item ||
      item.isContainer !== true
    ) {
      return;
    }

    const itemId =
      cleanString(item.id);

    creatorState.openContainerId =
      creatorState.openContainerId === itemId
        ? ""
        : itemId;

    setStatus(
      creatorState.openContainerId
        ? `${item.name || "Container"} opened.`
        : "Container closed."
    );

    renderCreatorView();
  }

  function handleSection15CloseContainer() {
    creatorState.openContainerId = "";

    setStatus(
      "Container closed."
    );

    renderCreatorView();
  }

  function handleSection15MoveItemOut(
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      moveSection15ItemToContainer(
        index,
        "",
        null
      )
    ) {
      setStatus(
        "Item moved to general inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15ChangeQuantity(
    amount,
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      changeSection15Quantity(
        index,
        amount
      )
    ) {
      setStatus(
        "Item quantity updated."
      );

      renderCreatorView();
    }
  }

  function handleSection15RemoveItem(
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    const result =
      removeSection15Item(
        index
      );

    if (result === "pending") {
      setStatus(
        "Choose how to handle the container's contents."
      );

      renderCreatorView();

      return;
    }

    if (result) {
      setStatus(
        "Item removed from inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15ResolveContainerRemoval(
    ...values
  ) {
    const button =
      findSection15ActionElement(
        ...values
      );

    const containerId =
      cleanString(
        button?.dataset
          ?.containerId
      );

    const removalMode =
      cleanString(
        button?.dataset
          ?.removalMode
      );

    const inventory =
      getSection15Inventory();

    const index =
      inventory.findIndex((item) => {
        return (
          cleanString(item.id) ===
          containerId
        );
      });

    const result =
      removeSection15Item(
        index,
        removalMode
      );

    if (result === "pending") {
      setStatus(
        "Choose how to handle the container's contents."
      );

      renderCreatorView();

      return;
    }

    if (removalMode === "cancel") {
      setStatus(
        "Container removal cancelled."
      );

      renderCreatorView();

      return;
    }

    if (result) {
      setStatus(
        removalMode === "delete"
          ? "Container and contents removed."
          : "Container removed and contents moved to inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15ToggleState(
    property,
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      toggleSection15ItemState(
        index,
        property
      )
    ) {
      setStatus(
        property === "equipped"
          ? "Equipped state updated."
          : "Attunement state updated."
      );

      renderCreatorView();
    }
  }

  function handleSection15Change(event) {
    const target =
      event?.target;

    if (
      target?.dataset
        ?.ccActionChange !==
      "move-item-container" &&
      target?.dataset
        ?.ccActionChange !==
      "update-inventory-item"
    ) {
      return false;
    }

    const index =
      Math.round(
        safeNumber(
          target.dataset.index,
          -1
        )
      );

    if (
      target.dataset
        .ccActionChange ===
      "update-inventory-item"
    ) {
      if (
        updateSection15InventoryItem(
          index,
          target.dataset.itemField,
          target.value,
          target.dataset.valueType,
          target.checked
        )
      ) {
        setStatus(
          "Inventory item updated."
        );

        renderCreatorView();
      }

      return true;
    }

    const quantityInput =
      typeof document !== "undefined"
        ? document.getElementById(
            `ccItemMoveQuantity-${index}`
          )
        : null;

    const itemBeforeMove =
      getSection15Inventory()[index];

    const movingIntoContainer =
      Boolean(
        cleanString(target.value)
      );

    const clearsEquippedState =
      movingIntoContainer &&
      (
        itemBeforeMove?.equipped === true ||
        itemBeforeMove?.attuned === true
      );

    if (
      moveSection15ItemToContainer(
        index,
        target.value,
        quantityInput?.value
      )
    ) {
      setStatus(
        clearsEquippedState
          ? "Container assignment updated; stored items were unequipped and unattuned."
          : "Container assignment updated."
      );

      renderCreatorView();
    }

    return true;
  }

  async function handleStepClick(context) {
    const action =
      cleanString(context?.action);

    switch (action) {
      case "add-catalog-item":
        handleSection15AddCatalogItem(context);
        return true;
      case "add-custom-item":
        handleSection15AddCustomItem();
        return true;
      case "skip-equipment":
        handleSection15SkipEquipment();
        return true;
      case "toggle-contained-items":
        handleSection15ToggleContainedItems();
        return true;
      case "open-container":
        handleSection15OpenContainer(context);
        return true;
      case "close-container":
        handleSection15CloseContainer();
        return true;
      case "move-item-out-container":
        handleSection15MoveItemOut(context);
        return true;
      case "decrease-item-quantity":
        handleSection15ChangeQuantity(-1, context);
        return true;
      case "increase-item-quantity":
        handleSection15ChangeQuantity(1, context);
        return true;
      case "toggle-item-equipped":
        handleSection15ToggleState(
          "equipped",
          context
        );
        return true;
      case "toggle-item-attuned":
        handleSection15ToggleState(
          "attuned",
          context
        );
        return true;
      case "remove-inventory-item":
        handleSection15RemoveItem(context);
        return true;
      case "resolve-container-removal":
        handleSection15ResolveContainerRemoval(
          context
        );
        return true;
      default:
        return false;
    }
  }

  function handleStepInput() {
    return false;
  }

  function handleStepChange(context) {
    return handleSection15Change(context);
  }

  function isStepComplete(character) {
    const equipment =
      character?.equipment || {};

    if (
      equipment.startingPackageId ===
      "none"
    ) {
      return true;
    }

    const currency =
      equipment.currency || {};

    const hasCurrency =
      Object.values(currency).some((value) => {
        return safeNumber(value, 0) > 0;
      });

    return Boolean(
      safeDisplayString(
        equipment.startingPackageId
      ) ||
      safeDisplayString(
        equipment.notes
      ) ||
      hasCurrency ||
      (
        Array.isArray(equipment.items) &&
        equipment.items.length > 0
      )
    );
  }

  function validateStep(character) {
    const complete =
      isStepComplete(character);

    return {
      valid: complete,
      blockingErrors: complete
        ? []
        : [
            "Choose starting equipment, add inventory or currency, enter equipment notes, or select No Starting Equipment."
          ],
      reminders: []
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function getStepWarnings(character) {
    const validation =
      validateStep(character);

    return [
      ...validation.blockingErrors,
      ...validation.reminders
    ];
  }

  return Object.freeze({
    id: "equipment",
    actions: EQUIPMENT_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    findActionElement:
      findSection15ActionElement,
    compatibility: Object.freeze({
      renderEquipmentStep: renderStep,
      findSection15ActionElement,
      getSection15ActionIndex,
      handleSection15AddCatalogItem,
      handleSection15AddCustomItem,
      handleSection15SkipEquipment,
      handleSection15ToggleContainedItems,
      handleSection15OpenContainer,
      handleSection15CloseContainer,
      handleSection15MoveItemOut,
      handleSection15ChangeQuantity,
      handleSection15RemoveItem,
      handleSection15ResolveContainerRemoval,
      handleSection15ToggleState,
      handleSection15Change
    })
  });
}
