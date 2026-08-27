import assert from "node:assert/strict";
import test from "node:test";
import {
  createTemplateGeometry,
  feetToMapPixels,
  formatTemplateLabel,
  getTemplateDirection,
  normalizeTemplateAngle,
  normalizeTemplateDistance,
  normalizeTemplateHeight,
  normalizeTemplateShape
} from "../battleMap/templateGeometry.js";

test("circle templates convert game feet into map pixels", () => {
  const geometry = createTemplateGeometry({
    shape: "circle",
    pointer: { x: 400, y: 300 },
    sizeFeet: 20,
    pixelsPerSquare: 64,
    feetPerSquare: 5
  });

  assert.equal(geometry.shape, "circle");
  assert.equal(geometry.sizePixels, 256);
  assert.deepEqual(geometry.anchor, {
    x: 400,
    y: 300
  });
  assert.equal(geometry.bounds.width, 512);
  assert.equal(geometry.bounds.height, 512);
  assert.match(geometry.path, /^M /);
  assert.equal(
    formatTemplateLabel(geometry),
    "Circle · 20-ft radius"
  );
});

test("cone templates rotate from their fixed origin toward the pointer", () => {
  const right = createTemplateGeometry({
    shape: "cone",
    anchor: { x: 100, y: 100 },
    pointer: { x: 300, y: 100 },
    sizeFeet: 15,
    pixelsPerSquare: 64,
    feetPerSquare: 5
  });
  const down = createTemplateGeometry({
    shape: "cone",
    anchor: { x: 100, y: 100 },
    pointer: { x: 100, y: 300 },
    sizeFeet: 15,
    pixelsPerSquare: 64,
    feetPerSquare: 5
  });

  assert.equal(right.sizePixels, 192);
  assert.equal(right.directionRadians, 0);
  assert.equal(
    down.directionRadians,
    Math.PI / 2
  );
  assert.notEqual(right.path, down.path);
  assert.equal(
    formatTemplateLabel(down),
    "Cone · 15 ft"
  );
});

test("line templates preserve configured length and width", () => {
  const geometry = createTemplateGeometry({
    shape: "line",
    anchor: { x: 10, y: 20 },
    pointer: { x: 10, y: 200 },
    sizeFeet: 100,
    widthFeet: 5,
    pixelsPerSquare: 64,
    feetPerSquare: 5
  });

  assert.equal(geometry.sizePixels, 1280);
  assert.equal(geometry.widthPixels, 64);
  assert.equal(geometry.points.length, 4);
  assert.equal(geometry.bounds.width, 64);
  assert.equal(geometry.bounds.height, 1280);
  assert.equal(
    formatTemplateLabel(geometry),
    "Line · 100 ft × 5 ft"
  );
});

test("square templates use their cursor as the center", () => {
  const geometry = createTemplateGeometry({
    shape: "square",
    pointer: { x: 200, y: 180 },
    sizeFeet: 10,
    pixelsPerSquare: 64,
    feetPerSquare: 5
  });

  assert.equal(geometry.sizePixels, 128);
  assert.deepEqual(geometry.anchor, {
    x: 200,
    y: 180
  });
  assert.deepEqual(geometry.points[0], {
    x: 136,
    y: 116
  });
  assert.equal(geometry.bounds.width, 128);
  assert.equal(geometry.bounds.height, 128);
  assert.equal(
    formatTemplateLabel(geometry),
    "Square · 10 ft"
  );
});

test("volume templates keep their real vertical bounds", () => {
  const sphere = createTemplateGeometry({
    shape: "sphere",
    pointer: { x: 100, y: 100 },
    sizeFeet: 20,
    elevationFeet: 30,
    pixelsPerSquare: 10,
    feetPerSquare: 5
  });
  const cylinder = createTemplateGeometry({
    shape: "cylinder",
    pointer: { x: 100, y: 100 },
    sizeFeet: 10,
    heightFeet: 40,
    elevationFeet: 5,
    pixelsPerSquare: 10,
    feetPerSquare: 5
  });
  const cube = createTemplateGeometry({
    shape: "cube",
    pointer: { x: 100, y: 100 },
    sizeFeet: 20,
    elevationFeet: 30,
    pixelsPerSquare: 10,
    feetPerSquare: 5
  });

  assert.deepEqual(sphere.verticalBounds, {
    minFeet: 10,
    maxFeet: 50,
    heightFeet: 40
  });
  assert.deepEqual(cylinder.verticalBounds, {
    minFeet: 5,
    maxFeet: 45,
    heightFeet: 40
  });
  assert.deepEqual(cube.verticalBounds, {
    minFeet: 20,
    maxFeet: 40,
    heightFeet: 20
  });
  assert.equal(
    formatTemplateLabel(sphere),
    "Sphere · 20-ft radius · center +30 ft"
  );
  assert.equal(
    formatTemplateLabel(cylinder),
    "Cylinder · 10-ft radius × 40 ft high · base +5 ft"
  );
  assert.equal(
    formatTemplateLabel(cube),
    "Cube · 20 ft · center +30 ft"
  );
});

test("template inputs remain finite and bounded", () => {
  assert.equal(normalizeTemplateShape("LINE"), "line");
  assert.equal(normalizeTemplateShape("SPHERE"), "sphere");
  assert.equal(normalizeTemplateShape("fireball"), "circle");
  assert.equal(normalizeTemplateDistance(Infinity, 20), 20);
  assert.equal(normalizeTemplateDistance(0, 20), 1);
  assert.equal(normalizeTemplateDistance(50000, 20), 1000);
  assert.equal(normalizeTemplateAngle(NaN, 60), 60);
  assert.equal(normalizeTemplateAngle(0, 60), 1);
  assert.equal(normalizeTemplateHeight(-1, 40), 0);
  assert.equal(normalizeTemplateHeight(50000, 40), 1000);
  assert.equal(
    feetToMapPixels(30, {
      pixelsPerSquare: 64,
      feetPerSquare: 5
    }),
    384
  );
  assert.equal(
    getTemplateDirection(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      Math.PI
    ),
    Math.PI
  );
});
