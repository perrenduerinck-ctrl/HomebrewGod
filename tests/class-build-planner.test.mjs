import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateClassLevels,
  createClassBuildPlan,
  setClassBuildLevel,
  setClassBuildMode,
  setClassBuildSelection,
  validateClassBuildPlan
} from "../characterCreator/classBuildPlanner.js";

test("level one permits a single class and disables a multiclass plan", () => {
  const initial = createClassBuildPlan({
    classProgression: {
      totalLevel: 1,
      classes: []
    }
  });
  const fighter = setClassBuildSelection(
    initial,
    "fighter",
    true
  );
  const attemptedMulticlass = setClassBuildMode(
    fighter,
    "multiclass"
  );

  assert.equal(attemptedMulticlass.mode, "single");
  assert.deepEqual(attemptedMulticlass.levels, {
    fighter: 1
  });
  assert.equal(
    validateClassBuildPlan(attemptedMulticlass).valid,
    true
  );
});

test("guided allocation creates valid 1/1, 2/1, 1/2, and 2/3 splits", () => {
  assert.deepEqual(
    allocateClassLevels({
      totalLevel: 2,
      selectedClassIds: ["fighter", "paladin"],
      startingClassId: "fighter"
    }),
    { fighter: 1, paladin: 1 }
  );

  const levelThree = {
    totalLevel: 3,
    mode: "multiclass",
    selectedClassIds: ["fighter", "paladin"],
    startingClassId: "fighter",
    levels: { fighter: 2, paladin: 1 }
  };
  assert.equal(validateClassBuildPlan(levelThree).valid, true);
  assert.deepEqual(
    setClassBuildLevel(levelThree, "fighter", 1).levels,
    { fighter: 1, paladin: 2 }
  );
  assert.equal(
    validateClassBuildPlan({
      ...levelThree,
      totalLevel: 5,
      levels: { fighter: 2, paladin: 3 }
    }).valid,
    true
  );
});

test("class count and allocations cannot exceed the chosen total", () => {
  let plan = {
    totalLevel: 2,
    mode: "multiclass",
    selectedClassIds: ["fighter", "paladin"],
    startingClassId: "fighter",
    levels: { fighter: 1, paladin: 1 }
  };
  plan = setClassBuildSelection(plan, "cleric", true);

  assert.deepEqual(
    plan.selectedClassIds,
    ["fighter", "paladin"]
  );
  assert.equal(
    validateClassBuildPlan({
      ...plan,
      levels: { fighter: 2, paladin: 1 }
    }).valid,
    false,
    "an over-allocation is rejected"
  );
  assert.equal(
    validateClassBuildPlan({
      ...plan,
      levels: { fighter: 0, paladin: 2 }
    }).valid,
    false,
    "a zero-level selected class is rejected"
  );
});

test("switching modes remembers an unconfirmed multiclass selection", () => {
  const multiclass = {
    totalLevel: 5,
    mode: "multiclass",
    selectedClassIds: ["fighter", "paladin"],
    startingClassId: "fighter",
    levels: { fighter: 2, paladin: 3 }
  };
  const single = setClassBuildMode(multiclass, "single");
  const restored = setClassBuildMode(single, "multiclass");

  assert.deepEqual(single.selectedClassIds, ["fighter"]);
  assert.deepEqual(restored.selectedClassIds, [
    "fighter",
    "paladin"
  ]);
  assert.deepEqual(restored.levels, {
    fighter: 2,
    paladin: 3
  });
});

test("starting class is read from saved level order", () => {
  const plan = createClassBuildPlan({
    classProgression: {
      totalLevel: 3,
      classes: [
        {
          entryId: "paladin-main",
          classId: "paladin",
          className: "Paladin",
          level: 2
        },
        {
          entryId: "fighter-main",
          classId: "fighter",
          className: "Fighter",
          level: 1
        }
      ],
      levelOrder: [
        "fighter-main",
        "paladin-main",
        "paladin-main"
      ]
    }
  });

  assert.equal(plan.startingClassId, "fighter");
  assert.equal(validateClassBuildPlan(plan).valid, true);
});
