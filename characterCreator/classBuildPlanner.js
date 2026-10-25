export const CLASS_BUILD_MODES = Object.freeze([
  "single",
  "multiclass"
]);

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
}

function cleanId(value) {
  return String(value ?? "").trim();
}

function uniqueIds(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map(cleanId)
      .filter(Boolean)
  )];
}

export function clampCharacterLevel(value) {
  return Math.max(
    1,
    Math.min(
      20,
      Math.round(safeNumber(value, 1))
    )
  );
}

export function allocateClassLevels({
  totalLevel,
  selectedClassIds = [],
  startingClassId = "",
  previousLevels = {}
} = {}) {
  const total = clampCharacterLevel(totalLevel);
  const selected = uniqueIds(selectedClassIds)
    .slice(0, total);

  if (!selected.length) {
    return {};
  }

  const allocations = Object.fromEntries(
    selected.map((classId) => [classId, 1])
  );
  let remaining = total - selected.length;

  selected.forEach((classId) => {
    if (remaining < 1) {
      return;
    }

    const requestedExtra = Math.max(
      0,
      Math.round(
        safeNumber(previousLevels?.[classId], 1)
      ) - 1
    );
    const grantedExtra = Math.min(
      remaining,
      requestedExtra
    );

    allocations[classId] += grantedExtra;
    remaining -= grantedExtra;
  });

  const preferredClassId = selected.includes(
    cleanId(startingClassId)
  )
    ? cleanId(startingClassId)
    : selected[0];

  allocations[preferredClassId] += remaining;
  return allocations;
}

export function createClassBuildPlan(
  character = {}
) {
  const classEntries = Array.isArray(
    character?.classProgression?.classes
  )
    ? character.classProgression.classes
    : [];
  const selectedClassIds = uniqueIds(
    classEntries.map((entry) => {
      return entry?.classId || entry?.className;
    })
  );
  const levels = Object.fromEntries(
    classEntries.map((entry) => [
      cleanId(entry?.classId || entry?.className),
      Math.max(
        1,
        Math.round(safeNumber(entry?.level, 1))
      )
    ])
  );
  const summedLevel = Object.values(levels)
    .reduce((sum, level) => sum + level, 0);
  const totalLevel = clampCharacterLevel(
    character?.classProgression?.totalLevel ||
      summedLevel ||
      character?.level ||
      1
  );
  const rawLevelOrder = Array.isArray(
    character?.classProgression?.levelOrder
  )
    ? character.classProgression.levelOrder
    : [];
  const firstOrderKey = cleanId(
    typeof rawLevelOrder[0] === "string"
      ? rawLevelOrder[0]
      : rawLevelOrder[0]?.entryId ||
        rawLevelOrder[0]?.classEntryId ||
        rawLevelOrder[0]?.classId
  );
  const startingEntry = classEntries.find((entry) => {
    return [
      entry?.entryId,
      entry?.classEntryId,
      entry?.classId,
      entry?.className
    ].map(cleanId).includes(firstOrderKey);
  }) || classEntries[0] || null;
  const startingClassId = cleanId(
    startingEntry?.classId ||
      startingEntry?.className ||
      selectedClassIds[0]
  );

  return {
    totalLevel,
    mode:
      selectedClassIds.length > 1
        ? "multiclass"
        : "single",
    selectedClassIds,
    startingClassId,
    levels: allocateClassLevels({
      totalLevel,
      selectedClassIds,
      startingClassId,
      previousLevels: levels
    }),
    rememberedMulticlassClassIds:
      selectedClassIds.length > 1
        ? [...selectedClassIds]
        : [],
    rememberedMulticlassLevels:
      selectedClassIds.length > 1
        ? { ...levels }
        : {}
  };
}

export function normalizeClassBuildPlan(
  plan = {}
) {
  const totalLevel = clampCharacterLevel(
    plan.totalLevel
  );
  const mode = CLASS_BUILD_MODES.includes(
    plan.mode
  )
    ? plan.mode
    : "single";
  let selectedClassIds = uniqueIds(
    plan.selectedClassIds
  ).slice(0, totalLevel);

  if (
    mode === "single" &&
    selectedClassIds.length > 1
  ) {
    const preferred = cleanId(
      plan.startingClassId
    );
    selectedClassIds = [
      selectedClassIds.includes(preferred)
        ? preferred
        : selectedClassIds[0]
    ];
  }

  const startingClassId = selectedClassIds.includes(
    cleanId(plan.startingClassId)
  )
    ? cleanId(plan.startingClassId)
    : selectedClassIds[0] || "";

  return {
    ...plan,
    totalLevel,
    mode:
      totalLevel === 1
        ? "single"
        : mode,
    selectedClassIds,
    startingClassId,
    levels: allocateClassLevels({
      totalLevel,
      selectedClassIds,
      startingClassId,
      previousLevels: plan.levels
    }),
    rememberedMulticlassClassIds: uniqueIds(
      plan.rememberedMulticlassClassIds
    ),
    rememberedMulticlassLevels:
      plan.rememberedMulticlassLevels &&
      typeof plan.rememberedMulticlassLevels === "object"
        ? { ...plan.rememberedMulticlassLevels }
        : {}
  };
}

export function setClassBuildMode(
  rawPlan,
  nextMode
) {
  const plan = normalizeClassBuildPlan(rawPlan);
  const mode = CLASS_BUILD_MODES.includes(nextMode)
    ? nextMode
    : plan.mode;

  if (mode === "multiclass" && plan.totalLevel < 2) {
    return plan;
  }

  if (mode === "single") {
    const selectedClassIds = [...plan.selectedClassIds];
    const singleClassId = plan.startingClassId ||
      selectedClassIds[0] ||
      "";

    return normalizeClassBuildPlan({
      ...plan,
      mode,
      rememberedMulticlassClassIds:
        selectedClassIds.length > 1
          ? selectedClassIds
          : plan.rememberedMulticlassClassIds,
      rememberedMulticlassLevels:
        selectedClassIds.length > 1
          ? { ...plan.levels }
          : plan.rememberedMulticlassLevels,
      selectedClassIds:
        singleClassId ? [singleClassId] : [],
      startingClassId: singleClassId
    });
  }

  const restoredIds = uniqueIds(
    plan.rememberedMulticlassClassIds
  ).slice(0, plan.totalLevel);

  return normalizeClassBuildPlan({
    ...plan,
    mode,
    selectedClassIds:
      restoredIds.length > 1
        ? restoredIds
        : plan.selectedClassIds,
    levels:
      restoredIds.length > 1
        ? plan.rememberedMulticlassLevels
        : plan.levels
  });
}

export function setClassBuildSelection(
  rawPlan,
  classId,
  selected = true
) {
  const plan = normalizeClassBuildPlan(rawPlan);
  const id = cleanId(classId);

  if (!id) {
    return plan;
  }

  if (plan.mode === "single") {
    return normalizeClassBuildPlan({
      ...plan,
      selectedClassIds: selected ? [id] : [],
      startingClassId: selected ? id : "",
      levels: selected
        ? { [id]: plan.totalLevel }
        : {}
    });
  }

  const nextIds = selected
    ? uniqueIds([...plan.selectedClassIds, id])
    : plan.selectedClassIds.filter((entry) => {
        return entry !== id;
      });

  if (nextIds.length > plan.totalLevel) {
    return plan;
  }

  return normalizeClassBuildPlan({
    ...plan,
    selectedClassIds: nextIds,
    startingClassId:
      nextIds.includes(plan.startingClassId)
        ? plan.startingClassId
        : nextIds[0] || ""
  });
}

export function setClassBuildLevel(
  rawPlan,
  classId,
  nextLevel
) {
  const plan = normalizeClassBuildPlan(rawPlan);
  const id = cleanId(classId);

  if (!plan.selectedClassIds.includes(id)) {
    return plan;
  }

  const currentLevel = Math.max(
    1,
    Math.round(safeNumber(plan.levels[id], 1))
  );
  const requestedLevel = Math.max(
    1,
    Math.round(safeNumber(nextLevel, currentLevel))
  );
  const delta = requestedLevel - currentLevel;

  if (delta === 0) {
    return plan;
  }

  const nextLevels = { ...plan.levels };

  if (delta > 0) {
    let remaining = delta;
    const donors = plan.selectedClassIds
      .filter((entry) => entry !== id)
      .reverse();

    donors.forEach((donorId) => {
      if (remaining < 1) {
        return;
      }
      const available = Math.max(
        0,
        safeNumber(nextLevels[donorId], 1) - 1
      );
      const moved = Math.min(remaining, available);
      nextLevels[donorId] -= moved;
      remaining -= moved;
    });

    nextLevels[id] += delta - remaining;
  } else {
    const receiverId = plan.selectedClassIds.find((entry) => {
      return entry !== id;
    });

    if (!receiverId) {
      return plan;
    }

    const movable = Math.min(
      Math.abs(delta),
      Math.max(0, currentLevel - 1)
    );
    nextLevels[id] -= movable;
    nextLevels[receiverId] += movable;
  }

  return {
    ...plan,
    levels: nextLevels
  };
}

export function validateClassBuildPlan(
  rawPlan = {}
) {
  const plan = normalizeClassBuildPlan(rawPlan);
  const errors = [];
  const rawSelectedClassIds = uniqueIds(
    rawPlan.selectedClassIds
  );
  const selectedClassIds = rawSelectedClassIds.length
    ? rawSelectedClassIds
    : plan.selectedClassIds;
  const selectedCount = selectedClassIds.length;
  const rawLevels =
    rawPlan.levels &&
    typeof rawPlan.levels === "object"
      ? rawPlan.levels
      : plan.levels;
  const allocated = selectedClassIds.reduce(
    (sum, classId) => {
      return sum + Math.max(
        0,
        Math.round(safeNumber(rawLevels[classId], 0))
      );
    },
    0
  );

  if (plan.mode === "single" && selectedCount !== 1) {
    errors.push("Single Class mode requires exactly one class.");
  }

  if (plan.mode === "multiclass") {
    if (plan.totalLevel < 2) {
      errors.push("Multiclassing requires at least character level 2.");
    }
    if (selectedCount < 2) {
      errors.push("Multiclass mode requires at least two distinct classes.");
    }
  }

  if (selectedCount > plan.totalLevel) {
    errors.push("You cannot select more classes than the total character level.");
  }

  selectedClassIds.forEach((classId) => {
    if (safeNumber(rawLevels[classId], 0) < 1) {
      errors.push("Every selected class must have at least one level.");
    }
  });

  if (selectedCount && allocated !== plan.totalLevel) {
    errors.push(
      `Allocated class levels must equal total character level (${allocated} / ${plan.totalLevel}).`
    );
  }

  if (
    plan.mode === "multiclass" &&
    !selectedClassIds.includes(
      cleanId(rawPlan.startingClassId || plan.startingClassId)
    )
  ) {
    errors.push("Choose which selected class the character started as.");
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    allocated,
    remaining: plan.totalLevel - allocated,
    plan
  };
}

export function summarizeClassBuildChanges(
  character = {},
  rawPlan = {}
) {
  const validation = validateClassBuildPlan(rawPlan);
  const plan = validation.plan;
  const previousEntries = Array.isArray(
    character?.classProgression?.classes
  )
    ? character.classProgression.classes
    : [];
  const previousLevels = new Map(
    previousEntries.map((entry) => [
      cleanId(entry?.classId || entry?.className),
      Math.max(0, Math.round(safeNumber(entry?.level, 0)))
    ])
  );
  const removedClassIds = [...previousLevels.keys()]
    .filter((classId) => {
      return !plan.selectedClassIds.includes(classId);
    });
  const addedClassIds = plan.selectedClassIds
    .filter((classId) => {
      return !previousLevels.has(classId);
    });
  const changedLevels = plan.selectedClassIds
    .filter((classId) => {
      return previousLevels.has(classId) &&
        previousLevels.get(classId) !== plan.levels[classId];
    })
    .map((classId) => ({
      classId,
      before: previousLevels.get(classId),
      after: plan.levels[classId]
    }));

  return {
    ...validation,
    removedClassIds,
    addedClassIds,
    changedLevels
  };
}
