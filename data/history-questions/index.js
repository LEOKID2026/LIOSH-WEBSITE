import { HISTORY_QUESTIONS_G6_RAW } from "./g6-generated.js";
import { enrichHistoryBankRowWithCanonicalMetadata } from "../../lib/learning/history-canonical-metadata.js";

export const HISTORY_QUESTIONS = HISTORY_QUESTIONS_G6_RAW.map((row) =>
  enrichHistoryBankRowWithCanonicalMetadata(row, { gradeKey: "g6" })
);

export { HISTORY_QUESTIONS_G6_RAW, HISTORY_QUESTIONS_G6_COUNT } from "./g6-generated.js";
