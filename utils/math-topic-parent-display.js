/**
 * Math row titles for parent-facing reports (short + detailed).
 * Operation/topic label is the Hebrew operation name only — grade and level live
 * in dedicated table columns, so they are not repeated in displayName.
 *
 * When two rows share the same operation + grade + level but different mode,
 * a mode suffix is appended so the rows stay distinguishable.
 */

import {
  getMathReportBucketDisplayName,
  MATH_PARENT_TOPIC_FALLBACK_HE,
  canonicalParentReportGradeKey,
} from "./math-report-generator.js";
import { splitTopicRowKey, MATH_SCOPE_UNKNOWN } from "./parent-report-row-diagnostics.js";

const MODE_SUFFIX_LABELS = {
  learning: "למידה",
  practice: "תרגול",
  challenge: "אתגר",
  speed: "מהירות",
  marathon: "מרתון",
  graded: "מדורג",
  normal: "רגיל",
  mistakes: "טעויות",
  practice_mistakes: "חזרה על שגיאות",
};

function effectiveMathGradeKeyFromRowOrKey(rowKey, row) {
  if (row?.gradeKey) return row.gradeKey;
  const tp = splitTopicRowKey(String(rowKey || ""));
  if (!tp.gradeScope || tp.gradeScope === MATH_SCOPE_UNKNOWN) return null;
  return canonicalParentReportGradeKey(tp.gradeScope);
}

function effectiveMathLevelKeyFromRowOrKey(rowKey, row) {
  if (row?.levelKey && row.levelKey !== MATH_SCOPE_UNKNOWN) return row.levelKey;
  const tp = splitTopicRowKey(String(rowKey || ""));
  if (!tp.levelScope || tp.levelScope === MATH_SCOPE_UNKNOWN) return null;
  const l = String(tp.levelScope).trim().toLowerCase();
  if (l === "easy" || l === "medium" || l === "hard") return l;
  return null;
}

function modeSuffixLabel(m) {
  if (m == null || m === "") return "לא זמין";
  return MODE_SUFFIX_LABELS[m] || "מצב תרגול";
}

/** Hebrew operation name only (same as chart/table fallback without grade/level). */
function mathOperationTopicLabel(row) {
  if (!row || typeof row !== "object") return "";
  const bk = row.bucketKey != null && row.bucketKey !== "" ? String(row.bucketKey) : "";
  return String(getMathReportBucketDisplayName(bk)).trim() || MATH_PARENT_TOPIC_FALLBACK_HE;
}

/**
 * Stable key for "same scoped math row" - used only to detect when mode suffix is needed.
 * Not shown to parents.
 */
function mathTopicScopedIdentityKey(row, rowKey) {
  const bk = row?.bucketKey != null && row.bucketKey !== "" ? String(row.bucketKey) : "";
  const gk = effectiveMathGradeKeyFromRowOrKey(rowKey, row) || "";
  const lk = effectiveMathLevelKeyFromRowOrKey(rowKey, row) || "";
  return `${bk}\u0001${gk}\u0001${lk}`;
}

/**
 * Core title = operation name only (grade/level in table columns).
 * @param {Record<string, unknown>} row
 * @param {string} [rowKey]
 */
export function mathTopicParentDisplayCoreFromRow(row, rowKey = "") {
  void rowKey;
  return mathOperationTopicLabel(row);
}

/**
 * מעדכן displayName + displayNameScoped לכל שורות המתמטיקה במפה.
 * @param {Record<string, unknown>|null|undefined} mathOperations
 */
export function applyMathScopedParentDisplayNames(mathOperations) {
  if (!mathOperations || typeof mathOperations !== "object") return;
  const list = Object.entries(mathOperations).filter(([, row]) => row && typeof row === "object");
  if (!list.length) return;
  const countByIdentity = new Map();
  for (const [itemKey, row] of list) {
    const id = mathTopicScopedIdentityKey(row, itemKey);
    countByIdentity.set(id, (countByIdentity.get(id) || 0) + 1);
  }
  for (const [itemKey, row] of list) {
    const id = mathTopicScopedIdentityKey(row, itemKey);
    const needModeSuffix = (countByIdentity.get(id) || 0) > 1;
    const topic = mathOperationTopicLabel(row);
    const modeSuff = needModeSuffix ? ` - ${modeSuffixLabel(row.modeKey)}` : "";
    const full = `${topic}${modeSuff}`.trim();
    row.displayNameScoped = full;
    row.displayName = full;
  }
}
