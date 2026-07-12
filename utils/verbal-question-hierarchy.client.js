import {
  isEquationLikeText,
  isFormulaLikeText,
  isLikelyVerbalInstruction,
} from "./student-question-display.js";

/** @param {Record<string, unknown>|null|undefined} obj @param {string[]} keys */
function pickField(obj, keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** @param {string} text */
function normalizeInstruction(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  return t.endsWith(":") ? t : `${t}:`;
}

/** @param {string} text */
function extractQuotedPassage(text) {
  const t = String(text ?? "").trim();
  const patterns = [
    /^['']([\s\S]*?)['']\s*([\s\S]+)$/u,
    /^"([\s\S]*?)"\s*([\s\S]+)$/u,
    /^«([\s\S]*?)»\s*([\s\S]+)$/u,
  ];
  for (const re of patterns) {
    const match = t.match(re);
    if (match?.[1] != null && match[2]?.trim()) {
      return { passage: match[1].trim(), remainder: match[2].trim() };
    }
  }
  return null;
}

/** @param {string} text */
function extractFinalQuestionSentence(text) {
  const t = String(text ?? "").trim();
  if (!/[?؟]/.test(t)) return null;

  const singleQuotes = (t.match(/'/g) || []).length;
  if (singleQuotes >= 2 && singleQuotes % 2 === 0) return null;

  const parts = t.split(/(?<=[.!?؟])\s+/u).filter(Boolean);
  if (parts.length < 2) return null;

  const finalQuestion = parts[parts.length - 1].trim();
  if (!/[?؟]\s*$/.test(finalQuestion)) return null;
  if (finalQuestion.length > 220) return null;

  const passage = parts.slice(0, -1).join(" ").trim();
  if (passage.length < 20) return null;

  return { passage, finalQuestion };
}

/** @param {string} text */
function parseTextBody(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  const quoted = extractQuotedPassage(raw);
  if (quoted) {
    const remainder = quoted.remainder.trim();
    const sentenceSplit = extractFinalQuestionSentence(remainder);
    if (sentenceSplit) {
      return {
        passage: quoted.passage,
        finalQuestion: sentenceSplit.finalQuestion,
      };
    }
    if (remainder && /[?؟]/.test(remainder)) {
      return { passage: quoted.passage, finalQuestion: remainder };
    }
    return { passage: quoted.passage, finalQuestion: "" };
  }

  const sentenceSplit = extractFinalQuestionSentence(raw);
  if (sentenceSplit) return sentenceSplit;

  return { passage: raw, finalQuestion: "" };
}

/** @param {string} text */
function parseFullCombinedText(text) {
  const raw = String(text ?? "").trim();
  const colonIdx = raw.indexOf(":");
  if (colonIdx <= 0 || colonIdx > 72) return null;

  const instructionPart = raw.slice(0, colonIdx).trim();
  const rest = raw.slice(colonIdx + 1).trim();
  if (!rest || !isLikelyVerbalInstruction(instructionPart)) return null;

  const instruction = normalizeInstruction(instructionPart);
  const bodyParsed = parseTextBody(rest);
  if (!bodyParsed) return null;

  if (bodyParsed.finalQuestion && bodyParsed.passage) {
    return buildHierarchy(instruction, bodyParsed.passage, bodyParsed.finalQuestion);
  }

  if (bodyParsed.passage && bodyParsed.passage.length >= 12) {
    return buildHierarchy(instruction, bodyParsed.passage, bodyParsed.finalQuestion || "");
  }

  return null;
}

/** @param {string} text */
function isShortStandaloneVerbalQuestion(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return true;
  if (isEquationLikeText(raw) || isFormulaLikeText(raw)) return true;

  const colonMatch = raw.match(/^([^:]{1,72}):\s*(.+)$/su);
  if (colonMatch && isLikelyVerbalInstruction(colonMatch[1])) return false;

  if (extractQuotedPassage(raw)) return false;

  if (/^(קרא|קראו|Read the|Listen and)/iu.test(raw) && raw.length > 72) return false;

  const sentenceCount = raw.split(/(?<=[.!?؟])\s+/u).filter(Boolean).length;
  if (sentenceCount >= 2 && /[?؟]/.test(raw)) return false;

  return raw.length <= 140;
}

/**
 * @param {string} instruction
 * @param {string} passage
 * @param {string} finalQuestion
 * @returns {{ mode: "hierarchy", instruction?: string, passage?: string, finalQuestion?: string } | { mode: "single", text: string }}
 */
function buildHierarchy(instruction, passage, finalQuestion) {
  const inst = String(instruction ?? "").trim();
  const pass = String(passage ?? "").trim();
  const fin = String(finalQuestion ?? "").trim();

  const segments = [inst, pass, fin].filter(Boolean);
  if (segments.length < 2) {
    return { mode: "single", text: segments[0] || "" };
  }

  if (inst && !isLikelyVerbalInstruction(inst) && !pass && fin) {
    return { mode: "single", text: segments.join(" ") };
  }

  if (inst && pass && fin && pass === fin) {
    return { mode: "single", text: segments.join(" ") };
  }

  return {
    mode: "hierarchy",
    instruction: inst || undefined,
    passage: pass || undefined,
    finalQuestion: fin || undefined,
  };
}

/**
 * Resolve verbal question into instruction / passage / final question tiers.
 * Returns null when body is not plain verbal text (equations, formulas).
 *
 * @param {{
 *   question?: string,
 *   questionLabel?: string,
 *   exerciseText?: string,
 *   stem?: string,
 *   instruction?: string,
 *   passage?: string,
 *   prompt?: string,
 *   leadText?: string,
 *   bodyText?: string,
 *   bodyKind?: string,
 * } | null | undefined} input
 * @returns {{ mode: "single", text: string } | { mode: "hierarchy", instruction?: string, passage?: string, finalQuestion?: string } | null}
 */
export function resolveVerbalQuestionHierarchy(input) {
  if (!input || typeof input !== "object") {
    return { mode: "single", text: "" };
  }

  const bodyKind = input.bodyKind || "text";
  if (bodyKind !== "text") return null;

  const explicitInstruction = pickField(input, ["instruction"]);
  const explicitPassage = pickField(input, ["passage"]);
  const explicitPrompt = pickField(input, ["prompt"]);
  const questionField = pickField(input, ["question"]);
  const exerciseField = pickField(input, ["exerciseText"]);
  const stemField = pickField(input, ["stem"]);
  const labelRaw = pickField(input, ["questionLabel"]);
  const label =
    labelRaw && !/^\d+$/.test(labelRaw) ? normalizeInstruction(labelRaw) : "";

  const stemAsQuestion =
    stemField &&
    stemField !== explicitPassage &&
    !(label && exerciseField && stemField === exerciseField)
      ? stemField
      : "";
  const finalFromFields =
    explicitPrompt ||
    (questionField && questionField !== explicitPassage ? questionField : "") ||
    stemAsQuestion;

  if (explicitInstruction && explicitPassage && finalFromFields) {
    return buildHierarchy(
      normalizeInstruction(explicitInstruction),
      explicitPassage,
      finalFromFields
    );
  }

  if (
    label &&
    exerciseField &&
    questionField &&
    questionField !== exerciseField &&
    !isEquationLikeText(exerciseField)
  ) {
    const parsed = parseTextBody(exerciseField);
    if (parsed?.finalQuestion && parsed.passage) {
      return buildHierarchy(label, parsed.passage, parsed.finalQuestion);
    }
    return buildHierarchy(label, exerciseField, questionField);
  }

  if (label && exerciseField && !isEquationLikeText(exerciseField)) {
    const parsed = parseTextBody(exerciseField);
    if (parsed?.finalQuestion && parsed.passage) {
      return buildHierarchy(label, parsed.passage, parsed.finalQuestion);
    }
    if (isLikelyVerbalInstruction(label) && exerciseField) {
      if (parsed?.passage) {
        return buildHierarchy(label, parsed.passage, parsed.finalQuestion || "");
      }
      return buildHierarchy(label, exerciseField, "");
    }
  }

  const leadText = input.leadText ? normalizeInstruction(String(input.leadText)) : "";
  const bodyText = typeof input.bodyText === "string" ? input.bodyText.trim() : "";

  if (leadText && bodyText && !isLikelyVerbalInstruction(leadText.replace(/:$/, ""))) {
    return null;
  }

  if (leadText && bodyText && !isEquationLikeText(bodyText)) {
    const parsed = parseTextBody(bodyText);
    if (parsed?.finalQuestion && parsed.passage) {
      return buildHierarchy(leadText, parsed.passage, parsed.finalQuestion);
    }
    if (isLikelyVerbalInstruction(leadText)) {
      if (parsed?.passage) {
        return buildHierarchy(leadText, parsed.passage, parsed.finalQuestion || "");
      }
      return buildHierarchy(leadText, bodyText, "");
    }
  }

  const combined = exerciseField || questionField || stemField || bodyText || "";
  if (combined && !isEquationLikeText(combined)) {
    const fullParsed = parseFullCombinedText(combined);
    if (fullParsed) return fullParsed;
  }

  const singleText = bodyText || combined || leadText;
  if (!singleText) return { mode: "single", text: "" };

  if (isShortStandaloneVerbalQuestion(singleText)) {
    return { mode: "single", text: singleText };
  }

  const fullParsed = parseFullCombinedText(singleText);
  if (fullParsed) return fullParsed;

  const sentenceOnly = parseTextBody(singleText);
  if (
    sentenceOnly?.finalQuestion &&
    sentenceOnly.passage &&
    sentenceOnly.passage.length >= 30 &&
    !/^[^:]{1,72}:\s/u.test(singleText)
  ) {
    return buildHierarchy("", sentenceOnly.passage, sentenceOnly.finalQuestion);
  }

  return { mode: "single", text: singleText };
}
