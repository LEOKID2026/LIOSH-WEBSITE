# Parent Demo Mode — דוח Acceptance סופי

**תאריך:** 18 ביולי 2026  
**פרויקט:** `LEO-KIDS-WEB-TRY` בלבד  
**סטטוס:** ✅ **Complete** (Acceptance עבר)

---

## 1. שורש ה-500 ב-`/api/demo/catalog`

### אבחון

| שלב | תוצאה |
|-----|--------|
| סביבה | `node --env-file=.env.local` + dev server `:3004` |
| קריאה | `GET /api/demo/catalog?gradeLevel=g3` |
| לפני תיקון | `500` — `{ ok: false, error: "Server error" }` |
| Stack | `Error: SUBJECT_CONTENT_CATALOG_INCOMPLETE` at `resolveEffectiveContentGradePure` ← `buildDemoSubjectAccessPayload` (`demo-catalog.server.js:79`) |

### סיווג

**Shape שגוי של תוצאה / שימוש לא נכון בלוגיקת grades** — לא env, לא import, לא Supabase client, לא RLS, לא טבלה חסרה.

`buildDemoSubjectAccessPayload` בנה `availableGrades` רק משורות **הכיתה הנוכחית** (`catalogRows.filter is_grade_suitable`). למקצועות עם `is_grade_suitable: false` ב-g3 המערך ריק → `resolveEffectiveContentGradePure` זורק.

המימוש הרגיל (`resolveEffectiveContentGrade` ב-`subject-access.server.js`) משתמש ב-`loadAvailableGradesForSubject` — **כל הכיתות** במקטalog.

---

## 2. התיקון שבוצע

### `lib/demo/demo-catalog.server.js`

- import `loadAvailableGradesForSubject`
- לכל מקצוע: grades מ-DB cross-grade (כמו production)
- dedupe לפי `subjectKey`
- `isEnabled: row.is_enabled_by_default === true` (Admin default, **לא** parent locks)
- fallback `effectiveGrade: gradeKey` כשאין grades (ללא throw)

### `pages/_app.js` (Acceptance — מניעת `/api/student/me` בדemo)

- `gateKind`: `pending | demo | student | none`
- ב-`pending` — **לא** mount `StudentAccessGate` (מונע fetch `/me` לפני זיהוי demo session)
- ב-`demo` — `DemoAccessGate` בלבד

### קבצי Acceptance חדשים

- `scripts/tests/demo-catalog-api-smoke.mjs`
- `tests/e2e/parent-demo-mode-acceptance.spec.ts`

---

## 3. תוצאת endpoint סופית

**Status:** `200 OK`

**Response shape (מצומצם, ללא מידע רגיש):**

```json
{
  "ok": true,
  "gradeLevel": "g3",
  "permissions": {
    "onlineEnabled": true,
    "offlineEnabled": true,
    "soloEnabled": true,
    "educationalEnabled": true
  },
  "categories": { "online": {}, "offline": {}, "solo": {}, "educational": {} },
  "gamesCount": 33,
  "enabledGames": 29,
  "playableGames": 29,
  "adminDisabledGameKeys": ["recycling-factory", "leo-lab", "puzzle", "leo-jump"],
  "subjectsCount": 8,
  "subjectKeys": ["math", "geometry", "hebrew", "english", "science", "history", "moledet", "geography"],
  "disabledSubjectKeys": ["history", "geography"],
  "sampleGame": {
    "gameKey": "leo-supermarket",
    "category": "educational",
    "isEnabled": true,
    "playable": true,
    "accessState": "allowed"
  },
  "sampleSubject": {
    "subjectKey": "math",
    "displayNameHe": "מתמטיקה",
    "isActive": true
  },
  "subjectAccess": {
    "enforced": true,
    "allowStudentGradePicker": true,
    "subjectPermissions": {
      "math": { "isEnabled": true, "isGradeSuitable": true, "effectiveGrade": "g3" },
      "history": { "isEnabled": false, "isGradeSuitable": false, "effectiveGrade": "..." }
    }
  }
}
```

### אימות מבנה

| דרישה | ✅ |
|--------|---|
| קטלוג משחקים פעילים | 29 playable / 33 total |
| משחק Admin כבוי — לא playable | 4 disabled, 0 disabled+playable |
| מקצועות פעילים | 8 subjects |
| מקצוע Admin כבוי — `isEnabled: false` | history, geography |
| התאמות כיתה (`effectiveGrade`) | per subject |
| flags גלובליים (`permissions`, `categories`) | present |
| אין parent locks | אין `loadStudentSubjectPermissionMap` |
| אין `studentId` | verified |
| אין כתיבה ל-DB | GET only |

---

## 4. בדיקות פונקציונליות בדפדפן (Playwright)

**Suite:** `tests/e2e/parent-demo-mode-acceptance.spec.ts`  
**Server:** `next dev` `:3004` + `.env.local`  
**תוצאה:** **14 passed**, 1 skipped

| # | תרחיש | תוצאה |
|---|--------|--------|
| 1 | דף הבית נטען | ✅ |
| 2 | כפתור דemo desktop + mobile | ✅ |
| 3 | בחירת כיתה → `/student/home` | ✅ |
| 4 | ללא `/api/student/me` | ✅ |
| 5 | סיור learning / arcade / cards | ✅ |
| 6 | Online URL → מסך חסימה | ✅ |
| 7 | Offline tic-tac-toe | ✅ |
| 8 | Solo memory | ✅ |
| 9 | Educational leo-supermarket | ✅ |
| 10 | Learning math-master | ✅ |
| 11 | Leo Miners (ללא API writes) | ✅ |
| 12 | Arcade / friends placeholder | ✅ |
| 13 | Expiry + modal + סגירה | ✅ |
| 14 | Parent login + demo session | ✅ |
| 15 | Guest + resume token | ✅ |
| 16 | תלמיד רשום | ⏭ skipped — אין `E2E_STUDENT_USERNAME`/`PIN` ב-`.env.local` |

---

## 5. Network verification (בדמו)

נ monitored ב-Playwright — **0 writes** ל:

- `/api/student/solo-games/*`
- `/api/student/educational-games/*`
- `/api/learning/session/*`, `/api/learning/answer`
- `/api/student/leo-miners/*`
- `/api/learning/book-events`
- `/api/student/activities/*`, `/api/student/worksheet-activities/*`
- `/api/arcade/presence/*`, `/api/arcade/invites`, `/api/arcade/friends`, `/api/arcade/rooms/*`
- `/api/student/home-profile/*`

**מותר:** `GET /api/demo/catalog` — נקרא ועובד.

**תיקון regression:** `/api/student/me` לא נקרא בדemo (אחרי תיקון `_app.js`).

---

## 6. Regression בפועל

| מסלול | תוצאה |
|--------|--------|
| **אורח** | ✅ כניסה כאורח → `/student/home`, `liosh_guest_resume_token` ב-localStorage, ללא demo bar |
| **הורה** | ✅ `/parent/login` עם `leokids_demo_session` פעיל — אין redirect/התנגשות |
| **תלמיד רשום** | ⏭ לא ניתן לאמת אוטומטית — חסרות credentials ב-`.env.local`; קוד: `StudentAccessGate` + `/api/student/me` כשאין demo session |

---

## 7. אימות 15 דקות (ללא המתנה)

בבדיקה בלבד: `startedAt` שונה ל-localStorage ל-16+ דקות אחורה (`page.evaluate`).

| בדיקה | ✅ |
|--------|---|
| סיור בין דפים אחרי expiry | ✅ |
| start חדש → `DemoTimeExpiredModal` | ✅ (solo memory) |
| Modal נסגר ב-"הבנתי" | ✅ |
| אין redirect כפוי | ✅ |
| בר מציג "הזמן להתחלות חדשות הסתיים" | ✅ |

**לא נשאר** קיצור debug בקוד production.

---

## 8. בדיקות סופיות

| בדיקה | תוצאה |
|--------|--------|
| `node --test tests/demo/parent-demo-mode.test.mjs` | ✅ 8/8 |
| `node --env-file=.env.local scripts/tests/demo-catalog-api-smoke.mjs` | ✅ |
| `npm run test:production-script-guards` | ✅ 11/11 |
| `npm run build` | ✅ |
| Playwright acceptance | ✅ 14/14 (1 skipped) |

---

## 9. קבצים בסבב Acceptance

### נוצרו

- `scripts/tests/demo-catalog-api-smoke.mjs`
- `tests/e2e/parent-demo-mode-acceptance.spec.ts`

### שונו

- `lib/demo/demo-catalog.server.js` — תיקון שורש 500 + `is_enabled_by_default`
- `pages/_app.js` — gateKind, מניעת flash של StudentAccessGate

---

## 10. Git

### `git diff --stat` (נתיבי demo + acceptance)

```
 lib/demo/demo-catalog.server.js                  | (new, fixed)
 pages/_app.js                                     | 24 insertions, 3 deletions
 scripts/tests/demo-catalog-api-smoke.mjs          | (new)
 tests/e2e/parent-demo-mode-acceptance.spec.ts     | (new)
 + 21 modified + 12 new from implementation phase (see prior list)
```

### `git status --short` (demo-related)

```
 M pages/_app.js
?? lib/demo/
?? components/demo/
?? components/home/HomeDemoButton.jsx
?? pages/demo/
?? pages/api/demo/
?? tests/demo/
?? tests/e2e/parent-demo-mode-acceptance.spec.ts
?? scripts/tests/demo-catalog-api-smoke.mjs
?? docs/audits/PARENT-DEMO-MODE-IMPLEMENTATION-REPORT.md
 (+ 21 modified pages/hooks from implementation)
```

---

## 11. אישור

- ❌ **לא** בוצע commit  
- ❌ **לא** בוצע push  
- ❌ **לא** בוצע deploy  
- ❌ לא נגעו `LEO-KIDS`, `LEO-KIDS-GLOBAL`, ייצור, SQL, DB, RLS  

---

## 12. הערת regression — תלמיד רשום

להשלמת smoke ידני: הגדירו ב-`.env.local`:

```
E2E_STUDENT_USERNAME=...
E2E_STUDENT_PIN=...
```

והריצו:

```bash
node --env-file=.env.local ./node_modules/@playwright/test/cli.js test tests/e2e/parent-demo-mode-acceptance.spec.ts -g "registered student"
```

---

*דוח Acceptance — Parent Demo Mode — Complete.*
