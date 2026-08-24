import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMapDistance,
  formatMapSquares,
  measureMapDistance,
  normalizeFeetPerSquare,
  normalizeGridPixelSize
} from "../battleMap/measurement.js";

test("six map squares at five feet each measure thirty feet", () => {
  const measurement = measureMapDistance(
    { x: 10, y: 20 },
    { x: 394, y: 20 },
    {
      pixelsPerSquare: 64,
      feetPerSquare: 5
    }
  );

  assert.equal(measurement.squares, 6);
  assert.equal(measurement.feet, 30);
  assert.equal(
    formatMapDistance(measurement.feet),
    "30 ft"
  );
});

test("diagonal ruler measurement uses both axes", () => {
  const measurement = measureMapDistance(
    { x: 0, y: 0 },
    { x: 192, y: 256 },
    {
      pixelsPerSquare: 64,
      feetPerSquare: 5
    }
  );

  assert.equal(measurement.squares, 5);
  assert.equal(measurement.feet, 25);
  assert.equal(
    formatMapSquares(measurement.squares),
    "5 squares"
  );
});

test("zoomed grid pixels keep the same game distance", () => {
  const normal = measureMapDistance(
    { x: 0, y: 0 },
    { x: 384, y: 0 },
    {
      pixelsPerSquare: 64,
      feetPerSquare: 5
    }
  );
  const zoomed = measureMapDistance(
    { x: 0, y: 0 },
    { x: 768, y: 0 },
    {
      pixelsPerSquare: 128,
      feetPerSquare: 5
    }
  );

  assert.equal(normal.feet, 30);
  assert.equal(zoomed.feet, 30);
});

test("ruler scale inputs are finite and bounded", () => {
  assert.equal(normalizeFeetPerSquare("5"), 5);
  assert.equal(normalizeFeetPerSquare("7.8"), 8);
  assert.equal(normalizeFeetPerSquare(0), 1);
  assert.equal(normalizeFeetPerSquare(5000), 1000);
  assert.equal(normalizeFeetPerSquare("Infinity"), 5);
  assert.equal(normalizeGridPixelSize(96), 96);
  assert.equal(normalizeGridPixelSize(0), 64);
});

test("fractional distances use a compact one-decimal label", () => {
  assert.equal(formatMapDistance(17.46), "17.5 ft");
  assert.equal(formatMapSquares(1), "1 square");
  assert.equal(formatMapDistance(Infinity), "0 ft");
});

