# מיפוי מדיניות משפטית / אמון — Leo Kids לפני השקה

**תאריך מיפוי:** 2026-07-01  
**סוג עבודה:** מיפוי בלבד — ללא שכתוב, מחיקה, איחוד או שינוי קוד  
**מטרה:** לאפשר לבעלים לעבור על התוכן הקיים, לאשר נוסח סופי, ולהחליט על איחוד לעמוד אחד

---

## סיכום מנהלים

| שאלה | ממצא |
|------|------|
| כמה עמודי מדיניות נפרדים קיימים? | **6 עמודים משפטיים** (`/privacy`, `/terms`, `/accessibility`, `/ai-disclosure`, `/data-deletion`, `/security`) + **עמוד hub** חלקי ב-`/contact` |
| האם אפשר לאחד לעמוד אחד בלי לשבור קישורים? | **כן**, עם redirects מ-`/privacy`, `/terms` וכו' ל-anchors בעמוד מאוחד (למשל `/legal#privacy`) |
| קישורים שחייבים להישאר | **`/privacy`** (Google Play / OAuth), **`/terms`**, **`/accessibility`** (ציפיות נגישות בישראל), **`/ai-disclosure`** (Copilot + שקיפות AI) |
| מה חסר לפני נוסח סופי? | מורים פרטיים, מצב אורח, OAuth/Google, PWA/localStorage, מטבעות/חנות, אימות ניסוח «מאשרים» מול acceptance שקט בשרת, איחוד «הבהרה חשובה», אימייל יצירת קשר אחיד |

**מקור תוכן מרכזי:** `data/legal/sitePolicies.he.js`  
**רenderer:** `components/legal/SitePolicyPage.js`  
**גרסאות acceptance:** `TERMS_VERSION` / `PRIVACY_VERSION` = `2026-05-24`  
**אימייל בקוד:** `leokid2026@gmail.com` (שונה מ-`18eran@gmail.com` במסמכי תכנון ישנים)

---

# חלק א׳ — רשימת כל העמודים שנמצאו

## 1. עמודי מדיניות משפטיים (routes רשמיים)

כל העמודים הבאים משתמשים ב-`SitePolicyPage`, RTL עברית, `POLICY_LAST_UPDATED`, cross-links בתחתית, ו-metadata ב-`<Head>`.

| URL | נתיב קובץ | Title / H1 | מטרת העמוד | מקושר מהאתר? | מאיפה מקושר | עברית מלאה? | כפילות | בעיות / הערות |
|-----|-----------|------------|------------|--------------|-------------|-------------|--------|---------------|
| `/privacy` | `pages/privacy.js` → `SITE_POLICIES.privacy` | **מדיניות פרטיות** | איסוף/שימוש/שמירת נתונים, עוגיות, AI (סיכום), זכויות | **כן** | `/contact`, cross-links בכל עמוד מדיניות, `/parent/login`, `ParentCompactPolicyAcceptance` (לא פעיל ב-dashboard) | **כן** | חופף חלקית ל-`/terms`, `/data-deletion`, `/ai-disclosure`, `/security` | לא מזכיר מורים/אורח/OAuth; פרסום «עתידי»; אימייל ≠ docs ישנים |
| `/terms` | `pages/terms.js` → `SITE_POLICIES.terms` | **תנאי שימוש** | כללי שימוש, חשבונות, אופי חינוכי, IP, מנוי עתידי, אחריות | **כן** | כמו למעלה | **כן** | חופף privacy, AI, deletion | אומר «הרשמת הורה = הסכמה» — בפועל אין checkbox; acceptance שקט בשרת |
| `/accessibility` | `pages/accessibility.js` → `SITE_POLICIES.accessibility` | **הצהרת נגישות** | מחויבות, ת"י 5568 / WCAG AA, דיווח | **כן** | `/contact`, cross-links | **כן** | נושא נפרד — לא כפול מלא | «בתהליך» — לא חתום יועץ נגישות |
| `/ai-disclosure` | `pages/ai-disclosure.js` → `SITE_POLICIES.aiDisclosure` | **גילוי שימוש בבינה מלאכותית (AI)** | Copilot, מגבלות, נתונים לספק AI | **כן** | cross-links, `/privacy`, `/terms`, **Copilot panel** | **כן** | חופף privacy § AI + terms § educational + disclaimer בדוח | לא מפרט ספק/מודל; מפנה ל«הבהרה חשובה» בדוח |
| `/data-deletion` | `pages/data-deletion.js` → `SITE_POLICIES.dataDeletion` | **מחיקת נתונים** | מחיקת ילד, SLA 7 ימי עסקים, מה לא גורם למחיקה | **כן** | `/contact`, cross-links, `/privacy`, `/terms` | **כן** | חופף privacy § retention + terms § subscription | — |
| `/security` | `pages/security.js` → `SITE_POLICIES.security` | **אבטחת מידע** | סיכום אבטחה להורים | **כן** | `/contact`, cross-links | **כן** | חופף privacy § processors/visibility | «מידע בלבד» — לא DPA |

### Metadata / SEO / robots

| עמוד | `<title>` | `meta description` | `noindex` |
|------|-----------|-------------------|-----------|
| כל 6 העמודים | `{pageTitle} · LEO KIDS` | כן — מ-`metaDescription` | **לא** — ניתנים לאינדוקס |
| `/contact` | ברירת מחדל Layout | לא ייעודי ב-Head | לא |

**anchors קיימים:** כל section ב-`SitePolicyPage` מקבל `id={section.id}` (למשל `#cookies`, `#children`, `#does-not`) — **מוכן לאיחוד**, אך ה-URLs הנוכחיים לא משתמשים ב-anchors.

---

## 2. עמוד hub / יצירת קשר

| URL | נתיב | Title / H1 | מטרה | מקושר? | מאיפה | עברית | כפילות | הערות |
|-----|------|------------|------|--------|-------|-------|--------|-------|
| `/contact` | `pages/contact.js` | **צור קשר** | FAQ, אימייל, רשתות, **רשימת 6 קישורי מדיניות** | **כן** | Header nav (`/help`, `/contact`), cross-links | **כן** | FAQ ≠ מדיניות | **זהו hub המשפטי היחיד** ב-chrome (footer הגלובלי = copyright בלבד) |

קישורים ב-`/contact` (מ-`LEGAL_CONTACT_PAGE_LINKS`):

- פרטיות → `/privacy`
- תנאי שימוש → `/terms`
- נגישות → `/accessibility`
- מחיקת נתונים → `/data-deletion`
- גילוי שימוש ב-AI → `/ai-disclosure`
- אבטחה → `/security`

---

## 3. עמודים ש**אינם** מדיניות — אך רלוונטיים

| URL | קובץ | קשר משפטי | קישורי מדיניות? |
|-----|------|-----------|-----------------|
| `/` | `pages/index.js` | דף בית | **אין** |
| `/kids`, `/parents`, `/teachers` | marketing landings | שיווק | **אין** |
| `/about` | `pages/about.js` | שיווק | **אין** |
| `/help/**` | Help Center | חינוכי — **לא** תחליף למדיניות | `/contact` בלבד במאמרים רלוונטיים |
| `/parent/login` | `pages/parent/login.js` | הרשמה/כניסה + **טקסט תנאים פסיבי** | `/terms`, `/privacy` |
| `/student/login` | `pages/student/login.js` | כניסת ילד + **אורח** | **אין** |
| `/teacher/login` | `pages/teacher/login.js` | מורים פרטיים / בית ספר | **אין** |
| `/*/install-app` | PWA install | התקנה | **אין** טקסט מדיניות |

---

## 4. Routes ש**לא** קיימים (נבדק)

| Route מבוקש | סטטוס |
|-------------|--------|
| `/policy` | **לא קיים** |
| `/legal` | **לא קיים** |
| `/parent-consent` | **לא קיים** (נכון לפי החלטת מוצר) |
| `/parent/*` policy | רק login |
| redirects ב-`next.config.js` | **אין** redirects למדיניות |

---

## 5. קישורים שבורים / עמודים יתומים

| בדיקה | תוצאה |
|-------|--------|
| קישורים פנימיים `/privacy`, `/terms`, `/accessibility`, `/ai-disclosure`, `/data-deletion`, `/security`, `/contact` | **כולם מובילים לעמודים קיימים** |
| עמודים ללא inbound links | **אין עמוד יתום** — כולם מקושרים מ-`/contact` ו/או cross-links |
| עמודים «נסתרים» | `/security`, `/data-deletion` — **לא** ב-header; רק `/contact` + cross-links |
| Footer גלובלי | `SiteLegalFooterBar` — **copyright בלבד**, ללא קישורי מדיניות (הערה בקוד: «legal links live on /contact») |

---

# חלק ב׳ — טקסטים משפטיים קצרים מחוץ לעמודים

## B1. כניסת הורים — טקסט פסיבי (ללא checkbox)

| שדה | ערך |
|-----|-----|
| **קובץ** | `pages/parent/login.js` — `ParentPassivePolicyNotice` |
| **קומפוננטה** | inline ב-login |
| **טקסט מדויק** | «בהמשך השימוש ב־Leo Kids, אתם מאשרים את [תנאי השימוש](/terms) ו[מדיניות הפרטיות](/privacy).» |
| **איפה מופיע** | מתחת לטופס login/signup + Google, בעמוד `/parent/login` |
| **סוג** | **טקסט פסיבי** — אין checkbox, אין חסימת submit |
| **הערה** | E2E מאשר: `parent-policy-acceptance-checkbox` count = 0; signup enabled |

## B2. Google Sign-In — כפתור בלבד

| שדה | ערך |
|-----|-----|
| **קובץ** | `components/auth/ParentGoogleSignInButton.jsx` |
| **טקסט** | «התחברות עם Google» (`aria-label` זהה) |
| **איפה** | `/parent/login` — מעל טופס email |
| **סוג** | כפתור OAuth — **ללא** טקסט privacy נפרד ליד הכפתור |
| **הערה** | לאחר OAuth → `postParentSessionReady` → acceptance **שקט** בשרת |

## B3. Parent Policy Acceptance — checkbox (קיים בקוד, לא פעיל ב-UI ראשי)

| שדה | ערך |
|-----|-----|
| **קבצים** | `components/parent/ParentCompactPolicyAcceptance.jsx`, `ParentPolicyAcceptanceGate.jsx` |
| **טקסט label** | «ביצירת חשבון או בשימוש באתר, מומלץ לעיין ב[תנאי השימוש](/terms) וב[מדיניות הפרטיות](/privacy).» |
| **כפתור** | «אישור והמשך» — **disabled** עד סימון checkbox |
| **איפה אמור להופיע** | Gate על dashboard — **לא מחובר** ב-`pages/parent/dashboard.js` הנוכחי |
| **סוג** | **checkbox חובה** — קיים רק ב-review-packages ישנים |
| **סתירה** | ניסוח «מומלץ לעיין» ≠ «מאשרים» ב-login; gate UI ≠ acceptance שקט ב-`/api/parent/session/ready` |

## B4. Footer גלובלי

| שדה | ערך |
|-----|-----|
| **קובץ** | `components/layout/SiteLegalFooterBar.jsx` |
| **טקסט** | «© {שנה} LEO K · משחקים ולמידה לילדים» |
| **איפה** | כל עמוד עם `Layout` (לא immersive games) |
| **סוג** | copyright בלבד — **אין** קישורי מדיניות |

## B5. Header / Navigation

| שדה | ערך |
|-----|-----|
| **קובץ** | `lib/site-nav.js` → `PUBLIC_NAV` |
| **קישורים** | בית, עולם הילדים, פורטל הורים, פורטל מורים, אודות, **צור קשר**, **מרכז העזרה** |
| **מדיניות** | **אין** `/privacy` / `/terms` ב-header |

## B6. Copilot — גילוי AI inline

| שדה | ערך |
|-----|-----|
| **קובץ** | `components/parent-copilot/parent-copilot-panel.jsx` |
| **טקסט קישור** | «מידע על שימוש ב-AI» → `/ai-disclosure` |
| **טקסט הסבר** | «אפשר לשאול כאן בחופשיות על הדוח…» |
| **איפה** | דוח הורים (Copilot panel) |
| **סוג** | קישור פסיבי |

## B7. דוח הורים — «הבהרה חשובה» (in-product)

| שדה | ערך |
|-----|-----|
| **קובץ** | `components/ParentReportImportantDisclaimer.js` |
| **H2** | «הבהרה חשובה» |
| **גוף (3 פסקאות)** | נגזר מנתוני תרגול; כלי עזר לימודי — **לא** אבחון/הערכה מקצועית; מומלץ להיוועץ במורה/איש מקצוע |
| **איפה** | `parent-report`, `parent-report-detailed`, הדפסה |
| **סוג** | disclaimer חובה בתוך דוח — **לא** checkbox |

## B8. Parent AI Insight — footnote

| שדה | ערך |
|-----|-----|
| **קובץ** | `components/ParentReportInsight.jsx` |
| **טקסט AI** | «סיכום נכתב על ידי מודל AI על בסיס נתוני הדוח, ועבר אימות בטיחות לפני הצגה.» |
| **טקסט דטרמיניסטי** | «סיכום זה נבנה אוטומטית מנתוני הדוח (גרסה דטרמיניסטית)…» |
| **איפה** | בלוק «סיכום חכם להורה» / «תובנה להורה» |
| **סוג** | footnote — לא checkbox |

## B9. מחיקת ילד — modal operational

| שדה | ערך |
|-----|-----|
| **קובץ** | `pages/parent/dashboard.js` |
| **כותרת** | «מחיקת ילד לצמיתות» |
| **טקסט** | «מחיקה זו תמחק לצמיתות את הילד, פרטי הכניסה, הסשנים, התשובות, הדוחות, המטבעות וכל הנתונים הקשורים אליו. לא ניתן לשחזר פעולה זו.» + אישור בשם |
| **איפה** | Dashboard הורה |
| **סוג** | **פעולה מפורשת** — לא acceptance תנאים |

## B10. כניסת ילד / אורח

| שדה | ערך |
|-----|-----|
| **קובץ** | `pages/student/login.js` |
| **טקסטים** | «כניסה כאורח»; «אין לך חשבון עדיין? בקש מההורה…» |
| **מדיניות** | **אין** |
| **אורח locks** | `lib/guest/constants.js` — «לא זמין במצב אורח» (UI בלבד) |

## B11. כניסת מורה

| שדה | ערך |
|-----|-----|
| **קובץ** | `pages/teacher/login.js` |
| **מדיניות** | **אין** קישורי terms/privacy |
| **הערה** | consent tokens למורה-תלמיד — backend בלבד (`teacher-consent.server.js`), לא טקסט משפטי גלוי |

## B12. Help Center — תוכן קרוב (לא משפטי)

| מאמר | slug | טקסט רלוונטי | קישור |
|------|------|--------------|-------|
| הבנת ההבהרה | `understanding-the-disclaimer` | ציטוט D-1 (גרסה help — **ניסוח שונה מעט**) | — |
| פרטיות ונתונים | `privacy-and-data` | «המערכת שומרת נתוני תרגול…» | **`/contact` בלבד** — לא `/privacy` |
| Copilot | `parent-copilot` | מגבלות: לא ייעוץ מקצועי | — |

## B13. Acceptance בשרת (לא UI)

| מנגנון | קובץ | התנהגות |
|--------|------|---------|
| Silent accept ב-login | `lib/parent-server/parent-session-ready.server.js` | `recordParentPolicyAcceptance` עם `TERMS_VERSION` / `PRIVACY_VERSION` |
| API | `/api/parent/policy-acceptance/accept`, `/status` | קיים — gate UI לא מחובר ל-dashboard |
| DB | `parent_policy_acceptances` | append-only audit |

---

# חלק ג׳ — כפילויות וסתירות

## ג1. אותו נושא בכמה מקומות

| נושא | מופיע ב |
|------|---------|
| **לא אבחון מקצועי** | `ParentReportImportantDisclaimer`, `/terms` § educational, `/ai-disclosure`, `/privacy` § ai-summary, Help `understanding-the-disclaimer`, Help Copilot limits |
| **מחיקת נתונים** | `/data-deletion`, `/privacy` § retention, `/terms` § subscription, modal dashboard |
| **עוגיות / אחסון** | `/privacy` § cookies (session Supabase) | **חסר:** localStorage, PWA, guest token |
| **AI / Copilot** | `/ai-disclosure`, `/privacy`, Copilot link, `ParentReportInsight`, Help |
| **ילדים / מגבלת 3** | `/privacy`, `/terms` | **חסר:** מורים, אורח |
| **אבטחה** | `/security`, `/privacy` § visibility/processors |

## ג2. ניסוחים שונים / סותרים

| # | נושא | ממצא |
|---|------|------|
| 1 | **הסכמה להרשמה** | Login: «**מאשרים**» (פסיבי) ↔ Terms: «הרשמת הורה **מהווה הסכמה**» ↔ Compact gate: «**מומלץ לעיין**» + checkbox |
| 2 | **Acceptance בפועל** | UI: **אין** checkbox/ch gate ב-dashboard ↔ Server: **כן** רושם acceptance אוטומטית ב-login/OAuth |
| 3 | **הבהרה חשובה** | `ParentReportImportantDisclaimer` פסקה 3: «**אתגר לימודי מתמשך, פער לימודי**…» ↔ Help `disclaimerQuoteBlock`: «**קושי מתמשך, פער לימודי**…» — **לא זהים** |
| 4 | **פרטיות Help vs Policy** | Help `privacy-and-data` → `/contact` | Policy → `/privacy` — **שני מסלולים** |
| 5 | **Footer docs vs קוד** | `LEGAL_POLICY_IMPLEMENTATION_VERIFICATION.md` מתאר footer עם 7 קישורים | **`SiteLegalFooterBar` = copyright בלבד** |
| 6 | **אימייל** | `sitePolicies.he.js`: `leokid2026@gmail.com` | `LEGAL_POLICY_PHASE_A_COPY_SKELETON.md`: `18eran@gmail.com` |
| 7 | **תאריך עדכון** | `POLICY_LAST_UPDATED` = **2026-05-24** | verification doc מציין 2026-05-23 |

## ג3. ניסוח ישן / חסר

| נושא | סטטוס |
|------|--------|
| מורים פרטיים (`/teacher/login`) | **חסר** בעמודי מדיניות |
| מצב אורח לילדים | **חסר** |
| Google OAuth / Supabase auth | **חסר** (מוזכר רק עוגיות Supabase) |
| מטבעות, קלפים, חנות, פרסים | **חלקי** — bullet ב-privacy בלבד |
| PWA / offline / install-app | **חסר** |
| localStorage (guest resume, theme) | **חסר** |
| בית ספר / school portal | **חסר** (יש docs נפרדים `SCHOOL_LEGAL_READINESS_CHECKLIST.md`) |
| analytics events | **חסר** — privacy מזכיר «עתיד» |
| Terms/Privacy **באנגלית** | **לא נמצא** — הכל עברית ב-UI |

## ג4. checkbox / friction

| מקום | checkbox? |
|------|-----------|
| `/parent/login` signup/login | **לא** — by design (E2E test D) |
| `ParentPolicyAcceptanceGate` | **כן** — **לא מחובר** ל-dashboard production |
| יצירת ילד | **לא** |
| כניסת ילד/מורה | **לא** |
| מחיקת ילד | **כן** — אישור בשם (operational) |

---

# חלק ד׳ — הצעת מבנה עמוד מאוחד (נוסח לא סופי)

**Route מוצע:** `/legal` או `/terms` (canonical) — עם anchors לכל נושא.

| # | Anchor מוצע | מקור תוכן קיים | הערות לאיחוד |
|---|-------------|----------------|--------------|
| 1 | `#intro` | חדש — פתיחה | מי אנחנו, תאריך, אימייל |
| 2 | `#terms-general` | `/terms` § acceptance, acceptable-use, law | |
| 3 | `#children` | `/privacy` § audience + children; `/terms` § eligibility | |
| 4 | `#parents` | `/terms` § accounts; dashboard flows | הוסיף acceptance model (פסיבי + server) |
| 5 | `#private-teachers` | **חסר** | כתיבה חדשה נדרשת |
| 6 | `#accounts` | `/terms` § accounts + `/privacy` § data-collected (parent) | Google OAuth — **חדש** |
| 7 | `#guest-mode` | **חסר** (+ `guest-access-policy`) | |
| 8 | `#learning-reports` | `/terms` § educational + `ParentReportImportantDisclaimer` (קישור/ציטוט) | |
| 9 | `#rewards` | `/privacy` bullet coins/arcade | הרחבה |
| 10 | `#privacy` | `/privacy` (full) | |
| 11 | `#children-data` | `/privacy` § children, visibility | |
| 12 | `#learning-analytics` | `/privacy` § purposes, reports | |
| 13 | `#ai` | `/ai-disclosure` + privacy § ai-summary | |
| 14 | `#no-diagnosis` | disclaimer + terms + ai § does-not | **נקודת אמת אחת** |
| 15 | `#cookies-storage` | `/privacy` § cookies + **PWA/localStorage חדש** | |
| 16 | `#google-oauth` | **חדש** | Privacy Policy URL ל-Google Console |
| 17 | `#security` | `/security` | |
| 18 | `#processors` | `/privacy` § processors | |
| 19 | `#retention-deletion` | `/data-deletion` + privacy § retention | |
| 20 | `#your-rights` | `/privacy` § rights | |
| 21 | `#accessibility` | `/accessibility` | |
| 22 | `#ip` | `/terms` § ip | |
| 23 | `#liability` | `/terms` § liability | |
| 24 | `#contact` | כל העמודים § contact | |
| 25 | `#updates` | `/privacy` + `/terms` § changes | version ids |

---

# חלק ה׳ — המלצת איחוד

| עמוד קיים | לאחד לעמוד חדש? | להשאיר נפרד? | redirect? | link anchor? | הערות |
|-----------|------------------|--------------|-----------|--------------|--------|
| `/privacy` | **כן** → `#privacy` + תת-sections | אופציונלי shell | **מומלץ** 301/302 → `/legal#privacy` | כן | **חובה** ל-Google Play / OAuth |
| `/terms` | **כן** → `#terms-general` + sections | אופציונלי | redirect → `/legal#terms-general` | כן | קישור signup |
| `/accessibility` | **כן** → `#accessibility` | **שקול** נפרד (נגישות) | redirect או נפרד | כן | בעלים יחליט — anchor vs עמוד |
| `/ai-disclosure` | **כן** → `#ai` | shell redirect | redirect → `/legal#ai` | Copilot link | |
| `/data-deletion` | **כן** → `#retention-deletion` | redirect | כן | כן | |
| `/security` | **כן** → `#security` | redirect | כן | כן | |
| `/contact` | **לא** — hub + FAQ | **כן** | — | קישור ל-`/legal` | עדכן `LEGAL_FOOTER_LINKS` |
| Help articles | **לא** | **כן** | — | קישור ל-anchors | עדכן `/privacy` links |
| `ParentReportImportantDisclaimer` | **לא** (in-product) | **כן** | — | link ל-`#no-diagnosis` | שמור נוסח D-1 |
| Passive login notice | **לא** (micro-copy) | **כן** | — | `/legal#terms-general` | יישור ניסוח עם acceptance |

---

# חלק ו׳ — החלטות לבעלים

1. **עמוד נגישות נפרד** (`/accessibility`) **או** anchor בלבד ב-`/legal#accessibility`?
2. **`/privacy` ו-`/terms`** — redirects ל-anchors **או** עמודים קצרים עם תוכן מלא?
3. **`/ai-disclosure`** — route נפרד **או** anchor בלבד? (Copilot כבר מקשר)
4. **Footer** — קישור יחיד «תנאים, פרטיות ונגישות» → `/legal` **או** להשאיר hub ב-`/contact`?
5. **Header** — האם להוסיף קישור מדיניות בדף הבית/login?
6. **Google OAuth Privacy Policy URL** — להישאר `https://…/privacy` גם אם התוכן ב-`/legal#privacy`?
7. **מודל acceptance:** passive «מאשרים» + server silent **או** checkbox gate **או** שניהם?
8. **אימייל רשמי:** `leokid2026@gmail.com` **או** `18eran@gmail.com`?
9. **«הבהרה חשובה»** — נוסח D-1 בלבד **או** סנכרון עם Help quote?
10. **מורים פרטיים / אורח / PWA / rewards** — מה נכנס לנוסח הסופי?
11. **בית ספר** — מדיניות נפרדת **או** section ב-legal?
12. **`TERMS_VERSION` / `PRIVACY_VERSION`** — bump + re-accept אחרי איחוד?

---

# חלק ז׳ — קבצים שיצטרכו שינוי (אחרי אישור — לא שונה במיפוי)

## Routes / Pages

- `pages/privacy.js`, `pages/terms.js`, `pages/accessibility.js`, `pages/ai-disclosure.js`, `pages/data-deletion.js`, `pages/security.js`
- **חדש אפשרי:** `pages/legal.js` (או `[slug].js`)
- `pages/contact.js`
- `pages/parent/login.js`
- `pages/index.js`, `pages/kids.js`, `pages/parents.js`, `pages/teachers.js`, `pages/about.js` (אם יוסיפו links)
- `pages/student/login.js`, `pages/teacher/login.js`
- `pages/parent/install-app.js`, `pages/student/install-app.js`, `pages/teacher/install-app.js`
- `next.config.js` (redirects)

## Data / Content

- `data/legal/sitePolicies.he.js` — מקור אמת
- `data/help-center/content/parents.js` — `privacy-and-data`, `parent-copilot`
- `data/help-center/content/parent-report.js` — `understanding-the-disclaimer`
- `data/help-center/articleHelpers.js` — `disclaimerQuoteBlock`

## Components

- `components/legal/SitePolicyPage.js`
- `components/layout/SiteLegalFooterBar.jsx`
- `components/Layout.js`
- `components/parent/ParentCompactPolicyAcceptance.jsx`
- `components/parent/ParentPolicyAcceptanceGate.jsx`
- `components/parent-copilot/parent-copilot-panel.jsx`
- `components/ParentReportImportantDisclaimer.js`
- `components/ParentReportInsight.jsx`
- `components/auth/ParentGoogleSignInButton.jsx`

## Server / API / Tests

- `lib/parent-server/parent-session-ready.server.js`
- `lib/parent-server/policy-acceptance.server.js`
- `lib/parent-client/policy-acceptance-api.js`
- `pages/api/parent/session/ready.js`
- `pages/api/parent/policy-acceptance/accept.js`, `status.js`
- `tests/e2e/parent-policy-acceptance-d2b.spec.ts`
- `docs/android/GOOGLE_PLAY_READINESS_CHECKLIST.md`

## Metadata / Nav

- `lib/site-nav.js`
- `docs/legal/*` (תיעוד פנימי)

---

# סיכום סופי

## האם קיימים 5–6 עמודים נפרדים כיום?

**כן — 6 עמודים משפטיים מלאים:**

1. `/privacy`
2. `/terms`
3. `/accessibility`
4. `/ai-disclosure`
5. `/data-deletion`
6. `/security`

בנוסף: **`/contact`** כ-hub קישורים (לא עמוד מדיניות מלא).

## האם אפשר לאחד לעמוד אחד בלי לשבור links?

**כן.** התשתית כבר תומכת:

- תוכן מרכזי ב-`sitePolicies.he.js`
- section `id` ל-anchors
- redirects מ-`/privacy`, `/terms` וכו' ל-`/legal#…`
- עדכון 7 inbound links (contact, login, copilot, cross-links)

## אילו links חייבים להישאר?

| URL | סיבה |
|-----|------|
| `/privacy` | Google Play, OAuth consent screen, חובה חיצונית |
| `/terms` | signup copy, store terms |
| `/accessibility` | ציפיות רגולטוריות / נגישות בישראל |
| `/ai-disclosure` | Copilot + שקיפות AI |
| `/contact` | hub + FAQ + דיווח |
| `/data-deletion` | שקיפות מחיקה (מומלץ redirect ל-anchor) |

## מה חסר לפני כתיבת נוסח סופי?

1. **נוסח מאוחד** לכל 25 הנושאים (כולל חסרים: מורים, אורח, OAuth, PWA, rewards)
2. **החלטת acceptance model** — passive vs checkbox vs server-only
3. **נקודת אמת אחת** ל«הבהרה חשובה» (D-1 vs Help vs terms)
4. **אימייל יצירת קשר** סופי
5. **החלטת redirects / footer / header**
6. **יועץ משפטי / נגישות** — הקוד מציין במפורש: *NOT lawyer-approved final text*
7. **סנכרון Help Center** — `/privacy` במקום `/contact` במאמר פרטיות
8. **ניקוי dead code** — `ParentPolicyAcceptanceGate` לא מחובר (להחליט: למחוק או לחבר)

---

*מסמך זה נוצר במסגרת מיפוי pre-launch בלבד. לא בוצעו שינויים בקוד, בתוכן או ב-routes.*
