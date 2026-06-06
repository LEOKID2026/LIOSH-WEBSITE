# Phase 5 — Learning Book Full Tracking: Architecture Audit

**Project:** Diagnostic Truth Fix  
**Phase:** 5 (Architecture Mapping Only)  
**Date:** 2026-06-06  
**Revision:** 3 (final pre-implementation corrections)  
**Status:** AUDIT COMPLETE — implementation approved per [`PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md`](./PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md) (Revision 3)  
**Prepared by:** AI audit agent (read-only exploration)

---

> ⚠️ **NO CODE CHANGES MADE.**
> This document is a pure architecture mapping report.
> No files were modified, no migrations were created, no UI was changed.
> Do not begin Phase 5 implementation until the owner explicitly approves.

---

## Table of Contents

1. [Learning Book Routes](#1-learning-book-routes)
2. [Learning Book Components](#2-learning-book-components)
3. [Book Catalog and Registry Structure](#3-book-catalog-and-registry-structure)
4. [Navigation Flow](#4-navigation-flow)
5. [CTA / Practice-After-Book Audit](#5-cta--practice-after-book-audit)
6. [Current Tracking Audit](#6-current-tracking-audit)
7. [Data Model Proposal](#7-data-model-proposal)
8. [Proposed Event Contract](#8-proposed-event-contract)
9. [Reporting Integration Design](#9-reporting-integration-design)
10. [Risk Assessment](#10-risk-assessment)
11. [Required Test Plan](#11-required-test-plan)
12. [Student Identity Verification](#12-student-identity-verification-correction)
13. [Credited Dwell Policy](#13-credited-dwell-policy)
14. [RLS / Security Design](#14-rls--security-design)
15. [Aggregator Integration Safety Guards](#15-aggregator-integration-safety-guards)
16. [Coins / Monthly Progress Boundary](#16-coins--monthly-progress-boundary)
17. [Book CTA Mode Rule](#17-book-cta-mode-rule)
18. [Feature Flags, SQL Execution, UI Boundary](#18-feature-flags-sql-execution-ui-boundary)
19. [Implementation Plan Reference](#19-implementation-plan-reference)

> **Implementation details** (exact files, migration draft, rollback, QA checklist) are in a separate document:  
> [`PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md`](./PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md)

---

## 1. Learning Book Routes

### Route Architecture

There are **two types of book routes**: explicit per-subject/grade routes (for Math g1–g6 and Geometry g1–g6), and a shared dynamic route that handles all other subjects.

#### 1.1 Dynamic Route (catch-all for non-Math, non-Geometry)

| File | URL Pattern | Subjects Served |
|------|-------------|-----------------|
| `pages/learning/book/[subject]/[grade]/index.js` | `/learning/book/{subject}/{grade}` | Science, Hebrew, English, Moledet, Geography |
| `pages/learning/book/[subject]/[grade]/[pageId].js` | `/learning/book/{subject}/{grade}/{pageId}` | Science, Hebrew, English, Moledet, Geography |

#### 1.2 Explicit Math Routes (g1–g6)

| File | URL Pattern |
|------|-------------|
| `pages/learning/book/math/g1/index.js` | `/learning/book/math/g1` |
| `pages/learning/book/math/g1/[pageId].js` | `/learning/book/math/g1/{pageId}` |
| `pages/learning/book/math/g2/index.js` | `/learning/book/math/g2` |
| `pages/learning/book/math/g2/[pageId].js` | `/learning/book/math/g2/{pageId}` |
| `pages/learning/book/math/g3/[pageId].js` | `/learning/book/math/g3/{pageId}` |
| `pages/learning/book/math/g4/[pageId].js` | `/learning/book/math/g4/{pageId}` |
| `pages/learning/book/math/g5/[pageId].js` | `/learning/book/math/g5/{pageId}` |
| `pages/learning/book/math/g6/[pageId].js` | `/learning/book/math/g6/{pageId}` |

#### 1.3 Explicit Geometry Routes (g1–g6)

| File | URL Pattern |
|------|-------------|
| `pages/learning/book/geometry/g1/index.js` | `/learning/book/geometry/g1` |
| `pages/learning/book/geometry/g1/[pageId].js` | `/learning/book/geometry/g1/{pageId}` |
| ... (g2–g6 identical pattern) | `/learning/book/geometry/{g2–g6}/{pageId}` |

#### 1.4 Required Route Params

| Param | Source | Description |
|-------|--------|-------------|
| `subject` | URL segment | One of: `math`, `geometry`, `science`, `hebrew`, `english`, `moledet`, `geography` |
| `grade` | URL segment | One of: `g1`, `g2`, `g3`, `g4`, `g5`, `g6` |
| `pageId` | URL segment | Stable page identifier (e.g., `ns_counting_forward`, `triangles`) |

#### 1.5 Rendering Strategy

- **All book routes** use `getStaticProps` + `getStaticPaths` → **Static Site Generation (SSG)**
- Pages are pre-built at deploy time; no server-side auth, no session cookie on book pages
- The SSG strategy means: **no student identity is available during page render**
- Auth is resolved only when the student submits answers (via `/api/learning/answer`)

#### 1.6 Does the Route Create Learning Sessions or Answer Rows?

**No.** Book page routes do not currently call any API. No session row, no answer row, no coin credit is created when a student opens or reads a book page.

This is the **core tracking gap** that Phase 5 must address.

#### 1.7 Subject/Book Coverage

All 7 subjects have authored books across grades g1–g6 (science, math, geometry, hebrew, english) or a subset of grades (moledet: g2–g4, geography: g5–g6). The full catalog contains approximately **35+ authored subject-grade book combinations**, each with between 4 and 30 pages.

---

## 2. Learning Book Components

### 2.1 Component Map

| Component | File | Responsibility |
|-----------|------|----------------|
| `LearningBookShell` | `components/learning-book/LearningBookShell.js` | Outer layout wrapper: sticky header, return button, TOC modal trigger, grade theme. Renders for both index and page views. |
| `LearningPageBody` | `components/learning-book/LearningPageBody.js` | Core page viewer: section carousel (prev/next sections within a page), CTA button, bottom HUD with topic nav. Contains all practice launch logic. |
| `LearningBookIndexContent` | `components/learning-book/LearningBookIndexContent.js` | Book table of contents rendered on the index (`/index.js`) route. Lists all topics. |
| `LearningBookIndexTile` | `components/learning-book/LearningBookIndexTile.js` | Tile button shown inside each subject master page to enter the book. Entry point from master into book. |
| `BookTocModal` | `components/learning-book/BookTocModal.js` | Slide-in modal listing all pages in the book; allows jumping to any page. |
| `BookTopicCardTitle` | `components/learning-book/BookTopicCardTitle.js` | Renders topic title with mixed Hebrew/math text in prev/next navigation cards. |
| `LearningMarkdown` | `components/learning-book/LearningMarkdown.js` | Markdown renderer for section body content. |
| `MixedHebrewMathText` | `components/learning-book/MixedHebrewMathText.js` | Inline Hebrew+math text renderer used in headers. |
| `BookGradeThemeContext` | `components/learning-book/BookGradeThemeContext.js` | React context providing grade-specific color theme. |
| `BookContentLine` | `components/learning-book/BookContentLine.js` | Individual content line renderer (text, formula, diagram). |
| `BookDiagram` | `components/learning-book/BookDiagram.js` | SVG diagram renderer for geometric/visual content. |
| `BookVerticalArithmetic` | `components/learning-book/BookVerticalArithmetic.js` | Renderer for vertical arithmetic (column addition/subtraction). |
| `BookPlaceValueEquation` | `components/learning-book/BookPlaceValueEquation.js` | Place value equation renderer. |
| `BookExampleTitleLine` | `components/learning-book/BookExampleTitleLine.js` | "Example:" title separator line. |
| `BookPipeTable` | `components/learning-book/BookPipeTable.js` | Markdown pipe-table renderer. |
| `BookMathDisplay` | `components/learning-book/BookMathDisplay.js` (via handoff) | Math formula display block. |
| `MathG1BookShell` – `MathG6BookShell` | `components/learning-book/MathG{N}BookShell.js` | Math-grade-specific wrappers (possibly legacy, catalog now generic). |

### 2.2 Key Props on `LearningPageBody`

```
page          — { pageId, displayTitle, sections: [{ number, title, body }] }
prevPageId    — string|null
nextPageId    — string|null
prevTitle     — string|null
nextTitle     — string|null
bookSubject   — "math"|"geometry"|"science"|...
bookGrade     — "g1"..."g6"
```

### 2.3 CTA Button (Practice Button) Location

The **"בואו נתרגל עכשיו"** (Let's practice now) CTA button is rendered inside `LearningPageBody` at:

```
isFinalPracticeSection && practicePath && practiceTarget → renders CTA Link
```

Condition: the student must be on the **last section** (`atLast`) of the page AND the section `number === 7` (final practice section) AND a `practiceTarget` must resolve for this `pageId`.

The CTA is a `<Link href={practicePath}>` — a **client-side navigation** that does NOT make any API call when clicked. Practice preset is saved to `sessionStorage` via `onClick={handlePracticeClick}`.

### 2.4 What Each Component Can Detect

| Component | Can detect page view? | Can detect page leave? | Can detect section swipe? |
|-----------|----------------------|----------------------|--------------------------|
| `LearningBookShell` | Yes (on mount) | Yes (via router events) | No |
| `LearningPageBody` | Yes (per `page.pageId` change) | Partial (via router events/unmount) | Yes (goPrev/goNext callbacks) |
| `LearningMarkdown` | No | No | No |
| `BookTocModal` | No (jump targets only) | No | No |

---

## 3. Book Catalog and Registry Structure

### 3.1 Architecture Overview

The book catalog is a two-layer system:

**Layer 1 — Client-safe metadata** (`lib/learning-book/learning-book-catalog-meta.js`):
- `LEARNING_BOOK_META_BY_KEY` — a `Record<"subject:grade", { subject, grade, status, meta }>` map
- `meta` shape per book: `{ subject, grade, routeBase, bookTitleHe, draftsDir, ...gradeShortLabel }`
- `status`: `"authored"` | `"placeholder"` | `"prepared"`
- Functions: `getLearningBookClientMeta`, `getLearningBookIndexHref`, `hasLearningBook`, `getVisibleLearningBooks`

**Layer 2 — Server-side registry** (`lib/learning-book/learning-book-catalog.js`):
- `buildServerCatalogEntry` constructs a registry + loader + nav per book
- `getLearningBookEntry(subject, grade)` — used by SSG
- Contains `features: { practice, topicResolve, questionResolve }` flags — all authored books have `practice: true`

### 3.2 Per-Subject Registries

Each `lib/learning-book/{subject}-{grade}-registry.js` exports:

| Export | Description |
|--------|-------------|
| `{SUBJECT}_G{N}_BOOK_BATCHES` | Array of `{ id, titleHe, pages: string[] }` — chapter groupings |
| `{SUBJECT}_G{N}_PAGE_ORDER` | Ordered array of `pageId` strings |
| `get{Subject}G{N}PageNeighbors(pageId)` | Returns `{ prev, next, index }` |
| `isValid{Subject}G{N}PageId(pageId)` | Boolean page ID validator |
| `{SUBJECT}_G{N}_BOOK_META` | `{ subject, grade, routeBase, bookTitleHe, draftsDir }` |

### 3.3 PageId Stability

`pageId` values are stable string identifiers (e.g., `ns_counting_forward`, `triangles`, `solids`). They are defined statically in registry files and never change at runtime. They match the filenames in `docs/learning-book/{subject}/{grade}/drafts/{pageId}.md`.

### 3.4 Page Metadata Available per Page

From the registry + loader:
- `pageId` — stable string
- `displayTitle` — human-readable topic title (Hebrew)
- `sections` — array of `{ number, title, body }` (markdown content)
- `batchId` — chapter group id (e.g., `"a"`, `"b"`)
- `batchOrder` — chapter ordering index
- `sequenceIndex` — global sequence position across book

**Topic/subtopic/skill metadata available:** `pageId` IS the skill/topic key. It maps 1:1 to practice topics in `{subject}-book-practice-map.js`.

**Connection to practice topics:** `lib/learning-book/{subject}-book-practice-map.js` defines `pageId → { topic, forceKind }` mappings for all authored pages. The resolve functions (`resolveMathG1PracticeTarget`, `resolveGeometryPracticeTarget`, etc.) use these maps to set up practice sessions.

### 3.5 Sequence Metadata

`lib/learning-book/learning-book-sequence-meta.js` contains `LEARNING_BOOK_PAGE_SEQUENCE` — a nested map `{ "subject:grade": { pageId: PageSequenceMeta } }` with `sequenceIndex`, `batchId`, `batchOrder`, `prerequisitePageIds` per page.

This metadata enables topological ordering (prerequisite pages appear before dependent pages) and is used at SSG time.

### 3.6 Report Grouping Capability

Each page has enough metadata for grouping:
- By `subject` + `grade` (from URL params)
- By `batchId` (chapter)
- By `pageId` (individual topic)
- By `sequenceIndex` (reading order position)
- By practice topic (`topic` field from practice-map)

This is sufficient for report aggregation in Phase 5.

---

## 4. Navigation Flow

```
Student Portal / Subject Master Page
    │
    │  [LearningBookIndexTile button in master]
    │  router.push(bookIndexHref) → getLearningBookIndexHref(subject, grade)
    │  e.g. /learning/book/math/g1
    ▼
Book Index Page  (/learning/book/{subject}/{grade})
    │  LearningBookIndexContent — lists all chapters and topics
    │
    │  [Student clicks a topic link]
    │  <Link href="/learning/book/{subject}/{grade}/{pageId}">
    ▼
Book Page  (/learning/book/{subject}/{grade}/{pageId})
    │  LearningBookShell + LearningPageBody
    │  Shows sections (section carousel: prev/next section via button or swipe)
    │
    │  [Student taps "עמוד הבא" — next section within page]
    │  setSectionIndex(i + 1) — CLIENT-SIDE STATE, no navigation
    │
    │  [Student reaches final section AND section.number === 7 AND practiceTarget exists]
    │  Renders: <Link href={practicePath}> "בואו נתרגל עכשיו"
    │
    │  [Student taps "נושא הבא" — next TOPIC (page)]
    │  <Link href="/learning/book/{subject}/{grade}/{nextPageId}">
    │
    │  [Student taps "נושא קודם" — previous TOPIC (page)]
    │  <Link href="/learning/book/{subject}/{grade}/{prevPageId}">
    │
    │  [Student taps "תוכן עניינים" — TOC modal]
    │  setTocOpen(true) → BookTocModal opens
    │  [Student picks any page in modal]
    │  <Link href="/learning/book/{subject}/{grade}/{selectedPageId}">
    │
    │  [Student taps "סגור" or "חזרה ל{subject}"]
    │  handleReturnClick → nav.handleClose(router) OR router.push(masterPath)
    ▼
Back to Subject Master Page  (/learning/{subject}-master)
    │  OR
    ▼
Practice Page (when CTA clicked):
    savePracticePreset(practiceTarget)  ← writes to sessionStorage
    <Link href="/learning/{subject}-master?fromBook=1">
    │
    ▼
Subject Master Page  (re-mounted with ?fromBook=1 query param)
    consumeBookPracticePreset()  ← reads + clears sessionStorage
    applyBookPracticePreset(preset) → sets mode="learning", grade, operation, forceKind
    │
    ▼
Answer API  POST /api/learning/answer
    clientMeta: { source: "math-master", afterStepByStep, ... }
    ← contextAfterBookReading is NOT currently set here
```

### Key Observations on Navigation

1. **No student identity on book pages** — SSG means no auth is checked during book render.
2. **No API calls during book reading** — pure client-side navigation between static pages.
3. **Section navigation is local state** — `sectionIndex` is React state in `LearningPageBody`, never persisted.
4. **Return flow uses `sessionStorage` snapshots** — `saveLearningBookLearningSnapshot` saves the master state before entering book so master can resume.
5. **Practice flow uses `sessionStorage` presets** — `savePracticePreset` writes `{ grade, mode, operation, forceKind, pageId }` so master can apply it on load.
6. **`contextAfterBookReading` is currently NOT set** in any `clientMeta` sent to the answer API from any master after a book CTA click.

---

## 5. CTA / Practice-After-Book Audit

### 5.1 All CTA Entry Points (where a book launches practice)

There is exactly **one CTA button** in the book UI, rendered in `LearningPageBody` (line 464–477):

```
Condition: isFinalPracticeSection && practicePath && practiceTarget
Button text: "בואו נתרגל עכשיו"
onClick: handlePracticeClick → savePracticePreset(practiceTarget)
href: practicePath → getMathG1PracticePath() → "/learning/math-master?fromBook=1"
```

This single CTA is shared across all subjects via the `bookUi` resolver that maps `(subject, grade)` to the correct `savePracticePreset` / `getPracticePath` functions.

### 5.2 CTA Details Per Subject

| Subject | Practice Path Function | Practice Preset Key |
|---------|----------------------|---------------------|
| Math (g1) | `getMathG1PracticePath()` → `/learning/math-master?fromBook=1` | `mleo_math_g1_book_practice_preset_v1` |
| Math (g2–g6) | Same pattern per grade | `mleo_math_g{N}_book_practice_preset_v1` |
| Geometry | `getGeometryBookPracticePath()` → `/learning/geometry-master?fromBook=1` | `mleo_geometry_g{N}_book_practice_preset_v1` |
| Science | `getScienceBookPracticePath()` → `/learning/science-master?fromBook=1` | `mleo_science_g{N}_book_practice_preset_v1` |
| Hebrew | `getHebrewBookPracticePath()` → `/learning/hebrew-master?fromBook=1` | `mleo_hebrew_g{N}_book_practice_preset_v1` |
| English | `getEnglishBookPracticePath()` → `/learning/english-master?fromBook=1` | `mleo_english_g{N}_book_practice_preset_v1` |
| Moledet/Geography | `getMoledetGeographyBookPracticePath()` → `/learning/moledet-geography-master?fromBook=1` | `mleo_{subject}_g{N}_book_practice_preset_v1` |

### 5.3 What the Practice Preset Contains

From `resolveMathG1PracticeTarget(pageId)`:

```js
{
  pageId: "ns_counting_forward",
  grade: "g1",
  mode: "learning",         // ← ALL book CTAs force mode="learning"
  operation: "number_sense",
  forceKind: "ns_counting_forward",
}
```

**Critical observation:** The preset always has `mode: "learning"`. This means the master will start in `mode="learning"` after a book CTA. In the current classification system, `mode="learning"` maps to `LEARNING_GUIDED` (not diagnostic). This is **correct** — but it is enforced by the mode value, not by an explicit `contextAfterBookReading` flag.

### 5.4 Where `contextAfterBookReading` Should Be Set

**Currently:** `contextAfterBookReading` is received at `pages/api/learning/answer.js` (line 131) from `body.clientMeta.contextAfterBookReading`. However, **no master page currently sets this field** in the `clientMeta` it sends to the answer API. The field exists in the classification system but has no active production source.

**Proposed mechanism (design, not implementation):**

When the practice CTA is clicked in `LearningPageBody`, save a short-lived `sessionStorage` key:

```js
// Key: liosh_lastBookContext_v1
{
  subject: "math",
  grade: "g1",
  pageId: "ns_counting_forward",
  source: "book_cta" | "book_reading",  // CTA click vs passive read exit
  timestamp: 1717689600000,
  expiresAt: 1717689900000              // timestamp + 5 minutes
}
```

**Which master files must consume it (all 6):**

| Master file | Book subjects served |
|-------------|---------------------|
| `pages/learning/math-master.js` | math |
| `pages/learning/geometry-master.js` | geometry |
| `pages/learning/science-master.js` | science |
| `pages/learning/hebrew-master.js` | hebrew |
| `pages/learning/english-master.js` | english |
| `pages/learning/moledet-geography-master.js` | moledet, geography |

**How consumed context is held for the current session only:**

1. On master mount (or when `?fromBook=1` is detected), call `consumeLastBookContext()` — reads + deletes `sessionStorage` key atomically.
2. If valid (not expired, matching subject), store in a **React ref** (e.g. `bookContextRef.current`), NOT in React state that persists across navigations.
3. The ref is scoped to the master component lifecycle — unmount clears it.

**Clearing if student lands on master but does not practice:**

- If no answer is submitted within the master's active session AND the student navigates away (unmount), the ref is discarded — no server write occurs.
- If student opens master from book but switches mode/subject without answering, clear `bookContextRef` on first mode change away from the preset.
- TTL (5 min) on `sessionStorage` is a backup — even if consume fails, expired keys are ignored.

**Scope of the flag on answers:**

| Scenario | `contextAfterBookReading` on answer? |
|----------|--------------------------------------|
| Book CTA → `mode="learning"` answers | Optional annotation only — **not required for diagnostic safety** (mode already excludes) |
| First answer in a `mode="practice"` session after book | `true` on first answer only |
| Subsequent answers in same practice session | `false` — use `bookContextConsumedRef` latch |
| Later sessions (new master mount, no fresh book context) | `false` |

**Product value of `contextAfterBookReading`:**

- **Not** for making book CTA learning diagnostic (CTA already uses `mode="learning"`).
- **Is** for future positive evidence: `post_book_practice`, `post_book_improvement`, `self_directed_learning`.
- **Is** for annotating independent practice (`mode="practice"`) that genuinely follows book reading.

**How to avoid contaminating future sessions:**

- One-time consume from `sessionStorage` (read + delete)
- 5-minute TTL on the stored key
- Per-master React ref latch — flag applied to at most one answer per consume
- Never write `contextAfterBookReading` to `localStorage` or server session metadata

### 5.5 Classification Outcome of Post-Book Practice

With proposed `contextAfterBookReading`:

| Scenario | Mode | `contextAfterBookReading` | Outcome |
|----------|------|--------------------------|---------|
| Book CTA → master practice session | `learning` | `true` (with fix) | `LEARNING_GUIDED` — NOT diagnostic (mode overrides) |
| Student manually opens master after reading book | `practice` | `true` (if within TTL) | `DIAGNOSTIC_INDEPENDENT` with context note |
| Regular practice | `practice` | `false` | `DIAGNOSTIC_INDEPENDENT` |

The current `classifyActivityEvidence` logic already handles `contextAfterBookReading` as a flag — it is stored in `contextFlags` and does NOT override `isDiagnosticEligible` on its own. The mode is the primary gate. This means:
- Book CTA → `mode="learning"` → not diagnostic (correct)
- Independent practice after book → `mode="practice"` → diagnostic (correct, with context annotation)

---

## 6. Current Tracking Audit

| Tracking Item | Status | Evidence | Risk |
|---------------|--------|----------|------|
| `book_session_start` | ❌ **MISSING** | No API endpoint, no component call | No record that student opened a book |
| `book_page_view` | ❌ **MISSING** | No event emitted on page load | Cannot distinguish read pages from skipped pages |
| `book_page_skip` | ❌ **MISSING** | No fast-flip detection | Pages navigated in < 2s cannot be identified |
| `book_session_end` | ❌ **MISSING** | No unload/navigate-away handler | Duration cannot be calculated |
| Dwell time measurement | ❌ **MISSING** | No timer in any book component | Total reading time is unknown |
| Hidden tab exclusion | ❌ **MISSING** | No `visibilitychange` listener on book pages | Tab-idle time would inflate reading metrics |
| Fast flip detection | ❌ **MISSING** | Section swipe has no timestamp check | Section-level flipping cannot be detected |
| Book reading credited time | ❌ **MISSING** | No `creditedTimeMs` for book | Book time never enters any ledger |
| Book reading in parent report | ❌ **MISSING** | `bookReadingMinutes` field planned in plan.md but not implemented in aggregator | Parents see no reading evidence |
| Book reading in teacher report | ❌ **MISSING** | Same — no book sessions table to query | Teachers see no reading evidence |
| Book reading in school report | ❌ **MISSING** | Same | School sees no reading evidence |
| Book reading in coins/monthly progress | ❌ **MISSING** | `monthly-persistence-reward.server.js` queries `learning_sessions.duration_seconds` — no book sessions exist | Book time does NOT contribute to coins |
| Book reading in `diagnosticAccuracy` | ✅ **CORRECT** | `EVIDENCE_CATEGORIES.LEARNING_BOOK` is defined; `mode="learning_book"` → `isDiagnosticEligible: false` | Safe — if a session ever existed it would be excluded |
| `contextAfterBookReading` in classification | ✅ **DEFINED** | `activity-classification.js` accepts and records `contextAfterBookReading` in `contextFlags` | Exists but no producer sends it |
| `contextAfterBookReading` in answer API | ⚠️ **PARTIAL** | `pages/api/learning/answer.js` reads `clientMeta.contextAfterBookReading` at line 131 | API accepts it but no master currently sends it |
| `learning_book` mode in allowlist | ✅ **EXISTS** | `LEARNING_GAME_MODE_ALLOWLIST` in `learning-activity.js` includes `"learning_book"` | Mode is recognized if ever passed |
| Book CTA `mode="learning"` preset | ✅ **CORRECT** | All `resolve*PracticeTarget` functions return `mode: "learning"` | CTA always lands in non-diagnostic mode |

**Summary:** The classification and mode-routing infrastructure is ready for book tracking (`learning_book` mode, `contextAfterBookReading` field, API acceptance). What is entirely missing is: any client-side event emission, any server endpoint, any database persistence, and any report aggregation consuming book data.

---

## 7. Data Model Proposal

> **Revision note:** The original draft incorrectly used `REFERENCES auth.users(id)` and mixed page-level and session-level fields in one table. This section is corrected.

### 7.1 Session vs Page Visit — Terminology Clarification

The original audit named the table `book_sessions` but described it as "one per page visit" while including session-level fields (`sections_viewed`, `sections_skipped`). That was ambiguous.

**Intended model (recommended): two-table design**

| Table | Granularity | Purpose |
|-------|-------------|---------|
| `book_reading_sessions` | One row per **continuous book-reading visit** | Student enters book area → navigates pages → leaves book |
| `book_page_visits` | One row per **book page visit** (one Next.js page load / `pageId`) | Dwell time, sections viewed/skipped, CTA trigger per page |

**Why two tables:**
- Next.js book navigation reloads `LearningPageBody` on each `pageId` change — natural page-visit boundary
- A reading session spans multiple page visits before returning to master
- Reporting sums `book_page_visits.credited_dwell_ms`; session table provides rollup and CTA linkage
- Avoids mixing page-level dwell with session-level aggregates in one row

**Alternative (not recommended):** Single table `book_page_visits` only, no session parent. Simpler but loses cross-page session context for `post_book_practice` evidence.

### 7.2 Options Comparison (Revised)

#### Option A — Two dedicated tables: `book_reading_sessions` + `book_page_visits` ✅ RECOMMENDED

**Pros:** Clean separation; correct granularity; no contamination of `learning_sessions`; queryable per-page and per-session.  
**Cons:** New migration; two tables to maintain.  
**Risk:** Low.  
**Reporting:** Sum `book_page_visits.credited_dwell_ms` for `bookReadingMinutes`; join to session for CTA context.  
**Diagnostic truth:** Fully isolated.

#### Option B — Reuse `learning_sessions` with `mode=learning_book`

**Pros:** No new table; coins query might pick up time automatically.  
**Cons:** Semantically wrong (no answers); risks contaminating diagnostic/coins aggregators; JSONB event storage messy.  
**Risk:** Medium-high.  
**Diagnostic truth:** Risky.

#### Option C — Hybrid: `learning_sessions` summary + `book_page_visits` events

**Pros:** Coins integration shortcut.  
**Cons:** Dual source of truth; double-count risk between Phase 5 and Phase 9.  
**Risk:** Medium-high.  
**Out of scope for Phase 5** unless owner explicitly approves coins changes.

#### Option D — JSONB event log in existing metadata

**Pros:** Zero migration.  
**Cons:** Poor query performance; no clean indexes.  
**Risk:** High.

### 7.3 Recommendation

**Option A — `book_reading_sessions` + `book_page_visits`** with `student_id REFERENCES public.students(id)`.

See [Section 12](#12-student-identity-verification-correction) for FK verification.

### 7.4 Proposed Table Schema (Draft — Not Migrated)

```sql
-- Parent: one continuous book-reading visit
CREATE TABLE public.book_reading_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject             text        NOT NULL,
  grade               text        NOT NULL,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  total_raw_dwell_ms      integer CHECK (total_raw_dwell_ms >= 0),
  total_credited_dwell_ms integer CHECK (total_credited_dwell_ms >= 0),
  total_hidden_tab_ms     integer NOT NULL DEFAULT 0 CHECK (total_hidden_tab_ms >= 0),
  pages_read_count    integer     NOT NULL DEFAULT 0,   -- pages with credited dwell >= view threshold
  pages_skipped_count integer     NOT NULL DEFAULT 0,
  triggered_cta       boolean     NOT NULL DEFAULT false,
  cta_page_id         text,
  client_session_token text       NOT NULL,              -- idempotency key from client
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT book_reading_sessions_student_token_unique UNIQUE (student_id, client_session_token)
);

-- Child: one row per book page visit within a reading session
CREATE TABLE public.book_page_visits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_reading_session_id uuid    NOT NULL REFERENCES public.book_reading_sessions(id) ON DELETE CASCADE,
  student_id          uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject             text        NOT NULL,
  grade               text        NOT NULL,
  page_id             text        NOT NULL,
  batch_id            text,
  sequence_index      integer,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  raw_dwell_ms        integer     CHECK (raw_dwell_ms >= 0),
  credited_dwell_ms   integer     CHECK (credited_dwell_ms >= 0),
  hidden_tab_ms       integer     NOT NULL DEFAULT 0 CHECK (hidden_tab_ms >= 0),
  sections_viewed     integer[]   NOT NULL DEFAULT '{}',
  sections_skipped    integer[]   NOT NULL DEFAULT '{}',
  page_read           boolean     NOT NULL DEFAULT false,  -- true if credited_dwell_ms >= page view threshold
  triggered_cta       boolean     NOT NULL DEFAULT false,
  client_visit_token  text        NOT NULL,                 -- idempotency per page visit
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT book_page_visits_session_token_unique UNIQUE (book_reading_session_id, client_visit_token)
);

CREATE INDEX book_reading_sessions_student_started_idx
  ON public.book_reading_sessions (student_id, started_at DESC);
CREATE INDEX book_page_visits_student_started_idx
  ON public.book_page_visits (student_id, started_at DESC);
CREATE INDEX book_page_visits_session_idx
  ON public.book_page_visits (book_reading_session_id);
CREATE INDEX book_page_visits_subject_grade_idx
  ON public.book_page_visits (subject, grade);
```

**Required fields:**
- Session: `student_id`, `subject`, `grade`, `client_session_token`
- Page visit: `book_reading_session_id`, `student_id`, `subject`, `grade`, `page_id`, `client_visit_token`

**Optional:** all dwell/timing fields, `batch_id`, `sequence_index`, CTA fields

---

## 8. Proposed Event Contract

### 8.1 API Endpoint Recommendation: Single Endpoint ✅

**Recommended:** `POST /api/learning/book-events` (one file, one auth path, one validation module)

**Why not three separate endpoints** (`book-session-start`, `book-event`, `book-session-end`):

| Factor | Single endpoint | Three endpoints |
|--------|----------------|---------------|
| Auth | One `getAuthenticatedStudentSession` path | Duplicated in 3 files |
| Validation | One schema dispatcher by `event` field | Duplicated validators |
| Batching | Client can send array of events in one POST | Requires orchestration |
| `sendBeacon` | One URL for unload beacons | Must pick correct endpoint under pressure |
| Implementation risk | Lower surface area | Higher — 3 files to keep in sync |
| Idempotency | Central handler | Must coordinate across handlers |

**When separate endpoints might be justified:** If start/end need materially different rate limits or middleware. For Phase 5, they do not — all events share the same auth and student_id resolution.

**Endpoint shape:**

```js
POST /api/learning/book-events
// Single event:
{ event: "book_reading_session_start", ...fields }
// Or batched (preferred for page end + section summary):
{ events: [ { event: "book_page_visit_end", ... }, { event: "book_reading_session_end", ... } ] }
```

Auth: `getAuthenticatedStudentSession(req)` → `auth.studentId` (= `public.students.id`).  
Client never sends `studentId` — server resolves from cookie.

### 8.2 Event Definitions

#### `book_reading_session_start`

Fired when student first enters book area (index or first page) without an active reading session token.

```js
{
  event: "book_reading_session_start",
  clientSessionToken: string,     // crypto.randomUUID() — persisted in sessionStorage for visit
  subject: string,
  grade: string,
  entryPageId: string | null,
  returnFrom: "learning_master" | null,
  clientTimestamp: number
}
```

**Response:** `{ ok: true, bookReadingSessionId: uuid }`  
**DB:** INSERT into `book_reading_sessions`  
**Idempotency:** UNIQUE `(student_id, client_session_token)`

#### `book_page_visit_start`

Fired when `LearningPageBody` mounts or `page.pageId` changes.

```js
{
  event: "book_page_visit_start",
  bookReadingSessionId: string,
  clientVisitToken: string,       // new UUID per page visit
  pageId: string,
  batchId: string | null,
  sequenceIndex: number | null,
  referrerPageId: string | null
}
```

**Response:** `{ ok: true, bookPageVisitId: uuid }`  
**DB:** INSERT into `book_page_visits`

#### `book_page_visit_end`

Fired on page navigation away, CTA click, or `sendBeacon` on unload. **Carries full dwell summary for the page.**

```js
{
  event: "book_page_visit_end",
  bookPageVisitId: string,
  rawDwellMs: number,
  creditedDwellMs: number,
  hiddenTabMs: number,
  sectionsViewed: number[],       // section numbers with visible dwell >= VIEW_THRESHOLD_MS
  sectionsSkipped: number[],      // section numbers with visible dwell < VIEW_THRESHOLD_MS
  pageRead: boolean,              // creditedDwellMs >= PAGE_READ_THRESHOLD_MS
  triggeredCta: boolean
}
```

**DB:** UPDATE `book_page_visits` + rollup counters on parent `book_reading_sessions`

#### `book_reading_session_end`

Fired when student leaves book entirely (back to master, close).

```js
{
  event: "book_reading_session_end",
  bookReadingSessionId: string,
  totalRawDwellMs: number,
  totalCreditedDwellMs: number,
  totalHiddenTabMs: number,
  pagesReadCount: number,
  pagesSkippedCount: number,
  triggeredCta: boolean,
  ctaPageId: string | null
}
```

**DB:** UPDATE `book_reading_sessions` SET `ended_at`, totals  
**Delivery:** Prefer `navigator.sendBeacon("/api/learning/book-events", blob)` with JSON body

### 8.3 Anti-Duplicate / Idempotency Strategy

- Client generates `clientSessionToken` once per reading visit; stored in `sessionStorage` (`liosh_book_reading_session_v1`)
- Each page visit gets fresh `clientVisitToken`
- Server enforces UNIQUE constraints; duplicate POSTs return 200 with existing row id
- Section-level view/skip data travels inside `book_page_visit_end` payload (no per-section API calls)
- `book_page_visit_end` UPDATE is idempotent by `bookPageVisitId`

### 8.4 Hidden Tab Time Exclusion

```
On visibilitychange:
  if document.hidden → tabHiddenAt = Date.now()
  if !document.hidden && tabHiddenAt → hiddenTabMs += Date.now() - tabHiddenAt

visibleDwellMs = wallClockElapsed - hiddenTabMs
creditedDwellMs = min(visibleDwellMs, PAGE_CREDIT_CAP_MS)   -- cap TBD by owner
```

Browser computes; server stores both raw and credited separately. Server may re-validate caps.

### 8.5 Fast Flip Detection (Technical Threshold Only)

```
VIEW_THRESHOLD_MS = 2000   -- minimum visible dwell to count a SECTION as "viewed"
```

This 2-second threshold is a **technical anti-noise filter**, not a definition of meaningful reading. See [Section 13](#13-credited-dwell-policy) for credited time rules.

---

## 9. Reporting Integration Design

### 9.1 Product Rules

1. Book reading → `learningActivity` only, never `diagnosticAccuracy`
2. Book reading can contribute positive evidence for:
   - `self_directed_learning` — student chose to read before practicing
   - `persistence` — student read multiple pages/chapters
   - `post_book_practice` — student clicked CTA after reading
   - `post_book_improvement` — accuracy improved after book reading session

### 9.2 Which Aggregator Consumes Book Activity

`lib/parent-server/report-data-aggregate.server.js` — the existing Phase 4 aggregator.

A new query branch should be added (Phase 5 implementation step):
```js
// Fetch book_page_visits for student within date range (service role)
// WHERE page_read = true OR credited_dwell_ms > 0
// Sum credited_dwell_ms → bookReadingMinutes
// Group by subject for bookReadingBySubject
// Count DISTINCT page_id WHERE page_read = true → bookPagesRead
```

This populates `reportPayload.learningActivity.*` only. See [Section 15](#15-aggregator-integration-safety-guards).

### 9.3 Report Payload Additions (Proposed Fields)

```js
// In learningActivity object:
{
  bookReadingMinutes: number,                    // total credited reading time (all subjects)
  bookReadingBySubject: {                        // per-subject breakdown
    math: number,
    geometry: number,
    science: number,
    ...
  },
  bookPagesRead: number,                         // unique pages where page_read=true (≥ 10s credited dwell)
  bookSessionCount: number,                      // number of book sessions
  postBookPracticeCount: number,                 // sessions started via CTA
}

// In contextualEvidence object (future Phase 6+):
{
  selfDirectedLearning: boolean,   // student read before practicing
  postBookPractice: boolean,       // practice was launched from book
  postBookImprovement: boolean,    // accuracy improved post-book
}
```

### 9.4 Report Visibility by Role

| Field | Parent Report | Teacher Report | School Report | Internal/Hidden |
|-------|--------------|----------------|---------------|-----------------|
| `bookReadingMinutes` | ✅ Visible | ✅ Visible | ✅ Aggregate | No |
| `bookPagesRead` | ✅ Visible | ✅ Visible | ✅ Aggregate | No |
| `postBookPracticeCount` | ✅ Visible | ✅ Visible | No | No |
| `bookSessionCount` | ✅ Visible | ✅ Visible | No | No |
| `sectionsSkipped` counts | No | Internal audit | No | ✅ Internal only |
| `hiddenTabMs` | No | No | No | ✅ Internal only |
| `sessionToken`, `sessionId` | No | No | No | ✅ Internal only |
| `postBookImprovement` | Future Phase | Future Phase | No | No |
| `selfDirectedLearning` | Future Phase | Future Phase | No | No |

### 9.5 Diagnostic Aggregation — Book Must NOT Enter

See [Section 15](#15-aggregator-integration-safety-guards) for mandatory guards and tests.

---

## 10. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **Double-counted reading time** — student navigates back, session re-fires | High | Medium | Use `sessionToken` idempotency; UPDATE existing session row rather than INSERT new one |
| **Tab idle time inflated** — student leaves browser open on book page | High | High | `visibilitychange` listener + `hiddenTabMs` tracking; use `creditedDwellMs` everywhere in reports |
| **Fast page flipping counted as reading** — student clicks through all sections in 1s | Medium | Medium | Enforce 2s dwell threshold per section; emit `book_page_skip` events; only count `sectionsViewed` in credited time |
| **Book CTA contaminating diagnosticAccuracy** — if `contextAfterBookReading` is misapplied | High | Low | Mode always set to `"learning"` by preset resolver — mode gate prevents diagnostic eligibility regardless of context flag |
| **Stale `contextAfterBookReading` leaking into future sessions** — student reads book, takes a break, comes back | High | Medium | 5-minute TTL on `sessionStorage` key; one-time consume pattern (read + delete atomically) |
| **`sessionStorage` as source of truth** — data lost on tab close, private mode | Medium | Low | `sessionStorage` is only for the `contextAfterBookReading` flag — not for session data. Session data goes to DB via API. |
| **Breaking current book navigation** — any change to `LearningPageBody` could break section carousel | Medium | Low | Implement event tracking as pure side-effects (useEffect) separate from navigation logic; no state changes in tracking code |
| **Breaking step-by-step/practice windows** — event emitters conflicting | Medium | Low | Book session events are isolated to book components; no overlap with master page logic |
| **Noisy parent report data** — small dwell times flood the report | Medium | Medium | `bookPagesRead` only where `page_read=true` (≥ 10s credited dwell); 2s is section-view only, not page-read |
| **`beforeunload` unreliable on mobile** — `book_session_end` may not fire | Medium | High | Use `navigator.sendBeacon()` for end event; also update session on `routeChangeStart` (Next.js router event) |
| **Auth not available on SSG book pages** — cannot resolve `student_id` in component | High | Certain | API route must use session cookie auth. The tracking API endpoint (not the page) authenticates the student. The page sends the event; the API resolves student identity from cookie. |
| **Sequence metadata mismatch** — `sequenceIndex` wrong for a page | Low | Low | Use registry's `getPageSequenceMeta()` which is validated at build time |
| **Large JSONB `metadata` in book tables** — slow queries | Low | Low | Keep JSONB minimal; use proper columns for queryable fields |

---

## 11. Required Test Plan

### 11.1 Unit Tests

| Test | File | Assertion |
|------|------|-----------|
| `classifyActivityEvidence("learning_book", "learning_book", {})` → `isDiagnosticEligible: false` | `tests/learning/activity-classification.test.mjs` | Existing test coverage |
| `classifyActivityEvidence("practice", "free_practice", { contextAfterBookReading: true })` → `isDiagnosticEligible: true`, `contextFlags.contextAfterBookReading: true` | `tests/learning/activity-classification.test.mjs` | Verify context flag is stored |
| `resolveMathG1PracticeTarget("ns_counting_forward")` returns `mode: "learning"` | New unit test | Preset always forces learning mode |
| Fast flip detection logic — elapsed < 2000 → skip event | New unit test (pure function) | Threshold enforced |
| `creditedDwellMs = rawDwellMs - hiddenTabMs` — correct subtraction | New unit test | Math is right |
| `normalizeLearningGameMode("learning_book")` → `"learning_book"` | Existing allowlist test | Already in allowlist |

### 11.2 API Tests

| Test | Description |
|------|-------------|
| `POST /api/learning/book-events` `{ event: "book_reading_session_start" }` with auth → 200 + `bookReadingSessionId` | Happy path |
| Same endpoint without auth → 401 | Auth guard |
| Duplicate `clientSessionToken` → 200 idempotent (no duplicate row) | Idempotency |
| `book_page_visit_end` with invalid `bookPageVisitId` → 400 | Validation |
| Batched `{ events: [...] }` processes all events atomically | Batching |
| `sendBeacon` payload to same endpoint accepted | Unload delivery |
| `POST /api/learning/answer` with `clientMeta.contextAfterBookReading: true` → stored in `context_flags` | Context flag |

### 11.3 Integration Tests

| Test | Description |
|------|-------------|
| `book_reading_sessions` + `book_page_visits` rows created via event sequence | DB write |
| `bookReadingMinutes` reflects sum of `book_page_visits.credited_dwell_ms` | Report aggregation |
| `bookPagesRead` counts only visits where `page_read = true` | Page read rule |
| Direct client SELECT on book tables blocked (no authenticated SELECT policy) | RLS |
| Parent report API returns book data via service-role aggregator only | Access path |

### 11.4 Regression Tests — Diagnostic Accuracy Exclusion (MANDATORY)

| Test | Description |
|------|-------------|
| Book rows never increment `diagnosticAnswers` | **MANDATORY** |
| Book rows never increment `diagnosticCorrect` | **MANDATORY** |
| Book rows never affect `diagnosticAccuracy` | **MANDATORY** |
| Book rows never enter topic weakness ranking | **MANDATORY** |
| Book rows only populate `learningActivity` | **MANDATORY** |
| `hiddenTabMs`, `sectionsSkipped`, internal tokens stripped from public payload | **MANDATORY** |
| Practice after book CTA (`mode="learning"`) → `isDiagnosticEligible: false` | Mode gate |
| `contextAfterBookReading: true` + `mode="practice"` → eligible with context flag | Context combo |
| Phase 5 does NOT change `monthly-persistence-reward` coin totals | Coins boundary |

### 11.5 Hidden Tab / Fast Flip Tests

| Test | Description |
|------|-------------|
| Simulated `visibilitychange` → `hidden` → `visible` → `hiddenTabMs` accumulated correctly | Unit test (pure function) |
| `creditedDwellMs` < `rawDwellMs` when `hiddenTabMs > 0` | Unit test |
| Section navigated at 1500ms → classified as `skip` not `view` | Unit test |
| Section navigated at 2500ms → classified as `view` | Unit test |
| `creditedDwellMs = 0` when entire dwell was hidden | Edge case unit test |

### 11.6 Parent / Teacher Report Consumer Tests

| Test | Description |
|------|-------------|
| Parent report shows `bookReadingMinutes > 0` when student has book sessions | Integration |
| Parent report `bookReadingMinutes` excluded from `diagnosticAccuracy` | Critical regression |
| Teacher report shows `bookPagesRead` for student who read | Integration |
| School aggregate includes book minutes correctly | Integration |
| `stripInternalReportPayloadFields` removes `hiddenTabMs`, `sectionsSkipped` from public payload | Unit test |
| `_rawActivityAccuracy` absence from meta in book-session-including report | Phase 4 regression |

---

## 12. Student Identity Verification (Correction)

### 12.1 What the Production Model Uses

**Verified against migrations and runtime code.** The app does **NOT** use `auth.users.id` as `student_id` on learning/report rows.

| Identifier | Role | Used as `student_id` on learning rows? |
|------------|------|----------------------------------------|
| `auth.users.id` | Parent account (via `parent_profiles.id`) | ❌ No |
| `public.students.id` | Child learner profile | ✅ **Yes — canonical** |
| `student_profiles.id` | School admin extension (`053_school_student_admin_profiles`) | ❌ No — references `students.id` |
| `student_sessions.id` | Login session token row | ❌ No — contains `student_id` FK to `students` |

### 12.2 Evidence (File References)

| Table / Path | FK / Usage |
|--------------|-----------|
| `learning_sessions.student_id` | `REFERENCES public.students(id)` — `001_learning_core_foundation.sql:52` |
| `answers.student_id` | `REFERENCES public.students(id)` — `001_learning_core_foundation.sql:66` |
| `student_activity_attempts.student_id` | `REFERENCES public.students(id)` — `026_student_activities.sql:121` |
| `parent_activity_attempts.student_id` | Same pattern (parent activities migration) |
| `pages/api/learning/answer.js` | `auth.studentId` from `getAuthenticatedStudentSession` → `students.id` |
| `lib/learning-supabase/student-auth.js:178-179` | `return { studentId: student.id }` — loads from `students` table |
| `lib/parent-server/report-data-aggregate.server.js` | Queries `.eq("student_id", studentId)` on sessions/answers |

### 12.3 Auth Resolution Path for Book Events

```
liosh_student_session cookie
  → student_sessions.session_token_hash lookup
  → student_sessions.student_id
  → students.id  ← this is book_events.student_id
```

Client never sends `studentId`. API resolves via `getAuthenticatedStudentSession(req)`.

### 12.4 Corrected FK (Mandatory)

```sql
student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE
```

**Do not use** `REFERENCES auth.users(id)` — would break report joins and RLS patterns.

---

## 13. Credited Dwell Policy

### 13.1 Owner-Approved Threshold Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `VIEW_THRESHOLD_MS` | **2,000** | Section technically **viewed** vs **skipped** only. Does **not** make a page count as read. |
| `PAGE_READ_THRESHOLD_MS` | **10,000** | Page counts as read (`page_read=true`) only if credited visible dwell ≥ **10 seconds**. |
| `PAGE_CREDIT_CAP_MS` | **600,000** | Max credited time per page (10 minutes). |
| `SESSION_CREDIT_CAP_MS` | **3,600,000** | Max credited time per book-reading session (60 minutes). |

**Raw dwell rule:** `raw_dwell_ms` and `total_raw_dwell_ms` must always be stored even when credited time is capped.

### 13.2 Rules Summary

| Rule | Description |
|------|-------------|
| Section viewed | Visible dwell ≥ 2s (hidden tab excluded) → `sections_viewed` |
| Section skipped | Visible dwell < 2s → `sections_skipped`; no credited time from that section |
| Page read | Credited visible dwell on page ≥ **10s** → `page_read=true` |
| Credited page time | Sum of credited visible section dwells, capped at 10 min/page |
| Credited session time | Rollup of page credits, capped at 60 min/session |
| Hidden tab | Never credited |
| `bookPagesRead` | COUNT DISTINCT `page_id` WHERE `page_read = true` (**not** 2s) |
| `bookReadingMinutes` | `sum(credited_dwell_ms) / 60000` |

### 13.3 What Is NOT Credited

- Time while tab is hidden (`document.hidden`)
- Sections with visible dwell < 2s
- Pages where credited visible dwell < 10s (`page_read=false`)
- Time above per-page or per-session caps (raw still stored for audit)

---

## 14. RLS / Security Design

### 14.1 Pattern Alignment

Follow `student_activity_attempts` pattern (`026_student_activities.sql:145-150`):
- RLS **enabled**
- **No authenticated policies** (service-role only for reads/writes via API)

### 14.2 Access Matrix

| Actor | INSERT (via API) | SELECT (direct) | SELECT (report API) |
|-------|-----------------|-----------------|---------------------|
| Student client | ✅ POST `/api/learning/book-events` only | ❌ Blocked | ❌ N/A |
| Parent (authenticated) | ❌ | ❌ Not direct table access | ✅ Via parent report API (service role) |
| Teacher | ❌ | ❌ | ✅ Via teacher report API (service role) |
| School manager | ❌ | ❌ | ✅ Via school report API (service role) |
| Service role (API handlers) | ✅ | ✅ | ✅ |

### 14.3 Policies (Draft)

```sql
ALTER TABLE public.book_reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_page_visits ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated role → direct client SELECT/INSERT blocked
-- All writes go through pages/api/learning/book-events.js using service role
-- Same pattern as student_activity_attempts
```

Optional future parent read policy (only if needed for direct Supabase client access — **not recommended for Phase 5**):
```sql
-- Only if app later queries book tables as authenticated parent:
-- USING (exists (select 1 from students s where s.id = book_page_visits.student_id and s.parent_id = auth.uid()))
```

### 14.4 API Security

- `guardCookieMutationOrigin(req, res)` — same as `/api/learning/answer`
- `getAuthenticatedStudentSession(req)` — reject 401 if no valid student cookie
- Server assigns `student_id` from auth — ignore any client-sent `studentId`
- Validate `bookReadingSessionId` ownership before accepting child page events

---

## 15. Aggregator Integration Safety Guards

When `lib/parent-server/report-data-aggregate.server.js` adds book data, these guards are **mandatory**:

```js
// 1. Separate data source — never mix book rows into answer iteration loops
const bookPageVisits = await fetchBookPageVisitsInRange(supabase, studentId, from, to);

// 2. Dedicated accumulator — learningActivity only
function accumulateBookReading(learningActivity, visit) {
  learningActivity.bookReadingMinutes += visit.credited_dwell_ms / 60000;
  // NEVER touch: diagnosticAnswers, diagnosticCorrect, diagnosticAccuracy
}

// 3. Explicit exclusion guards in answer aggregation loops
if (row.source === "book_page_visits" || row.source === "book_reading_sessions") {
  throw new Error("book rows must not enter answer aggregation");
}

// 4. Never call classifyActivityEvidence on book rows

// 5. Never add book time to topic weakness / skill ranking

// 6. stripInternalReportPayloadFields must remove:
//    hiddenTabMs, sectionsSkipped, clientSessionToken, clientVisitToken,
//    bookReadingSessionsInternal (if present)
```

### Mandatory Test Assertions

| Guard | Test |
|-------|------|
| `diagnosticAnswers` unchanged by book data | `phase5-book-tracking.test.mjs` |
| `diagnosticCorrect` unchanged | same |
| `diagnosticAccuracy` unchanged | same |
| Topic weakness ranking unchanged | same |
| `learningActivity.bookReadingMinutes` populated | same |
| Public payload has no `hiddenTabMs` | `stripInternalReportPayloadFields` test |

---

## 16. Coins / Monthly Progress Boundary

### 16.1 Current State

`lib/learning-supabase/monthly-persistence-reward.server.js` queries **`learning_sessions.duration_seconds` only**. Book reading does not create `learning_sessions` rows today, so book time does **not** affect coins or monthly progress.

### 16.2 Phase 5 Scope (Recommended)

| In scope | Out of scope |
|----------|--------------|
| Persist book reading to `book_reading_sessions` + `book_page_visits` | Award coins for book reading |
| Expose `learningActivity.bookReadingMinutes` in reports | Modify `monthly-persistence-reward.server.js` |
| Prepare `credited_dwell_ms` fields for future Phase 9 | Change monthly coin milestone calculations |
| Store data queryable by Phase 9 | Double-count book time in existing minute totals |

**Phase 9** ("Single Truth for Coins / Time / Monthly Progress") will decide whether book `credited_dwell_ms` feeds coin milestones. Phase 5 only lays persistence groundwork.

### 16.3 Explicit Test

`monthly-persistence-reward` totals unchanged after book reading session — regression test required.

---

## 17. Book CTA Mode Rule

### 17.1 Current Behavior (Confirmed)

All `resolve*PracticeTarget` functions return `mode: "learning"`. Book CTA always lands student in guided learning mode on the master page.

### 17.2 Implementation Rule (Mandatory)

> **Phase 5 must NOT change book CTA mode from `"learning"` to `"practice"`.**

Rationale:
- Changing CTA to `mode="practice"` would be a **product decision** with diagnostic impact
- Could affect `diagnosticAccuracy` for students who click CTA without truly independent practice
- If post-book independent diagnostic practice is desired, that requires **separate owner approval** and explicit UX (e.g., separate "תרגל בעצמך" button)

Phase 5 may add `contextAfterBookReading` annotation but must preserve `mode: "learning"` on all CTA presets.

**Owner-confirmed scope:**
- CTA stays `mode="learning"` — not diagnostic
- `contextAfterBookReading` is annotation only
- First answer in `mode="practice"` only, after one-time context consume
- Not whole session unless later approved

---

## 18. Feature Flags, SQL Execution, UI Boundary

### 18.1 Feature Flags (Exact Names)

| Flag | Scope | When `"false"` |
|------|-------|----------------|
| `NEXT_PUBLIC_LEARNING_BOOK_TRACKING_ENABLED` | Client tracker | No-op tracker; no events emitted |
| `LEARNING_BOOK_TRACKING_ENABLED` | Server API + aggregator | API returns disabled; reports skip book tables |

Default: enabled unless explicitly `"false"`. Rollback does not change navigation or CTA.

### 18.2 SQL Execution Rule

- Migration file: `supabase/migrations/056_book_reading_tracking.sql` — **create only**
- Agent does **not** run SQL against any database unless owner explicitly instructs
- Owner applies migration manually when ready

### 18.3 UI / Report Visibility Boundary

Phase 5 may add to report payload: `bookReadingMinutes`, `bookReadingBySubject`, `bookPagesRead`, `bookSessionCount`, `postBookPracticeCount`.

**Not allowed without owner approval:** new Hebrew UI text, new report components, CSS changes. Existing generic `learningActivity` renderers may consume new fields if safe.

---

## 19. Implementation Plan Reference

Detailed implementation steps are in a separate document to keep this audit focused on architecture:

**[`PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md`](./PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md)**

Contains: exact files, migration draft, API handler design, client tracking helper, aggregator changes, tests, rollback plan, manual QA checklist.

---

## Appendix A — Book Subjects and Grade Coverage

| Subject | Grades |
|---------|--------|
| Math | g1, g2, g3, g4, g5, g6 |
| Geometry | g1, g2, g3, g4, g5, g6 |
| Science | g1, g2, g3, g4, g5, g6 |
| Hebrew | g1, g2, g3, g4, g5, g6 |
| English | g1, g2, g3, g4, g5, g6 |
| Moledet | g2, g3, g4 |
| Geography | g5, g6 |

Total authored books: **35**

## Appendix B — SessionStorage Keys (Current)

| Key Pattern | Set By | Consumed By | Purpose |
|-------------|--------|-------------|---------|
| `mleo_math_g{N}_book_learning_resume_v1` | `saveMathGNBookLearningSnapshot` in math-master | `consumeMathGNBookLearningSnapshot` on re-mount | Restore learning session state after returning from book |
| `mleo_math_g{N}_book_practice_preset_v1` | `saveMathGNBookPracticePreset` in LearningPageBody | `consumeMathGNBookPracticePreset` in math-master | Apply book-CTA practice configuration on master load |
| `mleo_{subject}_{grade}_book_learning_resume_v1` | Generic nav: `saveLearningBookLearningSnapshot` | `consumeLearningBookLearningSnapshot` | Same for non-Math subjects |
| `mleo_{subject}_{grade}_book_practice_preset_v1` | Generic nav: `saveLearningBookPracticePreset` | `consumeLearningBookPracticePreset` | Same for non-Math subjects |
| `liosh_lastBookContext_v1` | **NOT YET CREATED** — proposed for Phase 5 | All 6 master pages on mount | `contextAfterBookReading` signal |
| `liosh_book_reading_session_v1` | **NOT YET CREATED** — proposed for Phase 5 | `LearningPageBody` tracking helper | Persist `clientSessionToken` across page navigations |

## Appendix C — Document Index

| Document | Purpose |
|----------|---------|
| `PHASE_5_LEARNING_BOOK_TRACKING_ARCHITECTURE_AUDIT.md` | Architecture map (this file) |
| `PHASE_5_LEARNING_BOOK_TRACKING_IMPLEMENTATION_PLAN.md` | Step-by-step implementation plan |

---

## Certification

**NO APPLICATION CODE CHANGES WERE MADE.**  
Revision 3 updated audit/plan documentation only.  
No migrations applied, no UI/Hebrew/CSS changes, no commits/pushes/deploys.  
Phase 5 **implementation is approved** per Implementation Plan Revision 3; SQL apply remains manual owner action.
