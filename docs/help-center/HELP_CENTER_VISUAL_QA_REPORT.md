# Help Center — Final Visual QA Audit Report

**Audit type:** Read-only re-audit (no fixes applied in this run)  
**Audit timestamp:** `2026-05-24T17:26:12.085Z`  
**Environment:** `http://127.0.0.1:3001` (Next.js dev)  
**Viewports:** Desktop 1366×900, Mobile 390×844  
**Scope:** `/help/**` — routes, screenshots, RTL, overflow, links, privacy. **Excluded:** videos, legal/security/policy, product logic, Hebrew copy edits, design/CSS changes.

---

## A. Executive summary

| Dimension | Verdict |
|-----------|---------|
| **Final status** | **PASS** |
| Route coverage (47 routes × 2 viewports) | **PASS** — 94/94 HTTP 200, RTL OK, no horizontal scroll |
| Screenshots (in-page figures) | **PASS** — **0 BLOCKER**, **0 FAIL**, **0 MINOR** (automated), **90/90 PASS** |
| PNG file gates (`public/`) | **PASS** — 135/135 present; 0 files over height cap |
| Data-safety review | **PASS** — 135/135 approved, `publishAllowed: true` |
| `/help` link graph | **PASS** — 0 broken internal `/help/**` links |
| Privacy (automated text scan) | **PASS** — 0 hits |
| Text / design / `HelpScreenshot` / product pages | **PASS** — no git diff in content or component |
| **`npm run build`** | **Not run** (out of scope for this audit) |

### Can Help Center **screenshots** phase be closed?

**Yes.** This re-audit confirms the prior screenshot-fix report: assets load correctly, crops are within file-height caps, and browser QA shows **0 BLOCKER / 0 FAIL** on all figures.

### Sign-off counters (mandatory thresholds)

| Metric | Result |
|--------|--------|
| Route-level BLOCKER | **0** |
| Screenshot BLOCKER | **0** |
| Screenshot FAIL | **0** |
| Screenshot PASS | **90 / 90** |
| Broken `/help/**` links | **0** |

---

## B. Route coverage table

**Registry alignment:** Audit route list matches `qa-evidence-audit/help-center-visual-qa/run-audit.mjs` → `SECTION_ROUTES` (same articles as `data/help-center/content/*.js` via `screenshotBlock` registry).  
**47 unique routes** × 2 viewports = **94** page loads.

| Check | Desktop | Mobile |
|-------|---------|--------|
| HTTP 200 | 47/47 | 47/47 |
| `dir="rtl"` present | 47/47 | 47/47 |
| Horizontal page scroll | 0 routes | 0 routes |
| Missing screenshot placeholder (`תמונת מסך תתווסף בקרוב`) | 0 | 0 |
| Screenshot load error (`לא ניתן לטעון`) | 0 | 0 |

**Full machine-readable table:** `qa-evidence-audit/help-center-visual-qa/report-summary.json` → `routeTable` (all routes **PASS** for layout; screenshot column **PASS** or **N/A**).

**Routes without screenshot figures (N/A):** `/help`, `/help/parents`, `/help/students`, `/help/parent-report`, `/help/subjects`, and text/video-only articles (`troubleshooting-login`, `privacy-and-data`, `hints-and-explanations`, `tips-for-good-practice`).

---

## C. Screenshot audit table

**Grading (automated in `run-audit.mjs`):**

| Grade | Rule |
|-------|------|
| **BLOCKER** | Not loaded / blank; placeholder; mobile serves non-`/mobile/` asset; mobile display &gt;520px with extreme aspect |
| **FAIL** | Overflow figure; mobile &gt;520px tall strip; desktop figure display &gt;960px |
| **MINOR** | Missing alt; stretch hint; small figure |
| **PASS** | Otherwise |

**Result:** **90 figures — all PASS.** No BLOCKER, FAIL, or MINOR in `audit-results.json`.

**PNG file dimensions** (`check-png-heights.mjs`): mobile ≤520px, tablet ≤700px, desktop ≤960px file height — **0 violations** across **135** files.

### Advisory (non-blocking) — mobile displayed height 401–519px

Automated status remains **PASS** (threshold FAIL at &gt;520px display). These are within the “up to 500px exceptional” band; no full-page strips:

| Route | Asset (mobile) | Display height | Why not blocking |
|-------|----------------|----------------|------------------|
| `/help/parents/create-parent-account` | `login.png` | ~428px | Login form crop; readable |
| `/help/parents/parent-copilot` | `copilot-panel.png` | ~481px | Panel section crop |
| `/help/parents/student-pin-and-credentials` | `pin-display.png` | ~519px | At cap; demo UI only — manual: confirm no real PIN |
| `/help/students/daily-missions` | `missions.png` | ~443px | Missions card block |
| `/help/students/monthly-persistence` | `persistence.png` | ~443px | Same pattern |
| `/help/students/avatar-and-profile` | `avatar.png` | ~481px | Avatar modal crop |
| `/help/students/offline-games` | `offline.png` | ~518px | Game list section; not full viewport strip |
| `/help/parent-report/recommendations` | `recommendations.png` | ~423px | Section crop (was former BLOCKER) |
| `/help/parent-report/detailed-report` | `letter.png` | ~502px | Single subject letter block |
| `/help/parent-report/printing-and-pdf` | `pdf.png` | ~497px | Toolbar + PDF control |
| `/help/subjects/*` | `question.png` / `explanation.png` | ~457–519px | Game/modal boards; file height ≤520px; mobile `currentSrc` uses `/mobile/` |

**Former BLOCKER routes (verified PASS):** `/help/parents/monthly-rewards` (mobile), `/help/parent-report/recommendations` (mobile).

**Desktop parent-report:** No multi-thousand-pixel displayed columns; largest audited desktop figures within PASS (e.g. `detailed-report` link crop, `topics-table` section).

---

## D. Mobile-specific issues

1. **Tall strips:** **None** failing audit thresholds.  
2. **Horizontal scroll:** **None.**  
3. **Mobile assets:** All audited mobile figures use `currentSrc` containing `/mobile/` (no desktop fallback flagged).  
4. **TOC / layout:** Mobile `<details>` TOC; sticky desktop TOC hidden — **PASS** (visual evidence in `mobile/*.png`).

---

## E. Desktop-specific issues

**None failing.** Parent-report desktop screenshots are section crops (not full report columns). Subject desktop `explanation` assets for math/geometry/science captured at **820×420** file size to avoid CSS upscale to ~1500px display.

---

## F. Broken links / navigation

| Check | Result |
|-------|--------|
| Header/footer “מרכז עזרה” from `/` | **PASS** — `href="/help"` |
| Internal `/help/**` links (crawl from desktop articles) | **PASS** — **0** broken |
| Breadcrumbs / hub cards | **PASS** (spot-checked via route loads) |

`audit-results.json` → `brokenLinks: []`

---

## G. Privacy / data

| Check | Result |
|-------|--------|
| Email / phone patterns in page text samples | **0 hits** |
| `privacyHits` in audit | **[]** |
| Demo names (`ישראל ישראלי`, `ADMIN`) | Allowed in demo context |
| `help:data-safety-review` | **135/135 approved** |

**Manual note:** `student-pin-and-credentials` — screenshot shows demo PIN UI; ensure production captures never contain a real family PIN (data-safety approved for current assets).

---

## H. Text / design safety (git verification)

| Path | Changed in working tree? |
|------|--------------------------|
| `data/help-center/content/**` | **No** |
| `components/help/HelpScreenshot.js` | **No** |
| `pages/help/**` | **No** |
| Legal / security / policy | **No** |

This audit run did **not** modify Hebrew copy, layout CSS, or product logic.

---

## I. Scope boundary — files changed vs approved list

### Approved areas (expected)

| Category | Paths |
|----------|--------|
| Screenshot assets | `public/help-center/screenshots/**` (90 modified PNGs in `git status`) |
| QA evidence | `qa-evidence-audit/help-center-visual-qa/**` |
| QA/capture scripts | `scripts/help-center/capture-*.mjs`, `data-safety-review.mjs`, `sync-screenshots-to-public.mjs`, `recapture-visual-fix-jobs.mjs`, `delete-recapture-raws.mjs` |
| Report | `docs/help-center/HELP_CENTER_VISUAL_QA_REPORT.md` (this file) |

### Changes **outside** the narrow approved list (report only — not fixed in this audit)

| File / area | What changed | Related to screenshots? |
|-------------|--------------|-------------------------|
| `package.json` | Added `help:capture:visual-fix`, `help:sync-screenshots-public`, etc. | **Yes** — capture/QA tooling |
| `data/help-center/_capture-state.json` | Capture batch hashes / state | **Yes** — pipeline metadata |
| `data/help-center/screenshots-manifest-approved.json` | Manifest checksums | **Yes** — publish gate |
| `docs/help-center/CAPTURE-PROGRESS-B.json` | Batch B progress log | **Yes** — capture ops |
| `docs/help-center/CAPTURE-PROGRESS-VISUAL-FIX.json` | Visual-fix batch log | **Yes** — capture ops |
| `docs/help-center/VIDEO_*.md`, `STUDENT_LEARNING_VIDEO_*.md` | Video planning docs (untracked) | **No** — separate initiative |
| `scripts/parent-video-pilot/**` | Video pilot capture scripts (untracked) | **No** — videos out of scope |
| `qa-evidence-audit/parent-video-pilot/**` | Video pilot evidence (untracked) | **No** |
| `.cursor/plans/video_tutorials_master_plan_doc_*.plan.md` | Cursor plan | **No** |

**No product page or Help article source files were modified.**

---

## J. Changed files summary (`git status --short`)

Run: `git status --short` on **2026-05-24** after this audit.

| Category | Count (approx.) | Notes |
|----------|-----------------|--------|
| `public/help-center/screenshots/**` | 90 modified | Published PNG assets |
| `qa-evidence-audit/help-center-visual-qa/**` | 30+ modified, several new | Audit runner, results, route PNGs |
| `scripts/help-center/**` | 3 modified, 3 new | Capture + sync |
| `data/help-center/**` | 2 modified | State + manifest |
| `docs/help-center/` | 1 new report + progress JSON + video docs (untracked) | Report + ops logs |
| `package.json` | 1 modified | npm scripts |
| Unrelated (video pilot) | many untracked | See boundary table |

Full listing: execute `git status --short` in repo root (output preserved in audit workspace).

---

## K. Commands run (this audit)

| Command | Exit code |
|---------|-----------|
| `node qa-evidence-audit/help-center-visual-qa/check-png-heights.mjs` | **0** |
| `node qa-evidence-audit/help-center-visual-qa/run-audit.mjs --base-url=http://127.0.0.1:3001` | **0** |
| `node qa-evidence-audit/help-center-visual-qa/build-report-summary.mjs` | **0** |
| `npm run help:verify` | **0** |
| `npm run help:data-safety-review` | **0** |
| `npm run build` | **Not run** |

**Evidence outputs:**

- `qa-evidence-audit/help-center-visual-qa/audit-results.json`
- `qa-evidence-audit/help-center-visual-qa/report-summary.json`
- `qa-evidence-audit/help-center-visual-qa/desktop/*.png` (47 full-page)
- `qa-evidence-audit/help-center-visual-qa/mobile/*.png` (47 full-page)
- `qa-evidence-audit/help-center-visual-qa/issues/*.png` (historical “before” samples)

---

## L. Final verdict

| Question | Answer |
|----------|--------|
| **PASS / PARTIAL / FAIL?** | **PASS** |
| Close Help Center **screenshots** phase? | **Yes** |
| 0 BLOCKER / 0 FAIL on screenshots? | **Confirmed** (90/90 PASS; see `audit-results.json`) |
| Any scope violation? | **Minor:** video-pilot files and video docs in tree are **unrelated** to screenshot sign-off; capture `data/` + `package.json` are pipeline-related, not product UI |
| Commit / push in this audit? | **No** |

---

*Generated by final read-only re-audit. No code, copy, CSS, or asset fixes were applied during this run.*
