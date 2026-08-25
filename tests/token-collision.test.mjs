import assert from "node:assert/strict";
import test from "node:test";
import {
  createTemplateGeometry
} from "../battleMap/templateGeometry.js";
import {
  findAffectedTokens,
  normalizeTokenFootprint,
  templateGeometryToPolygon,
  tokenIntersectsTemplate
} from "../battleMap/tokenCollision.js";

const mapScale = {
  pixelsPerSquare: 64,
  feetPerSquare: 5
};

test("circle collision counts a token footprint touching the radius", () => {
  const circle = createTemplateGeometry({
    shape: "circle",
    pointer: { x: 200, y: 200 },
    sizeFeet: 10,
    ...mapScale
  });

  assert.equal(circle.sizePixels, 128);
  assert.equal(
    tokenIntersectsTemplate(circle, {
      id: "large-edge",
      left: 320,
      top: 175,
      width: 50,
      height: 50
    }),
    true
  );
  assert.equal(
    tokenIntersectsTemplate(circle, {
      id: "outside",
      left: 329,
      top: 190,
      width: 20,
      height: 20
    }),
    false
  );
});

test("square collision uses the creature's full occupied area", () => {
  const square = createTemplateGeometry({
    shape: "square",
    pointer: { x: 200, y: 200 },
    sizeFeet: 10,
    ...mapScale
  });

  assert.equal(
    tokenIntersectsTemplate(square, {
      id: "partly-inside",
      left: 260,
      top: 260,
      width: 80,
      height: 80
    }),
    true
  );
  assert.equal(
    tokenIntersectsTemplate(square, {
      id: "clear-of-square",
      left: 265,
      top: 265,
      width: 20,
      height: 20
    }),
    false
  );
});

test("cone collision follows the aimed direction", () => {
  const rightFacingCone = createTemplateGeometry({
    shape: "cone",
    anchor: { x: 100, y: 100 },
    pointer: { x: 300, y: 100 },
    sizeFeet: 15,
    ...mapScale
  });
  const conePolygon = templateGeometryToPolygon(
    rightFacingCone
  );

  assert.ok(conePolygon.length >= 10);
  assert.equal(
    tokenIntersectsTemplate(rightFacingCone, {
      id: "ahead",
      left: 230,
      top: 80,
      width: 40,
      height: 40
    }),
    true
  );
  assert.equal(
    tokenIntersectsTemplate(rightFacingCone, {
      id: "behind",
      left: 40,
      top: 80,
      width: 40,
      height: 40
    }),
    false
  );
});

test("line collision includes a large token that crosses the line edge", () => {
  const line = createTemplateGeometry({
    shape: "line",
    anchor: { x: 100, y: 100 },
    pointer: { x: 300, y: 100 },
    sizeFeet: 20,
    widthFeet: 5,
    ...mapScale
  });

  assert.equal(
    tokenIntersectsTemplate(line, {
      id: "large-crossing",
      left: 180,
      top: 125,
      width: 90,
      height: 90
    }),
    true
  );
  assert.equal(
    tokenIntersectsTemplate(line, {
      id: "small-miss",
      left: 180,
      top: 140,
      width: 20,
      height: 20
    }),
    false
  );
});

test("affected-token results preserve useful token metadata", () => {
  const circle = createTemplateGeometry({
    shape: "circle",
    pointer: { x: 100, y: 100 },
    sizeFeet: 5,
    ...mapScale
  });
  const affected = findAffectedTokens(circle, [
    {
      id: "goblin",
      name: "Goblin",
      type: "enemy",
      left: 90,
      top: 90,
      width: 20,
      height: 20
    },
    {
      id: "wizard",
      name: "Wizard",
      type: "player",
      left: 300,
      top: 300,
      width: 20,
      height: 20
    }
  ]);

  assert.deepEqual(
    affected.map((token) => ({
      id: token.id,
      name: token.name,
      type: token.type
    })),
    [
      {
        id: "goblin",
        name: "Goblin",
        type: "enemy"
      }
    ]
  );
  assert.equal(
    tokenIntersectsTemplate(
      circle,
      normalizeTokenFootprint({
        id: "empty",
        width: 0,
        height: 0
      })
    ),
    false
  );
});
