/**
 * Worksheet question fingerprints for dedup.
 * @module lib/worksheets/worksheet-fingerprint.server
 */

import { hebrewQuestionFingerprint } from "../../utils/hebrew-learning-intel.js";

/**
 * @param {Record<string, unknown>} item
 * @param {string} subjectId
 * @returns {string}
 */
export function worksheetQuestionFingerprint(item, subjectId) {
  const sub = String(subjectId || item.subject || "").toLowerCase();
  if (sub === "hebrew") {
    return hebrewQuestionFingerprint({
      topic: item.topic || item.operation,
      question: item.question,
      exerciseText: item.exerciseText,
      answerMode: item.answerMode || item.params?.answerMode,
      answers: item.answers || item.choices,
      params: item.params,
    });
  }
  if (sub === "english") {
    const stem = String(item.question || item.exerciseText || "");
    const phonics = String(item.params?.phonicsStimulus || item.exerciseText || "");
    const pf = String(item.params?.patternFamily || item.params?.subtype || "");
    return `english|${item.topic || item.operation}|${pf}|${stem}|${phonics}|${item.correctAnswer}`;
  }
  if (sub === "geometry") {
    const p = item.params && typeof item.params === "object" ? item.params : {};
    return [
      "geometry",
      item.topic || item.operation,
      p.kind || "",
      p.subtype || "",
      p.type || "",
      p.patternFamily || "",
      item.question,
      item.correctAnswer,
      item.answerMode || p.answerMode || "",
    ].join("|");
  }
  if (sub === "math") {
    const kind = String(item.params?.kind || "");
    const a = item.a ?? item.params?.a;
    const b = item.b ?? item.params?.b;
    const c = item.params?.c;
    return `math|${item.topic || item.operation}|${kind}|${a}|${b}|${c}|${item.question}|${item.correctAnswer}`;
  }
  return `${sub}|${item.question}|${item.correctAnswer}`;
}
