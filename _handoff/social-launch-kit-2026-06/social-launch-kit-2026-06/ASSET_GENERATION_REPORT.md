# Asset Generation Report — Social Launch Kit 2026-06

**Generated:** 2026-06-02  
**Output folder:** `_handoff/social-launch-kit-2026-06/`  
**ZIP:** `_handoff/social-launch-kit-2026-06.zip`

---

## Commands run

```bash
# Directory setup
New-Item -ItemType Directory -Force _handoff/social-launch-kit-2026-06/assets/source, assets/final, scripts

# Asset generation (run twice — second run after render fix)
node _handoff/social-launch-kit-2026-06/scripts/generate-kit.mjs

# Render validation test
node _handoff/social-launch-kit-2026-06/scripts/test-render.mjs

# ZIP packaging
Compress-Archive -Path _handoff/social-launch-kit-2026-06/* -DestinationPath _handoff/social-launch-kit-2026-06.zip -Force
```

**Base URL used:** `https://liosh-website.vercel.app` (default; override via `SOCIAL_KIT_BASE_URL`)

---

## Pages inspected

| Route | Method |
|-------|--------|
| `/` | Playwright mobile viewport + crop |
| `/parent/login` | Playwright screenshot |
| `/student/login` | Playwright screenshot |
| `/learning` | Playwright screenshot |
| `/help` | Playwright screenshot |
| `/about` | Playwright screenshot |
| Help-center demo PNGs | Direct download from production |

**Codebase review (no runtime):** `pages/index.js`, `components/Layout.js`, `styles/globals.css`, `public/manifest.json`, `pages/contact.js`, `pages/about.js`, `pages/learning/index.js`, help-center content.

---

## Screenshots captured

| File | Result |
|------|--------|
| `parent-login.png` | ✅ OK |
| `learning-hub.png` | ✅ OK (2nd run; 1st run timed out on networkidle) |
| `student-login.png` | ✅ OK |
| `help-center-home.png` | ✅ OK |
| `about-page-mobile.png` | ✅ OK |
| `homepage-parent-student-crop.png` | ✅ OK — teacher portal cropped out |
| `parent-report-help.png` | ✅ OK — demo help asset |
| `learning-subjects-help.png` | ✅ OK — demo help asset |
| `logo-coin.png` | ✅ OK |
| `logo-icon-512.png` | ✅ OK |

Log: `generation-log.json`

---

## Marketing assets created (15 PNGs)

All under `assets/final/` — see `VISUAL_ASSET_INVENTORY.md` for full list.

Render method: HTML templates (RTL Hebrew, Segoe UI) → Playwright `file://` navigation → PNG export.  
Product insets: base64-free relative paths to source screenshots.

---

## Redactions performed

- Homepage: **crop** excludes "פורטל מורים" card.
- Final posts use **help-center demo** parent report (no real family data).
- No credentials printed in any report or markdown file.
- `parent-login.png` **not** embedded in finals (teacher-adjacent placeholder on live form).

---

## Intentionally excluded

| Item | Reason |
|------|--------|
| Teacher portal marketing | Launch scope: parent/child only |
| School / private teacher features | Future/conditional — per brief |
| Full homepage with 3 portals | Teacher card visible |
| Live authenticated dashboards | No demo credentials exported |
| URLs baked into PNG images | Soft CTAs in copy only |
| Fake testimonials / ministry claims | Policy |
| `node_modules`, `.env`, `.next` | Not packaged in ZIP |

---

## Verification performed

- [x] All 15 required final PNG filenames present
- [x] Hebrew RTL rendered correctly (visual review of sample assets)
- [x] File sizes >> 5KB (valid renders; initial broken run produced ~5KB blanks — fixed)
- [x] No teacher/school/private-teacher copy in marketing documents
- [x] No secrets/credentials in outputs
- [x] Isolated under `_handoff/` only — no product code/routes/Hebrew UI changed

---

## Copy documents created

1. `README.md`
2. `SOCIAL_LAUNCH_STRATEGY_HE.md`
3. `FACEBOOK_PAGE_SETUP_HE.md`
4. `FACEBOOK_POSTS_HE.md`
5. `INSTAGRAM_STORIES_HE.md`
6. `PARENT_GROUP_POSTS_HE.md`
7. `PERSONAL_PROFILE_POST_HE.md`
8. `FAQ_FOR_PARENTS_HE.md`
9. `VISUAL_ASSET_INVENTORY.md`
10. `ASSET_GENERATION_REPORT.md` (this file)

---

## ZIP path

`_handoff/social-launch-kit-2026-06.zip`

Contents: entire `social-launch-kit-2026-06/` folder (docs, scripts, assets/source, assets/final).  
Excludes: `node_modules`, `.env`, credentials, unrelated repo files.

---

## Git status summary

At generation time, `_handoff/` was **untracked** (new folder only from this task).  
Pre-existing modified files elsewhere in the repo were **not** touched by this work.

---

## Confirmations

| Action | Status |
|--------|--------|
| Commit | ❌ Not performed |
| Push | ❌ Not performed |
| Deploy | ❌ Not performed |
| SQL | ❌ Not run |
| Product logic / routes / Hebrew UI changes | ❌ None |
| Teacher/school/private-teacher marketing | ❌ Excluded |

---

## Known issues / follow-ups

1. Live parent login placeholder still says "שקיבלתם מהמורה" — product copy issue; marketing kit avoids that screenshot in finals.
2. First script run used `setContent` + Google Fonts → blank PNGs; fixed via file-based HTML + system fonts.
3. Facebook cover mobile crop — keep text in right-center safe zone (already applied).

---

## Revision pass — 2026-06-02 (pre-launch review)

### What was fixed

| Item | Change |
|------|--------|
| `fb-post-03-parent-report.png` | Inset replaced: `short-report` (demo name "דניאל י" in header) → `summary-card` stats demo (**no child name**) |
| `fb-post-04-child-practice.png` | Inset replaced: mistaken student-login capture from `/learning` redirect → help-center **subject/learning hub** demo (fallback: question screen) |
| Docs | Clarified "מנהל/ת **הקבוצה**" (Facebook group admin, not school manager); "ניהול כיתות" vs grade levels א׳–ו׳ |
| `generate-kit.mjs` | Added `parent-report-summary-help.png`, `student-question-help.png`; marked `parent-report-help.png` / `learning-hub.png` as reference-only |

### Terminology preserved

- **"גאומטריה"** left unchanged wherever it appears (e.g. `FACEBOOK_POSTS_HE.md` post 4 body). **No terminology replacement was run.**

### Confirmations (revision)

| Check | Status |
|-------|--------|
| No teacher/school/private-teacher/**institutional** marketing in final docs or PNGs | ✅ Verified (FAQ/disclaimers use negative wording only — "לא מחליף בית ספר/מורה") |
| No sensitive child/account data in final assets | ✅ No names, credentials, emails, or IDs in final PNGs |
| No commit / push / deploy / SQL | ✅ |
| ZIP regenerated | ✅ `_handoff/social-launch-kit-2026-06.zip` |

**Regeneration command (revision):**

```bash
node _handoff/social-launch-kit-2026-06/scripts/generate-kit.mjs
Compress-Archive -Path _handoff/social-launch-kit-2026-06 -DestinationPath _handoff/social-launch-kit-2026-06.zip -Force
```

---

## Text cleanup — 2026-06-02

Fixed accidental Hebrew/English/Cyrillic hybrid typos in copy docs only (no image or structure changes):

| File | Before | After |
|------|--------|-------|
| `FACEBOOK_POSTS_HE.md` | `לא מараthon אחד גדול` | `לא מרתון אחד גדול` |
| `PERSONAL_PROFILE_POST_HE.md` | `אופצional` | `אופציונלית` |
| `FAQ_FOR_PARENTS_HE.md` | `לא מרathon` | `לא מרתון` |
| `FAQ_FOR_PARENTS_HE.md` | `רשmiית` | `רשמית` |
| `PARENT_GROUP_POSTS_HE.md` | `פידbck` | `פידבק` |

**Terminology:** **"גאומטריה"** unchanged. Full re-scan of Hebrew `.md` docs found no remaining corrupted hybrids.

**Confirmations (text cleanup):**

| Check | Status |
|-------|--------|
| No image redesign | ✅ |
| No code/product changes | ✅ |
| No commit / push / deploy / SQL | ✅ |
| ZIP regenerated | ✅ `_handoff/social-launch-kit-2026-06.zip` |
