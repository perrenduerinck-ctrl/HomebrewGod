import assert from "node:assert/strict";
import test from "node:test";
import {
  formatElevation,
  getTokenElevation,
  measureSpatialDistance,
  normalizeElevation
} from "../battleMap/elevation.js";

test("token elevation defaults safely and uses whole bounded feet", () => {
  assert.equal(normalizeElevation(""), 0);
  assert.equal(normalizeElevation("NaN"), 0);
  assert.equal(normalizeElevation("Infinity"), 0);
  assert.equal(normalizeElevation("40.6"), 41);
  assert.equal(normalizeElevation(5000), 1000);
  assert.equal(normalizeElevation(-5000), -1000);
  assert.equal(getTokenElevation({}), 0);
  assert.equal(getTokenElevation({ elevation: 35 }), 35);
  assert.equal(getTokenElevation({ elevationFeet: -10 }), -10);
});

test("spatial distance combines horizontal and vertical distance", () => {
  const measurement = measureSpatialDistance({
    horizontalFeet: 40,
    startElevationFeet: 10,
    endElevationFeet: 40
  });

  assert.equal(measurement.horizontalFeet, 40);
  assert.equal(measurement.verticalFeet, 30);
  assert.equal(measurement.distanceFeet, 50);
  assert.equal(formatElevation(40), "+40 ft");
  assert.equal(formatElevation(-10), "-10 ft");
  assert.equal(formatElevation(0), "Ground");
});
