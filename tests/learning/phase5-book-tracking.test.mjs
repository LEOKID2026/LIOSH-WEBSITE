/**
 * Phase 5 — Learning book full tracking
 * Run: node --test tests/learning/phase5-book-tracking.test.mjs
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  VIEW_THRESHOLD_MS,
  PAGE_READ_THRESHOLD_MS,
  PAGE_CREDIT_CAP_MS,
  SESSION_CREDIT_CAP_MS,
  isSectionViewed,
  isPageRead,
  applyPageCreditCap,
  applySessionCreditCap,
  computeVisibleDwellMs,
  computePageCreditedDwellMs,
  isLearningBookTrackingEnabledServer,
} from "../../lib/learning/book-dwell-policy.js";

import {
  saveLastBookContext,
  consumeLastBookContext,
  LAST_BOOK_CONTEXT_KEY,
} from "../../lib/learning-book/book-context-after-reading.js";

import {
  buildBookContextClientMetaExtras,
  resolveContextAfterBookReadingForAnswer,
} from "../../lib/learning-book/book-context-master-helper.js";

import {
  isLearningBookTrackingEnabledClient,
  createBookReadingTracker,
} from "../../lib/learning-book/book-reading-tracker.js";

import {
  aggregateReportPayloadFromActivityRows,
  accumulateBookReadingActivity,
  countPostBookPracticeFromAnswers,
  createEmptyLearningActivity,
  mergeLearningActivityBookData,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

import { classifyActivityEvidence } from "../../lib/learning/activity-classification.js";

import { handleBookEvent, processBookEventsRequest } from "../../lib/learning-supabase/book-events.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FROM_DATE = new Date("2026-01-01T00:00:00.000Z");
const TO_DATE = new Date("2026-01-31T00:00:00.000Z");
const FETCH_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

function makeStudent(id = "stu-book-001") {
  return { id, full_name: "Book Student", grade_level: "g3", is_active: true };
}

function makeSession(id, subject, topic = "algebra", mode = "practice") {
  return {
    id,
    student_id: "stu-book-001",
    subject,
    topic,
    started_at: "2026-01-10T10:00:00Z",
    ended_at: "2026-01-10T10:30:00Z",
    duration_seconds: 300,
    status: "completed",
    metadata: { mode },
  };
}

function makeClassifiedAnswer(sessionId, subject, topic, isCorrect, isDiagnosticEligible, evidenceCategory, extra = {}) {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    student_id: "stu-book-001",
    learning_session_id: sessionId,
    question_id: "q-1",
    is_correct: isCorrect,
    answered_at: "2026-01-10T10:05:00Z",
    answer_payload: {
      subject,
      topic,
      gameMode: "practice",
      isDiagnosticEligible,
      evidenceCategory,
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
      ...extra,
    },
  };
}

// ── dwell policy ─────────────────────────────────────────────────────────────

describe("Phase 5 - dwell policy thresholds", () => {
  test("approved threshold constants", () => {
    // Policy update: no per-page 10-cap and no per-visit/session cap — only an overall
    // 3h sanity ceiling remains (see lib/learning/book-dwell-policy.js header comment).
    assert.equal(VIEW_THRESHOLD_MS, 2_000);
    assert.equal(PAGE_READ_THRESHOLD_MS, 10_000);
    assert.equal(PAGE_CREDIT_CAP_MS, null);
    assert.equal(SESSION_CREDIT_CAP_MS, 10_800_000);
  });

  test("section viewed at 2s, not at 1999ms", () => {
    assert.equal(isSectionViewed(1_999), false);
    assert.equal(isSectionViewed(2_000), true);
  });

  test("page read at 10s credited visible dwell", () => {
    assert.equal(isPageRead(9_999), false);
    assert.equal(isPageRead(10_000), true);
  });

  test("raw dwell fully credited (no page 10-cap); only the 3h sanity ceiling clamps", () => {
    const raw = 900_000; // 15 minutes - well under the 3h sanity ceiling
    const hidden = 0;
    const credited = computePageCreditedDwellMs(raw, hidden);
    assert.equal(credited, raw, "no per-page cap - full dwell credited");

    const rawOverSanityCeiling = 12_000_000; // over 3h
    const creditedOverSanityCeiling = computePageCreditedDwellMs(rawOverSanityCeiling, 0);
    assert.equal(creditedOverSanityCeiling, SESSION_CREDIT_CAP_MS, "3h sanity ceiling still applies");
  });

  test("session credit cap applies only above the 3h sanity ceiling", () => {
    assert.equal(applySessionCreditCap(4_000_000), 4_000_000, "under 3h ceiling - unchanged");
    assert.equal(applySessionCreditCap(12_000_000), SESSION_CREDIT_CAP_MS, "over 3h ceiling - clamped");
    assert.equal(applyPageCreditCap(700_000), 700_000, "no per-page 10-cap");
  });

  test("visible dwell subtracts hidden tab time", () => {
    assert.equal(computeVisibleDwellMs(30_000, 5_000), 25_000);
  });
});

// ── feature flags ────────────────────────────────────────────────────────────

describe("Phase 5 - feature flags", () => {
  const prevPublic = process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED;
  const prevServer = process.env.LEARNING_BOOK_TRACKING_ENABLED;

  after(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED;
    else process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED = prevPublic;
    if (prevServer === undefined) delete process.env.LEARNING_BOOK_TRACKING_ENABLED;
    else process.env.LEARNING_BOOK_TRACKING_ENABLED = prevServer;
  });

  test("client tracker no-op when NEXT_PUBLIC flag is false", () => {
    process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED = "false";
    const tracker = createBookReadingTracker({ subject: "math", grade: "g1", pageId: "p1" });
    assert.doesNotThrow(() => tracker.onPageEnter("p1"));
    assert.doesNotThrow(() => tracker.onCtaClick());
  });

  test("server disabled when LEARNING_BOOK_TRACKING_ENABLED is false", async () => {
    process.env.LEARNING_BOOK_TRACKING_ENABLED = "false";
    const result = await handleBookEvent({}, "stu-1", { event: "book_reading_session_start" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "book_tracking_disabled");
  });

  test("flags enabled by default when unset", () => {
    delete process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED;
    delete process.env.LEARNING_BOOK_TRACKING_ENABLED;
    assert.equal(isLearningBookTrackingEnabledClient(), true);
    assert.equal(isLearningBookTrackingEnabledServer(), true);
  });
});

// ── book context ─────────────────────────────────────────────────────────────

describe("Phase 5 - book context sessionStorage", () => {
  const storage = new Map();

  before(() => {
    global.sessionStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    };
  });

  after(() => {
    storage.clear();
    delete global.sessionStorage;
  });

  test("consume deletes key and respects TTL", () => {
    saveLastBookContext({ subject: "math", grade: "g3", pageId: "add-1" });
    const ctx = consumeLastBookContext({ subject: "math", grade: "g3" });
    assert.ok(ctx?.pageId);
    assert.equal(storage.has(LAST_BOOK_CONTEXT_KEY), false);
    const second = consumeLastBookContext({ subject: "math", grade: "g3" });
    assert.equal(second, null);
  });

  test("expired context ignored", () => {
    storage.set(
      LAST_BOOK_CONTEXT_KEY,
      JSON.stringify({
        subject: "math",
        grade: "g3",
        pageId: "old",
        expiresAt: Date.now() - 1,
      })
    );
    assert.equal(consumeLastBookContext({ subject: "math", grade: "g3" }), null);
  });

  test("first practice answer only gets contextAfterBookReading", () => {
    const bookContextRef = { current: { pageId: "p1" } };
    const bookContextConsumedRef = { current: false };
    const refs = { bookContextRef, bookContextConsumedRef };

    assert.equal(resolveContextAfterBookReadingForAnswer("learning", refs), false);
    assert.equal(resolveContextAfterBookReadingForAnswer("practice", refs), true);
    const meta = buildBookContextClientMetaExtras("practice", refs);
    assert.equal(meta.contextAfterBookReading, true);
    assert.equal(bookContextConsumedRef.current, true);
    assert.deepEqual(buildBookContextClientMetaExtras("practice", refs), {});
  });
});

// ── CTA mode ─────────────────────────────────────────────────────────────────

describe("Phase 5 - CTA presets stay mode=learning", () => {
  const resolveFiles = [
    "lib/learning-book/resolve-math-g1-practice-target.js",
    "lib/learning-book/resolve-math-g2-practice-target.js",
    "lib/learning-book/resolve-math-g3-practice-target.js",
    "lib/learning-book/resolve-math-g4-practice-target.js",
    "lib/learning-book/resolve-math-g5-practice-target.js",
    "lib/learning-book/resolve-math-g6-practice-target.js",
    "lib/learning-book/geometry-book-practice-map.js",
    "lib/learning-book/science-book-practice-map.js",
    "lib/learning-book/hebrew-book-practice-map.js",
    "lib/learning-book/english-book-practice-map.js",
    "lib/learning-book/moledet-geography-book-practice-map.js",
  ];

  test("all resolve*PracticeTarget sources use mode learning", () => {
    for (const rel of resolveFiles) {
      const src = readFileSync(join(__dirname, "../..", rel), "utf8");
      assert.match(src, /mode:\s*["']learning["']/, `${rel} must keep CTA mode learning`);
      assert.doesNotMatch(src, /mode:\s*["']practice["']/, `${rel} must not use practice CTA mode`);
    }
  });
});

// ── aggregator ───────────────────────────────────────────────────────────────

describe("Phase 5 - aggregator learningActivity only", () => {
  test("book visits populate learningActivity fields", () => {
    const la = createEmptyLearningActivity();
    accumulateBookReadingActivity(
      la,
      [
        { subject: "math", credited_dwell_ms: 120_000, page_read: true },
        { subject: "math", credited_dwell_ms: 60_000, page_read: false },
        { subject: "moledet", credited_dwell_ms: 30_000, page_read: true },
      ],
      [{ id: "sess-1" }, { id: "sess-2" }]
    );
    assert.equal(la.bookReadingMinutes, 3.5);
    assert.equal(la.bookPagesRead, 2);
    assert.equal(la.bookSessionCount, 2);
    assert.equal(la.bookReadingBySubject.math, 3);
    assert.equal(la.bookReadingBySubject.moledet_geography, 0.5);
  });

  test("book data does not change diagnostic buckets", () => {
    const session = makeSession("sess-diag", "math", "algebra", "practice");
    const answer = makeClassifiedAnswer(
      "sess-diag",
      "math",
      "algebra",
      true,
      true,
      "diagnostic_independent"
    );
    const base = aggregateReportPayloadFromActivityRows(
      makeStudent(),
      [session],
      [answer],
      FROM_DATE,
      TO_DATE,
      FETCH_META
    );
    const diagBefore = {
      answers: base.summary.diagnosticAnswers,
      correct: base.summary.diagnosticCorrect,
      accuracy: base.summary.diagnosticAccuracy,
    };

    const merged = mergeLearningActivityBookData(
      base,
      [{ subject: "math", credited_dwell_ms: 600_000, page_read: true, raw_dwell_ms: 900_000 }],
      [{ id: "book-sess-1" }],
      []
    );

    assert.equal(merged.summary.diagnosticAnswers, diagBefore.answers);
    assert.equal(merged.summary.diagnosticCorrect, diagBefore.correct);
    assert.equal(merged.summary.diagnosticAccuracy, diagBefore.accuracy);
    assert.ok(merged.learningActivity.bookReadingMinutes > 0);
    assert.equal(merged.learningActivity.bookPagesRead, 1);
  });

  test("postBookPracticeCount from answer contextFlags only", () => {
    const answers = [
      {
        answer_payload: {
          contextFlags: { contextAfterBookReading: true },
        },
      },
      {
        answer_payload: {
          contextFlags: { contextAfterBookReading: false },
        },
      },
    ];
    assert.equal(countPostBookPracticeFromAnswers(answers), 1);
  });

  test("book rows rejected from answer aggregation guard", () => {
    const la = createEmptyLearningActivity();
    assert.throws(
      () => accumulateBookReadingActivity(la, [{ source: "book_page_visits" }]),
      /book rows must not enter answer aggregation/
    );
  });

  test("strip removes internal book fields from learningActivity", () => {
    const payload = {
      learningActivity: {
        bookReadingMinutes: 5,
        hiddenTabMs: 1000,
        sectionsSkipped: [1],
        clientSessionToken: "tok",
        clientVisitToken: "vtok",
        _bookReadingInternal: { raw: true },
      },
      summary: { diagnosticAccuracy: 80, accuracy: 90 },
      meta: { _rawActivityAccuracy: 90 },
    };
    const stripped = stripInternalReportPayloadFields(payload);
    assert.equal(stripped.learningActivity.bookReadingMinutes, 5);
    assert.equal(stripped.learningActivity.hiddenTabMs, undefined);
    assert.equal(stripped.learningActivity.clientSessionToken, undefined);
    assert.equal(stripped.learningActivity._bookReadingInternal, undefined);
    assert.equal(stripped.meta._rawActivityAccuracy, undefined);
  });
});

// ── classification regression ────────────────────────────────────────────────

describe("Phase 5 - classification combos", () => {
  test("mode=learning after CTA is not diagnostic even with context flag", () => {
    const r = classifyActivityEvidence("learning", "free_practice", { contextAfterBookReading: true });
    assert.equal(r.isDiagnosticEligible, false);
  });

  test("mode=practice + contextAfterBookReading remains diagnostic eligible", () => {
    const r = classifyActivityEvidence("practice", "free_practice", { contextAfterBookReading: true });
    assert.equal(r.isDiagnosticEligible, true);
    assert.equal(r.contextFlags.contextAfterBookReading, true);
  });
});

// ── API handler (mock supabase) ──────────────────────────────────────────────

describe("Phase 5 - book-events server", () => {
  test("unknown event returns 400", async () => {
    const result = await handleBookEvent({}, "stu-1", { event: "nope" });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  });

  test("session start validates subject and grade", async () => {
    const result = await handleBookEvent({}, "stu-1", {
      event: "book_reading_session_start",
      clientSessionToken: "tok1",
      subject: "bad",
      grade: "g1",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "invalid_session_start");
  });

  test("batch processing returns aggregated ok", async () => {
    const calls = [];
    const supabase = {
      from(table) {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          insert() {
            calls.push(`insert:${table}`);
            return {
              select() {
                return this;
              },
              limit() {
                return this;
              },
              maybeSingle: async () => ({
                data: { id: table === "book_reading_sessions" ? "sess-uuid" : "visit-uuid" },
                error: null,
              }),
            };
          },
          update() {
            return {
              eq() {
                return this;
              },
              select() {
                return this;
              },
              limit() {
                return this;
              },
              maybeSingle: async () => ({ data: { id: "visit-uuid" }, error: null }),
            };
          },
        };
      },
    };

    const batch = await processBookEventsRequest(supabase, "stu-1", {
      events: [
        {
          event: "book_reading_session_start",
          clientSessionToken: "tok-batch",
          subject: "math",
          grade: "g3",
        },
      ],
    });
    assert.equal(batch.ok, true);
    assert.ok(calls.includes("insert:book_reading_sessions"));
  });
});

// ── coins boundary regression ────────────────────────────────────────────────

describe("Phase 5 - monthly persistence unchanged", () => {
  test("monthly-persistence-reward delegates to the unified learning-credit aggregate (now includes books, by design)", () => {
    const path = join(__dirname, "../../lib/learning-supabase/monthly-persistence-reward.server.js");
    const src = readFileSync(path, "utf8");
    // Policy update: monthly persistence now shares the single source of truth used by
    // parent reports (sumStudentLearningCreditedMinutesInIsraelMonth), which itself already
    // includes book reading time. This file no longer queries learning_sessions directly.
    assert.match(src, /sumStudentLearningCreditedMinutesInIsraelMonth/);
  });
});
