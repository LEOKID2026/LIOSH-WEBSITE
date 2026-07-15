import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeometryStepMetadata,
  enrichGeometryAnimationSteps,
} from "../../utils/geometry-animations.js";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import { GEOMETRY_ANIMATION_PRESETS } from "../../utils/geometry-step-types.js";
import { GRADES, TOPIC_SHAPES } from "../../utils/geometry-constants.js";
import { generateQuestion } from "../../utils/geometry-question-generator.js";

const VALID_PRESETS = new Set(Object.values(GEOMETRY_ANIMATION_PRESETS));

function sampleQuestion(topic, shape, gradeKey) {
  switch (topic) {
    case "area":
      if (shape === "square") {
        return { topic, shape, params: { kind: "area_square", side: 5 }, correctAnswer: 25 };
      }
      if (shape === "rectangle") {
        return {
          topic,
          shape,
          params: { kind: "area_rectangle", length: 6, width: 4 },
          correctAnswer: 24,
        };
      }
      if (shape === "triangle") {
        return {
          topic,
          shape,
          params: { kind: "area_triangle", base: 8, height: 5 },
          correctAnswer: 20,
        };
      }
      if (shape === "circle") {
        return {
          topic,
          shape,
          params: { kind: "area_circle", radius: 3 },
          correctAnswer: 28.26,
        };
      }
      break;
    case "perimeter":
      if (shape === "square") {
        return { topic, shape, params: { kind: "perimeter_square", side: 5 }, correctAnswer: 20 };
      }
      if (shape === "circle") {
        return {
          topic,
          shape,
          params: { kind: "perimeter_circle", radius: 3 },
          correctAnswer: 18.84,
        };
      }
      break;
    case "volume":
      if (shape === "cube") {
        return { topic, shape, params: { kind: "cube_volume", side: 3 }, correctAnswer: 27 };
      }
      if (shape === "cylinder") {
        return {
          topic,
          shape,
          params: { kind: "cylinder_volume", radius: 2, height: 5 },
          correctAnswer: 62.8,
        };
      }
      break;
    case "angles":
      return {
        topic,
        shape: "triangle",
        params: { kind: "triangle_angles", angle1: 60, angle2: 70, angle3: 50 },
        correctAnswer: 50,
      };
    case "pythagoras":
      return {
        topic,
        shape: "triangle",
        params: { kind: "pythagoras_hyp", a: 3, b: 4, c: 5, which: "hypotenuse" },
        correctAnswer: 5,
      };
    case "transformations":
      return {
        topic,
        shape,
        params: { kind: "concept_transform", type: "הזזה" },
        correctAnswer: "הזזה",
      };
    case "rotation":
      return {
        topic,
        shape,
        params: { kind: "concept_rotation", angle: 90 },
        correctAnswer: 90,
      };
    case "solids":
      return {
        topic,
        shape,
        params: { kind: "solids_identify", solidShape: shape },
        correctAnswer: shape,
      };
    case "symmetry":
      return {
        topic,
        shape: "square",
        params: { kind: "symmetry", shape: "ריבוע", axes: 4 },
        correctAnswer: 4,
      };
    case "diagonal":
      return {
        topic,
        shape: "square",
        params: { kind: "diagonal_square", side: 6, diagonal: 8.49 },
        correctAnswer: 8.49,
      };
    case "tiling":
      return {
        topic,
        shape: "square",
        params: { kind: "tiling", shape: "ריבוע", angle: 90 },
        correctAnswer: 90,
      };
    case "parallel_perpendicular":
      return {
        topic,
        shape,
        params: { kind: "parallel_perpendicular", type: "מקבילות" },
        correctAnswer: "מקבילות",
      };
    case "triangles":
      return {
        topic,
        shape: "triangle",
        params: { kind: "triangles", type: "משולש שווה צלעות" },
        correctAnswer: "שווה צלעות",
      };
    case "quadrilaterals":
      return {
        topic,
        shape: "rectangle",
        params: { kind: "quadrilaterals", type: "מלבן" },
        correctAnswer: "מלבן",
      };
    case "heights":
      return {
        topic,
        shape: "triangle",
        params: { kind: "heights_triangle", base: 10, height: 4, area: 20 },
        correctAnswer: 4,
      };
    case "circles":
      return {
        topic,
        shape: "circle",
        params: { kind: "circle_area", radius: 4, askArea: true },
        correctAnswer: 50.24,
      };
    case "shapes_basic":
      return {
        topic,
        shape,
        params: { kind: "shapes_basic", shape: shape === "square" ? "ריבוע" : "מלבן" },
        correctAnswer: 4,
      };
    default:
      return null;
  }
  return null;
}

function assertValidMetadata(meta, ctx) {
  assert.ok(meta, `missing metadata for ${ctx}`);
  assert.ok(typeof meta.diagramEmphasis === "string", ctx);
  assert.ok(Array.isArray(meta.diagramReveal), ctx);
  assert.ok(VALID_PRESETS.has(meta.animationPreset), `${ctx} preset=${meta.animationPreset}`);
  assert.ok(Array.isArray(meta.textHighlights), ctx);
}

test("buildGeometryStepMetadata returns valid fields for curriculum matrix", () => {
  for (const [gradeKey, gradeCfg] of Object.entries(GRADES)) {
    for (const topic of gradeCfg.topics) {
      const shapesCfg = TOPIC_SHAPES[topic];
      const shapes = shapesCfg?.[gradeKey] || gradeCfg.shapes || ["square"];
      for (const shape of shapes.slice(0, 2)) {
        const q = sampleQuestion(topic, shape, gradeKey);
        if (!q) continue;
        const spec = getGeometryDiagramSpec(q);
        const totalSteps = 5;
        for (let i = 0; i < totalSteps; i += 1) {
          const meta = buildGeometryStepMetadata(q, i, totalSteps, topic);
          assertValidMetadata(meta, `${gradeKey}/${topic}/${shape}/step${i}`);
          if (spec && meta.diagramEmphasis === "neutral" && i > 0) {
            assert.fail(`unexpected neutral emphasis at step ${i} for ${gradeKey}/${topic}/${shape}`);
          }
        }
      }
    }
  }
});

test("enrichGeometryAnimationSteps attaches metadata per slide", () => {
  const q = sampleQuestion("area", "square", "g2");
  const slides = ["step1", "step2", "step3", "step4"];
  const steps = enrichGeometryAnimationSteps(q, "area", "g2", slides);
  assert.equal(steps.length, 4);
  for (const step of steps) {
    assert.match(step.id, /^geometry-step-/);
    assert.ok(step.diagramEmphasis);
    assert.ok(VALID_PRESETS.has(step.animationPreset));
  }
});

test("generateQuestion smoke - metadata for procedural questions", () => {
  globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL = true;
  try {
    for (const gradeKey of ["g3", "g4", "g5", "g6"]) {
      for (const topic of GRADES[gradeKey].topics.filter((t) => t !== "mixed")) {
        const q = generateQuestion({ name: "קל" }, topic, gradeKey);
        if (q.params?.kind === "no_question") continue;
        const spec = getGeometryDiagramSpec(q);
        if (!spec) continue;
        for (let i = 0; i < 4; i += 1) {
          const meta = buildGeometryStepMetadata(q, i, 4, q.topic || topic);
          assertValidMetadata(meta, `${gradeKey}/${topic}/gen/step${i}`);
        }
      }
    }
  } finally {
    delete globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL;
  }
});
