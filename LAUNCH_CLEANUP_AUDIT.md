# LAUNCH_CLEANUP_AUDIT — מיפוי לפני Git השקה נקי

**פרויקט:** `leo-k-kids-site` (Next.js 15, Pages Router)  
**תאריך סריקה:** 2 ביולי 2026  
**מטרה:** מיפוי בלבד — ללא שינוי קוד, מחיקה, או commit  
**סטטוס Git נוכחי:** ~26,689 קבצים tracked; ~131,050 קבצים ignored (כולל `node_modules`, build artifacts)

---

## סיכום מנהלים

| מדד | ערך |
|-----|-----|
| גודל כולל בדיסק (משוער) | ~14+ GB |
| `reports/` (מקומי) | 91,412 קבצים · ~12.2 GB — **רובו לא ב-Git** |
| `qa-evidence-audit/` (ב-Git) | 12,342 קבצים — **סרטוני QA / pilot** |
| `exports/` (ב-Git) | 5,199 קבצים — **מקור תוכן ספרי למידה, לא runtime** |
| `public/` (ב-Git) | 1,684 קבצים · ~1.2 GB — **נכסי production** |
| `supabase/migrations/` | 90 migrations — **חובה** |
| קבצי `.env` בדיסק | 5 קבצים — **אסור ב-Git** |

**ממצא קריטי:** חלק מהנתיבים שנראים "זבל" (למשל `components/prototypes/dev/`) **מחוברים לקוד production** — לא למחוק בלי בדיקה.  
**ממצא אבטחה:** `pages/dev/*` נגישים ב-production ללא `getServerSideProps` guard (רק `noindex`). דורש החלטת בעלים.

---

## מבנה פרויקט (רמה עליונה)

```
LIOSH-WEB-TRY/
├── pages/              # Next.js routes + API (518 tracked)
├── components/         # UI (466 tracked)
├── lib/                # לוגיקת שרת/דומיין (641 tracked)
├── utils/              # generators, question banks, helpers (491 tracked)
├── data/               # curriculum, questions, legal, help-center (143 tracked)
├── public/             # static assets, PWA, audio, images (1684 tracked)
├── scripts/            # build, QA, content sync (1406 tracked)
├── supabase/migrations/ # 90 SQL migrations
├── tests/ + __tests__/ # Playwright + unit (202 tracked)
├── docs/               # תיעוד + תוכן ספרי למידה (2214 tracked)
├── exports/            # מקור TXT לספרי audio-text (5199 tracked)
├── qa-evidence-audit/  # סרטוני/צילומי QA (12342 tracked)
├── reports/            # פלטי QA (gitignored, 12GB מקומי)
├── android/            # Capacitor shell (47 tracked)
└── [תיקיות זמניות / handoff / packs — ראו סעיף B]
```

**Stack:** Next.js 15.5 · React 18 · Supabase · Tailwind 4 · Playwright · Capacitor Android  
**Build production:** `npm run build` → `scripts/run-production-build.mjs` → `next build`  
**Deploy:** Vercel (`capacitor.config.ts` מצביע על `https://liosh-website.vercel.app`)

---

## A. חובה להשאיר

### A1 — קוד אפליקציה (Production Runtime)

| path | למה הוא דרוש | רמת ביטחון |
|------|--------------|------------|
| `pages/` | כל הניתוב: student/parent/teacher/learning/api/help/legal/offline | **גבוה** |
| `pages/api/` | Supabase, auth, learning sessions, copilot, arcade, rewards | **גבוה** |
| `components/` | UI לכל הפורטלים | **גבוה** |
| `lib/` | auth, security, learning-book, parent-server, arcade, offline PWA | **גבוה** |
| `utils/` | question generators (math/hebrew/english/science/geometry), diagnostics, parent-report | **גבוה** |
| `hooks/` | React hooks | **גבוה** |
| `contexts/` | React contexts | **גבוה** |
| `styles/` | global CSS | **גבוה** |

### A2 — נתוני תוכן וקurriculum (מיובאים ב-runtime)

| path | למה הוא דרוש | רמת ביטחון |
|------|--------------|------------|
| `data/*-curriculum.js` | מפת curriculum לכל מקצוע | **גבוה** |
| `data/hebrew-g*-content-map.js` | מיפוי תת-נושאים עברית | **גבוה** |
| `data/history-curriculum.js`, `history-g6-content-map.js` | היסטוריה | **גבוה** |
| `data/english-questions/` | בנק שאלות אנגלית | **גבוה** |
| `data/science-questions*.js` | בנק מדעים | **גבוה** |
| `data/geography-questions/` | בנק גיאוגרפיה/מולדת | **גבוה** |
| `data/history-questions/` | בנק היסטוריה | **גבוה** |
| `data/hebrew-literacy-g*/` | literacy pools | **גבוה** |
| `data/hebrew-questions/` | בנק עברית | **גבוה** |
| `data/legal/sitePolicies.he` | מדיניות פרטיות/תנאים — דפים `/privacy`, `/terms` | **גבוה** |
| `data/marketing/landing-pages.he` | דפי נחיתה `/kids`, `/parents`, `/teachers` | **גבוה** |
| `data/help-center/` | מרכז עזרה — `pages/help/*` | **גבוה** |
| `data/launch-readiness/topic-launch-registry.json` | מדיניות השקת נושאים | **גבוה** |
| `data/reward-options.js` | חנות rewards | **גבוה** |

### A3 — נכסים סטטיים (Production)

| path | למה הוא דרוש | רמת ביטחון |
|------|--------------|------------|
| `public/images/`, `public/icons/`, `public/sounds/` | UI, games, rewards | **גבוה** |
| `public/audio/` (995 tracked) | שמע ספרי למידה / phonics | **גבוה** |
| `public/help-center/` (187 tracked) | screenshots למרכז עזרה | **גבוה** |
| `public/videos/promo/*.mp4` | סרטוני שיווק (מפורש ב-.gitignore) | **גבוה** |
| `public/rewards/` | תמונות כרטיסי Leo | **גבוה** |
| `public/sw.js`, `public/manifest*.webmanifest` | PWA student/parent/teacher | **גבוה** |
| `public/student/sw.js`, `public/parent/sw.js`, `public/teacher/sw.js` | Service workers לפי פורטל | **גבוה** |

### A4 — תשתית, DB, Build

| path | למה הוא דרוש | רמת ביטחון |
|------|--------------|------------|
| `package.json`, `package-lock.json` | dependencies + scripts | **גבוה** |
| `next.config.js` | CSP, PWA headers, webpack | **גבוה** |
| `postcss.config.js`, `tailwind.config.js` | styling | **גבוה** |
| `capacitor.config.ts` | Android shell | **גבוה** (אם Android בשימוש) |
| `scripts/run-production-build.mjs` | orchestrator ל-`npm run build` | **גבוה** |
| `supabase/migrations/*.sql` | schema production (90 קבצים) | **גבוה** |
| `.env.example` | תבנית env ללא secrets | **גבוה** |
| `.gitignore`, `.vercelignore` | כללי ignore | **גבוה** |

### A5 — קוד "נראה dev" אך **מחובר ל-production** (לא למחוק!)

| path | למה הוא דרוש | רמת ביטחון |
|------|--------------|------------|
| `components/prototypes/dev/learning/` | **ייבוא ישיר** מ-`components/educational-games/leo-*` (styles, frames, CSS modules) | **גבוה** |
| `components/dev/DevServiceWorkerCleanup.js` | נטען ב-`_app.js` (dev-only render) | **בינוני** — קוד קטן, לא מזיק ב-prod |
| `components/dev-student-simulator/` | סימולטור — מוגן `NODE_ENV === 'production'` → 404 | **בינוני** |
| `lib/dev/`, `utils/server/dev-student-simulator-auth` | guards ל-dev APIs | **בינוני** |

**בדיקת imports:** לא נמצאו imports מ-`pages/`, `components/` (מלבד prototypes), או `lib/` אל:  
`archive/`, `reports/`, `review-packages/`, `pass12-14_*`, `_handoff/`, `_qa-transfer/`, `tmp/` (קבצי tmp בתוך tmp/ בלבד).

---

## B. מועמד למחיקה / לא להעברה ל-Git החדש

### B1 — Artifacts מקומיים (לא ב-Git / gitignored) — בטוח שלא להעביר

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `node_modules/` | dependencies — `npm ci` | **בטוח למחיקה מקומית** |
| `.next/`, `.next-qa-deep/`, `.next-final-subject-sim/` | build cache | **בטוח למחיקה מקומית** |
| `out/` | static export / Capacitor | **בטוח למחיקה** (נוצר מ-build) |
| `reports/` (~12 GB, 91K files) | פלטי QA/simulator — gitignored | **בטוח למחיקה מקומית** / **לא להעביר** |
| `playwright-report/`, `test-results/` | פלט Playwright | **בטוח למחיקה** |
| `.vercel/` | metadata deploy | **לא להעביר** |
| `public/admin-video-assets/` (~496 MB) | uploads מקומיים — gitignored | **לא להעביר** (נוצר מ-admin tool) |
| `public/audio/hebrew/gen/v1/` | cache MP3 dev — gitignored | **לא להעביר** |
| `data/_audio_store/` | dev audio API store — gitignored | **לא להעביר** |
| `.tmp/`, `.tmp-zip-preview/` | temp | **בטוח למחיקה** |

### B2 — Tracked ב-Git הנוכחי — **מועמד חזק לא להעביר**

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `qa-evidence-audit/` (12,342 files) | סרטוני parent/student video pilot, visual QA — **לא בשימוש runtime**; scripts publish ממנו ל-`public/help-center` | **לא להעביר ל-Git** · מחיקה מקומית **בטוחה** אם הסרטונים כבר ב-`public/help-center` |
| `qa-evidence-audit/parent-video-pilot/` (5,063) | captures גולמיים | כנ"ל |
| `qa-evidence-audit/student-video-pilot/` (7,175) | captures גולמיים | כנ"ל |
| `reports/` (1 tracked file) | שארית — `.gitignore` מכסה | **לא להעביר** |
| `.phase-*.log` (8 קבצים ב-root, tracked) | לוגי ריצות phase C/D | **בטוח למחיקה · לא להעביר** |
| `ElevenLabs_*.mp3` (3 קבצים ב-root, tracked) | קבצי audio ניסוי | **בטוח למחיקה · לא להעביר** |
| `temp_geometry.txt`, `tmp_geo_func.txt`, `tmp_math_generate.txt` | scratch notes | **בטוח למחיקה · לא להעביר** |
| `_tmp_user_msg.txt` | temp | **בטוח למחיקה** |
| `rtl-bidi-commit-full.patch`, `rtl-bidi-*.txt`, `rtl-phase1-*.patch` | audit RTL — היסטוריה | **לא להעביר** (שמור בארכיון אם צריך) |
| `CHECK-MASS-1000*.bat`, `START-MASS-1000*.bat` | automation ל-parent-AI mass sim | **לא להעביר** (QA ops) |
| `run-final-subject-simulation.bat`, `download_qa_results.bat` | QA batch | **לא להעביר** |
| `pull-latest.bat`, `pull_from_git.bat`, `update_and_push.bat` | git helpers אישיים | **לא להעביר** |
| `apply-hebrew-pass1-exact-cleanup.mjs` (root) | one-off cleanup | **לא להעביר** |
| `hebrew_pass1_exact_replacements.{csv,json}` | one-off data | **לא להעביר** |
| `cursor_hebrew_pass1_exact_cleanup_prompt.md` | prompt ארכיון | **לא להעביר** |

### B3 — תיקיות handoff / packs / review (לא runtime)

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `review-packages/` (317 tracked, 137 MB) | snapshots code review ישנים — **ב-.vercelignore** | **לא להעביר** · מחיקה **בינונית** (ארכיון review) |
| `_handoff/` (125 tracked) | חבילת handoff | **לא להעביר** |
| `_qa-transfer/`, `_qa-transfer_review/` (מקומי, 0 tracked) | העברות QA | **לא להעביר** |
| `_tmp_batch065/`, `_tmp_leo_cards_8_9/`, `_tmp_leo_event_phase7/` | temp batches | **בטוח למחיקה מקומית** |
| `pass12_exact_english_final_fix_pack/` | content fix pack | **לא להעביר** |
| `pass13_exact_english_cleanup_pack/` | content fix pack | **לא להעביר** |
| `pass14_english_audio_symbol_cleanup_pack/` | content fix pack | **לא להעביר** |
| `cursor_book_content_fix_pack/` | content fix pack | **לא להעביר** |
| `archive/` (8 files) | ארכיון | **לא להעביר** |
| `remediation-plans/` (2 files) | תוכניות תיקון | **לא להעביר** (או docs בלבד) |
| `hebrew-owner-review/` (84 tracked, 130 MB) | חבילת review עברית | **לא להעביר** |
| `qa/` (37 files) | QA configs מקומיים | **לא להעביר** |
| `qa-visual-output/` (8 tracked) | פלט visual QA | **לא להעביר** |
| `tmp/` (283 tracked) | ניסויים — **יש קבצים עם imports ל-data** אך לא מחוברים ל-app | **לא להעביר** · מחיקה **בינונית** |
| `.cursor/` (127 tracked) | plans/agents — IDE | **לא להעביר** |

### B4 — `exports/` — מקור תוכן, לא runtime

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `exports/audio-text/` (5,199 tracked) | מקור `page-XXX.txt` לספרי למידה — **scripts** `apply-*-content-sync.mjs` / `verify-*` | **לא runtime** · **להעביר רק אם** רוצים לשמר pipeline תוכן ב-Git · אחרת **לא להעביר** (4.5 MB) |

### B5 — `docs/` — סלקטיבי

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `docs/learning-book/**/drafts/` | טיוטות תוכן — לא runtime (`lib/learning-book` נפרד) | **לא להעביר** (או repo docs נפרד) |
| `docs/school-portal/review-packages/` | duplicates של code review | **לא להעביר** |
| `docs/qa/_artifacts/` | artifacts — **ב-.vercelignore** | **לא להעביר** |
| `docs/` (שאר) | תיעוד production, SQL, security | **להשאיר** (או subset) |

### B6 — `scripts/` — רוב ה-volume הוא QA

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `scripts/learning-simulator/` | QA orchestrator — כותב ל-`reports/` | **לא חובה ל-production deploy** · **להשאיר** אם רוצים CI/QA |
| `scripts/launch-readiness/`, `scripts/curriculum-audit/` | audits | **לא להעביר** (או repo QA נפרד) |
| `scripts/parent-ai-mass-simulation/` | mass sim | **לא להעביר** |
| `scripts/parent-video-pilot/`, `scripts/student-video-pilot/` | capture | **לא להעביר** |
| `scripts/help-center/capture-*.mjs` | screenshot capture | **לא להעביר** (נכסים ב-`public/help-center`) |
| `scripts/tmp/` (8 tracked) | diagnostic cert temp | **לא להעביר** |
| `scripts/run-production-build.mjs` | **build** | **חובה** |

### B7 — דוחות Markdown ב-root (tracked)

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `LAUNCH_READINESS_AUDIT.md`, `QA_LAUNCH_REPORT.md`, `QUESTION_BANK_INVENTORY_AUDIT.md` | דוחות QA | **לא להעביר** (או `docs/audits/`) |
| `INDEPENDENT_SECURITY_AUDIT_REPORT.md`, `LEGAL_POLICY_MAPPING_BEFORE_LAUNCH.md` | audits משפטי/אבטחה | **להעביר** — ערך לשקיפות |
| `PARENT_REPORT_PRODUCT_ORACLE.md`, `parent_report_hebrew_copy_spec.md` | spec production | **להעביר** |
| `MULTI_DEVICE_*.md` | verification docs | **להעביר** (או docs) |
| `README.md` | **לא README פרויקט** — מסמך "Hebrew PASS 1 Cleanup Pack" | **להחליף/לא להעביר כפי שהוא** |

### B8 — Android / apps

| path | סיבה | בטוח למחיקה? |
|------|------|--------------|
| `android/` (47 tracked) | Capacitor — `npm run cap:sync` | **להשאיר** אם Android app פעיל |
| `apps/` | `DEPRECATED-NOT-WEB-PRODUCT.md` בלבד | **לא להעביר** |

---

## C. אסור להעלות ל-Git

| path / pattern | סיבה | להוסיף ל-.gitignore? |
|----------------|------|----------------------|
| `.env.local` | secrets: Supabase service role, LLM keys, dev flags | **כבר מכוסה** (`.env*`) |
| `.env.e2e.local` | credentials E2E / Playwright | **כבר מכוסה** |
| `.env.vercel.local`, `.env.vercel.prod.check` | dump env מ-Vercel | **כבר מכוסה** (`.env.vercel*`) |
| `.env*` (חוץ מ-`.env.example`) | כל secrets | **כבר מכוסה** |
| `*.pem`, `*.jks`, `*.keystore`, `keystore.properties` | signing keys Android | **כבר מכוסה** |
| `node_modules/` | dependencies | **כבר מכוסה** |
| `.next/`, `out/`, `build/` | build output | **כבר מכוסה** |
| `reports/` | QA output ענק | **כבר מכוסה** — **להוסיף** explicit ל-`qa-evidence-audit/` |
| `qa-evidence-audit/` (חוץ מ-manifests קטנים) | 12K+ video/screenshot files | **מומלץ להוסיף:** `qa-evidence-audit/` |
| `scripts/school-portal/.local/` | sim state מקומי | **כבר מכוסה** |
| `scripts/school-portal/sim-state.json` | demo sim | **כבר מכוסה** |
| `public/admin-video-assets/uploads/`, `outputs/` | media uploads | **כבר מכוסה** |
| `data/admin-video-builder/projects/`, `export-work/` | local projects | **כבר מכוסה** |
| `data/ai-hybrid-gold/synthetic-gold-v1.jsonl` | synthetic gold | **כבר מכוסה** |
| `AUDIO.zip` | bundle גדול | **כבר מכוסה** |
| `.vercel/` | deploy metadata | **כבר מכוסה** (כפילות בשורה 103) |
| `.local/` | local override | **מומלץ להוסיף:** `.local/` |
| `.phase-*.log` | logs tracked בטעות | **מומלץ להוסיף:** `.phase-*.log` |
| `ElevenLabs_*.mp3` (root) | audio samples tracked | **מומלץ להוסיף:** `ElevenLabs_*.mp3` |
| `scripts/school-portal/fixtures/demo-student-access-credentials.json` | **PINs plaintext** ל-demo school (1597+ שורות) | **מומלץ:** להעביר ל-`.gitignore` + `.local/` override (קיים בהערה בקובץ) |

**הערה:** `.env.example` **כן** ב-Git — מכיל URL Supabase ציבורי + placeholders; **אין** keys אמיתיים בדוגמה שנבדקה.

---

## D. לא ברור / דורש החלטה

| path | למה לא ברור | מה צריך לבדוק |
|------|-------------|---------------|
| `pages/dev/*` (34 דפים) | **אין** `getServerSideProps` production guard — רק `noindex`; נגיש ב-Vercel production | האם לחסום ב-prod / להסיר מה-build / להשאיר לפיתוח |
| `pages/learning/dev/engine-review.js` | dev tool + קישור מ-`lib/site-nav.js` | האם nav מוצג ב-production |
| `pages/learning/dev-student-simulator.js` | מוגן 404 ב-production — **הקוד נשאר ב-bundle** | האם להסיר לגמרי מ-repo השקה |
| `exports/audio-text/` (5199 files) | pipeline תוכן — לא runtime, אך מקור אמת ל-sync | האם repo נפרד ל-content authoring |
| `docs/` (2214 files, 139 MB) | mix של production docs + drafts | אילו תת-תיקיות חובה לצוות |
| `scripts/` (1406 files) | רוב scripts = QA; 일부 נדרשים ל-CI (`.github/workflows`) | רשימת scripts מינימלית ל-repo השקה |
| `tests/` + Playwright configs (5) | E2E דורש `.env.e2e.local` | האם CI ב-repo החדש |
| `components/prototypes/dev/` | נראה dev — **מיובא production** | refactor לפני מחיקה — **אל תמחק** |
| `data/hebrew-official-*.json`, `hebrew-g12-closure-queue.json` | metadata audit עברית — לא כל ה-imports ברורים | האם generators משתמשים ב-runtime |
| `data/hebrew-copy-baseline/` | baseline ל-delta gate scripts | נדרש רק ל-`npm run hebrew:delta*` |
| `data/language-review/` | review queue | production או QA בלבד |
| `data/curriculum-oracle/`, `data/curriculum-spine/` | oracle/spine data | בדיקת imports ב-utils |
| `android/` (534 files disk, 47 tracked) | build artifacts vs source | `android/app/build/` gitignored — מה tracked |
| `תוכנית_לימודים_מתמטיקה.html` (root, tracked) | מסמך HTML עברית | האם referenced / ארכיון בלבד |
| תיקיות עברית ב-root (שמות מקודדים) | תוכן TXT/HTML | פתיחה ידנית — ארכיון תוכן? |
| `scripts/school-portal/fixtures/demo-student-access-credentials.json` | tracked עם PINs demo | QA fixture vs secret leak |
| `public/images2/`, `public/videos2/` | gallery API (`pages/api/gallery.js`) | production או legacy |
| `pages/student/pwa-debug.js` | debug PWA | guard ב-production? |
| `pages/api/student/dev-add-coins.js` | שם dev | production guard? |

---

## E. תוכנית העתקה לתיקייה חדשה

### E1 — מה להעתיק (Production Core)

```
pages/
components/
lib/
utils/
hooks/
contexts/
styles/
data/                    # ללא admin-video-builder projects / _audio_store
public/                  # ללא admin-video-assets/, hebrew/gen/v1/
supabase/migrations/
scripts/run-production-build.mjs
scripts/verify-*.mjs     # אופציונלי — env verification
package.json
package-lock.json
next.config.js
postcss.config.js
tailwind.config.js
capacitor.config.ts      # אם Android
android/                 # אם Android — ללא app/build/
.env.example
.gitignore
.vercelignore
.github/                 # CI
tests/                   # אם שומרים CI
playwright.config.ts       # אם E2E
```

**אופציונלי (תיעוד / specs):**
```
docs/                    # subset — ללא drafts/review-packages
LEGAL_POLICY_MAPPING_BEFORE_LAUNCH.md
PARENT_REPORT_PRODUCT_ORACLE.md
INDEPENDENT_SECURITY_AUDIT_REPORT.md
```

### E2 — מה **לא** להעתיק

```
node_modules/
.git/
.next/
.next-qa-deep/
.next-final-subject-sim/
out/
reports/
playwright-report/
test-results/
.vercel/
.env.local
.env.e2e.local
.env.vercel.*
qa-evidence-audit/
review-packages/
_handoff/
_qa-transfer/
_qa-transfer_review/
_tmp_*/
tmp/
.tmp/
.tmp-zip-preview/
.local/
.cursor/
pass12_exact_english_final_fix_pack/
pass13_exact_english_cleanup_pack/
pass14_english_audio_symbol_cleanup_pack/
cursor_book_content_fix_pack/
hebrew-owner-review/
archive/
remediation-plans/
qa/
qa-visual-output/
apps/
.phase-*.log
ElevenLabs_*.mp3
*.bat                    # pull/run/mass scripts
rtl-bidi-*.patch
rtl-bidi-*.txt
temp_*.txt
tmp_*.txt
public/admin-video-assets/
public/audio/hebrew/gen/v1/
data/_audio_store/
data/admin-video-builder/projects/
data/admin-video-builder/export-work/
```

**החלטת בעלים — exports/ + scripts/ מלאים:**
- **Repo lean:** אל תעתיק `exports/` ו-~90% מ-`scripts/`
- **Repo full dev:** העתק `exports/` + `scripts/` + `docs/` (ללא drafts)

### E3 — פקודת robocopy מומלצת (Windows)

החלף `SOURCE` ו-`DEST`:

```bat
set SOURCE=C:\Users\ERAN YOSEF\Desktop\final projects\FINAL-WEB\LIOSH-WEB-TRY
set DEST=C:\Users\ERAN YOSEF\Desktop\final projects\FINAL-WEB\LIOSH-WEB-TRY-CLEAN

robocopy "%SOURCE%" "%DEST%" /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NP ^
  /XD node_modules .git .next .next-qa-deep .next-final-subject-sim out reports ^
       playwright-report test-results .vercel .cursor .local .tmp .tmp-zip-preview ^
       qa-evidence-audit review-packages _handoff _qa-transfer _qa-transfer_review ^
       _tmp_batch065 _tmp_leo_cards_8_9 _tmp_leo_event_phase7 tmp ^
       pass12_exact_english_final_fix_pack pass13_exact_english_cleanup_pack ^
       pass14_english_audio_symbol_cleanup_pack cursor_book_content_fix_pack ^
       hebrew-owner-review archive remediation-plans qa qa-visual-output apps ^
       "public\admin-video-assets" "public\audio\hebrew\gen\v1" ^
       "data\_audio_store" "data\admin-video-builder\projects" "data\admin-video-builder\export-work" ^
  /XF .env.local .env.e2e.local .env.vercel.local .env.vercel.prod.check ^
       .phase-*.log ElevenLabs_*.mp3 *.bat rtl-bidi-commit-full.patch ^
       rtl-bidi-*.txt rtl-phase1-*.patch temp_geometry.txt tmp_geo_func.txt ^
       tmp_math_generate.txt _tmp_user_msg.txt apply-hebrew-pass1-exact-cleanup.mjs ^
       hebrew_pass1_exact_replacements.csv hebrew_pass1_exact_replacements.json
```

**אחרי robocopy:**

```bat
cd /d "%DEST%"
copy "%SOURCE%\.env.example" .env.example
git init
git add .
git status
```

**שלבים נוספים מומלצים:**
1. צור `.env.local` חדש מ-`.env.example` (לא מעתיקים את הישן ל-Git).
2. `npm ci && npm run build` — אימות build נקי.
3. `.gitignore` מורחב: `qa-evidence-audit/`, `.phase-*.log`, `.local/`, `scripts/school-portal/fixtures/demo-student-access-credentials.json`.
4. החלף `README.md` בתיאור פרויקט אמיתי.

---

## נספח — ממצאי בדיקת imports

| נתיב "חשוד" | מחובר לקוד production? | פרטים |
|-------------|------------------------|--------|
| `components/prototypes/dev/` | **כן** | `LeoPizzeriaGame`, `LeoBakeryGame`, `LeoWordDetectiveGame` ועוד |
| `exports/` | **לא (runtime)** | scripts בלבד: `apply-*-content-sync.mjs`, `verify-*` |
| `reports/` | **לא (runtime)** | `pages/learning/dev/engine-review.js` קורא artifacts; dev-only |
| `review-packages/` | **לא** | עותקים ישנים; excluded מ-scripts migration |
| `qa-evidence-audit/` | **לא (runtime)** | scripts publish videos → `public/help-center` |
| `tmp/` | **לא** | קבצים experimental; לא imported מ-pages/components/lib |
| `pass12-14_*` | **לא** | packs חד-פעמיים |
| `data/help-center/` | **כן** | `pages/help/*`, `components/help/*` |
| `data/legal/` | **כן** | דפי legal + parent login policy versions |

---

## נספח — `pages/` לפי תיקייה (518 tracked)

| תיקייה | תפקיד | הערת השקה |
|--------|--------|-----------|
| `student/` | פורטל תלמיד, games, offline, learning book | **Production** |
| `parent/` | dashboard, reports, copilot | **Production** |
| `teacher/` | classes, activities, reports | **Production** |
| `learning/` | masters, parent-report, curriculum, books | **Production** |
| `api/` | כל backend routes | **Production** |
| `help/` | מרכז עזרה | **Production** |
| `offline/` | משחקים offline | **Production** |
| `admin/` | admin guest | **Production** (בדוק guards) |
| `dev/` | 34 prototypes | **דורש החלטה** |
| `learning/dev/` | engine-review | **Dev tool** |

---

*דוח זה נוצר אוטומטית מסריקת מבנה, `.gitignore`, `package.json`, `next.config.js`, ו-counts של `git ls-files`. לא בוצעו שינויים בפרויקט.*
