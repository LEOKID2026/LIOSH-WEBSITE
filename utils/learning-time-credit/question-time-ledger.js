import { resolveQuestionTimeCreditTier } from "./classify-question-tier.js";
import {
  legacyAccumulateQuestionMs,
  topicCreditSecondsFromQuestionClose,
} from "./compute-credited-ms.js";
import { LEARNING_UNIT_CREDIT_CAP_MS } from "../../lib/learning/learning-time-credit-policy.js";

/**
 * Per-question learning unit time ledger.
 * Credits only while visible + optional lease canAccrue; caps sleep/wake jumps.
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
   *   canAccrue?: () => boolean,
   *   maxSliceMs?: number,
   * }} options
   */
  constructor({
    subjectId,
    gameMode,
    question = null,
    now = Date.now(),
    initiallyVisible = true,
    canAccrue = null,
    maxSliceMs = 60_000,
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
    this.fairnessEnabled = true;
    this.canAccrue = typeof canAccrue === "function" ? canAccrue : () => true;
    this.maxSliceMs = Math.max(1_000, Math.floor(Number(maxSliceMs) || 60_000));

    this.visibleAccumulatedMs = 0;
    this.questionOpenedAtMs = now;
    this.isVisible = Boolean(initiallyVisible);
    this.lastTickAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  onVisible(now = Date.now()) {
    this._flushVisibleSlice(now);
    this.isVisible = true;
    this.lastTickAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  onHidden(now = Date.now()) {
    this._flushVisibleSlice(now);
    this.isVisible = false;
    this.lastTickAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  flushVisibleSlice(now = Date.now()) {
    return this._flushVisibleSlice(now);
  }

  /**
   * @param {number} now
   */
  _flushVisibleSlice(now) {
    const anchor = this.lastTickAtMs ?? this.questionOpenedAtMs;
    if (anchor == null || now <= anchor) {
      this.lastTickAtMs = now;
      return 0;
    }
    const delta = now - anchor;
    this.lastTickAtMs = now;
    if (!this.isVisible) return 0;
    if (!this.canAccrue()) return 0;
    if (delta > this.maxSliceMs) return 0; // sleep/wake / background throttle
    const slice = legacyAccumulateQuestionMs(delta);
    const room = Math.max(0, this.tierCapMs - this.visibleAccumulatedMs);
    const credited = Math.min(slice, room);
    if (credited > 0) {
      this.visibleAccumulatedMs += credited;
    }
    return credited;
  }

  /**
   * @param {number} [now]
   */
  peekCreditedMs(now = Date.now()) {
    if (!this.isVisible || !this.canAccrue()) {
      return Math.min(this.visibleAccumulatedMs, this.tierCapMs);
    }
    const anchor = this.lastTickAtMs ?? this.questionOpenedAtMs;
    const delta = now - anchor;
    if (delta <= 0 || delta > this.maxSliceMs) {
      return Math.min(this.visibleAccumulatedMs, this.tierCapMs);
    }
    const slice = legacyAccumulateQuestionMs(delta);
    return Math.min(this.visibleAccumulatedMs + slice, this.tierCapMs);
  }

  /**
   * @param {number} [now]
   */
  closeQuestion(now = Date.now()) {
    this._flushVisibleSlice(now);
    const rawWallMs = Math.max(0, now - this.questionOpenedAtMs);
    const creditedMs = Math.min(this.visibleAccumulatedMs, this.tierCapMs);

    return {
      creditedMs,
      creditedSecForTopic: topicCreditSecondsFromQuestionClose(
        creditedMs,
        true,
        rawWallMs / 1000
      ),
      tier: this.tier,
      tierCapMs: this.tierCapMs,
      fairnessEnabled: true,
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
