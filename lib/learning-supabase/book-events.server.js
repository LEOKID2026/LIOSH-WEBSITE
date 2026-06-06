import {
  applyPageCreditCap,
  applySessionCreditCap,
  clampNonNegativeMs,
  computeVisibleDwellMs,
  isLearningBookTrackingEnabledServer,
  isPageRead,
} from "../learning/book-dwell-policy.js";

const BOOK_SUBJECTS = new Set([
  "math",
  "geometry",
  "science",
  "hebrew",
  "english",
  "moledet",
  "geography",
]);
const BOOK_GRADES = new Set(["g1", "g2", "g3", "g4", "g5", "g6"]);

export function isBookTrackingTablesMissingError(error) {
  const code = error?.code;
  const message = String(error?.message || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /book_reading_sessions|book_page_visits|relation.*does not exist/i.test(message)
  );
}

function normalizeSubject(raw) {
  const v = String(raw || "").trim().toLowerCase();
  return BOOK_SUBJECTS.has(v) ? v : null;
}

function normalizeGrade(raw) {
  const v = String(raw || "").trim().toLowerCase();
  return BOOK_GRADES.has(v) ? v : null;
}

function normalizeToken(raw, maxLen = 120) {
  const v = String(raw || "").trim();
  if (!v || v.length > maxLen) return null;
  return v;
}

function normalizeIntArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function normalizeBool(raw) {
  return raw === true;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} sessionId
 */
async function assertSessionOwnership(supabase, studentId, sessionId) {
  const { data, error } = await supabase
    .from("book_reading_sessions")
    .select("id,student_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.student_id !== studentId) {
    return { ok: false, reason: "forbidden_session" };
  }
  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} visitId
 */
async function assertVisitOwnership(supabase, studentId, visitId) {
  const { data, error } = await supabase
    .from("book_page_visits")
    .select("id,student_id,book_reading_session_id")
    .eq("id", visitId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.student_id !== studentId) {
    return { ok: false, reason: "forbidden_visit" };
  }
  return { ok: true, visit: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>} event
 */
export async function handleBookEvent(supabase, studentId, event) {
  if (!isLearningBookTrackingEnabledServer()) {
    return { ok: false, error: "book_tracking_disabled", status: 503 };
  }

  const type = String(event?.event || "").trim();
  if (!type) return { ok: false, error: "missing_event", status: 400 };

  try {
    if (type === "book_reading_session_start") {
      return handleSessionStart(supabase, studentId, event);
    }
    if (type === "book_page_visit_start") {
      return handlePageVisitStart(supabase, studentId, event);
    }
    if (type === "book_page_visit_end") {
      return handlePageVisitEnd(supabase, studentId, event);
    }
    if (type === "book_reading_session_end") {
      return handleSessionEnd(supabase, studentId, event);
    }
    return { ok: false, error: "unknown_event", status: 400 };
  } catch (error) {
    if (isBookTrackingTablesMissingError(error)) {
      return { ok: false, error: "book_tables_not_ready", status: 503 };
    }
    throw error;
  }
}

async function handleSessionStart(supabase, studentId, event) {
  const subject = normalizeSubject(event.subject);
  const grade = normalizeGrade(event.grade);
  const clientSessionToken = normalizeToken(event.clientSessionToken, 80);
  if (!subject || !grade || !clientSessionToken) {
    return { ok: false, error: "invalid_session_start", status: 400 };
  }

  const existing = await supabase
    .from("book_reading_sessions")
    .select("id")
    .eq("student_id", studentId)
    .eq("client_session_token", clientSessionToken)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) {
    return { ok: true, bookReadingSessionId: existing.data.id, idempotent: true };
  }

  const metadata = {};
  if (event.entryPageId) metadata.entryPageId = String(event.entryPageId).slice(0, 120);
  if (event.returnFrom) metadata.returnFrom = String(event.returnFrom).slice(0, 40);

  const insert = await supabase
    .from("book_reading_sessions")
    .insert({
      student_id: studentId,
      subject,
      grade,
      client_session_token: clientSessionToken,
      metadata,
    })
    .select("id")
    .limit(1)
    .maybeSingle();
  if (insert.error) throw insert.error;
  return { ok: true, bookReadingSessionId: insert.data?.id || null };
}

async function handlePageVisitStart(supabase, studentId, event) {
  const bookReadingSessionId = normalizeToken(event.bookReadingSessionId, 64);
  const clientVisitToken = normalizeToken(event.clientVisitToken, 80);
  const pageId = normalizeToken(event.pageId, 120);
  const subject = normalizeSubject(event.subject);
  const grade = normalizeGrade(event.grade);
  if (!bookReadingSessionId || !clientVisitToken || !pageId || !subject || !grade) {
    return { ok: false, error: "invalid_page_visit_start", status: 400 };
  }

  const owned = await assertSessionOwnership(supabase, studentId, bookReadingSessionId);
  if (!owned.ok) return { ok: false, error: owned.reason, status: 403 };

  const existing = await supabase
    .from("book_page_visits")
    .select("id")
    .eq("book_reading_session_id", bookReadingSessionId)
    .eq("client_visit_token", clientVisitToken)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) {
    return { ok: true, bookPageVisitId: existing.data.id, idempotent: true };
  }

  const insert = await supabase
    .from("book_page_visits")
    .insert({
      book_reading_session_id: bookReadingSessionId,
      student_id: studentId,
      subject,
      grade,
      page_id: pageId,
      batch_id: event.batchId ? String(event.batchId).slice(0, 40) : null,
      sequence_index:
        event.sequenceIndex != null && Number.isFinite(Number(event.sequenceIndex))
          ? Math.floor(Number(event.sequenceIndex))
          : null,
      client_visit_token: clientVisitToken,
      metadata: event.referrerPageId
        ? { referrerPageId: String(event.referrerPageId).slice(0, 120) }
        : {},
    })
    .select("id")
    .limit(1)
    .maybeSingle();
  if (insert.error) throw insert.error;
  return { ok: true, bookPageVisitId: insert.data?.id || null };
}

async function handlePageVisitEnd(supabase, studentId, event) {
  const bookPageVisitId = normalizeToken(event.bookPageVisitId, 64);
  if (!bookPageVisitId) return { ok: false, error: "invalid_page_visit_end", status: 400 };

  const owned = await assertVisitOwnership(supabase, studentId, bookPageVisitId);
  if (!owned.ok) return { ok: false, error: owned.reason, status: 403 };

  const rawDwellMs = clampNonNegativeMs(event.rawDwellMs);
  const hiddenTabMs = clampNonNegativeMs(event.hiddenTabMs);
  const visibleDwellMs = computeVisibleDwellMs(rawDwellMs, hiddenTabMs);
  const creditedDwellMs = applyPageCreditCap(visibleDwellMs);
  const pageRead = isPageRead(visibleDwellMs);
  const sectionsViewed = normalizeIntArray(event.sectionsViewed);
  const sectionsSkipped = normalizeIntArray(event.sectionsSkipped);
  const triggeredCta = normalizeBool(event.triggeredCta);

  const update = await supabase
    .from("book_page_visits")
    .update({
      ended_at: new Date().toISOString(),
      raw_dwell_ms: rawDwellMs,
      credited_dwell_ms: creditedDwellMs,
      hidden_tab_ms: hiddenTabMs,
      sections_viewed: sectionsViewed,
      sections_skipped: sectionsSkipped,
      page_read: pageRead,
      triggered_cta: triggeredCta,
    })
    .eq("id", bookPageVisitId)
    .select("id,book_reading_session_id,credited_dwell_ms,page_read,triggered_cta")
    .limit(1)
    .maybeSingle();
  if (update.error) throw update.error;

  return { ok: true, bookPageVisitId, pageRead, creditedDwellMs };
}

async function handleSessionEnd(supabase, studentId, event) {
  const bookReadingSessionId = normalizeToken(event.bookReadingSessionId, 64);
  if (!bookReadingSessionId) return { ok: false, error: "invalid_session_end", status: 400 };

  const owned = await assertSessionOwnership(supabase, studentId, bookReadingSessionId);
  if (!owned.ok) return { ok: false, error: owned.reason, status: 403 };

  const totalRawDwellMs = clampNonNegativeMs(event.totalRawDwellMs);
  const totalHiddenTabMs = clampNonNegativeMs(event.totalHiddenTabMs);
  const visibleTotal = computeVisibleDwellMs(totalRawDwellMs, totalHiddenTabMs);
  const totalCreditedDwellMs = applySessionCreditCap(
    clampNonNegativeMs(event.totalCreditedDwellMs) || applyPageCreditCap(visibleTotal)
  );

  const pagesReadCount = Math.max(0, Math.floor(Number(event.pagesReadCount) || 0));
  const pagesSkippedCount = Math.max(0, Math.floor(Number(event.pagesSkippedCount) || 0));

  const update = await supabase
    .from("book_reading_sessions")
    .update({
      ended_at: new Date().toISOString(),
      total_raw_dwell_ms: totalRawDwellMs,
      total_credited_dwell_ms: totalCreditedDwellMs,
      total_hidden_tab_ms: totalHiddenTabMs,
      pages_read_count: pagesReadCount,
      pages_skipped_count: pagesSkippedCount,
      triggered_cta: normalizeBool(event.triggeredCta),
      cta_page_id: event.ctaPageId ? String(event.ctaPageId).slice(0, 120) : null,
    })
    .eq("id", bookReadingSessionId)
    .select("id")
    .limit(1)
    .maybeSingle();
  if (update.error) throw update.error;

  return { ok: true, bookReadingSessionId };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {Record<string, unknown>|{ events: Record<string, unknown>[] }} body
 */
export async function processBookEventsRequest(supabase, studentId, body) {
  const events = Array.isArray(body?.events) ? body.events : [body];
  /** @type {Record<string, unknown>[]} */
  const results = [];
  for (const event of events) {
    if (!event || typeof event !== "object") {
      results.push({ ok: false, error: "invalid_event" });
      continue;
    }
    const result = await handleBookEvent(supabase, studentId, event);
    results.push(result);
    if (result.ok === false && result.status && result.status >= 400 && result.status !== 503) {
      return { ok: false, error: result.error, status: result.status, results };
    }
  }
  const last = results[results.length - 1] || { ok: true };
  return { ok: true, results, ...last };
}
