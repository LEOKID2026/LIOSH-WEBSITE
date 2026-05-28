/**
 * Canonical session/answer topic resolution for learning master pages.
 * Rejects subject-name keys (math, geometry) and non-whitelist values.
 */

import { OPERATIONS } from "../../utils/math-constants.js";
import { TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";

const VALID_MATH_OPERATIONS = new Set(OPERATIONS);
const VALID_GEOMETRY_TOPICS = new Set(Object.keys(GEOMETRY_TOPICS));

const MATH_REJECT_KEYS = new Set(["math", "general", "mixed"]);
const GEO_REJECT_KEYS = new Set(["geometry", "general", "mixed"]);

/**
 * @param {string|null|undefined} operation
 * @returns {string} canonical operation key or "" when invalid
 */
export function resolveMathSessionTopic(operation) {
  const op = String(operation ?? "").trim();
  if (!op) return "";
  if (MATH_REJECT_KEYS.has(op)) return "";
  if (!VALID_MATH_OPERATIONS.has(op)) return "";
  return op;
}

/**
 * @param {{ topic?: string|null }|string|null|undefined} questionOrTopic
 * @returns {string} canonical geometry topic key or "" when invalid
 */
export function resolveGeometrySessionTopic(questionOrTopic) {
  const raw =
    questionOrTopic != null && typeof questionOrTopic === "object"
      ? questionOrTopic.topic
      : questionOrTopic;
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (GEO_REJECT_KEYS.has(t)) return "";
  if (!VALID_GEOMETRY_TOPICS.has(t)) return "";
  return t;
}
