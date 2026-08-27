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
      elevation: 15,
      left: 90,
      top: 90,
      width: 20,
      height: 20
    },
    {
      id: "wizard",
      name: "Wizard",
      type: "player",
      elevation: 30,
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
      type: token.type,
      elevation: token.elevation
    })),
    [
      {
        id: "goblin",
        name: "Goblin",
        type: "enemy",
        elevation: 15
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

test("sphere collision combines horizontal and vertical distance", () => {
  const sphere = createTemplateGeometry({
    shape: "sphere",
    pointer: { x: 100, y: 100 },
    sizeFeet: 20,
    elevationFeet: 20,
    pixelsPerSquare: 10,
    feetPerSquare: 5
  });
  const token = {
    top: 98,
    width: 4,
    height: 4
  };

  assert.equal(tokenIntersectsTemplate(sphere, {
    ...token,
    left: 124,
    elevation: 32
  }), true);
  assert.equal(tokenIntersectsTemplate(sphere, {
    ...token,
    left: 130,
    elevation: 35
  }), false);
  assert.equal(tokenIntersectsTemplate(sphere, {
    ...token,
    left: 98,
    elevation: 40
  }), true);
  assert.equal(tokenIntersectsTemplate(sphere, {
    ...token,
    left: 98,
    elevation: 41
  }), false);
});

test("cylinder collision uses its base elevation and height", () => {
  const cylinder = createTemplateGeometry({
    shape: "cylinder",
    pointer: { x: 100, y: 100 },
    sizeFeet: 10,
    heightFeet: 40,
    elevationFeet: 0,
    pixelsPerSquare: 10,
    feetPerSquare: 5
  });
  const inside = {
    left: 98,
    top: 98,
    width: 4,
    height: 4
  };

  assert.equal(tokenIntersectsTemplate(cylinder, {
    ...inside,
    elevation: 0
  }), true);
  assert.equal(tokenIntersectsTemplate(cylinder, {
    ...inside,
    elevation: 40
  }), true);
  assert.equal(tokenIntersectsTemplate(cylinder, {
    ...inside,
    elevation: 41
  }), false);
  assert.equal(tokenIntersectsTemplate(cylinder, {
    ...inside,
    elevation: -1
  }), false);
});

test("cube collision requires both map overlap and vertical overlap", () => {
  const cube = createTemplateGeometry({
    shape: "cube",
    pointer: { x: 100, y: 100 },
    sizeFeet: 20,
    elevationFeet: 20,
    pixelsPerSquare: 10,
    feetPerSquare: 5
  });
  const inside = {
    left: 90,
    top: 90,
    width: 4,
    height: 4
  };

  assert.equal(tokenIntersectsTemplate(cube, {
    ...inside,
    elevation: 10
  }), true);
  assert.equal(tokenIntersectsTemplate(cube, {
    ...inside,
    elevation: 30
  }), true);
  assert.equal(tokenIntersectsTemplate(cube, {
    ...inside,
    elevation: 31
  }), false);
  assert.equal(tokenIntersectsTemplate(cube, {
    ...inside,
    left: 130,
    elevation: 20
  }), false);
});

test("flat templates retain their original 2D collision behavior", () => {
  const circle = createTemplateGeometry({
    shape: "circle",
    pointer: { x: 100, y: 100 },
    sizeFeet: 5,
    ...mapScale
  });

  assert.equal(tokenIntersectsTemplate(circle, {
    left: 95,
    top: 95,
    width: 10,
    height: 10,
    elevation: 1000
  }), true);
});
