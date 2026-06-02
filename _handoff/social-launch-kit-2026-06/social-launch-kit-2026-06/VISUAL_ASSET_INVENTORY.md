# Visual Asset Inventory — Social Launch Kit 2026-06

## Brand identity (from site inspection)

| Element | Source | Notes |
|---------|--------|-------|
| Product name | `pages/index.js`, `components/Layout.js` | **LEO KIDS** (also "ליאו" in help center) |
| Logo (header) | `/images/coin.png` | Shiba/coin mascot |
| App icons | `/images/leo-icons/icon-192.png`, `icon-512.png` | PWA / favicon |
| Mascot image | `/images/lio.png` | About page |
| Background | `styles/globals.css`, `Layout.js` | `#050816` → `#0b1020` gradient |
| Accent | Tailwind classes sitewide | Amber `#fbbf24` / `#fcd34d`, rose, emerald/teal |
| Typography | System + Segoe UI in generated assets | RTL Hebrew throughout |
| Theme color | `public/manifest.json` | `#fbbf24` |
| Production URL | `docs/android/ANDROID_QA_REPORT.md` | https://liosh-website.vercel.app |

Marketing assets reuse this palette — **no new brand invented**.

---

## Existing logo/assets found

| File (production path) | Local copy | Safe for marketing |
|------------------------|------------|-------------------|
| `/images/leo-icons/icon-512.png` | `assets/source/logo-icon-512.png` | ✅ Yes — profile & posts |
| `/images/coin.png` | `assets/source/logo-coin.png` | ✅ Yes |
| `/images/lio.png` | Not copied | ✅ Would be safe; not required for kit |
| Help-center screenshots | See below | ✅ Pre-sanitized demo visuals |

---

## Pages / screens inspected

| Page | URL | Inspected | Used in kit |
|------|-----|-----------|-------------|
| Homepage | `/` | ✅ | Cropped source only (`homepage-parent-student-crop.png`) |
| Parent login | `/parent/login` | ✅ | Source reference; **not embedded** in finals (see rejections) |
| Student login | `/student/login` | ✅ | Source only |
| Learning hub | `/learning` | ✅ | Embedded in `fb-post-04-child-practice.png` |
| Help center | `/help` | ✅ | Source only |
| About | `/about` | ✅ | Source only |
| Parent report (demo) | help-center screenshot PNG | ✅ | Embedded in `fb-post-03-parent-report.png` |
| Student subjects (demo) | help-center screenshot PNG | ✅ | Fallback source |

**Not inspected live (auth required):** parent dashboard, live student question session, learning book reader — replaced by **approved help-center demo screenshots** without PII.

---

## Safe to use

| Asset | Why safe |
|-------|----------|
| All `assets/final/*.png` | Generated copy only; no credentials |
| `logo-icon-512.png`, `logo-coin.png` | Public brand assets |
| `parent-report-summary-help.png` | Help-center demo summary stats — **no child name** |
| `student-question-help.png` | Demo activity/question screen — no credentials |
| `learning-subjects-help.png` | Demo help screenshot |
| `parent-report-help.png` | **Reference only** — header includes demo name "דניאל י" |
| `learning-hub.png` | **Reference only** — unauthenticated capture is student login redirect |
| `homepage-parent-student-crop.png` | **Teacher portal card excluded** by crop |
| `help-center-home.png`, `about-page-mobile.png` | Public marketing-safe pages |

---

## Rejected or excluded

| Asset / screen | Reason |
|----------------|--------|
| Full homepage screenshot | Shows **פורטל מורים** — excluded from marketing |
| `parent-login.png` for direct embed | Placeholder mentions **"שקיבלתם מהמורה"** — teacher-adjacent wording; kept as source reference only |
| Teacher portal routes | Out of scope for parent/child launch |
| School / private-teacher UI | Not captured or referenced |
| Raw auth dashboards with real accounts | No credentials used; no live PII captured |
| `student-login.png` in finals | May contain generic fields only — not used in finals to minimize login-form exposure |

---

## Redactions performed

- Homepage capture: **spatial crop** removes teacher portal card (bottom-right grid cell).
- No real child names, emails, passwords, IDs, or phone numbers in final PNGs.
- Product screenshots in posts use **demo help-center images** (synthetic persona data from help pipeline).

---

## Final generated files (`assets/final/`)

| File | Size (approx.) | Purpose |
|------|----------------|---------|
| `fb-profile-1024.png` | 1024×1024 | Facebook profile |
| `fb-cover-summer-pilot.png` | 1640×624 | Facebook cover |
| `fb-post-01-launch.png` | 1080×1080 | Launch post |
| `fb-post-02-how-it-works.png` | 1080×1080 | How it works |
| `fb-post-03-parent-report.png` | 1080×1080 | Parent value + **summary stats inset (no name)** |
| `fb-post-04-child-practice.png` | 1080×1080 | Child value + **subject/learning hub inset** |
| `fb-post-05-free-summer.png` | 1080×1080 | Free summer |
| `fb-post-06-feedback.png` | 1080×1080 | Feedback request |
| `fb-group-share-parent-pilot.png` | 1080×1080 | Parent groups |
| `story-01-summer-learning.png` | 1080×1920 | Story |
| `story-02-10-minutes.png` | 1080×1920 | Story |
| `story-03-feedback.png` | 1080×1920 | Story |
| `blank-square-background.png` | 1080×1080 | Canva blank |
| `blank-story-background.png` | 1080×1920 | Canva blank |
| `blank-cover-background.png` | 1640×624 | Canva blank |

**Total final PNGs: 15**

---

## Source captures (`assets/source/`)

| File | Status |
|------|--------|
| `parent-login.png` | Captured — reference only |
| `learning-hub.png` | Captured — **reference only** (redirects to student login without auth) |
| `student-login.png` | Captured — reference only |
| `help-center-home.png` | Captured |
| `about-page-mobile.png` | Captured |
| `homepage-parent-student-crop.png` | Captured — cropped |
| `parent-report-help.png` | Downloaded demo PNG — **not used in finals** (demo name in header) |
| `parent-report-summary-help.png` | Downloaded — used in post 3 |
| `student-question-help.png` | Downloaded — used in post 4 |
| `learning-subjects-help.png` | Downloaded demo PNG |
| `logo-coin.png`, `logo-icon-512.png` | Downloaded |
| `templates/*.html` | HTML templates used for rendering |

---

## Caveats

1. **Facebook cover safe zone:** On mobile, left/right edges may crop — main Hebrew text is right-aligned (RTL) within safe area.
2. **Demo insets:** Help-center demo assets only — no live family data or child names in finals.
3. **Post 3 (rev.):** Summary stats inset — replaced `short-report` (had demo name in header).
4. **Post 4 (rev.):** Subject-card learning inset — replaced mistaken login capture from `/learning`.
5. **Production dependency:** Screenshots captured from `https://liosh-website.vercel.app`; UI may drift slightly.
6. **Parent login placeholder** on live site mentions teacher — not used in finals.
7. **No URL on image assets** — links provided in copy docs only.

---

## Regeneration

```bash
node _handoff/social-launch-kit-2026-06/scripts/generate-kit.mjs
```

Optional: `SOCIAL_KIT_BASE_URL=https://your-preview.example`
