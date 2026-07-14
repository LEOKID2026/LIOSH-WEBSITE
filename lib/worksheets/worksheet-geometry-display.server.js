/**
 * Geometry printable question enrichment — diagram spec + printability.
 * @module lib/worksheets/worksheet-geometry-display.server
 */

import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import {
  isGeometryDiagramKindPrintSupported,
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
  "hideAngle3",
]);

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
    if (!GEOMETRY_DIAGRAM_SPEC_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
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
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function enrichGeometryPrintableQuestion(raw, base) {
  const diagramSpec = resolveGeometryWorksheetDiagramSpec(raw);
  const kind = String(raw.params?.kind || "").replace(/^story_/, "");
  const hasDiagram = Boolean(diagramSpec?.kind);
  const diagramSupported =
    hasDiagram && isGeometryDiagramKindPrintSupported(diagramSpec.kind);

  let printability = base.printability;
  if (hasDiagram && !diagramSupported) {
    printability = WORKSHEET_PRINTABILITY.blocked_diagram_pending;
  } else if (GEOMETRY_TEXT_ONLY_TOPIC_KINDS.has(kind) && !hasDiagram) {
    printability = WORKSHEET_PRINTABILITY.printable;
  }

  let questionType = base.questionType;
  if (hasDiagram && diagramSupported) questionType = "diagram_mcq";
  else if (base.optionsHe?.length) questionType = "mcq";
  else questionType = "open";

  return {
    ...base,
    questionType,
    diagramSpec: diagramSupported ? diagramSpec : undefined,
    printability,
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function geometryQuestionRequiresDiagram(raw) {
  const kind = String(raw.params?.kind || "").replace(/^story_/, "");
  if (kind.startsWith("concept_")) return true;
  if (["area", "perimeter", "volume", "angles", "pythagoras", "circles"].includes(String(raw.topic))) {
    return true;
  }
  return false;
}
