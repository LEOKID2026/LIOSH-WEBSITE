/**
 * Parent-report activity timestamps — storage stays UTC/ISO; display uses Asia/Jerusalem.
 */

export const PARENT_REPORT_DISPLAY_TIMEZONE = "Asia/Jerusalem";

const LATEST_RANK = Object.freeze({
  "answer.answered_at": 40,
  "answer.created_at": 39,
  "session.ended_at": 30,
  "session.updated_at": 20,
  "session.started_at": 10,
  "session.created_at": 5,
  unknown: 0,
});

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseActivityTimestampMs(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * @param {number|null|undefined} ms
 * @returns {string|null}
 */
export function activityTimestampIsoFromMs(ms) {
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function createEmptyActivityTimestamps() {
  return {
    latestActivityAt: null,
    latestActivityMs: null,
    latestActivitySource: null,
    lastAnswerAt: null,
    lastAnswerMs: null,
    sessionStartedAt: null,
    sessionStartedMs: null,
    sessionFinishedAt: null,
    sessionFinishedMs: null,
  };
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} source
 */
export function mergeActivityTimestamps(target, source) {
  if (!target || !source) return;
  const srcLatest = Number(source.latestActivityMs);
  const tgtLatest = Number(target.latestActivityMs);
  if (Number.isFinite(srcLatest) && (!Number.isFinite(tgtLatest) || srcLatest > tgtLatest)) {
    for (const key of Object.keys(createEmptyActivityTimestamps())) {
      if (source[key] != null && source[key] !== "") target[key] = source[key];
    }
    return;
  }
  if (Number.isFinite(srcLatest) && srcLatest === tgtLatest && source.latestActivitySource) {
    const prevRank = LATEST_RANK[target.latestActivitySource] ?? 0;
    const nextRank = LATEST_RANK[source.latestActivitySource] ?? 0;
    if (nextRank > prevRank) target.latestActivitySource = source.latestActivitySource;
  }
  const srcAns = Number(source.lastAnswerMs);
  const tgtAns = Number(target.lastAnswerMs);
  if (Number.isFinite(srcAns) && (!Number.isFinite(tgtAns) || srcAns > tgtAns)) {
    target.lastAnswerMs = source.lastAnswerMs;
    target.lastAnswerAt = source.lastAnswerAt;
  }
  const srcEnd = Number(source.sessionFinishedMs);
  const tgtEnd = Number(target.sessionFinishedMs);
  if (Number.isFinite(srcEnd) && (!Number.isFinite(tgtEnd) || srcEnd > tgtEnd)) {
    target.sessionFinishedMs = source.sessionFinishedMs;
    target.sessionFinishedAt = source.sessionFinishedAt;
  }
  const srcStart = Number(source.sessionStartedMs);
  const tgtStart = Number(target.sessionStartedMs);
  if (Number.isFinite(srcStart) && (!Number.isFinite(tgtStart) || srcStart > tgtStart)) {
    target.sessionStartedMs = source.sessionStartedMs;
    target.sessionStartedAt = source.sessionStartedAt;
  }
}

/** @param {Record<string, unknown>} obj */
export function pickActivityTimestampFields(obj) {
  const out = createEmptyActivityTimestamps();
  if (!obj || typeof obj !== "object") return out;
  for (const key of Object.keys(out)) {
    if (obj[key] != null && obj[key] !== "") out[key] = obj[key];
  }
  return out;
}

/**
 * @param {Record<string, unknown>} target
 * @param {{ iso?: string|null, ms?: number|null, source?: string|null, kind?: "answer"|"session"|"activity" }} patch
 */
export function bumpActivityTimestamp(target, patch) {
  if (!target || !patch) return;
  const ms =
    Number.isFinite(patch.ms) ? patch.ms : parseActivityTimestampMs(patch.iso);
  if (!Number.isFinite(ms)) return;
  const iso = activityTimestampIsoFromMs(ms);
  const source = String(patch.source || "unknown").trim() || "unknown";
  const kind = patch.kind || (source.includes("answer") ? "answer" : "session");

  if (kind === "answer") {
    const prevAns = Number(target.lastAnswerMs);
    if (!Number.isFinite(prevAns) || ms > prevAns) {
      target.lastAnswerMs = ms;
      target.lastAnswerAt = iso;
    }
  }

  if (kind === "session") {
    if (source.includes("ended")) {
      const prevEnd = Number(target.sessionFinishedMs);
      if (!Number.isFinite(prevEnd) || ms > prevEnd) {
        target.sessionFinishedMs = ms;
        target.sessionFinishedAt = iso;
      }
    }
    if (source.includes("started") || source.includes("created")) {
      const prevStart = Number(target.sessionStartedMs);
      if (!Number.isFinite(prevStart) || ms > prevStart) {
        target.sessionStartedMs = ms;
        target.sessionStartedAt = iso;
      }
    }
  }

  const prevLatest = Number(target.latestActivityMs);
  const prevRank = LATEST_RANK[target.latestActivitySource] ?? 0;
  const nextRank = LATEST_RANK[source] ?? 0;
  if (
    !Number.isFinite(prevLatest) ||
    ms > prevLatest ||
    (ms === prevLatest && nextRank > prevRank)
  ) {
    target.latestActivityMs = ms;
    target.latestActivityAt = iso;
    target.latestActivitySource = source;
  }
}

/**
 * @param {Date} fromDate inclusive calendar date
 * @param {Date} toDate inclusive calendar date
 */
export function reportRangeBoundsMs(fromDate, toDate) {
  const fromMs = fromDate.getTime();
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  return { fromMs, toMsExclusive: toExclusive.getTime() };
}

/**
 * @param {number|null|undefined} ms
 * @param {{ fromMs: number, toMsExclusive: number }} range
 */
export function activityMsInReportRange(ms, range) {
  return (
    Number.isFinite(ms) &&
    Number.isFinite(range?.fromMs) &&
    Number.isFinite(range?.toMsExclusive) &&
    ms >= range.fromMs &&
    ms < range.toMsExclusive
  );
}

/**
 * Keep only in-range timestamps on a bucket before serializing period-scoped report payloads.
 * @param {Record<string, unknown>} target
 * @param {{ fromMs: number, toMsExclusive: number }} range
 */
export function reconcileLatestActivityToReportRange(target, range) {
  if (!target || !range) return;
  /** @type {Array<{ ms: number, source: string }>} */
  const candidates = [];
  const add = (ms, source) => {
    if (activityMsInReportRange(ms, range)) candidates.push({ ms, source });
  };
  add(Number(target.lastAnswerMs), "answer.answered_at");
  add(Number(target.sessionFinishedMs), "session.ended_at");
  add(Number(target.sessionStartedMs), "session.started_at");

  const currentLatest = Number(target.latestActivityMs);
  if (activityMsInReportRange(currentLatest, range)) {
    candidates.push({
      ms: currentLatest,
      source: String(target.latestActivitySource || "unknown"),
    });
  }

  if (!candidates.length) {
    if (Number.isFinite(currentLatest) && !activityMsInReportRange(currentLatest, range)) {
      target.latestActivityMs = null;
      target.latestActivityAt = null;
      target.latestActivitySource = null;
    }
    return;
  }

  candidates.sort(
    (a, b) =>
      b.ms - a.ms ||
      (LATEST_RANK[b.source] ?? 0) - (LATEST_RANK[a.source] ?? 0),
  );
  const best = candidates[0];
  target.latestActivityMs = best.ms;
  target.latestActivityAt = activityTimestampIsoFromMs(best.ms);
  target.latestActivitySource = best.source;
}

function bumpActivityFromLearningSessionWithRange(target, session, range = null) {
  if (!target || !session) return;
  const ended = parseActivityTimestampMs(session.ended_at);
  const updated = parseActivityTimestampMs(session.updated_at);
  const started = parseActivityTimestampMs(session.started_at);
  const created = parseActivityTimestampMs(session.created_at);
  const allow = (ms) => !range || activityMsInReportRange(ms, range);

  if (Number.isFinite(started) && allow(started)) {
    bumpActivityTimestamp(target, {
      ms: started,
      source: "session.started_at",
      kind: "session",
    });
  } else if (Number.isFinite(created) && allow(created)) {
    bumpActivityTimestamp(target, {
      ms: created,
      source: "session.created_at",
      kind: "session",
    });
  }
  if (Number.isFinite(updated) && allow(updated)) {
    bumpActivityTimestamp(target, {
      ms: updated,
      source: "session.updated_at",
      kind: "session",
    });
  }
  if (Number.isFinite(ended) && allow(ended)) {
    bumpActivityTimestamp(target, {
      ms: ended,
      source: "session.ended_at",
      kind: "session",
    });
  }

  const lastAnswerMs = Number(target.lastAnswerMs);
  if (!Number.isFinite(lastAnswerMs)) {
    const sessionOnlyMs = [ended, updated, started, created].find((ms) => allow(ms));
    if (Number.isFinite(sessionOnlyMs)) {
      const source = Number.isFinite(ended) && allow(ended)
        ? "session.ended_at"
        : Number.isFinite(updated) && allow(updated)
        ? "session.updated_at"
        : Number.isFinite(started) && allow(started)
        ? "session.started_at"
        : "session.created_at";
      bumpActivityTimestamp(target, {
        ms: sessionOnlyMs,
        source,
        kind: "activity",
      });
    }
  }
}

/**
 * Session-only activity when no answers exist in range for that bucket.
 * @param {Record<string, unknown>} target
 * @param {{ started_at?: string|null, created_at?: string|null, ended_at?: string|null, updated_at?: string|null }} session
 * @param {{ fromMs: number, toMsExclusive: number }|null} [range]
 */
export function bumpActivityFromLearningSession(target, session, range = null) {
  bumpActivityFromLearningSessionWithRange(target, session, range);
}

/**
 * @param {number|null|undefined} ms
 * @returns {string}
 */
export function formatParentReportActivityIsrael(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "לא זמין";
  const d = new Date(ms);
  const parts = new Intl.DateTimeFormat("he-IL", {
    timeZone: PARENT_REPORT_DISPLAY_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${pick("day")}/${pick("month")}/${pick("year")} ${pick("hour")}:${pick("minute")}`;
}
