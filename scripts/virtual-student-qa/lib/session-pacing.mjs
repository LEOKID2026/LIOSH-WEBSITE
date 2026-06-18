/**
 * In-session realistic pacing for Virtual Student QA.
 *
 * The product credits wall-clock time per question via the browser session
 * ledger. Automation that answers instantly produces unrealistically low
 * duration_seconds. This module sleeps BEFORE each answer submit so
 * learning_sessions.duration_seconds reflects the daily plan's intendedMinutes.
 *
 * Formula (owner-approved):
 *   targetSecondsPerQuestion = intendedMinutes * 60 / questionCount
 * with human jitter, clamped to a child-realistic band.
 */

import { resolveInSessionPacingEnabled } from "./config.mjs";

const ABSOLUTE_MIN_SEC = 30;
const ABSOLUTE_MAX_SEC = 120;
const JITTER_LOW = 0.85;
const JITTER_HIGH = 1.15;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function sleep(ms) {
  const dur = Math.max(0, Math.floor(Number(ms) || 0));
  if (dur === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, dur));
}

function resolveRng(scenario) {
  if (typeof scenario?.rng === "function") {
    const draw = scenario.rng();
    if (typeof draw === "function") return draw;
  }
  return Math.random;
}

/**
 * @param {object} args
 * @param {number} args.intendedMinutes
 * @param {number} args.questionCount
 * @param {() => number} args.rng
 * @param {(line: string) => void} args.log
 * @param {string} args.subjectLabel
 * @param {boolean} [args.enabled]
 */
export function createInSessionPacing({
  intendedMinutes,
  questionCount,
  rng,
  log,
  subjectLabel,
  enabled = true,
}) {
  const qc = Math.max(1, Math.floor(Number(questionCount) || 1));
  const mins = Math.max(1, Number(intendedMinutes) || Math.ceil(qc * 1.5));
  const targetSecondsPerQuestion = (mins * 60) / qc;
  const rngFn = typeof rng === "function" ? rng : Math.random;

  return {
    enabled: !!enabled,
    intendedMinutes: mins,
    questionCount: qc,
    targetSecondsPerQuestion,

    /**
     * Wait realistic think time before submitting answer N.
     * Must be called while the question is visible and BEFORE doClick/submit.
     */
    async waitBeforeAnswer(questionIndex) {
      if (!enabled) return { waitedMs: 0, targetSec: targetSecondsPerQuestion };

      const jitter = JITTER_LOW + rngFn() * (JITTER_HIGH - JITTER_LOW);
      const planned = targetSecondsPerQuestion * jitter;
      const softMin = Math.min(ABSOLUTE_MIN_SEC, targetSecondsPerQuestion * 0.75);
      const softMax = Math.max(ABSOLUTE_MAX_SEC, targetSecondsPerQuestion * 1.25);
      const seconds = clamp(planned, softMin, softMax);
      const waitedMs = Math.round(seconds * 1000);

      log?.(
        `${subjectLabel}: in-session pacing q${questionIndex}/${qc} ` +
          `wait ${seconds.toFixed(1)}s (plan ${targetSecondsPerQuestion.toFixed(1)}s/q, ` +
          `intendedMinutes=${mins})`
      );
      await sleep(waitedMs);
      return { waitedMs, targetSec: targetSecondsPerQuestion };
    },
  };
}

/**
 * Build pacing from a Phase C/D2 scenario object.
 */
export function attachSessionPacingToScenario(scenario, { log, subjectLabel }) {
  const enabled = resolveInSessionPacingEnabled(scenario?.inSessionPacingEnabled);
  const intendedMinutes =
    Number(scenario?.intendedMinutes) ||
    Math.max(5, Math.ceil((Number(scenario?.questionCount) || 1) * 1.5));

  return createInSessionPacing({
    intendedMinutes,
    questionCount: scenario?.questionCount,
    rng: resolveRng(scenario),
    log,
    subjectLabel,
    enabled,
  });
}
