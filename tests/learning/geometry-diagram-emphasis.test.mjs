import test from "node:test";
import assert from "node:assert/strict";
import { buildGeometryStepMetadata } from "../../utils/geometry-animations.js";

const TRIANGLE_AREA_Q = {
  topic: "area",
  shape: "triangle",
  params: { kind: "area_triangle", base: 8, height: 5 },
  correctAnswer: 20,
};

test("triangle area steps avoid duplicate emphasis on adjacent compute/substitute", () => {
  const total = 5;
  const emphases = [];
  for (let i = 0; i < total; i += 1) {
    emphases.push(buildGeometryStepMetadata(TRIANGLE_AREA_Q, i, total).diagramEmphasis);
  }
  assert.deepEqual(emphases, ["formula", "formula", "base", "base_height", "result"]);
  for (let i = 1; i < emphases.length; i += 1) {
    if (emphases[i] === emphases[i - 1] && emphases[i] !== "formula") {
      assert.fail(`duplicate non-formula emphasis ${emphases[i]} at steps ${i - 1} and ${i}`);
    }
  }
});

test("pythagoras hyp mode progresses through leg squares and hyp", () => {
  const q = {
    topic: "pythagoras",
    params: { kind: "pythagoras_hyp", a: 3, b: 4, c: 5, which: "hypotenuse" },
  };
  const total = 5;
  const emphases = Array.from({ length: total }, (_, i) =>
    buildGeometryStepMetadata(q, i, total).diagramEmphasis
  );
  assert.ok(emphases.includes("squares_legs"));
  assert.ok(emphases.includes("sum"));
  assert.equal(emphases[total - 1], "hyp");
});

test("perimeter circle uses trace animation on rim step", () => {
  const q = {
    topic: "perimeter",
    shape: "circle",
    params: { kind: "perimeter_circle", radius: 3 },
  };
  const last = buildGeometryStepMetadata(q, 3, 4);
  assert.equal(last.diagramEmphasis, "rim");
  assert.equal(last.animationPreset, "tracePerimeter");
});

test("volume cylinder uses solid animation preset", () => {
  const q = {
    topic: "volume",
    shape: "cylinder",
    params: { kind: "cylinder_volume", radius: 2, height: 5 },
  };
  const meta = buildGeometryStepMetadata(q, 1, 4);
  assert.equal(meta.animationPreset, "solidFaces");
});
