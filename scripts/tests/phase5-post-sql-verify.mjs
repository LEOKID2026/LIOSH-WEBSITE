#!/usr/bin/env node
/**
 * Phase 5 post-SQL verification (owner-applied migration 056).
 * Run: node --env-file=.env.local scripts/tests/phase5-post-sql-verify.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { processBookEventsRequest } from "../../lib/learning-supabase/book-events.server.js";
import {
  aggregateParentReportPayload,
  mergeLearningActivityBookData,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("FAIL: missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  // 1. Tables exist
  const sessProbe = await supabase.from("book_reading_sessions").select("id").limit(1);
  if (sessProbe.error) {
    fail("book_reading_sessions table", sessProbe.error.message);
  } else {
    pass("book_reading_sessions table exists");
  }

  const visitProbe = await supabase.from("book_page_visits").select("id").limit(1);
  if (visitProbe.error) {
    fail("book_page_visits table", visitProbe.error.message);
  } else {
    pass("book_page_visits table exists");
  }

  const { data: students, error: stuErr } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active")
    .eq("is_active", true)
    .limit(1);
  if (stuErr || !students?.[0]?.id) {
    fail("active student for flow test", stuErr?.message || "no student");
    printSummary();
    process.exit(1);
  }
  const student = students[0];

  const clientSessionToken = `postsql_verify_${Date.now()}`;
  const clientVisitToken = `postsql_visit_${Date.now()}`;
  const pageId = "add_two";

  // 2 + 3. Book-events flow (server path — same handler as POST /api/learning/book-events)
  const sessionStart = await processBookEventsRequest(supabase, student.id, {
    event: "book_reading_session_start",
    clientSessionToken,
    subject: "math",
    grade: "g3",
    entryPageId: pageId,
  });
  if (!sessionStart.ok || sessionStart.error === "book_tables_not_ready") {
    fail("book-events session_start", sessionStart.error || "not ok");
  } else {
    pass("book-events session_start", `not book_tables_not_ready; session=${sessionStart.bookReadingSessionId || "idempotent"}`);
  }

  const bookReadingSessionId = sessionStart.bookReadingSessionId;
  if (!bookReadingSessionId) {
    fail("book_reading_session_id returned");
    printSummary();
    process.exit(1);
  }

  const visitStart = await processBookEventsRequest(supabase, student.id, {
    event: "book_page_visit_start",
    bookReadingSessionId,
    clientVisitToken,
    pageId,
    subject: "math",
    grade: "g3",
    sequenceIndex: 0,
  });
  if (!visitStart.ok || visitStart.error === "book_tables_not_ready") {
    fail("book-events page_visit_start", visitStart.error || "not ok");
  } else {
    pass("book-events page_visit_start", `visit=${visitStart.bookPageVisitId || "idempotent"}`);
  }

  const bookPageVisitId = visitStart.bookPageVisitId;
  if (!bookPageVisitId) {
    fail("book_page_visit_id returned");
    printSummary();
    process.exit(1);
  }

  const rawDwellMs = 12_000;
  const visitEnd = await processBookEventsRequest(supabase, student.id, {
    event: "book_page_visit_end",
    bookPageVisitId,
    rawDwellMs,
    hiddenTabMs: 0,
    sectionsViewed: [1, 2, 3, 4, 5, 6, 7],
    sectionsSkipped: [],
    triggeredCta: false,
  });
  if (!visitEnd.ok || visitEnd.error === "book_tables_not_ready") {
    fail("book-events page_visit_end", visitEnd.error || "not ok");
  } else {
    pass("book-events page_visit_end", `pageRead=${visitEnd.pageRead}, credited=${visitEnd.creditedDwellMs}ms`);
    assert.equal(visitEnd.pageRead, true, "12s dwell should mark page_read=true");
  }

  const sessionEnd = await processBookEventsRequest(supabase, student.id, {
    event: "book_reading_session_end",
    bookReadingSessionId,
    totalRawDwellMs: rawDwellMs,
    totalCreditedDwellMs: visitEnd.creditedDwellMs,
    totalHiddenTabMs: 0,
    pagesReadCount: 1,
    pagesSkippedCount: 0,
    triggeredCta: false,
  });
  if (!sessionEnd.ok || sessionEnd.error === "book_tables_not_ready") {
    fail("book-events session_end", sessionEnd.error || "not ok");
  } else {
    pass("book-events session_end");
  }

  const { data: sessionRow } = await supabase
    .from("book_reading_sessions")
    .select("id,student_id,total_raw_dwell_ms,pages_read_count")
    .eq("id", bookReadingSessionId)
    .maybeSingle();
  const { data: visitRow } = await supabase
    .from("book_page_visits")
    .select("id,raw_dwell_ms,credited_dwell_ms,page_read,page_id")
    .eq("id", bookPageVisitId)
    .maybeSingle();

  if (sessionRow?.id && visitRow?.id) {
    pass("DB rows created", `session raw=${sessionRow.total_raw_dwell_ms} visit raw=${visitRow.raw_dwell_ms} page_read=${visitRow.page_read}`);
    assert.equal(visitRow.raw_dwell_ms, rawDwellMs, "raw_dwell_ms preserved in DB");
    assert.equal(visitRow.page_read, true);
  } else {
    fail("DB rows created", "missing session or visit row");
  }

  // 4 + 5. Report payload + diagnostic safety
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 7);

  const beforePayload = await aggregateParentReportPayload(supabase, student, fromDate, toDate);
  const diagBefore = {
    diagnosticAnswers: beforePayload.summary.diagnosticAnswers,
    diagnosticCorrect: beforePayload.summary.diagnosticCorrect,
    diagnosticAccuracy: beforePayload.summary.diagnosticAccuracy,
  };

  if (beforePayload.learningActivity?.bookReadingMinutes > 0) {
    pass("learningActivity.bookReadingMinutes", String(beforePayload.learningActivity.bookReadingMinutes));
  } else {
    fail("learningActivity.bookReadingMinutes", "expected > 0 after insert");
  }

  if (beforePayload.learningActivity?.bookPagesRead >= 1) {
    pass("learningActivity.bookPagesRead", String(beforePayload.learningActivity.bookPagesRead));
  } else {
    fail("learningActivity.bookPagesRead", "expected >= 1");
  }

  const diagAfter = {
    diagnosticAnswers: beforePayload.summary.diagnosticAnswers,
    diagnosticCorrect: beforePayload.summary.diagnosticCorrect,
    diagnosticAccuracy: beforePayload.summary.diagnosticAccuracy,
  };
  if (
    diagBefore.diagnosticAnswers === diagAfter.diagnosticAnswers &&
    diagBefore.diagnosticCorrect === diagAfter.diagnosticCorrect &&
    diagBefore.diagnosticAccuracy === diagAfter.diagnosticAccuracy
  ) {
    pass("diagnostic buckets unchanged by book data");
  } else {
    fail("diagnostic buckets unchanged", JSON.stringify({ before: diagBefore, after: diagAfter }));
  }

  // Book-only merge must not touch diagnostic fields on a synthetic baseline
  const syntheticSession = {
    id: "synth-sess",
    student_id: student.id,
    subject: "math",
    topic: "algebra",
    started_at: `${fromDate.toISOString().slice(0, 10)}T12:00:00Z`,
    ended_at: `${fromDate.toISOString().slice(0, 10)}T12:30:00Z`,
    duration_seconds: 100,
    status: "completed",
    metadata: { mode: "practice" },
  };
  const syntheticAnswer = {
    id: "synth-ans",
    student_id: student.id,
    learning_session_id: "synth-sess",
    question_id: "q1",
    is_correct: true,
    answered_at: `${fromDate.toISOString().slice(0, 10)}T12:05:00Z`,
    answer_payload: {
      subject: "math",
      topic: "algebra",
      gameMode: "practice",
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_independent",
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
    },
  };
  const { aggregateReportPayloadFromActivityRows } = await import(
    "../../lib/parent-server/report-data-aggregate.server.js"
  );
  const base = aggregateReportPayloadFromActivityRows(
    student,
    [syntheticSession],
    [syntheticAnswer],
    fromDate,
    toDate,
    { sessionsFilterField: "started_at", answersFilterField: "answered_at" }
  );
  const topicWeaknessBefore = JSON.stringify(base.subjects?.math?.topics || {});
  const merged = mergeLearningActivityBookData(
    base,
    [{ subject: "math", credited_dwell_ms: 120_000, page_read: true, raw_dwell_ms: 200_000 }],
    [{ id: "brs-verify" }],
    []
  );
  const topicWeaknessAfter = JSON.stringify(merged.subjects?.math?.topics || {});
  if (
    merged.summary.diagnosticAnswers === base.summary.diagnosticAnswers &&
    merged.summary.diagnosticCorrect === base.summary.diagnosticCorrect &&
    merged.summary.diagnosticAccuracy === base.summary.diagnosticAccuracy &&
    topicWeaknessBefore === topicWeaknessAfter
  ) {
    pass("weakness/topic ranking unchanged by book merge");
  } else {
    fail("weakness/topic ranking unchanged");
  }

  const stripped = stripInternalReportPayloadFields({
    learningActivity: {
      bookReadingMinutes: 2,
      hiddenTabMs: 1,
      clientSessionToken: "x",
    },
    summary: { diagnosticAccuracy: 50, accuracy: 60 },
    meta: { _rawActivityAccuracy: 60 },
  });
  if (
    stripped.learningActivity.bookReadingMinutes === 2 &&
    stripped.learningActivity.hiddenTabMs === undefined &&
    stripped.meta._rawActivityAccuracy === undefined
  ) {
    pass("stripInternalReportPayloadFields book internals removed");
  } else {
    fail("stripInternalReportPayloadFields");
  }

  // Cleanup verification rows (optional — keeps DB tidy)
  await supabase.from("book_page_visits").delete().eq("id", bookPageVisitId);
  await supabase.from("book_reading_sessions").delete().eq("id", bookReadingSessionId);
  pass("cleanup verification rows");

  printSummary();
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- ${results.length - failed.length}/${results.length} checks passed ---`);
  if (failed.length) {
    for (const f of failed) console.error(`  ✗ ${f.name}: ${f.detail}`);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
