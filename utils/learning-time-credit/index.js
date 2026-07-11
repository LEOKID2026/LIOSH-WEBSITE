export {
  TIER_DEFAULT_MS,
  TIER_HARD_MS,
  TIER_LONG_READING_MS,
  TIER_LEGACY_GAME_MS,
  TIER_LEGACY_LEARNING_MS,
  LEGACY_TOPIC_MAX_EXCLUSIVE_SEC,
  SESSION_MAX_CREDITED_MS,
  VISIBILITY_STALE_MS,
  TIER_CAP_MS,
  resolveTierCapMs,
  capSessionCreditedMs,
  sessionCreditedMsToDurationSeconds,
} from "./constants.js";

export { isLearningTimeFairnessV1Enabled } from "./feature-flag.js";

export {
  resolveQuestionTimeCreditTier,
  normalizeTimeCreditSubjectId,
} from "./classify-question-tier.js";

export {
  creditVisibleSliceMs,
  legacyAccumulateQuestionMs,
  legacyTopicCreditSeconds,
  fairnessTopicCreditSeconds,
  topicCreditSecondsFromQuestionClose,
  sumCreditedFromVisibleIntervals,
} from "./compute-credited-ms.js";

export { QuestionTimeLedger, createQuestionTimeLedger } from "./question-time-ledger.js";

export {
  isLearningOrPracticeMode,
  isFairnessVisibilityLedgerActive,
  resolveMasterFairnessEnabled,
  beginMasterQuestionLedger,
  finalizeMasterQuestionLedger,
  legacyAccumulateQuestionWallTime,
  resolveMasterSessionDurationSeconds,
} from "./master-integration.js";

export {
  LEARNING_UNIT_CREDIT_CAP_MS,
  LEARNING_UNIT_CREDIT_CAP_SECONDS,
  LEARNING_UNIT_CREDIT_CAP_MINUTES,
  CREDITABLE_LEARNING_MODES,
  NON_CREDITING_PLAY_ACTIVITY_TYPES,
  creditLearningUnitMs,
  isLearningModeCreditable,
  isNonCreditingPlayActivity,
} from "../../lib/learning/learning-time-credit-policy.js";
