# Grade 1 Geometry Learning Book — Owner Signoff

**Status:** Content **owner-approved** (documentation gate). Runtime wiring **not** started.  
**Date:** June 2026  
**Book (child-facing):** ספר גאומטריה — כיתה א׳  
**Draft folder:** `docs/learning-book/geometry/g1/drafts/`

---

## 1. Executive Summary

The **Grade 1 Geometry Learning Book** Hebrew content package is **accepted** as the full book for the current curriculum spine (3 teachable pages).

| Item | Status |
|------|--------|
| Pages approved | **3** — `shapes_basic_square`, `shapes_basic_rectangle`, `transformations` |
| Spine alignment | Matches `subject: geometry`, `minGrade ≤ 1`, `maxGrade ≥ 1` (excluding `no_question`) |
| `approval_status` on draft files | Still **`draft`** until a separate runtime/implementation task updates metadata |
| Hebrew titles in draft files | Still carry **`[DRAFT — not owner-approved]`** marker until implementation pass |
| Runtime routes | ✅ Wired — `/learning/book/geometry/g1` (3 pages); practice CTA off |

---

## 2. Owner Decisions (Recorded)

| # | Decision |
|---|----------|
| 1 | The **3-page book** is approved as the complete Grade 1 Geometry book per spine: **הכרת הריבוע**, **הכרת המלבן**, **הזזה ושיקוף — היכרות**. |
| 2 | Child-facing book name: **גאומטריה**, not **הנדסה**. |
| 3 | Term **זווית ישרה** is acceptable in Grade 1 when explained simply (straight / box-corner intuition). |
| 4 | **transformations** page: **הזזה + שיקוף only** — **no rotation** in Grade 1. |
| 5 | Visual illustrations/assets: deferred to **runtime/implementation review** (drafts remain word-based). |

---

## 3. Approved Page Inventory

| learning_page_id | skill_id | File | Hebrew title |
|------------------|----------|------|--------------|
| `geometry:g1:shapes_basic_square` | `geometry:kind:shapes_basic_square` | `shapes_basic_square.md` | הכרת הריבוע |
| `geometry:g1:shapes_basic_rectangle` | `geometry:kind:shapes_basic_rectangle` | `shapes_basic_rectangle.md` | הכרת המלבן |
| `geometry:g1:transformations` | `geometry:kind:transformations` | `transformations.md` | הזזה ושיקוף — היכרות |

**Not in book:** `geometry:kind:no_question` (meta). `book_placeholder.md` is infrastructure only.

---

## 4. Content Boundaries (Confirmed)

| Topic | In scope (G1) | Out of scope |
|-------|---------------|--------------|
| Square / rectangle | זיהוי, שמות, צלעות, זווית ישרה בפשטות | שטח, היקף, נוסחאות |
| Transformations | הזזה, שיקוף | סיבוב (G3+ in spine) |
| Illustrations | Words only in approved drafts | Assets at implementation |

---

## 5. Resolved Owner Questions (from Plan)

| Question | Resolution |
|----------|------------|
| Approve 3 pages as full G1 book? | **Yes** |
| גאומטריה vs גאומטריה? | **גאומטריה** |
| G1 transformations without rotation? | **Yes** |
| זווית ישרה in G1? | **Yes**, simple explanation |
| Visual diagrams? | **Later** — implementation |
| Practice CTA mapping? | **Separate task** after runtime insertion |

---

## 6. Explicit Stop Rule (Still Active)

Until the **runtime insertion** task is explicitly started:

- No design, CSS, theme, reader shell changes for this approval
- No learning-book registry, routes, loaders, SQL
- No commit, push, or deploy required by this signoff

**Next step (later, separate task):** Insert approved content into learning-book pages at runtime.

---

## 7. Related Documents

| Document | Role |
|----------|------|
| `GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Curriculum plan (updated with approval status) |
| `GEOMETRY_GRADE_1_HEBREW_REVIEW_PACK.md` | Full Hebrew text snapshot for reference |
| `geometry/g1/drafts/README.md` | Draft folder status |
| `scripts/verify-geometry-g1-book-content.mjs` | Structural/content checks (unchanged gate) |
