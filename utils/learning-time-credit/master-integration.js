import { createQuestionTimeLedger } from "./question-time-ledger.js";
import {
  capSessionCreditedMs,
  sessionCreditedMsToDurationSeconds,
} from "./constants.js";
import { isLearningTimeFairnessV1Enabled } from "./feature-flag.js";
import { legacyAccumulateQuestionMs } from "./compute-credited-ms.js";

/** @typedef {import('./question-time-ledger.js').QuestionTimeLedger} QuestionTimeLedger */

/**
 * @param {string} mode
 */
export function isLearningOrPracticeMode(mode) {
  return mode === "learning" || mode === "practice";
}

/**
 * Fairness visibility ledger applies only in learning/practice when flag is on.
 *
 * @param {string} mode
 * @param {boolean} [flagOverride]
 */
export function isFairnessVisibilityLedgerActive(mode, flagOverride) {
  const enabled =
    flagOverride !== undefined ? flagOverride : isLearningTimeFairnessV1Enabled();
  return enabled && isLearningOrPracticeMode(mode);
}

/**
 * @param {string} mode
 * @param {boolean} [flagOverride]
 */
export function resolveMasterFairnessEnabled(mode, flagOverride) {
  const flag =
    flagOverride !== undefined ? flagOverride : isLearningTimeFairnessV1Enabled();
  return flag && isLearningOrPracticeMode(mode);
}

/**
 * @param {import('react').MutableRefObject<QuestionTimeLedger | null>} ledgerRef
 * @param {{
 *   subjectId: string,
 *   mode: string,
 *   question?: unknown,
 *   fairnessEnabled?: boolean,
 * }} options
 */
export function beginMasterQuestionLedger(ledgerRef, options) {
  const { subjectId, mode, question = null, fairnessEnabled } = options;
  const fairness =
    fairnessEnabled !== undefined
      ? fairnessEnabled
      : resolveMasterFairnessEnabled(mode);
  const initiallyVisible =
    typeof document !== "undefined" && document.visibilityState
      ? document.visibilityState === "visible"
      : true;

  ledgerRef.current = createQuestionTimeLedger({
    subjectId,
    gameMode: mode,
    question,
    fairnessEnabled: fairness,
    initiallyVisible,
  });
}

/**
 * Close open question ledger: credit session ms and optional topic track.
 *
 * @param {import('react').MutableRefObject<QuestionTimeLedger | null>} ledgerRef
 * @param {import('react').MutableRefObject<number>} sessionSecondsRef — stores milliseconds (legacy name)
 * @param {(closed: { creditedMs: number, creditedSecForTopic: number }) => void} [onTopicTrack]
 * @returns {ReturnType<QuestionTimeLedger['closeQuestion']> | null}
 */
export function finalizeMasterQuestionLedger(
  ledgerRef,
  sessionSecondsRef,
  onTopicTrack
) {
  const ledger = ledgerRef.current;
  if (!ledger) return null;

  const closed = ledger.closeQuestion();
  if (closed.creditedMs > 0) {
    sessionSecondsRef.current += closed.creditedMs;
  }
  if (onTopicTrack && closed.creditedSecForTopic > 0) {
    onTopicTrack(closed);
  }
  ledgerRef.current = null;
  return closed;
}

/**
 * Legacy path when no ledger (fallback): wall-clock ms capped at 120s.
 *
 * @param {number | null} questionStartTime
 * @param {import('react').MutableRefObject<number>} sessionSecondsRef
 */
export function legacyAccumulateQuestionWallTime(questionStartTime, sessionSecondsRef) {
  if (!questionStartTime) return;
  const elapsed = Date.now() - questionStartTime;
  if (elapsed <= 0) return;
  sessionSecondsRef.current += legacyAccumulateQuestionMs(elapsed);
}

/**
 * @param {import('react').MutableRefObject<number>} sessionSecondsRef — milliseconds accumulated
 */
export function resolveMasterSessionDurationSeconds(sessionSecondsRef) {
  const rawMs = Number(sessionSecondsRef.current) || 0;
  return sessionCreditedMsToDurationSeconds(capSessionCreditedMs(rawMs));
}
