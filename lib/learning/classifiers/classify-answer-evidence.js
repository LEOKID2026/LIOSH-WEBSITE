/**
 * Answer evidence classification dispatch — evidence-safe, no forced tags.
 */

import {
  buildAnswerEvidence,
  CLASSIFIER_VERSION,
  EVIDENCE_TYPES,
  extractCanonicalOperands,
} from "../answer-evidence-contract.js";
import {
  classifyMathNumericAnswer,
  proveRemainderIdentityError,
} from "./math-numeric-classifier.js";
import {
  classifyMcqDistractorAnswer,
  resolveSelectedMcqCell,
} from "./mcq-distractor-classifier.js";
import { classifyHebrewTypedAnswer } from "./hebrew-typed-classifier.js";
import { classifyEnglishTypedAnswer } from "./english-typed-classifier.js";
import { classifyScienceTypedAnswer } from "./science-typed-classifier.js";
import { classifyHistoryTypedAnswer } from "./history-typed-classifier.js";
import { classifyMoledetTypedAnswer } from "./moledet-typed-classifier.js";
import {
  detectQuestionTypeFromRecord,
  mapAnswerModeToQuestionType,
} from "../question-engine-metadata.js";
import { isTopic3FracKind } from "../fraction-parse.js";
import { classifyGeometryAnswer, isGeometryNumericKind } from "../fuzzy-tolerance-geometry.js";
import { classifyHebrewAnswer } from "../fuzzy-tolerance-hebrew.js";
import { classifyEnglishAnswer } from "../fuzzy-tolerance-english.js";
import { classifyScienceAnswer } from "../fuzzy-tolerance-science.js";
import { classifyHistoryAnswer } from "../fuzzy-tolerance-history.js";
import { classifyMoledetAnswer } from "../fuzzy-tolerance-moledet.js";

/** @param {string} subject */
function isMoledetSubject(subject) {
  const s = String(subject || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  return (
    s === "moledet-geography" ||
    s === "geography" ||
    s === "homeland" ||
    s === "moledet" ||
    s === "civics"
  );
}

/** @param {Record<string, unknown>} question @param {Record<string, unknown>} params */
function languageChoiceLists(question, params) {
  const answers = question.answers || question.options || question.choices || params.answers || params.options;
  return Array.isArray(answers) ? answers : undefined;
}

/** @param {unknown} v */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {object} ctx
 */
export function classifyAnswerEvidence(ctx) {
  const subject = pickStr(ctx.subject) || "unknown";
  const question = ctx.question && typeof ctx.question === "object" ? ctx.question : {};
  const params =
    ctx.params && typeof ctx.params === "object"
      ? ctx.params
      : question.params && typeof question.params === "object"
        ? question.params
        : ctx.questionEngine?.params && typeof ctx.questionEngine.params === "object"
          ? ctx.questionEngine.params
          : {};
  const kind =
    pickStr(params.kind) ||
    pickStr(question.kind) ||
    pickStr(ctx.questionEngine?.generatorKind);
  const answerMode =
    pickStr(ctx.answerMode) ||
    pickStr(question.answerMode) ||
    pickStr(params.answerMode) ||
    pickStr(params.runtimeAnswerMode);
  // Runtime answerMode wins over distractor-array heuristics and stale engine mcq.
  const questionType =
    mapAnswerModeToQuestionType(answerMode) ||
    pickStr(ctx.questionEngine?.questionType) ||
    detectQuestionTypeFromRecord(question, { answerMode });
  const userAnswer = ctx.userAnswer;
  const expectedAnswer =
    ctx.expectedAnswer ?? question.correctAnswer ?? ctx.questionEngine?.correctAnswer?.value;

  /** @type {string[]} */
  const candidates = [];
  /** @type {{ tag: string, evidenceType: string, details: object, confidence: number, ruleId?: string }|null} */
  let hit = null;

  if (ctx.isCorrect !== true) {
    if (questionType === "mcq") {
      const cell = resolveSelectedMcqCell(
        {
          ...question,
          params,
          answers: question.answers || ctx.questionEngine?.allAnswerChoices,
          options: question.options || ctx.questionEngine?.allAnswerChoices,
        },
        userAnswer,
        ctx.selectedOptionIndex ?? ctx.questionEngine?.selectedAnswer?.index,
      );
      const engineCell =
        !cell && ctx.questionEngine?.selectedAnswer
          ? {
              ...ctx.questionEngine.selectedAnswer,
              distractorFamily:
                ctx.questionEngine.selectedAnswer.distractorFamily ||
                ctx.questionEngine.distractorFamily,
              misconceptionTag:
                ctx.questionEngine.selectedAnswer.misconceptionTag ||
                ctx.questionEngine.misconceptionTag,
            }
          : null;
      hit = classifyMcqDistractorAnswer(cell || engineCell, userAnswer, expectedAnswer);

      // Remainder MCQ: if cell has no tagged family, prove identity modes from operands.
      if (
        !hit &&
        (kind === "div_with_remainder" || kind === "div_with_remainder_long")
      ) {
        const rem = proveRemainderIdentityError({
          kind,
          ...params,
          userAnswer,
          expectedAnswer,
        });
        if (rem) {
          hit = {
            tag: rem.tag,
            evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: rem.details,
            confidence: rem.confidence ?? 0.9,
            ruleId: rem.ruleId,
          };
        }
      }

      // Topic-3 fractions MCQ: prove TEPs when distractor cell has no family tag.
      if (!hit && kind && (isTopic3FracKind(kind) || String(kind).includes("frac"))) {
        hit = classifyMathNumericAnswer(userAnswer, expectedAnswer, params, kind);
      }

      // Geometry MCQ: value-based TEPs when cell has no family (or generic formula tag miss).
      if (
        !hit &&
        subject === "geometry" &&
        kind &&
        (isGeometryNumericKind(kind) || String(kind).startsWith("heights_"))
      ) {
        const geo = classifyGeometryAnswer({
          kind,
          ...params,
          userAnswer,
          expectedAnswer,
        });
        if (geo) {
          hit = {
            tag: geo.tag,
            evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: geo.details,
            confidence: geo.confidence ?? 0.9,
            ruleId: geo.ruleId,
          };
        }
      }

      // Hebrew / English MCQ: exact TEPs when cell untagged.
      if (!hit && subject === "hebrew") {
        const he = classifyHebrewAnswer({
          kind,
          ...params,
          answers: languageChoiceLists(question, params),
          userAnswer,
          expectedAnswer,
        });
        if (he) {
          hit = {
            tag: he.tag,
            evidenceType: he.evidenceType || EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: he.details,
            confidence: he.confidence ?? 0.9,
            ruleId: he.ruleId,
          };
        }
      }
      if (!hit && subject === "english") {
        const en = classifyEnglishAnswer({
          kind,
          ...params,
          answers: languageChoiceLists(question, params),
          userAnswer,
          expectedAnswer,
        });
        if (en) {
          hit = {
            tag: en.tag,
            evidenceType: en.evidenceType || EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: en.details,
            confidence: en.confidence ?? 0.9,
            ruleId: en.ruleId,
          };
        }
      }

      // Science / History / Moledet MCQ: exact TEPs when cell untagged.
      if (!hit && subject === "science") {
        const sci = classifyScienceAnswer({
          kind,
          topic: ctx.topic ?? pickStr(question.topic),
          ...params,
          answers: languageChoiceLists(question, params),
          userAnswer,
          expectedAnswer,
        });
        if (sci) {
          hit = {
            tag: sci.tag,
            evidenceType: sci.evidenceType || EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: sci.details,
            confidence: sci.confidence ?? 0.9,
            ruleId: sci.ruleId,
          };
        }
      }
      if (!hit && subject === "history") {
        const hist = classifyHistoryAnswer({
          kind,
          topic: ctx.topic ?? pickStr(question.topic),
          ...params,
          answers: languageChoiceLists(question, params),
          userAnswer,
          expectedAnswer,
        });
        if (hist) {
          hit = {
            tag: hist.tag,
            evidenceType: hist.evidenceType || EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: hist.details,
            confidence: hist.confidence ?? 0.9,
            ruleId: hist.ruleId,
          };
        }
      }
      if (!hit && isMoledetSubject(subject)) {
        const mol = classifyMoledetAnswer({
          kind,
          topic: ctx.topic ?? pickStr(question.topic),
          ...params,
          answers: languageChoiceLists(question, params),
          userAnswer,
          expectedAnswer,
        });
        if (mol) {
          hit = {
            tag: mol.tag,
            evidenceType: mol.evidenceType || EVIDENCE_TYPES.DIRECT_EVIDENCE,
            details: mol.details,
            confidence: mol.confidence ?? 0.9,
            ruleId: mol.ruleId,
          };
        }
      }
    }

    if (
      !hit &&
      (subject === "math" || subject === "geometry") &&
      (questionType === "numeric" || questionType === "unknown" || questionType === "open")
    ) {
      hit = classifyMathNumericAnswer(userAnswer, expectedAnswer, params, kind);
    }

    // Geometry typed/numeric path also via dedicated module when math classifier missed.
    if (
      !hit &&
      subject === "geometry" &&
      kind &&
      (isGeometryNumericKind(kind) || String(kind).startsWith("heights_"))
    ) {
      const geo = classifyGeometryAnswer({
        kind,
        ...params,
        userAnswer,
        expectedAnswer,
      });
      if (geo) {
        hit = {
          tag: geo.tag,
          evidenceType: EVIDENCE_TYPES.DIRECT_EVIDENCE,
          details: geo.details,
          confidence: geo.confidence ?? 0.9,
          ruleId: geo.ruleId,
        };
      }
    }

    // answerMode "typed" maps to questionType "numeric" in engine metadata —
    // language subjects must still reach typed classifiers (not math numeric).
    const languageTypedSurface =
      questionType === "open" ||
      questionType === "typed" ||
      questionType === "unknown" ||
      questionType === "numeric" ||
      String(ctx.answerMode || params.answerMode || "")
        .toLowerCase()
        .includes("typ");

    if (!hit && subject === "hebrew" && languageTypedSurface) {
      hit = classifyHebrewTypedAnswer(userAnswer, expectedAnswer, {
        ...params,
        answerMode: params.answerMode || ctx.answerMode || "typing",
      });
    }

    if (!hit && subject === "english" && languageTypedSurface) {
      hit = classifyEnglishTypedAnswer(userAnswer, expectedAnswer, {
        ...params,
        answerMode: params.answerMode || ctx.answerMode || "typing",
      });
    }

    if (!hit && subject === "science" && languageTypedSurface) {
      hit = classifyScienceTypedAnswer(userAnswer, expectedAnswer, {
        ...params,
        topic: ctx.topic ?? pickStr(question.topic),
        answerMode: params.answerMode || ctx.answerMode || "typing",
      });
    }

    if (!hit && subject === "history" && languageTypedSurface) {
      hit = classifyHistoryTypedAnswer(userAnswer, expectedAnswer, {
        ...params,
        topic: ctx.topic ?? pickStr(question.topic),
        answerMode: params.answerMode || ctx.answerMode || "typing",
      });
    }

    if (!hit && isMoledetSubject(subject) && languageTypedSurface) {
      hit = classifyMoledetTypedAnswer(userAnswer, expectedAnswer, {
        ...params,
        topic: ctx.topic ?? pickStr(question.topic),
        answerMode: params.answerMode || ctx.answerMode || "typing",
      });
    }

    if (!hit && Array.isArray(params.expectedErrorTags)) {
      for (const t of params.expectedErrorTags) {
        const tag = pickStr(t);
        if (tag) candidates.push(tag);
      }
    }
  }

  /** Subject-aware tag remaps (avoid global alias collisions across subjects). */
  let detected = hit?.tag ?? null;
  if (subject === "hebrew" && detected === "agreement_error") {
    detected = "grammar_agreement_error";
  }
  if (
    subject === "hebrew" &&
    (detected === "detail_recall_error" || detected === "wrong_detail")
  ) {
    detected = "reading_comprehension_error";
  }
  const evidenceType = hit?.evidenceType ?? EVIDENCE_TYPES.UNKNOWN;
  const details = {
    ...(hit?.details && typeof hit.details === "object" ? hit.details : {}),
    ...(hit?.ruleId ? { classifierRuleId: hit.ruleId } : {}),
    ...(kind ? { kind } : {}),
  };

  return buildAnswerEvidence({
    subject,
    topic: ctx.topic ?? pickStr(question.topic) ?? pickStr(question.operation),
    subtopic: pickStr(params.subtype) || pickStr(question.subtopic),
    skillId:
      pickStr(ctx.questionEngine?.skillId) ||
      pickStr(params.diagnosticSkillId) ||
      pickStr(question.diagnosticSkillId),
    questionType,
    questionGenerator: ctx.questionGenerator,
    questionVersion: pickStr(question.version),
    canonicalOperands: extractCanonicalOperands(params, kind),
    expectedAnswer,
    userAnswer,
    selectedOptionIndex: ctx.selectedOptionIndex,
    isCorrect: ctx.isCorrect === true,
    difficulty: ctx.difficulty ?? pickStr(ctx.questionEngine?.difficulty),
    misconceptionCandidates: candidates,
    detectedMisconception: detected,
    evidenceType,
    evidenceDetails: details,
    confidence: hit?.confidence ?? 0,
    probeRequired: !ctx.isCorrect && !detected && questionType !== "mcq",
    timestamp: ctx.timestamp,
    answerId: ctx.answerId,
    classifierVersion: CLASSIFIER_VERSION,
  });
}
