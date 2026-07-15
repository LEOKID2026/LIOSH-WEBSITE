/**
 * Geometry printable question enrichment — diagram spec + printability.
 * @module lib/worksheets/worksheet-geometry-display.server
 */

import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import {
  isGeometryDiagramKindPrintSupported,
  isGeometryPrintBlockedSolidShape,
  GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS,
  GEOMETRY_TEXT_ONLY_TOPIC_KINDS,
} from "./worksheet-geometry-allowlist.js";
import { WORKSHEET_PRINTABILITY } from "./worksheet-question-types.js";

/** Whitelisted diagram spec fields for client/print payloads. */
const GEOMETRY_DIAGRAM_SPEC_KEYS = new Set([
  "kind",
  "mode",
  "side",
  "length",
  "width",
  "height",
  "base",
  "base1",
  "base2",
  "radius",
  "angle",
  "angle1",
  "angle2",
  "angle3",
  "a",
  "b",
  "c",
  "template",
  "grid",
  "gridCols",
  "gridRows",
  "solidShape",
  "side1",
  "side2",
  "side3",
  "tile",
  "tileSide",
  "floorL",
  "floorW",
  "hideAngle3",
  "hideSide",
  "hideHeight",
  "hideDiagonal",
  "hideAngle",
  "hideRadius",
  "which",
  "dx",
  "dy",
  "shape",
  "axes",
  "diagonal",
  "labels",
  "baseSide",
  "baseWidth",
  "baseLength",
  "baseHeight",
  "baseArea",
  "slantHeight",
  "diameter",
  "depth",
  "faces",
  "edges",
  "vertices",
]);

/**
 * Keep only small scalar trees for print payload safety.
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {boolean}
 */
function isSafePrintDiagramValue(value, depth = 0) {
  if (depth > 3) return false;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (value == null) return false;
  if (Array.isArray(value)) {
    if (value.length > 32) return false;
    return value.every((item) => isSafePrintDiagramValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(/** @type {Record<string, unknown>} */ (value));
    if (entries.length > 32) return false;
    return entries.every(
      ([k, v]) => typeof k === "string" && isSafePrintDiagramValue(v, depth + 1)
    );
  }
  return false;
}

/**
 * @param {unknown} spec
 * @returns {import("./worksheet-question-types.js").WorksheetDiagramSpec|null}
 */
export function sanitizeGeometryDiagramSpecForPrint(spec) {
  if (!spec || typeof spec !== "object") return null;
  const s = /** @type {Record<string, unknown>} */ (spec);
  const kind = typeof s.kind === "string" ? s.kind : null;
  if (!kind || kind === "pending") return null;

  /** @type {import("./worksheet-question-types.js").WorksheetDiagramSpec} */
  const out = { kind };
  for (const [key, value] of Object.entries(s)) {
    if (key === "kind") continue;
    if (!GEOMETRY_DIAGRAM_SPEC_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if ((key === "labels" || key === "axes") && isSafePrintDiagramValue(value)) {
      out[key] = /** @type {any} */ (value);
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {import("./worksheet-question-types.js").WorksheetDiagramSpec|null}
 */
export function resolveGeometryWorksheetDiagramSpec(raw) {
  const spec = getGeometryDiagramSpec(
    {
      topic: raw.topic || raw.operation,
      shape: raw.shape,
      question: raw.question,
      params: raw.params,
    },
    { hideUnknownValues: true }
  );
  return sanitizeGeometryDiagramSpecForPrint(spec);
}

/**
 * @param {Record<string, unknown>} raw
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} base
 * @param {{ preferMcq?: boolean }} [options]
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function enrichGeometryPrintableQuestion(raw, base, options = {}) {
  const preferMcq = options.preferMcq;
  const diagramSpec = resolveGeometryWorksheetDiagramSpec(raw);
  const kind = String(raw.params?.kind || "").replace(/^story_/, "");
  const hasDiagram = Boolean(diagramSpec?.kind);
  const blockedSolid =
    isGeometryPrintBlockedSolidShape(raw.shape) ||
    isGeometryPrintBlockedSolidShape(raw.params?.solidShape) ||
    isGeometryPrintBlockedSolidShape(raw.params?.solid) ||
    isGeometryPrintBlockedSolidShape(diagramSpec?.solidShape);
  const blockedDiagramKind =
    hasDiagram &&
    (GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has(String(diagramSpec.kind)) ||
      !isGeometryDiagramKindPrintSupported(diagramSpec.kind));
  const diagramSupported = hasDiagram && !blockedDiagramKind && !blockedSolid;

  let printability = base.printability;
  if (blockedSolid || blockedDiagramKind) {
    printability = WORKSHEET_PRINTABILITY.blocked_diagram_pending;
  } else if (hasDiagram && !diagramSupported) {
    printability = WORKSHEET_PRINTABILITY.blocked_diagram_pending;
  } else if (GEOMETRY_TEXT_ONLY_TOPIC_KINDS.has(kind) && !hasDiagram) {
    printability = WORKSHEET_PRINTABILITY.printable;
  }

  const answerMode = String(
    raw.answerMode || raw.params?.answerMode || ""
  ).toLowerCase();
  const isOpen =
    answerMode === "open" ||
    raw.geometryAnswerLine === true ||
    (preferMcq === false && !(base.optionsHe && base.optionsHe.length >= 2));

  let questionType = base.questionType;
  if (isOpen) {
    // Open compute may still carry a diagram — keep questionType open so MCQ UI is not forced.
    questionType = "open";
  } else if (hasDiagram && diagramSupported) {
    questionType = "diagram_mcq";
  } else if (preferMcq === false) {
    questionType = "open";
  } else if (preferMcq === true && base.optionsHe?.length) {
    questionType = "mcq";
  } else if (base.optionsHe?.length) {
    questionType = "mcq";
  } else {
    questionType = "open";
  }

  const { optionsHe, ...rest } = base;
  const showOptions = questionType === "diagram_mcq" || questionType === "mcq";
  return {
    ...rest,
    questionType,
    optionsHe: showOptions ? optionsHe : undefined,
    diagramSpec: diagramSupported ? diagramSpec : undefined,
    geometryAnswerLine: questionType === "open" ? true : undefined,
    writingSpaceLines:
      questionType === "open"
        ? typeof raw.writingSpaceLines === "number"
          ? raw.writingSpaceLines
          : 0
        : base.writingSpaceLines,
    printability,
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function geometryQuestionRequiresDiagram(raw) {
  const kind = String(raw.params?.kind || "").replace(/^story_/, "");
  if (kind.startsWith("concept_")) return false;
  const topic = String(raw.topic || raw.operation || "");
  if (
    [
      "area",
      "perimeter",
      "angles",
      "pythagoras",
      "circles",
      "shapes_basic",
      "triangles",
      "quadrilaterals",
      "parallel_perpendicular",
      "symmetry",
      "diagonal",
      "heights",
      "tiling",
      "transformations",
      "rotation",
      "volume",
      "solids",
    ].includes(topic)
  ) {
    return true;
  }
  if (
    kind.startsWith("heights_") ||
    kind.startsWith("diagonal_") ||
    kind === "tiling_count" ||
    kind === "tiling" ||
    kind === "triangle_angles" ||
    kind.includes("perimeter") ||
    kind.includes("area") ||
    kind.includes("pythagoras")
  ) {
    return true;
  }
  return false;
}
