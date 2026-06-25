# Phase 6 CI fix — follow-up issues (נפרד מהתיקון)

תאריך: 2026-06-25

## 1. `parent-activity-grade-evidence-selftest` — 9/61 כשלונות

**סטטוס:** בעיה נפרדת, לא נגרמה מתיקון phase6.

**מה נכשל (דוגמאות):**
- `self-practice higher-grade NOT broken (division g4)`
- `fractions g4 holds parent + self evidence` — רק `parent_assigned_activity`, חסר `self_practice`
- `truth packet surfaceFacts exposes evidenceSources`
- `evidenceSourcePhraseHe parent`
- `strength surfaces evidence source gently` — ניסוח עם «חשבון» (לפני יישור תוויות)

**השפעה על האתר:**
- **בינונית-נמוכה ל-UX ישיר:** פעילות הורה + תרגול עצמי באותו נושא/כיתה עדיין נספרים; הבעיה בבדיקות מצביעה על **פער בשרשור evidence** כשיש גם parent-assigned וגם self-practice באותו slice (למשל שברים g4).
- **דוח הורה / Copilot:** עלול להציג מקור ראיות חלקי או ניסוח שלא מזכיר במפורש תרגול עצמאי לצד פעילות הורה — לא שבר טעינה.
- **לא חוסם:** יצירת פעילות, מענה ילד, או טעינת דוח.

**קבצים רלוונטיים:** `lib/parent-server/report-data-aggregate.server.js`, `utils/parent-report-output-integrity/row-identity-v1.js`, `utils/parent-copilot/truth-packet-v1.js`

**הרצה:** `node scripts/parent-activity-grade-evidence-selftest.mjs`

---

## 2. ייבוא אנגלית תחת `tsx` — `getRuntimeEligiblePhonicsPool`

**סטטוס:** בעיה נפרדת, לא חלק מתיקון phase6.

**תסמין:**
```
The requested module 'data/english-questions/index.js' does not provide an export named 'getRuntimeEligiblePhonicsPool'
```

**סיבה:** `tsx` מעטף קבצי data גדולים כ-`default` בלבד; `english-question-generator.js` → `english-book-practice-map.js` משתמש ב-named import.

**השפעה על האתר:**
- **אין השפעה על Next/production** (bundler רגיל) — אומת: `node` + `qa:english:runtime-gate` + `certify-english-grammar-diagnostic-e2e` עוברים.
- **יש השפעה על סקריפטי `tsx`** שמייבאים ישירות `english-question-generator` או `generate-activity-questions-client` — נכשלים בטעינת מודול.

**תיקון מוצע (בטיקט נפרד):** אותו pattern כמו `utils/resolve-module-export.js` ב-`lib/learning-book/english-book-practice-map.js` (או ייבוא namespace מ-`index.js`).

**לא לשלב ב-PR של phase6** אלא אם רוצים לאחד את כל data-bank imports תחת tsx.

---

## 3. UI חי — לא הורץ בסשן זה

פורטים 3002 / 3110 לא היו פעילים. מומלץ להריץ ידנית:

```bash
npm run dev:run-button
# בטרמינל נפרד:
npm run test:parent-report-real-ui-load
# או עם build יציב לעברית:
npx next build && npx next start -p 3110
set E2E_BASE_URL=http://127.0.0.1:3110
node scripts/e2e-hebrew-niqqud-browser.mjs
```

SSR + bridge כבר עברו ב-`test:parent-report-phase6`.
