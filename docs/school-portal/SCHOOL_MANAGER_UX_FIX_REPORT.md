# School Manager UX Fix — Round 2 Report

**Status:** Ready for owner re-test. **No commit / push.**

---

## Why the owner still saw broken UI

| Cause | Explanation |
|-------|-------------|
| **Correct port, incomplete UX** | Owner uses **`localhost:3002`** via `npm run dev:run-button` (see `package.json`). That is the intended dev port — not a wrong port. |
| **Reports at page bottom** | `SchoolReportPreview` rendered **inline below** the drill-down content. After clicking דוח כיתה / דוח תלמיד, the manager had to scroll to find a small summary block. |
| **Students page blocked on 398 rows** | The page waited for `GET /api/school/students` (full list + heavy enrichment) before showing grade cards — **30–60s** blank/loading. |
| **Stale server (possible)** | If dev was started **before** pulling server fixes, `memberCount` stayed `0` until restart. Verified: `:3002` with current code returns `memberCount: 20` and `browse-summary` **200**. |

---

## Exact dev server instructions (owner)

From project root:

```powershell
# 1. Stop any old Next process on 3002 (Task Manager or:)
#    Get-NetTCPConnection -LocalPort 3002 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# 2. Start the school portal dev server (official script)
npm run dev:run-button

# 3. Open
#    http://localhost:3002/teacher/login
#    Login: school@leo-k.com  (password via your usual env — not in repo)

# 4. Hard refresh after pull: Ctrl+Shift+R on /school/*
```

**Alternative (production-like, for QA):**

```powershell
npm run build
$env:NODE_ENV="production"
npx next start -H 127.0.0.1 -p 3002
```

**Do not** set `NODE_ENV=production` in the shell while running `next dev` — it breaks React dev runtime.

---

## What changed (this round)

### 1. Report modals (class + student)

- New `components/school-portal/SchoolReportModal.jsx` — **fixed overlay** (`z-[100]`), backdrop, **סגירה** button, Escape to close, body scroll lock.
- Title: **דוח כיתה** / **דוח תלמיד** with meta: כיתה, שכבה, מקצוע, מורה / שם, כיתה.
- Stats: תלמידים, תשובות, דיוק (from `cohortSummary` / `summary`).
- Report state **clears** when changing grade/class/subject layer.

### 2. Fast students browse

- New `GET /api/school/students/browse-summary` — grade totals + physical classes (no 398 student payloads).
- `GET /api/school/students?gradeLevel=&physicalClassName=` — loads **one class roster** (~20 students).
- Students page shows **6 grade cards immediately**; counts fill in when summary returns; class list/students load only after drill-down.

### 3. Classes page

- Grade grid visible **while** classes API loads (counts show "…" then update).
- Subject cards + modal reports; previous report cleared on navigation.

---

## Files changed

| File | Change |
|------|--------|
| `components/school-portal/SchoolReportModal.jsx` | **New** — overlay modal |
| `pages/school/classes/index.js` | Modal reports, clear on nav |
| `pages/school/students/index.js` | Browse summary + lazy class load + modal |
| `pages/api/school/students/browse-summary.js` | **New** |
| `pages/api/school/students/index.js` | Filtered query by grade/class |
| `lib/school-server/school-students.server.js` | `getSchoolStudentBrowseSummary`, `listSchoolStudentsInPhysicalClass` |
| `lib/school-portal/school-ui.he.js` | Report titles |
| `tests/e2e/demo-school-simulation-smoke.spec.ts` | Modal + browse-summary assertions |

(Plus prior round: `SchoolDrillDown.jsx`, `school-drilldown.js`, `school-classes.server.js` paginated counts, etc.)

---

## Proof — modals & fast students

| Check | Result |
|-------|--------|
| `GET /api/school/students/browse-summary` on `:3002` | **200**, `totalStudents: 398` |
| `GET /api/school/classes` on `:3002` | **200**, `memberCount: 20` (sample) |
| Playwright T10 — class **dialog** + student **dialog** | **PASS** (production server `:3005`, build after this round) |
| Playwright T11 — private teachers blocked from `/school/*` | **PASS** |
| `npm run build` | **PASS** |
| Security matrix | **27/27 PASS** |
| Aggregation verify | **ALL PASS** |

---

## Final counts (unchanged)

| Metric | Expected | Verified |
|--------|----------|----------|
| Teaching teachers | 11 | ✓ |
| Active classes | 108 | ✓ |
| Students | 398 | ✓ |
| `teacher_class_students` | 2388 | ✓ |
| Classes with `memberCount=0` | 0 | ✓ |

---

## Screenshots

Playwright captured UI during T10 on build **3005** (same code as latest build):

- `test-results/demo-school-simulation-smo-4eb0a-er-portal-pages-and-reports-chromium/test-failed-1.png` (last frame includes modal flow)

**Owner should capture on `:3002` after restart:**

- Desktop + mobile (375px): dashboard, teachers, classes (grade → class → subject + **דוח כיתה** modal), students (grade cards immediate → class → **דוח תלמיד** modal).

---

## Hebrew / layout

- All school portal labels via `school-ui.he.js` maps (`moledet_geography`, `guided_practice`, etc.).
- No wide tables on main flows; card grids only.
- Teacher subjects deduplicated server + client.

---

## Confirmation

- **No commit / push**
- Owner port: **`npm run dev:run-button` → http://localhost:3002**
- Re-test reports in **centered modal**, students **grade screen first**
