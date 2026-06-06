# Phase 5 — Learning Book Full Tracking: Implementation Plan

**Project:** Diagnostic Truth Fix  
**Phase:** 5  
**Date:** 2026-06-06  
**Revision:** 3 (final pre-implementation corrections)  
**Status:** APPROVED — implementation may proceed per scope below  
**Prerequisite:** [`PHASE_5_LEARNING_BOOK_TRACKING_ARCHITECTURE_AUDIT.md`](./PHASE_5_LEARNING_BOOK_TRACKING_ARCHITECTURE_AUDIT.md) (Revision 3)

---

> ⚠️ **Implementation approved with constraints below.**  
> Migration SQL is **prepare-only** (file created, not run by agent).  
> No commit/push/deploy until owner review after implementation report.

---

## 1. Scope Summary

### In Scope

- Persist book reading via `book_reading_sessions` + `book_page_visits` tables
- Client-side dwell tracking in `LearningPageBody` (side-effect only)
- Single API endpoint: `POST /api/learning/book-events`
- Report aggregation: `learningActivity.bookReadingMinutes`, `bookPagesRead`, etc.
- `contextAfterBookReading` wiring (annotation only; CTA stays `mode="learning"`)
- Tests including mandatory diagnostic-exclusion guards

### Out of Scope

- Coins / monthly progress changes (deferred to Phase 9)
- Changing book CTA mode from `"learning"` to `"practice"`
- UI / Hebrew / CSS changes
- Phases 6–10
- Modifying Phase 1–4 logic except additive aggregator branch

### Owner-Approved Thresholds (Final)

| Constant | Value | Meaning |
|----------|-------|---------|
| `VIEW_THRESHOLD_MS` | **2,000** | Section technically **viewed** vs **skipped** only. Does **not** count a page as read. |
| `PAGE_READ_THRESHOLD_MS` | **10,000** | Page counts as **read** (`page_read=true`) only if credited visible dwell ≥ 10 seconds. |
| `PAGE_CREDIT_CAP_MS` | **600,000** | Max **credited** time per page (10 minutes). `raw_dwell_ms` always stored uncapped. |
| `SESSION_CREDIT_CAP_MS` | **3,600,000** | Max **credited** time per book-reading session (60 minutes). `total_raw_dwell_ms` always stored uncapped. |

**Raw dwell rule:** `raw_dwell_ms` / `total_raw_dwell_ms` must always be persisted even when credited time is capped.

### Owner-Approved `contextAfterBookReading` Scope

- Book CTA remains `mode="learning"` — Phase 5 must **not** change CTA to `mode="practice"`.
- `contextAfterBookReading` is **annotation only** — does not make CTA learning diagnostic.
- Applies only to the **first answer** in `mode="practice"` after valid one-time book context consume.
- Must **not** apply to the whole session unless later approved.

---

## 2. Migration — Prepare Only (Owner Runs SQL Manually)

### 2.1 Execution Rule

| Action | Who | Allowed? |
|--------|-----|----------|
| Create migration file `supabase/migrations/056_book_reading_tracking.sql` | Implementation agent | ✅ Yes |
| Run migration against local/staging/production DB | Implementation agent | ❌ **No** — unless owner explicitly instructs |
| Run migration manually | Owner | ✅ Yes — when ready |

**Implementation may proceed** with code that:
- Uses feature flags to disable tracking when tables are absent
- Handles API errors gracefully if tables do not exist yet
- Does not assume DB tables exist until owner confirms manual SQL apply

**File:** `supabase/migrations/056_book_reading_tracking.sql`  
**Status:** Prepare file only — owner applies SQL manually.

```sql
-- Phase 5: Learning book reading tracking
-- student_id uses public.students(id) — NOT auth.users(id)

begin;

create table if not exists public.book_reading_sessions (
  id                       uuid        primary key default gen_random_uuid(),
  student_id               uuid        not null references public.students(id) on delete cascade,
  subject                  text        not null,
  grade                    text        not null,
  started_at               timestamptz not null default now(),
  ended_at                 timestamptz,
  total_raw_dwell_ms       integer     check (total_raw_dwell_ms is null or total_raw_dwell_ms >= 0),
  total_credited_dwell_ms  integer     check (total_credited_dwell_ms is null or total_credited_dwell_ms >= 0),
  total_hidden_tab_ms      integer     not null default 0 check (total_hidden_tab_ms >= 0),
  pages_read_count         integer     not null default 0,
  pages_skipped_count      integer     not null default 0,
  triggered_cta            boolean     not null default false,
  cta_page_id              text,
  client_session_token     text        not null,
  metadata                 jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint book_reading_sessions_student_token_unique unique (student_id, client_session_token)
);

create table if not exists public.book_page_visits (
  id                       uuid        primary key default gen_random_uuid(),
  book_reading_session_id  uuid        not null references public.book_reading_sessions(id) on delete cascade,
  student_id               uuid        not null references public.students(id) on delete cascade,
  subject                  text        not null,
  grade                    text        not null,
  page_id                  text        not null,
  batch_id                 text,
  sequence_index           integer,
  started_at               timestamptz not null default now(),
  ended_at                 timestamptz,
  raw_dwell_ms             integer     check (raw_dwell_ms is null or raw_dwell_ms >= 0),
  credited_dwell_ms        integer     check (credited_dwell_ms is null or credited_dwell_ms >= 0),
  hidden_tab_ms            integer     not null default 0 check (hidden_tab_ms >= 0),
  sections_viewed          integer[]   not null default '{}',
  sections_skipped         integer[]   not null default '{}',
  page_read                boolean     not null default false,
  triggered_cta            boolean     not null default false,
  client_visit_token       text        not null,
  metadata                 jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  constraint book_page_visits_session_token_unique unique (book_reading_session_id, client_visit_token)
);

create index if not exists book_reading_sessions_student_started_idx
  on public.book_reading_sessions (student_id, started_at desc);

create index if not exists book_page_visits_student_started_idx
  on public.book_page_visits (student_id, started_at desc);

create index if not exists book_page_visits_session_idx
  on public.book_page_visits (book_reading_session_id);

create index if not exists book_page_visits_subject_grade_idx
  on public.book_page_visits (subject, grade);

-- RLS: enabled, no authenticated policies (service-role API only)
alter table public.book_reading_sessions enable row level security;
alter table public.book_page_visits enable row level security;

-- updated_at trigger (match existing pattern)
drop trigger if exists trg_book_reading_sessions_set_updated_at on public.book_reading_sessions;
create trigger trg_book_reading_sessions_set_updated_at
before update on public.book_reading_sessions
for each row execute function public.set_updated_at();

commit;
```

---

## 3. API Endpoint

### 3.1 Single Endpoint

**File:** `pages/api/learning/book-events.js` (new)

**Method:** `POST`  
**Auth:** `getAuthenticatedStudentSession(req)` → `auth.studentId` (= `students.id`)  
**Guard:** `guardCookieMutationOrigin(req, res)`

### 3.2 Request Shapes

```js
// Single event
{ event: "book_reading_session_start", clientSessionToken, subject, grade, entryPageId?, returnFrom?, clientTimestamp }

{ event: "book_page_visit_start", bookReadingSessionId, clientVisitToken, pageId, batchId?, sequenceIndex?, referrerPageId? }

{ event: "book_page_visit_end", bookPageVisitId, rawDwellMs, creditedDwellMs, hiddenTabMs, sectionsViewed, sectionsSkipped, pageRead, triggeredCta }

{ event: "book_reading_session_end", bookReadingSessionId, totalRawDwellMs, totalCreditedDwellMs, totalHiddenTabMs, pagesReadCount, pagesSkippedCount, triggeredCta, ctaPageId? }

// Batched
{ events: [ ...event objects... ] }
```

### 3.3 Server Module

**File:** `lib/learning-supabase/book-events.server.js` (new)

Responsibilities:
- Event type dispatcher
- Ownership validation (`bookReadingSessionId` belongs to `auth.studentId`)
- Idempotent INSERT/UPDATE via unique constraints
- Credit cap enforcement (server-side re-validation of client values)
- Returns `{ ok: true, bookReadingSessionId?, bookPageVisitId? }`

### 3.4 sendBeacon Support

Accept `Content-Type: application/json` on same endpoint. Parse body from raw request if needed (Next.js API route).

---

## 4. Client Tracking Helper

### 4.1 New Module

**File:** `lib/learning-book/book-reading-tracker.js` (new, client-safe)

Pure functions + hook factory. No direct DB access.

```js
// Owner-approved constants — shared via lib/learning/book-dwell-policy.js
export const VIEW_THRESHOLD_MS = 2_000;        // section viewed vs skipped ONLY
export const PAGE_READ_THRESHOLD_MS = 10_000;    // page_read=true threshold
export const PAGE_CREDIT_CAP_MS = 600_000;       // 10 min credited max per page
export const SESSION_CREDIT_CAP_MS = 3_600_000;  // 60 min credited max per session

export function isLearningBookTrackingEnabledClient() {
  return process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED !== "false";
}

export function createBookReadingTracker({ subject, grade, pageId, batchId, sequenceIndex }) {
  if (!isLearningBookTrackingEnabledClient()) return createNoOpBookReadingTracker();
  // Returns:
  // - onSectionChange(fromIndex, toIndex, sectionMetrics)
  // - onPageUnmount() → payload for book_page_visit_end
  // - onCtaClick() → marks triggeredCta
  // - getVisibilityTracker() → { hiddenTabMs }
  // - flushBeacon(url) → sendBeacon batch
}
```

### 4.2 SessionStorage Keys

| Key | Purpose | Lifecycle |
|-----|---------|-----------|
| `liosh_book_reading_session_v1` | `{ clientSessionToken, bookReadingSessionId, subject, grade }` | Created on first book entry; cleared on `book_reading_session_end` |
| `liosh_lastBookContext_v1` | `{ subject, grade, pageId, source, timestamp, expiresAt }` | Set on CTA click; consumed once on master mount |

### 4.3 Integration Point

**File:** `components/learning-book/LearningPageBody.js`

Add tracking as **side-effect only** in `useEffect` hooks:
- Do not modify navigation state (`sectionIndex`, `goPrev`, `goNext`)
- On `page.pageId` change: end previous visit, start new visit
- On unmount / `router.events.routeChangeStart`: send `book_page_visit_end` via fetch or beacon
- On CTA click: mark `triggeredCta`, save `liosh_lastBookContext_v1`

### 4.4 Book Context Helper

**File:** `lib/learning-book/book-context-after-reading.js` (new)

```js
export function saveLastBookContext({ subject, grade, pageId, source }) { ... }
export function consumeLastBookContext({ subject, grade }) { ... }  // read + delete, TTL check
```

---

## 5. Master Page Changes (`contextAfterBookReading`)

### 5.1 Files to Modify

| File | Change |
|------|--------|
| `pages/learning/math-master.js` | Import `consumeLastBookContext`; ref latch; set flag on first answer only |
| `pages/learning/geometry-master.js` | Same |
| `pages/learning/science-master.js` | Same |
| `pages/learning/hebrew-master.js` | Same |
| `pages/learning/english-master.js` | Same |
| `pages/learning/moledet-geography-master.js` | Same |

### 5.2 Pattern (Per Master)

```js
const bookContextRef = useRef(null);
const bookContextConsumedRef = useRef(false);

useEffect(() => {
  if (isBookPracticeEntry(router.query)) {
    bookContextRef.current = consumeLastBookContext({ subject: SUBJECT, grade });
  }
}, [router.query, grade]);

// In saveLearningAnswer clientMeta builder:
contextAfterBookReading:
  !bookContextConsumedRef.current &&
  bookContextRef.current != null &&
  mode === "practice",  // annotation for independent practice only
// After first answer with flag set:
bookContextConsumedRef.current = true;
```

**Rules (mandatory):**
- Do NOT change `applyBookPracticePreset` — must keep `mode: "learning"`.
- `contextAfterBookReading` on first `mode="practice"` answer only; latch `bookContextConsumedRef` after that answer.
- CTA learning answers must never receive `contextAfterBookReading` for diagnostic purposes (mode gate + no flag on learning mode).

Also save `liosh_lastBookContext_v1` in `LearningPageBody` `handlePracticeClick` (in addition to existing preset save).

---

## 6. Feature Flags

### 6.1 Flag Names (Exact)

| Flag | Scope | Default |
|------|-------|---------|
| `NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED` | Client — tracker emission | Enabled unless explicitly `"false"` |
| `LEARNING_BOOK_TRACKING_ENABLED` | Server — API + aggregator branch | Enabled unless explicitly `"false"` |

### 6.2 Behavior

**Client (`NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED`):**
```js
// Enabled by default; disabled only when env === "false"
if (process.env.NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED === "false") {
  return createNoOpBookReadingTracker(); // no fetch, no beacon, no sessionStorage session tokens
}
```

**Server (`LEARNING_BOOK_TRACKING_ENABLED`):**
```js
// pages/api/learning/book-events.js
if (process.env.LEARNING_BOOK_TRACKING_ENABLED === "false") {
  return res.status(503).json({ ok: false, error: "book_tracking_disabled" });
}

// lib/parent-server/report-data-aggregate.server.js
if (process.env.LEARNING_BOOK_TRACKING_ENABLED !== "false") {
  // fetch book_page_visits and accumulate learningActivity
}
```

### 6.3 Rollback via Flags

Disabling flags must:
- Leave book navigation unchanged
- Leave CTA behavior unchanged (`mode="learning"`)
- Stop event emission (client) and persistence/aggregation (server)
- Not require code deploy beyond env change (once implemented)

---

## 7. Report Aggregator Changes

### 7.1 File

`lib/parent-server/report-data-aggregate.server.js`

### 7.2 Allowed Report Payload Fields

Phase 5 may add these to `learningActivity` in the report payload:

- `bookReadingMinutes`
- `bookReadingBySubject`
- `bookPagesRead` — counts pages where `page_read=true` (≥ 10s credited dwell, not 2s)
- `bookSessionCount`
- `postBookPracticeCount`

### 7.3 UI / Report Visibility Boundary

| Allowed | Not allowed without owner approval |
|---------|-----------------------------------|
| Add fields to report payload JSON | New Hebrew labels or copy |
| Existing renderer displays generic `learningActivity` if already supported | New report UI components |
| Internal fields stripped before public API | CSS/layout changes for reports |

**Stop and ask owner** if implementation discovers that displaying book-reading data requires new Hebrew text or new visible UI components.

### 7.4 New Functions

```js
async function fetchBookPageVisitsInRange(supabase, studentId, fromIso, toIsoExclusive) {
  return supabase
    .from("book_page_visits")
    .select("id,student_id,subject,grade,page_id,credited_dwell_ms,page_read,triggered_cta,started_at,ended_at")
    .eq("student_id", studentId)
    .gte("started_at", fromIso)
    .lt("started_at", toIsoExclusive);
}

function accumulateBookReadingActivity(learningActivity, visits) {
  // ONLY mutates learningActivity.*
  // NEVER touches diagnosticAnswers, diagnosticCorrect, diagnosticAccuracy
}
```

### 7.5 `stripInternalReportPayloadFields` Extension

Strip from public payload if present:
- `hiddenTabMs`, `sectionsSkipped`, `clientSessionToken`, `clientVisitToken`
- Any `_bookReadingInternal` helper fields

### 7.6 Teacher / School Reports

If teacher/school aggregators reuse `report-data-aggregate.server.js`, they inherit book data automatically. If separate paths exist, add same `fetchBookPageVisitsInRange` call — verify during implementation.

---

## 8. Tests

### 8.1 New Test File

`tests/learning/phase5-book-tracking.test.mjs`

### 8.2 Test Categories

| Category | Tests |
|----------|-------|
| **Unit — dwell policy** | Section view at 2s; page read at 10s; credited caps; raw preserved when capped |
| **Unit — feature flags** | Client no-op when `NEXT_PUBLIC_…=false`; server 503 + aggregator skip when `LEARNING_BOOK_…=false` |
| **Unit — book context** | consumeLastBookContext TTL; one-time delete; expired ignored |
| **Unit — CTA mode** | All resolve*PracticeTarget return `mode: "learning"` |
| **Unit — aggregator** | Book visits populate `learningActivity` only |
| **Unit — aggregator guards** | Book data does NOT change `diagnosticAnswers/Correct/Accuracy` |
| **Unit — strip** | Internal book fields removed from public payload |
| **API — book-events** | Auth, idempotency, ownership validation, batch |
| **Regression — Phase 4** | `_rawActivityAccuracy` still absent from stripped payload |
| **Regression — coins** | Monthly persistence totals unchanged after book reading |
| **Regression — classification** | `mode=learning` after CTA → not diagnostic |

### 8.3 Existing Files to Extend

| File | Addition |
|------|----------|
| `tests/learning/activity-classification.test.mjs` | `contextAfterBookReading` + `mode=practice` combo |
| `tests/learning/phase4-aggregate-filter.test.mjs` | Book rows exclusion from diagnostic buckets |

---

## 9. Exact File List

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/056_book_reading_tracking.sql` | Schema |
| `pages/api/learning/book-events.js` | API endpoint |
| `lib/learning-supabase/book-events.server.js` | Event handler logic |
| `lib/learning-book/book-reading-tracker.js` | Client dwell tracking |
| `lib/learning-book/book-context-after-reading.js` | contextAfterBookReading sessionStorage |
| `lib/learning/book-dwell-policy.js` | Shared thresholds + credit computation (testable pure functions) |
| `tests/learning/phase5-book-tracking.test.mjs` | Test suite |

### Modified Files

| File | Change |
|------|--------|
| `components/learning-book/LearningPageBody.js` | Wire tracker hook; CTA context save |
| `lib/learning-book/learning-book-nav.js` | Re-export context helpers (optional) |
| `lib/parent-server/report-data-aggregate.server.js` | Book visit fetch + learningActivity accumulation |
| `pages/learning/math-master.js` | contextAfterBookReading consume |
| `pages/learning/geometry-master.js` | Same |
| `pages/learning/science-master.js` | Same |
| `pages/learning/hebrew-master.js` | Same |
| `pages/learning/english-master.js` | Same |
| `pages/learning/moledet-geography-master.js` | Same |

### Files Explicitly NOT Modified

| File | Reason |
|------|--------|
| `lib/learning-supabase/monthly-persistence-reward.server.js` | Phase 9 scope |
| `lib/learning-book/resolve-*-practice-target.js` | CTA mode must stay `"learning"` |
| Any UI/CSS/Hebrew strings | Out of scope |
| Phase 1–4 classification core | No reopen unless blocker |

---

## 10. Implementation Order

1. **`lib/learning/book-dwell-policy.js`** — thresholds, credit caps, raw-vs-credited helpers + unit tests
2. **Create migration file only** — `supabase/migrations/056_book_reading_tracking.sql` (do **not** run SQL)
3. **`lib/learning-supabase/book-events.server.js`** + `pages/api/learning/book-events.js` + API tests (graceful if tables absent when flag on)
4. **`lib/learning-book/book-reading-tracker.js`** — client tracker + feature flag no-op + unit tests
5. **`LearningPageBody.js`** — wire tracker side effects only
6. **`book-context-after-reading.js`** + all 6 master page wiring (first practice answer only)
7. **Aggregator `learningActivity` branch** + `stripInternalReportPayloadFields` extension
8. **`tests/learning/phase5-book-tracking.test.mjs`** + Phase 4 regression tests
9. **Full test run + build**
10. **Implementation report for owner** — include note that SQL must be run manually
11. **Owner review** before commit/push/deploy

**Not in agent scope:** Running `056_book_reading_tracking.sql` against any database.

---

## 11. Rollback Plan

### If Issues Found Before Deploy

1. Revert code commits
2. Migration file can remain unused until owner applies it

### If Issues Found After Deploy

1. **Immediate — disable client tracking:**
   ```
   NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED=false
   ```
   Tracker becomes no-op; no events emitted; navigation and CTA unchanged.

2. **Immediate — disable server/API/reports:**
   ```
   LEARNING_BOOK_TRACKING_ENABLED=false
   ```
   `/api/learning/book-events` returns 503; aggregator skips book tables.

4. **Data:** Book tables can remain — they don't affect existing diagnostic paths. No backfill needed.

5. **Migration rollback (production, last resort):**
   ```sql
   drop table if exists public.book_page_visits;
   drop table if exists public.book_reading_sessions;
   ```

### Rollback Safety

- Book tables are additive — dropping them does not affect `answers`, `learning_sessions`, or diagnostic aggregation
- No coins changes means no coin reversal needed
- CTA behavior unchanged — rollback is invisible to students

---

## 12. Manual QA Checklist

### Book Reading Tracking

- [ ] Open book from math master → `book_reading_session_start` fires (network tab)
- [ ] Navigate between book pages → `book_page_visit_start/end` per page
- [ ] Dwell on section ≥ 2s → section in `sectionsViewed` (section-view threshold only)
- [ ] Fast-flip section < 2s → in `sectionsSkipped`, not credited
- [ ] Page credited dwell ≥ 10s → `page_read=true`; counts toward `bookPagesRead`
- [ ] Page credited dwell < 10s → `page_read=false`; does not count as page read
- [ ] `raw_dwell_ms` stored even when `credited_dwell_ms` capped at 10 min/page
- [ ] Switch to another browser tab → `hiddenTabMs` > 0, credited < raw
- [ ] Return to master via "סגור" → `book_reading_session_end` fires (beacon OK)
- [ ] Refresh mid-book → new page visit, same reading session token in sessionStorage

### CTA / Context

- [ ] Click "בואו נתרגל עכשיו" → lands on master in `mode="learning"` (NOT practice)
- [ ] Answer in learning mode after CTA → NOT in diagnosticAccuracy
- [ ] CTA answer in `mode="learning"` → NOT diagnostic; no `contextAfterBookReading` required for safety
- [ ] `contextAfterBookReading` on first `mode="practice"` answer only after book context; not on second answer
- [ ] Open master later (no book) → `contextAfterBookReading` is false

### Reports

- [ ] Parent report shows `bookReadingMinutes` > 0 after reading
- [ ] Parent report `diagnosticAccuracy` unchanged by book reading alone
- [ ] No `hiddenTabMs` visible in parent report JSON
- [ ] Teacher report shows book pages read count

### Coins Boundary

- [ ] Monthly progress / coin milestones unchanged after book-only session (no answers)

### Regression

- [ ] Book navigation (prev/next section, topic nav, TOC) still works
- [ ] Step-by-step and practice windows unaffected
- [ ] Existing Phase 4 tests still pass

---

## 13. Approved Implementation Scope

Owner-approved Phase 5 implementation scope:

- [x] Add migration file only (`056_book_reading_tracking.sql`) — **not run SQL**
- [x] Add `POST /api/learning/book-events`
- [x] Add client book tracking side effects (feature-flagged)
- [x] Add `contextAfterBookReading` helper + master wiring (first practice answer only)
- [x] Add aggregator `learningActivity` branch only
- [x] Add tests and build
- [x] Thresholds: 2s section / 10s page read / 10 min page cap / 60 min session cap
- [x] Feature flags: `NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED` + `LEARNING_BOOK_TRACKING_ENABLED`
- [ ] No coins/monthly progress changes
- [ ] No UI/Hebrew/CSS changes
- [ ] No CTA mode change
- [ ] No Phase 6–10 work
- [ ] No commit/push/deploy until owner review after implementation report

---

## Certification

**NO APPLICATION CODE CHANGES WERE MADE in this documentation update.**  
This plan (Revision 3) is approved for implementation per scope above.  
SQL migration must be applied manually by owner when ready.
