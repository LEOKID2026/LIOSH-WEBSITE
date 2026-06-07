// ========== ייבוא כל השאלות לפי כיתה (Q2-C5 canonical enrich at export) ==========
import { enrichMoledetGradeQuestionsPool } from "../../lib/learning/moledet-geography-canonical-metadata.js";

import {
  G1_EASY_QUESTIONS as G1_EASY_RAW,
  G1_MEDIUM_QUESTIONS as G1_MEDIUM_RAW,
  G1_HARD_QUESTIONS as G1_HARD_RAW,
} from "./g1.js";
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

export const G1_EASY_QUESTIONS = enrichMoledetGradeQuestionsPool(G1_EASY_RAW);
export const G1_MEDIUM_QUESTIONS = enrichMoledetGradeQuestionsPool(G1_MEDIUM_RAW);
export const G1_HARD_QUESTIONS = enrichMoledetGradeQuestionsPool(G1_HARD_RAW);

export const G2_EASY_QUESTIONS = enrichMoledetGradeQuestionsPool(G2_EASY_RAW);
export const G2_MEDIUM_QUESTIONS = enrichMoledetGradeQuestionsPool(G2_MEDIUM_RAW);
export const G2_HARD_QUESTIONS = enrichMoledetGradeQuestionsPool(G2_HARD_RAW);

export const G3_EASY_QUESTIONS = enrichMoledetGradeQuestionsPool(G3_EASY_RAW);
export const G3_MEDIUM_QUESTIONS = enrichMoledetGradeQuestionsPool(G3_MEDIUM_RAW);
export const G3_HARD_QUESTIONS = enrichMoledetGradeQuestionsPool(G3_HARD_RAW);

export const G4_EASY_QUESTIONS = enrichMoledetGradeQuestionsPool(G4_EASY_RAW);
export const G4_MEDIUM_QUESTIONS = enrichMoledetGradeQuestionsPool(G4_MEDIUM_RAW);
export const G4_HARD_QUESTIONS = enrichMoledetGradeQuestionsPool(G4_HARD_RAW);

export const G5_EASY_QUESTIONS = enrichMoledetGradeQuestionsPool(G5_EASY_RAW);
export const G5_MEDIUM_QUESTIONS = enrichMoledetGradeQuestionsPool(G5_MEDIUM_RAW);
export const G5_HARD_QUESTIONS = enrichMoledetGradeQuestionsPool(G5_HARD_RAW);

export const G6_EASY_QUESTIONS = enrichMoledetGradeQuestionsPool(G6_EASY_RAW);
export const G6_MEDIUM_QUESTIONS = enrichMoledetGradeQuestionsPool(G6_MEDIUM_RAW);
export const G6_HARD_QUESTIONS = enrichMoledetGradeQuestionsPool(G6_HARD_RAW);
