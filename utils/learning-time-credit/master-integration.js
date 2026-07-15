import { createQuestionTimeLedger } from "./question-time-ledger.js";
import {
  capSessionCreditedMs,
  sessionCreditedMsToDurationSeconds,
} from "./constants.js";
import { legacyAccumulateQuestionMs } from "./compute-credited-ms.js";
import {
  createLearningTimeLease,
  resolveActiveLearningStudentId,
} from "../../lib/learning-client/learning-time-lease.client.js";

/** @typedef {import('./question-time-ledger.js').QuestionTimeLedger} QuestionTimeLedger */

/**
 * @param {string} mode
 */
export function isLearningOrPracticeMode(mode) {
  return mode === "learning" || mode === "practice";
}

/**
 * @param {string} _mode
 * @param {boolean} [_flagOverride]
 */
export function isFairnessVisibilityLedgerActive(_mode, _flagOverride) {
  return true;
}

/**
 * @param {string} _mode
 * @param {boolean} [_flagOverride]
 */
export function resolveMasterFairnessEnabled(_mode, _flagOverride) {
  return true;
}

/**
 * @param {import('react').MutableRefObject<QuestionTimeLedger | null>} ledgerRef
 * @param {{
 *   subjectId: string,
 *   mode: string,
 *   question?: unknown,
 *   fairnessEnabled?: boolean,
 *   studentId?: string,
 * }} options
 */
export function beginMasterQuestionLedger(ledgerRef, options) {
  const { subjectId, mode, question = null, fairnessEnabled, studentId } = options;
  const fairness =
    fairnessEnabled !== undefined
      ? fairnessEnabled
      : resolveMasterFairnessEnabled(mode);
  const initiallyVisible =
    typeof document !== "undefined" && document.visibilityState
      ? document.visibilityState === "visible"
      : true;

  const sid = resolveActiveLearningStudentId(studentId) || "active-learner";
  const ownerId = `master:${subjectId}:${mode}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const lease = createLearningTimeLease({
    studentId: sid,
    ownerId,
    source: `master:${subjectId}`,
  });

  const ledger = createQuestionTimeLedger({
    subjectId,
    gameMode: mode,
    question,
    fairnessEnabled: fairness,
    initiallyVisible,
    canAccrue: () => lease.isActive(),
    maxSliceMs: 60_000,
  });

  const onVisibility = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      ledger.onHidden();
      lease.release();
    } else {
      lease.claim();
      ledger.onVisible();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  const heart = setInterval(() => {
    lease.heartbeat();
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      ledger.flushVisibleSlice();
    }
  }, 2000);

  const prevClose = ledger.closeQuestion.bind(ledger);
  ledger.closeQuestion = (now) => {
    clearInterval(heart);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    const closed = prevClose(now);
    lease.dispose();
    return closed;
  };

  ledgerRef.current = ledger;
}

/**
 * Close open question ledger: credit session ms and optional topic track.
 *
 * @param {import('react').MutableRefObject<QuestionTimeLedger | null>} ledgerRef
 * @param {import('react').MutableRefObject<number>} sessionSecondsRef - stores milliseconds (legacy name)
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
 * Legacy path when no ledger (fallback): wall-clock ms capped at 10 min per unit.
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
 * @param {import('react').MutableRefObject<number>} sessionSecondsRef - milliseconds accumulated
 */
export function resolveMasterSessionDurationSeconds(sessionSecondsRef) {
  const rawMs = Number(sessionSecondsRef.current) || 0;
  return sessionCreditedMsToDurationSeconds(capSessionCreditedMs(rawMs));
}
