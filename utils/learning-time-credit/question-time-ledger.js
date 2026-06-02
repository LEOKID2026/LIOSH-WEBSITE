import { resolveQuestionTimeCreditTier } from "./classify-question-tier.js";
import {
  creditVisibleSliceMs,
  legacyAccumulateQuestionMs,
  topicCreditSecondsFromQuestionClose,
} from "./compute-credited-ms.js";
import { resolveTierCapMs, VISIBILITY_STALE_MS } from "./constants.js";
import { isLearningTimeFairnessV1Enabled } from "./feature-flag.js";

/**
 * Per-question visibility-aware credited time ledger (browser or test).
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
    fairnessEnabled,
    initiallyVisible = true,
  }) {
    this.subjectId = subjectId;
    this.gameMode = gameMode;
    this.question = question;
    this.fairnessEnabled =
      fairnessEnabled !== undefined
        ? fairnessEnabled
        : isLearningTimeFairnessV1Enabled();

    this.tier = resolveQuestionTimeCreditTier({
      subjectId,
      gameMode,
      question,
    });
    this.tierCapMs = resolveTierCapMs(this.tier, this.fairnessEnabled);

    this.visibleAccumulatedMs = 0;
    this.hiddenAccumulatedMs = 0;
    this.frozenUntilVisible = false;
    this.hiddenSinceMs = null;
    this.lastVisibleAtMs = initiallyVisible ? now : null;
    this.questionOpenedAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  onVisible(now = Date.now()) {
    if (this.fairnessEnabled) {
      this.flushVisibleSlice(now);
      this.frozenUntilVisible = false;
      this.hiddenSinceMs = null;
      this.lastVisibleAtMs = now;
      return;
    }
    this.lastVisibleAtMs = now;
  }

  /**
   * @param {number} [now]
   */
  onHidden(now = Date.now()) {
    if (!this.fairnessEnabled) {
      this._flushLegacyWallSlice(now);
      return;
    }
    this.flushVisibleSlice(now);
    this.lastVisibleAtMs = null;
    if (this.hiddenSinceMs == null) {
      this.hiddenSinceMs = now;
    }
    if (now - this.hiddenSinceMs >= VISIBILITY_STALE_MS) {
      this.frozenUntilVisible = true;
    }
  }

  /**
   * @param {number} [now]
   */
  flushVisibleSlice(now = Date.now()) {
    if (!this.fairnessEnabled) {
      return this._flushLegacyWallSlice(now);
    }

    if (this.frozenUntilVisible || this.lastVisibleAtMs == null) {
      return 0;
    }

    const slice = creditVisibleSliceMs(
      now - this.lastVisibleAtMs,
      this.tierCapMs,
      this.visibleAccumulatedMs
    );
    if (slice > 0) {
      this.visibleAccumulatedMs += slice;
      this.lastVisibleAtMs = now;
    }
    return slice;
  }

  /**
   * Legacy path: credit wall time regardless of visibility (matches pre-fairness masters).
   *
   * @param {number} now
   */
  _flushLegacyWallSlice(now) {
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
    if (!this.fairnessEnabled) {
      const elapsed = now - (this.lastVisibleAtMs ?? this.questionOpenedAtMs);
      return Math.min(
        this.visibleAccumulatedMs + legacyAccumulateQuestionMs(elapsed),
        this.tierCapMs
      );
    }

    if (this.frozenUntilVisible || this.lastVisibleAtMs == null) {
      return this.visibleAccumulatedMs;
    }
    const pending = creditVisibleSliceMs(
      now - this.lastVisibleAtMs,
      this.tierCapMs,
      this.visibleAccumulatedMs
    );
    return this.visibleAccumulatedMs + pending;
  }

  /**
   * @param {number} [now]
   * @returns {{
   *   creditedMs: number,
   *   creditedSecForTopic: number,
   *   tier: string,
   *   tierCapMs: number,
   *   fairnessEnabled: boolean,
   *   rawWallMs: number,
   * }}
   */
  closeQuestion(now = Date.now()) {
    if (!this.fairnessEnabled) {
      this._flushLegacyWallSlice(now);
      const rawWallMs = Math.max(0, now - this.questionOpenedAtMs);
      const wallCredit = legacyAccumulateQuestionMs(rawWallMs);
      this.visibleAccumulatedMs = Math.min(wallCredit, this.tierCapMs);
    } else {
      this.flushVisibleSlice(now);
      if (this.hiddenSinceMs != null) {
        this.hiddenAccumulatedMs += Math.max(0, now - this.hiddenSinceMs);
      }
    }

    const rawWallMs = Math.max(0, now - this.questionOpenedAtMs);
    const creditedMs = this.visibleAccumulatedMs;
    const rawDurationSec = rawWallMs / 1000;

    return {
      creditedMs,
      creditedSecForTopic: topicCreditSecondsFromQuestionClose(
        creditedMs,
        this.fairnessEnabled,
        rawDurationSec
      ),
      tier: this.tier,
      tierCapMs: this.tierCapMs,
      fairnessEnabled: this.fairnessEnabled,
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
