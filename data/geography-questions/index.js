// ========== ייבוא כל השאלות לפי כיתה (Q2-C5 canonical enrich at export) ==========
import { enrichMoledetGradeQuestionsPool } from "../../lib/learning/moledet-geography-canonical-metadata.js";
import { rebalanceObviousMcqDistractors } from "../../utils/mcq-distractor-rebalance.js";
import { repairMcqObviousAnswerContent } from "../../utils/mcq-fail-content-repair.js";

// G1 pools live in ./g1.js (enrichment/archived only — not exported from launch index).
import {
  G2_EASY_QUESTIONS as G2_EASY_RAW,
  G2_MEDIUM_QUESTIONS as G2_MEDIUM_RAW,
  G2_HARD_QUESTIONS as G2_HARD_RAW,
} from "./g2.js";
import {
  G3_EASY_QUESTIONS as G3_EASY_RAW,
  G3_MEDIUM_QUESTIONS as G3_MEDIUM_RAW,
  G3_HARD_QUESTIONS as G3_HARD_RAW,
} from "./g3.js";
import {
  G4_EASY_QUESTIONS as G4_EASY_RAW,
  G4_MEDIUM_QUESTIONS as G4_MEDIUM_RAW,
  G4_HARD_QUESTIONS as G4_HARD_RAW,
} from "./g4.js";
import {
  G5_EASY_QUESTIONS as G5_EASY_RAW,
  G5_MEDIUM_QUESTIONS as G5_MEDIUM_RAW,
  G5_HARD_QUESTIONS as G5_HARD_RAW,
} from "./g5.js";
import {
  G6_EASY_QUESTIONS as G6_EASY_RAW,
  G6_MEDIUM_QUESTIONS as G6_MEDIUM_RAW,
  G6_HARD_QUESTIONS as G6_HARD_RAW,
} from "./g6.js";

function prepareMoledetMcqRow(row) {
  if (!row || typeof row !== "object") return row;
  const answers = Array.isArray(row.answers)
    ? row.answers
    : Array.isArray(row.options)
      ? row.options
      : null;
  if (!answers || answers.length < 4) return row;

  const ci =
    Number.isFinite(Number(row.correctIndex)) && Number(row.correctIndex) >= 0
      ? Number(row.correctIndex)
      : Number.isFinite(Number(row.correct)) && Number(row.correct) >= 0
        ? Number(row.correct)
        : 0;

  let working = rebalanceObviousMcqDistractors({
    question: row.question,
    answers: [...answers],
    correct: ci,
    correctIndex: ci,
  });
  working = repairMcqObviousAnswerContent(working, {
    subject: "moledet_geography",
    stem: row.question,
  });

  const out = { ...row };
  if (Array.isArray(row.answers)) out.answers = working.answers;
  if (Array.isArray(row.options)) out.options = working.answers ?? working.options;
  if (row.correct != null) out.correct = working.correct ?? working.correctIndex ?? ci;
  if (row.correctIndex != null) {
    out.correctIndex = working.correctIndex ?? working.correct ?? ci;
  }
  return out;
}

function enrichMoledetPool(raw) {
  const enriched = enrichMoledetGradeQuestionsPool(raw);
  if (!enriched || typeof enriched !== "object" || Array.isArray(enriched)) return enriched;
  /** @type {Record<string, unknown[]>} */
  const out = {};
  for (const [topicKey, rows] of Object.entries(enriched)) {
    if (!Array.isArray(rows)) {
      out[topicKey] = rows;
      continue;
    }
    out[topicKey] = rows.map((row) => prepareMoledetMcqRow(row));
  }
  return out;
}

export const G2_EASY_QUESTIONS = enrichMoledetPool(G2_EASY_RAW);
export const G2_MEDIUM_QUESTIONS = enrichMoledetPool(G2_MEDIUM_RAW);
export const G2_HARD_QUESTIONS = enrichMoledetPool(G2_HARD_RAW);

export const G3_EASY_QUESTIONS = enrichMoledetPool(G3_EASY_RAW);
export const G3_MEDIUM_QUESTIONS = enrichMoledetPool(G3_MEDIUM_RAW);
export const G3_HARD_QUESTIONS = enrichMoledetPool(G3_HARD_RAW);

export const G4_EASY_QUESTIONS = enrichMoledetPool(G4_EASY_RAW);
export const G4_MEDIUM_QUESTIONS = enrichMoledetPool(G4_MEDIUM_RAW);
export const G4_HARD_QUESTIONS = enrichMoledetPool(G4_HARD_RAW);

export const G5_EASY_QUESTIONS = enrichMoledetPool(G5_EASY_RAW);
export const G5_MEDIUM_QUESTIONS = enrichMoledetPool(G5_MEDIUM_RAW);
export const G5_HARD_QUESTIONS = enrichMoledetPool(G5_HARD_RAW);

export const G6_EASY_QUESTIONS = enrichMoledetPool(G6_EASY_RAW);
export const G6_MEDIUM_QUESTIONS = enrichMoledetPool(G6_MEDIUM_RAW);
export const G6_HARD_QUESTIONS = enrichMoledetPool(G6_HARD_RAW);
