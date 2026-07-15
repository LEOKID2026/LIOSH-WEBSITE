/**
 * Server validation for public demo worksheet generation.
 * @module lib/worksheets/worksheet-public-demo-allowlist.server
 */

import {
  PUBLIC_DEMO_COUNT,
  getPublicDemoAllowlistEntry,
} from "./worksheet-public-demo.constants.js";
import { validateWorksheetPublicGenerationParams } from "./worksheet-level-map.server.js";
import { isMathPracticeFormatAllowedForGradeTopic } from "./worksheet-math-practice-format.js";

const GRADE_RE = /^g[1-6]$/;

/**
 * @param {Partial<{
 *   subjectId: string,
 *   gradeKey: string,
 *   topicKey: string,
 *   levelKey: string,
 *   mathPracticeFormat?: string,
 *   preferMcq?: boolean,
 *   inkSave?: boolean,
 *   titleHe?: string,
 *   seed?: number,
 *   mixedTopicKeys?: string[] | null,
 * }>} params
 * @returns {{ ok: true, normalized: Record<string, unknown> } | { ok: false, error: string }}
 */
export function validatePublicDemoGenerationParams(params) {
  const subjectId = String(params?.subjectId || "").trim();
  const gradeKey = String(params?.gradeKey || "").trim();
  const topicKey = String(params?.topicKey || "").trim();

  if (!GRADE_RE.test(gradeKey)) {
    return { ok: false, error: "INVALID_GRADE" };
  }

  const allowEntry = getPublicDemoAllowlistEntry(subjectId, gradeKey);
  if (!allowEntry) {
    return { ok: false, error: "INVALID_SUBJECT" };
  }

  if (topicKey === "mixed" || Array.isArray(params?.mixedTopicKeys)) {
    return { ok: false, error: "TOPIC_NOT_ALLOWED_IN_PUBLIC_DEMO" };
  }

  if (topicKey !== allowEntry.topicKey) {
    return { ok: false, error: "TOPIC_NOT_ALLOWED_IN_PUBLIC_DEMO" };
  }

  let mathPracticeFormat =
    typeof params?.mathPracticeFormat === "string" && params.mathPracticeFormat.trim()
      ? params.mathPracticeFormat.trim()
      : undefined;

  if (subjectId === "math") {
    const allowedFormats = allowEntry.mathPracticeFormats || [];
    if (!mathPracticeFormat) {
      mathPracticeFormat = allowedFormats[0];
    }
    if (!allowedFormats.includes(mathPracticeFormat)) {
      return { ok: false, error: "INVALID_MATH_PRACTICE_FORMAT" };
    }
    if (!isMathPracticeFormatAllowedForGradeTopic(mathPracticeFormat, gradeKey, topicKey)) {
      return { ok: false, error: "INVALID_MATH_PRACTICE_FORMAT_FOR_TOPIC" };
    }
  }

  const validated = validateWorksheetPublicGenerationParams({
    subjectId,
    gradeKey,
    topicKey,
    levelKey: params?.levelKey,
    count: PUBLIC_DEMO_COUNT,
    mathPracticeFormat,
    preferMcq: params?.preferMcq,
    mixedTopicKeys: undefined,
  });

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  return {
    ok: true,
    normalized: {
      subjectId,
      gradeKey,
      topicKey,
      levelKey: params?.levelKey || "regular",
      count: PUBLIC_DEMO_COUNT,
      mathPracticeFormat,
      preferMcq: params?.preferMcq,
      inkSave: params?.inkSave === true,
      titleHe: typeof params?.titleHe === "string" ? params.titleHe : undefined,
      seed: params?.seed,
    },
  };
}

export { PUBLIC_DEMO_COUNT };
