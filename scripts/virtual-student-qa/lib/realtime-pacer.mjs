/**
 * Phase D2 — Daily pacer.
 *
 * Single source of truth for the three pause types the daily simulator
 * applies to make activity look like real children studying instead of
 * a single Vercel-blasting test loop:
 *
 *   - between-question: think time inside one session (D2.5+ uses this;
 *     D2.3 fast mode is effectively zero — the subject drivers already
 *     handle their own per-question network sync).
 *   - between-session:  cool-down between two sessions for the SAME
 *     student. Realtime: random in [3min, 25min]. Fast: 0.
 *   - between-students: gap before the next student's fresh context
 *     opens. Always non-zero (a small Vercel politeness floor) so even
 *     fast mode doesn't burst all 12 logins inside the same second.
 *
 * Two knobs:
 *   - mode: 'realtime' | 'fast'
 *   - scale: number multiplier (default 1.0 in realtime, 0.0 in fast).
 *     Operator override via VIRTUAL_STUDENT_DAILY_PACER_SCALE.
 *
 * scale=0 hardens to "no waiting" EXCEPT a small hard floor on
 * between-students (BETWEEN_STUDENTS_FAST_FLOOR_MS).
 *
 * Determinism:
 *   The pacer takes its own RNG (seeded by the orchestrator from the
 *   target date) so realtime pauses on the same calendar date are
 *   replayable. Fast mode is deterministic by construction.
 */

const BETWEEN_STUDENTS_FAST_FLOOR_MS = 2_000;

const REALTIME_BANDS = {
  betweenQuestionsMs: { min: 2_000, max: 12_000 },
  betweenSessionsMs: { min: 3 * 60_000, max: 25 * 60_000 },
  betweenStudentsMs: { min: 30_000, max: 3 * 60_000 },
  perQuestionFloorMs: 100,
};

const FAST_BANDS = {
  betweenQuestionsMs: { min: 100, max: 100 },
  betweenSessionsMs: { min: 0, max: 0 },
  betweenStudentsMs: {
    min: BETWEEN_STUDENTS_FAST_FLOOR_MS,
    max: BETWEEN_STUDENTS_FAST_FLOOR_MS,
  },
  perQuestionFloorMs: 0,
};

function clampNonNegative(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function uniformInRange(rng, lo, hi) {
  const a = clampNonNegative(lo);
  const b = Math.max(a, clampNonNegative(hi));
  if (a === b) return a;
  return Math.round(a + (Math.max(0, Math.min(1, rng())) * (b - a)));
}

function sleep(ms) {
  const dur = clampNonNegative(ms);
  if (dur === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, dur));
}

/**
 * Build a daily pacer.
 *
 * @param {object} args
 * @param {'realtime'|'fast'} args.mode
 * @param {number}            args.scale       0..N multiplier
 * @param {() => number}      [args.rng]       seedable RNG; defaults to Math.random
 * @param {(line: string) => void} [args.log]
 * @returns {DailyPacer}
 */
export function makeDailyPacer({ mode, scale, rng, log, inSessionPacingEnabled = false } = {}) {
  const resolvedMode = mode === "fast" ? "fast" : "realtime";
  const bands = resolvedMode === "fast" ? FAST_BANDS : REALTIME_BANDS;
  const resolvedScale = clampNonNegative(
    scale == null ? (resolvedMode === "fast" ? 0 : 1) : scale
  );
  const rngFn = typeof rng === "function" ? rng : Math.random;

  function pickWithScale({ band, hardFloor = 0 }) {
    const sample = uniformInRange(rngFn, band.min, band.max);
    const scaled = Math.round(sample * resolvedScale);
    return Math.max(scaled, clampNonNegative(hardFloor));
  }

  const inSessionPacing = !!inSessionPacingEnabled;

  return {
    mode: resolvedMode,
    scale: resolvedScale,
    bands,
    inSessionPacingEnabled: inSessionPacing,

    /** Sleep for `ms` (after clamping). */
    async sleep(ms) {
      return sleep(ms);
    },

    /**
     * Between two adjacent sessions for the same student. In fast mode
     * (scale 0) returns 0; in realtime, samples from REALTIME_BANDS.
     */
    async pauseBetweenSessions() {
      let ms = pickWithScale({ band: bands.betweenSessionsMs });
      if (inSessionPacing) {
        ms = Math.min(ms, 2 * 60_000);
      }
      log?.(`pacer: between-session pause = ${ms} ms`);
      return sleep(ms);
    },

    /**
     * Gap before the next student's fresh context opens. Always
     * non-zero (Vercel politeness floor of ~2 s in fast mode, sampled
     * from [30s, 3min] in realtime, scaled).
     */
    async pauseBetweenStudents() {
      const ms = pickWithScale({
        band: bands.betweenStudentsMs,
        hardFloor:
          resolvedMode === "fast" ? BETWEEN_STUDENTS_FAST_FLOOR_MS : 0,
      });
      log?.(`pacer: between-students pause = ${ms} ms`);
      return sleep(ms);
    },

    /**
     * Between-question think time. D2.5 uses this from inside subject
     * drivers; D2.3 fast mode never invokes it (driver pacing is
     * sufficient for fast smoke runs).
     */
    async pauseBetweenQuestions() {
      const ms = pickWithScale({
        band: bands.betweenQuestionsMs,
        hardFloor: bands.perQuestionFloorMs,
      });
      return sleep(ms);
    },

    /**
     * Serial estimate (legacy) — sums student gaps as if students ran one
     * after another. Do NOT use for parallel orchestrator wall-clock.
     */
    estimateDayBudgetMs({ studentCount, totalSessionCount }) {
      const meanQuestion =
        (bands.betweenQuestionsMs.min + bands.betweenQuestionsMs.max) / 2;
      const meanSessionGap =
        (bands.betweenSessionsMs.min + bands.betweenSessionsMs.max) / 2;
      const meanStudentGap =
        (bands.betweenStudentsMs.min + bands.betweenStudentsMs.max) / 2;
      // Per-session inner work: ~10 questions * meanQuestion think time
      // (a coarse approximation; the actual driver also has UI nav time).
      const perSessionInnerMs = 10 * meanQuestion;
      const total =
        studentCount * meanStudentGap +
        Math.max(0, totalSessionCount - studentCount) * meanSessionGap +
        totalSessionCount * perSessionInnerMs;
      return Math.round(total * resolvedScale);
    },

    /**
     * Parallel day estimate: max(student planned in-session minutes) +
     * per-student session gaps + fixed orchestration overhead.
     * Matches Promise.all worker model in phase-d2-orchestrator.
     */
    estimateParallelDayBudgetMs({
      maxStudentPlannedMinutes = 0,
      maxStudentSessionCount = 1,
      inSessionPacingEnabled: pacingEnabled = inSessionPacing,
    }) {
      const inSessionMs = clampNonNegative(maxStudentPlannedMinutes) * 60_000;
      const sessionGapBand = pacingEnabled
        ? { min: 30_000, max: 2 * 60_000 }
        : bands.betweenSessionsMs;
      const meanSessionGap =
        (sessionGapBand.min + sessionGapBand.max) / 2;
      const sessionGapsMs =
        Math.max(0, maxStudentSessionCount - 1) *
        meanSessionGap *
        resolvedScale;
      const orchestrationOverheadMs = pacingEnabled ? 8 * 60_000 : 8 * 60_000;
      return Math.round(inSessionMs + sessionGapsMs + orchestrationOverheadMs);
    },
  };
}

/**
 * @typedef {object} DailyPacer
 * @property {'realtime'|'fast'} mode
 * @property {number} scale
 * @property {object} bands
 * @property {(ms: number) => Promise<void>} sleep
 * @property {() => Promise<void>} pauseBetweenSessions
 * @property {() => Promise<void>} pauseBetweenStudents
 * @property {() => Promise<void>} pauseBetweenQuestions
 * @property {(args: {studentCount: number, totalSessionCount: number}) => number} estimateDayBudgetMs
 */
