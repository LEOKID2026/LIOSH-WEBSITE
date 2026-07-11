import { resolveQuestionTimeCreditTier } from "./classify-question-tier.js";
import {
  legacyAccumulateQuestionMs,
  topicCreditSecondsFromQuestionClose,
} from "./compute-credited-ms.js";
import { LEARNING_UNIT_CREDIT_CAP_MS } from "../../lib/learning/learning-time-credit-policy.js";

/**
 * Per-question learning unit time ledger — מדיניות נדיבה, תקרה 10 דקות ליחידה.
 * זמן wall-clock נספר (כולל רמזים, הסברים, השהייה) עד התקרה.
 */
export class QuestionTimeLedger {
  /**
   * @param {{
   *   subjectId: string,
   *   gameMode: string,
   *   question?: unknown,
   *   now?: number,
   *   fairnessEnabled?: boolean,
   *   initiallyVisible?: boolean,
   * }} options
   */
  constructor({
    subjectId,
    gameMode,
    question = null,
    now = Date.now(),
    initiallyVisible = true,
  }) {
    this.subjectId = subjectId;
    this.gameMode = gameMode;
    this.question = question;

    this.tier = resolveQuestionTimeCreditTier({
      subjectId,
      gameMode,
      question,
    });
    this.tierCapMs = LEARNING_UNIT_CREDIT_CAP_MS;
    this.fairnessEnabled = false;

    this.visibleAccumulatedMs = 0;
    this.questionOpenedAtMs = now;
    this.lastVisibleAtMs = initiallyVisible ? now : now;
  }

  /**
   * @param {number} [now]
   */
  onVisible(now = Date.now()) {
    this._flushWallSlice(now);
    this.lastVisibleAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  onHidden(now = Date.now()) {
    this._flushWallSlice(now);
    this.lastVisibleAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  flushVisibleSlice(now = Date.now()) {
    return this._flushWallSlice(now);
  }

  /**
   * @param {number} now
   */
  _flushWallSlice(now) {
    const anchor = this.lastVisibleAtMs ?? this.questionOpenedAtMs;
    if (anchor == null || now <= anchor) {
      this.lastVisibleAtMs = now;
      return 0;
    }
    const slice = legacyAccumulateQuestionMs(now - anchor);
    const room = Math.max(0, this.tierCapMs - this.visibleAccumulatedMs);
    const credited = Math.min(slice, room);
    if (credited > 0) {
      this.visibleAccumulatedMs += credited;
      this.lastVisibleAtMs = now;
    }
    return credited;
  }

  /**
   * @param {number} [now]
   */
  peekCreditedMs(now = Date.now()) {
    const anchor = this.lastVisibleAtMs ?? this.questionOpenedAtMs;
    const elapsed = now - anchor;
    return Math.min(
      this.visibleAccumulatedMs + legacyAccumulateQuestionMs(elapsed),
      this.tierCapMs
    );
  }

  /**
   * @param {number} [now]
   */
  closeQuestion(now = Date.now()) {
    this._flushWallSlice(now);
    const rawWallMs = Math.max(0, now - this.questionOpenedAtMs);
    const wallCredit = legacyAccumulateQuestionMs(rawWallMs);
    this.visibleAccumulatedMs = Math.min(wallCredit, this.tierCapMs);

    const creditedMs = this.visibleAccumulatedMs;
    const rawDurationSec = rawWallMs / 1000;

    return {
      creditedMs,
      creditedSecForTopic: topicCreditSecondsFromQuestionClose(
        creditedMs,
        false,
        rawDurationSec
      ),
      tier: this.tier,
      tierCapMs: this.tierCapMs,
      fairnessEnabled: false,
      rawWallMs,
    };
  }
}

/**
 * @param {ConstructorParameters<typeof QuestionTimeLedger>[0]} options
 */
export function createQuestionTimeLedger(options) {
  return new QuestionTimeLedger(options);
}
