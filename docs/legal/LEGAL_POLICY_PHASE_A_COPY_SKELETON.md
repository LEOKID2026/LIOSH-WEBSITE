# Legal / Policy — Phase A.1 Copy Skeleton

**Date:** 2026-05-23  
**Phase:** A.1 — owner decisions + Hebrew copy skeleton only  
**Status:** planning — **not** final approved legal copy; **not** implemented on site  
**Prior audit:** [LEGAL_POLICY_SITE_INVENTORY_AND_PLAN.md](./LEGAL_POLICY_SITE_INVENTORY_AND_PLAN.md)

> **Scope of this pass:** documentation only. No routes, modals, checkboxes, DB, product Hebrew copy, design, ENV, engine, report disclaimer, or Copilot logic changes. No commit, push, or deploy.

---

## A. Final owner decisions table

| # | Decision | Owner value | Implementation note |
|---|----------|-------------|---------------------|
| 1 | **Jurisdiction / baseline** | **Israel-first**, **Hebrew-first** site | All public legal/policy pages primary in Hebrew; align with Israeli privacy and accessibility expectations — **not** deferred optional extras |
| 2 | **Site language** | Hebrew | RTL; `lang="he"` on policy pages when built |
| 3 | **Contact email** | [18eran@gmail.com](mailto:18eran@gmail.com) | Same as `pages/contact.js` (`CONTACT_EMAIL`); use for privacy, deletion, accessibility, abuse, general legal/policy contact |
| 4 | **Deletion request SLA** | **7 business days** | Policy wording only; mechanism not built in this phase |
| 5 | **Advertising** | **May exist** (now or future) | Privacy/cookie skeleton must reserve sections for ads, ad partners, analytics/marketing cookies or pixels — **no** ads/pixels/banners implemented now |
| 6 | **AI / Copilot** | Disclosure required in policy layer | Informational/educational only; not professional diagnosis; high-level data description — **not** an ENV decision; **no** Copilot UI/logic change now |
| 7 | **Child deletion** | Explicit parent action only | Dashboard delete with warning; data treated as deleted; optional **up to 7 business days** technical backup/recovery retention wording if needed |
| 8 | **Subscription / payment** | Non-renewal or payment failure **must not** auto-delete children or learning data | Access may pause/restrict/downgrade only; deletion only on explicit parent choice + confirmation |
| 9 | **Accessibility** | **Required**, core plan | `/accessibility` in **Phase B** (not late optional); Israeli Hebrew accessibility statement |
| 10 | **Consent model** | **Terms + Privacy only** at signup (future Phase D/E) | **No** “I confirm I am the parent/guardian” checkbox; **no** `/parent-consent` public route |
| 11 | **Public child limit** | **Max 3 children** per normal parent account | Never mention QA-only 50-student setup in public pages |
| 12 | **Report disclaimer** | `ParentReportImportantDisclaimer` is authoritative on reports | Policy pages may summarize or cross-reference — **no** conflicting third full version |

---

## B. Revised route plan

### Core required (implement in Phases B–C)

| Route | Purpose | Phase | Notes |
|-------|---------|-------|-------|
| **`/privacy`** | Privacy Policy (Hebrew) | **B** | Israel-first; ads/cookies/AI/data sections |
| **`/terms`** | Terms of Use (Hebrew) | **B** | Account rules, educational framing, subscription access rules |
| **`/accessibility`** | Accessibility statement (Hebrew) | **B** | **Core** — Israeli accessibility compliance target |
| **`/data-deletion`** | Data deletion & rights (Hebrew) | **C** | **Recommended standalone route** (clearer than burying only in Privacy); Privacy must cross-link |
| **`/ai-disclosure`** | AI & Copilot disclosure (Hebrew) | **C** | **Recommended standalone route**; Privacy § summary + link acceptable alternative if owner prefers single hub — default plan: **dedicated route** |
| **`/contact`** | Existing contact + legal cross-links | **B** (links only) | Add pointers to Privacy, Terms, Accessibility, deletion, AI |

### Optional but recommended

| Route | Purpose | Phase |
|-------|---------|-------|
| **`/security`** | Plain-language security summary for parents (non-technical) | **C** or post-B | Derived from internal docs; no secrets |

### Explicitly excluded

| Route | Status |
|-------|--------|
| **`/parent-consent`** | **Do not create** — acceptance is Terms + Privacy only, embedded in signup flow later |
| **`/security` (API)** | `pages/api/security/*` remains API-only; not a user policy page |

### Footer / navigation (future Phase B)

Add links (Hebrew labels TBD in implementation): פרטיות · תנאי שימוש · נגישות · (+ מחיקת נתונים · שימוש ב-AI as secondary footer or grouped under “מידע משפטי”).

---

## C. Hebrew copy skeleton (placeholders — not final legal text)

> **Disclaimer:** Skeleton headings and bullets for owner/legal review. **Not** approved legal wording. Lawyer review required before public launch.

---

### C.1 `/privacy` — מדיניות פרטיות

**Page title (placeholder):** מדיניות פרטיות

| Section | Heading (Hebrew skeleton) | Bullet placeholders | Risk / review notes |
|---------|---------------------------|---------------------|---------------------|
| 1 | מי אנחנו | • שם/זהות בעל/מפעיל השירות [להשלים] • כתובת/אזור פעילות: ישראל • דוא"ל ליצירת קשר: 18eran@gmail.com | Controller identity must be accurate for Israeli law |
| 2 | למי מיועד השירות | • הורים יוצרים חשבון • ילדים משתמשים בקוד כניסה מההורה • גילאי כיתות א׳–ו׳ | Child data via parent account model |
| 3 | אילו נתונים נאספים | • פרטי הורה (אימייל, חשבון) • פרטי תלמיד (שם, כיתה, קוד כניסה) • נתוני תרגול (תשובות, זמן, התקדמות) • דוחות והמלצות • מטבעות/משחקים/ארקייד [לפי מה שנאסף בפועל — לאשר מול מפת נתונים] • תקשורת דרך צור קשר | Cross-check `docs/security/SECURITY_DATA_INVENTORY.md` |
| 4 | למה אנחנו משתמשים בנתונים | • הפעלת השירות • דוחות להורים • שיפור חוויית למידה • אבטחה ומניעת שימוש לרעה • [פרסום/אנליטיקה — אם/כאשר יופעל] | Purpose limitation |
| 5 | מי רואה את המידע | • ההורה של הילד • מנהלי המערכת במידה הנדרשת • ספקי תשתית (אחסון, אירוח) • [שותפי פרסום — אם/כאשר] | Processors / subprocessors list TBD |
| 6 | אחסון ושמירה | • משך שמירה כללי [להשלים] • מחיקת ילד — ראו `/data-deletion` • בקשות מחיקה — טיפול עד **7 ימי עסקים** | Retention periods need lawyer signoff |
| 7 | עוגיות וטכנולוגיות דומות | • **עוגיות/אחסון פונקציונלי:** התחברות תלמיד, התחברות הורה (Supabase) • **עוגיות/פיקסלים/אנליטיקה/פרסום — אם/כאשר יופעלו:** [placeholder — רשימת קטגוריות, מטרה, opt-out אם נדרש] • הבחנה ברורה: **מה קיים היום** vs **מה עשוי להוסף** | No tracking implemented now; section is forward-looking |
| 8 | פרסום | • האתר **עשוי** לכלול פרסומות • [placeholder: סוגי פרסום, שותפים, נתונים שעשויים להימסר לצד שלישי] • קישור לעדכון מדיניות בעת הוספת פרסום | Must update policy before live ads |
| 9 | בינה מלאכותית (סיכום) | • שימוש ב-AI/Copilot — פירוט ב-`/ai-disclosure` • קישור | Do not duplicate report disclaimer verbatim |
| 10 | העברת מידע / ספקים | • אירוח (למשל Vercel) • מסד נתונים (למשל Supabase) • [ספקי AI — שם/אזור — להשלים בלי ENV] | Cross-border / processor disclosure |
| 11 | זכויות המשתמש | • גישה • תיקון • מחיקה • התנגדות/הגבלה [לפי דין ישראלי] • פנייה: 18eran@gmail.com | Map to Israeli Privacy Protection Law |
| 12 | ילדים | • מידע על ילדים דרך חשבון הורה • מקסימום **3 ילדים** לחשבון הורה רגיל • [לא להזכיר מגבלות QA] | |
| 13 | שינויים במדיניות | • תאריך עדכון אחרון [placeholder] • הודעה על שינויים מהותיים [placeholder] | |
| 14 | יצירת קשר | • 18eran@gmail.com • קישור ל-`/contact` | |

---

### C.2 `/terms` — תנאי שימוש

**Page title (placeholder):** תנאי שימוש

| Section | Heading | Bullet placeholders | Risk notes |
|---------|---------|---------------------|------------|
| 1 | קבלת התנאים | • שימוש באתר מהווה הסכמה • הרשמת הורה — קבלת תנאים + מדיניות פרטיות (Phase D/E) | |
| 2 | מי רשאי להשתמש | • הורים בגירים • ילדים תחת אחריות הורה • איסור שימוש לרעה | No guardian checkbox — parent account model |
| 3 | חשבון הורה וילדים | • הורה אחראי ליצירת קוד לילד • עד **3 ילדים** לחשבון • שמירה על סודיות קוד הכניסה | |
| 4 | השירות החינוכי | • תרגול ודוחות — **כלי עזר לימודי** • **לא** אבחון מקצועי — ראו דוחות + `/ai-disclosure` • **לא** לשכפל נוסח `ParentReportImportantDisclaimer` — הפניה בלבד | Cross-ref D-1 |
| 5 | שימוש מותר ואסור | • שימוש אישי/חינוכי • איסור פריצה, ספאם, ניצול לרעה • איסור העתקה/commercial scraping [placeholder] | |
| 6 | קניין רוחני | • תוכן, משחקים, שאלות — זכויות בעלים [placeholder] | |
| 7 | מנויים ותשלום (עתידי) | • שירות **עשוי** להיות בתשלום • **אי-חידוש / כשל תשלום — לא מוחק נתונים אוטומטית** • הגבלה/הקפאה/הורדת גישה בלבד • מחיקה — רק פעולה מפורשת של הורה | See §E |
| 8 | הפסקת שירות | • סגירת חשבון על ידי בעלים • השעיה בגין הפרת תנאים | |
| 9 | הגבלת אחריות | • השירות כפי שהוא (as-is) [placeholder — legal] • אין אחריות לתוצאות לימודיות | Lawyer review |
| 10 | שינויים | • עדכון תנאים • תאריך [placeholder] | |
| 11 | דין וסמכות שיפוט | • **דין ישראלי** • **סמכות שיפוט:** [placeholder — בתי משפט בישראל] | |
| 12 | יצירת קשר | • 18eran@gmail.com | |

---

### C.3 `/accessibility` — הצהרת נגישות

**Page title (placeholder):** הצהרת נגישות

| Section | Heading | Bullet placeholders | Risk notes |
|---------|---------|---------------------|------------|
| 1 | מחויבות נגישות | • האתר מיועד לשימוש נגיש לקהל רחב בישראל • עברית, RTL | Core Phase B — not optional |
| 2 | תקן / יעד נגישות | • [placeholder: ת"י 5568 / WCAG 2.x AA / רמת יעד — לאשר עם יועץ נגישות] | Owner + accessibility consultant |
| 3 | אמצעים שיושמו / מתוכננים | • RTL • מקלדת • ניגודיות • טקסט חלופי לתמונות [placeholder — לעדכן לאחר ביקורת] | Align with Help Center a11y work |
| 4 | מגבלות ידועות | • [placeholder: רשימת מגבלות אם יש — או "בבדיקה"] | Update after audit |
| 5 | דיווח על בעיית נגישות | • דוא"ל: **18eran@gmail.com** • מה לכלול בפנייה (דף, דפדפן, תיאור) • SLA טיפול [placeholder — ימים] | |
| 6 | תאריך עדכון | • עודכן לאחרונה: **[placeholder]** | |

---

### C.4 `/data-deletion` — מחיקת נתונים וזכויות

**Page title (placeholder):** מחיקת נתונים וזכויות

| Section | Heading | Bullet placeholders | Risk notes |
|---------|---------|---------------------|------------|
| 1 | מחיקת ילד על ידי ההורה | • מהלך קיים בלוח ההורה • אזהרה + הקלדת שם לאישור • **מחיקה מכוונת בלבד** | Matches `pages/parent/dashboard.js` UX |
| 2 | מה נמחק | • פרטי כניסה, סשנים, תשובות, דוחות, מטבעות [placeholder — ליישר עם RPC] | Technical accuracy review |
| 3 | שמירה טכנית זמנית | • **עד 7 ימי עסקים** — גיבוי/שחזור/בטיחות/חובה משפטית בלבד • לא שימוש מחדש בשירות | Proposed wording — lawyer approve |
| 4 | בקשות מחיקה נוספות | • מחיקת חשבון הורה מלא — פנייה ל-**18eran@gmail.com** • **SLA: 7 ימי עסקים** | No mechanism yet |
| 5 | מה שלא גורם למחיקה | • **אי-חידוש מנוי / כשל תשלום — לא מוחק נתונים** • רק הגבלת/הקפאת גישה | See §E |
| 6 | קישורים | • מדיניות פרטיות • צור קשר | |

**Route recommendation:** **Standalone `/data-deletion`** plus Privacy §6 cross-link (clearer for parents and regulators than Privacy-only).

---

### C.5 `/ai-disclosure` — שימוש בבינה מלאכותית (AI) ו-Copilot

**Page title (placeholder):** שימוש בבינה מלאכותית (AI) ו-Copilot

| Section | Heading | Bullet placeholders | Risk notes |
|---------|---------|---------------------|------------|
| 1 | מה זה | • AI/Copilot **עשוי** לסייע בהסבר דוחות הורים והמלצות למידה • לא חובה לשימוש | Not ENV; capability description |
| 2 | מה AI עושה | • ניתוח נתוני תרגול/דוח • תשובות טקסט בעברית • [placeholder: סוגי מודל/ספק — ללא פרטי ENV] | High-level only |
| 3 | מה AI **לא** עושה | • **לא** אבחון חינוכי/דידקטי/מקצועי • **לא** תחליף למורה, יועץ, פסיכолог, רופא • **לא** ייעוץ רפואי/קlinי | Align with Copilot guardrails; **do not copy** D-1 verbatim |
| 4 | דיוק ושגיאות | • AI **עשוי לטעות** • יש לבדוק מול דוח ושיקול דעת הורה | |
| 5 | אילו נתונים עשויים להישלח | • נתוני דוח/תרגול רלוונטיים לשאלה • **לא** רשימת PII מלאה בדף — קטגוריות בלבד [placeholder] | Lawyer + data map |
| 6 | שמירה ואבטחה | • [placeholder: האם prompts נשמרים, כמה זמן] | Owner decision |
| 7 | קישורים | • דוחות — הבהרה בתוך הדוח (cross-ref) • פרטיות • תנאים | |
| 8 | יצירת קשר | • 18eran@gmail.com | |

**Route recommendation:** **Dedicated `/ai-disclosure`** (linked from Privacy, Terms, future Copilot one-liner).

---

### C.6 `/security` (optional) — אבטחה ופרטיות בקצרה

**Page title (placeholder):** אבטחה ופרטיות — מידע להורים

| Section | Heading | Bullet placeholders |
|---------|---------|---------------------|
| 1 | הגנה על המידע | • HTTPS • הרשאות • [placeholder — plain language] |
| 2 | מה ההורים יכולים לעשות | • סיסמה חזקה • איפוס PIN • מחיקת ילד |
| 3 | דיווח על incident | • 18eran@gmail.com |
| 4 | לא כולל | • אין חשיפת ENV, tokens, or internal config |

---

### C.7 `/contact` — cross-links only (future)

**Additions (placeholder — no product edit in Phase A.1):**

- קישור: מדיניות פרטיות · תנאי שימוש · נגישות · מחיקת נתונים · AI
- פסקה: פניות פרטיות/מחיקה/נגישות/דיווח על שימוש לרעה → 18eran@gmail.com

---

## D. Data deletion policy skeleton (consolidated)

1. **Child deletion (in-app):** Parent initiates delete from dashboard; system shows **clear irreversibility warning** and requires **typed confirmation** of child name (existing UX).
2. **Effect:** Child data is **treated as deleted** from the parent’s account and service perspective upon successful completion.
3. **Technical retention (if required):** Backup/recovery copies may be retained **up to 7 business days** only for disaster recovery, technical safety, or legal/security obligations — **not** for continued service use.
4. **Parent/account deletion:** Request via **18eran@gmail.com**; handling **SLA 7 business days**.
5. **Not deletion triggers:** Subscription lapse, payment failure, non-renewal, or access downgrade — **no automatic deletion** of children or learning history.
6. **Public wording:** Never reference QA 50-child accounts.

---

## E. Subscription-related policy note (consolidated)

| Scenario | Allowed policy response | **Forbidden** |
|----------|-------------------------|---------------|
| Payment failure | Restrict/freeze/downgrade access | Auto-delete child or learning data |
| Subscription expires | Pause or read-only mode per future plan | Auto-delete |
| User cancels subscription | End paid features; retain data until explicit deletion | Silent data wipe |
| Parent wants data removed | Explicit deletion flow (child in-app or account via email) | N/A |

**Skeleton sentence (placeholder):**  
“ביטול מנוי, אי-חידוש, או כשל בתשלום **אינם** גורמים למחיקה אוטומטית של נתוני ילדים או היסטוריית למידה; הם עשויים להגביל או להשהות גישה לשירות בהתאם למדיניות המנוי. מחיקת נתונים תתבצע **רק** ביוזמת הורה מפורשת, לאחר אזהרה והבנה.”

---

## F. Advertising / cookies skeleton (consolidated)

### F.1 Current (functional only — no implementation change)

| Type | Purpose | Examples (site today) |
|------|---------|------------------------|
| Session / auth storage | Login state | Student session cookie; Supabase parent session |
| Essential site operation | Security, preferences | [placeholder if any beyond auth] |

### F.2 Possible future (disclosure only — **not implemented**)

| Type | Purpose | Disclosure requirement |
|------|---------|------------------------|
| Advertising | Display ads | Partner names, data shared, opt-out if applicable |
| Analytics | Usage measurement | Tool names, cookies, retention |
| Marketing pixels | Campaign attribution | Before activation — update Privacy + [cookie notice if required] |

**Skeleton principle:** Separate sections **“מה קיים היום”** vs **“מה עשוי להוסף בעתיד”**. No cookie banner, pixels, or ad code in Phase A.1.

---

## G. AI / Copilot disclosure skeleton (consolidated)

| Statement | Skeleton (Hebrew intent) |
|-----------|--------------------------|
| Capability | AI may help explain parent reports and learning recommendations |
| Nature | Informational / educational only |
| Limits | Not a diagnosis; not professional advice; may be wrong |
| Data | High-level categories sent to AI systems (see data inventory) |
| Report disclaimer | On-report text remains **`ParentReportImportantDisclaimer`** — policy **links**, does not replace |
| Contact | 18eran@gmail.com for questions |

**Explicitly not in this phase:** ENV changes, Copilot UI strings, model routing, or engine guardrails.

---

## H. Accessibility skeleton (consolidated)

| Item | Plan |
|------|------|
| Route | **`/accessibility`** — **Phase B core** |
| Language | Hebrew, RTL |
| Standard placeholder | [ת"י 5568 / WCAG — confirm with consultant] |
| Contact | **18eran@gmail.com** for accessibility issues |
| Known limitations | [placeholder section] |
| Last updated | [placeholder date on publish] |
| Compliance stance | Required for Israeli public-facing service — not “Phase E optional” |

---

## I. Future implementation phases (revised)

| Phase | Name | Deliverables | Owner gate |
|-------|------|--------------|------------|
| **A.1** | Decisions + copy skeleton | **This document** | ✅ Complete (planning) |
| **A.2** | Owner + legal review | Approved Hebrew legal copy (not skeleton) | Lawyer signoff on D-PRIV items |
| **B** | Core public pages | `/privacy`, `/terms`, `/accessibility`; footer/header links; `/contact` cross-links | After A.2 |
| **C** | Extended policy pages | `/data-deletion`, `/ai-disclosure`; optional `/security` | After A.2 |
| **D** | Signup discovery | Terms + Privacy **links** on parent signup (no checkbox yet if owner prefers link-only first) | After B |
| **E** | Signup acceptance | Terms + Privacy **acceptance** (checkbox or click-wrap); evidence storage design approved separately — **no guardian checkbox** | After D + storage decision |
| **ENV** | Pre-launch only | Secrets, DSN, production flags — **separate** from legal pages | Not part of A–E |

**Excluded permanently from public routes:** `/parent-consent`.

---

## J. QA checklist (future implementation — not run in A.1)

- [ ] `/privacy`, `/terms`, `/accessibility` return HTTP 200 (dev + production build)
- [ ] `/data-deletion` and `/ai-disclosure` return HTTP 200 when implemented (Phase C)
- [ ] Footer (and agreed header) links resolve
- [ ] Parent signup shows Terms + Privacy links (Phase D+)
- [ ] **No** duplicate full text of `ParentReportImportantDisclaimer` on policy pages
- [ ] **No** “אני מאשר/ת שאני הורה/אפוטרופוס” checkbox
- [ ] **No** `/parent-consent` route
- [ ] Public copy states **max 3 children**; no QA 50-student mention
- [ ] Subscription section states **no auto-delete** on payment failure
- [ ] Deletion SLA **7 business days** visible where applicable
- [ ] Contact email **18eran@gmail.com** consistent with `pages/contact.js`
- [ ] Advertising/cookie sections present (forward-looking) even if ads not live
- [ ] Hebrew RTL preserved on all new pages
- [ ] **No** ENV / Vercel env touched
- [ ] **No** changes to diagnostic engine, report calculations, D-1 disclaimer, Copilot logic
- [ ] `git diff` limited to approved legal page whitelist + additive Layout links

---

## Confirmations (Phase A.1 pass)

| Rule | Status |
|------|--------|
| Product pages/routes implemented | **No** |
| Modals / signup checkboxes / DB | **No** |
| Product Hebrew copy changed | **No** |
| Design changed | **No** |
| ENV / deploy / commit / push | **No** |
| Engine / report / D-1 / Copilot logic | **No** |

**Next step:** Phase **A.2** — owner and legal review of this skeleton; produce approved final Hebrew copy before Phase B implementation.
