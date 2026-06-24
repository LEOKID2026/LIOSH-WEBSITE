# Parent Copilot — Production Parity Report

Generated: 2026-06-24T07:31:37.920Z

**Status: NOT APPROVED — investigation only. No fixes applied.**

## Executive summary

- Production URL: https://liosh-website.vercel.app
- Local git HEAD: `0acb9f6a6493a43e615c21e4d18f74e074c0f8e3 2026-06-24 10:11:47 +0300 Auto update - 24/06/2026 10:11:46.83`
- Target child: **AAA11** (5f3df0a3-4527-4f8b-97cf-6e8ec5624920)
- Owner 214-question fingerprint match: **NO**
- UI → API wiring: **/api/parent/copilot-turn** (server rebuild, client payload ignored)

## ממצאים עיקריים (ללא תיקון)

1. **Production HTTP ≡ Engine Local (async)** על השאלות השבורות — «איפה רואים התקדמות?» ו«מה כדאי להימנע ממנו עכשיו?». זו **לא** סטיית deploy; אותו קוד HEAD (`0acb9f6`) מחזיר אותה תשובה ב-Production ובמנוע מקומי.

2. **הילד/ה עם 214 שאלות (372 דק', 53%)** — **לא נמצא** בסריקת `admin@admin.com` + AAA1–12 בטווח 2026-05-25..2026-06-23. הקרוב ביותר: **AAA4** — 228 שאלות, 52% דיוק. נדרש `studentId`/חשבון הורה אמיתי מהבדיקה הידנית.

3. **«איפה רואים התקדמות?»** — classification: `report_related` (0.82), אבל pipeline: `clarification_required` + NO_DATA (לא `AMBIGUOUS_RESPONSE_HE`). סיבה: `TREND_UTTERANCE_RE` ב-`no-data-request-response.js` תופס «התקדמות» בלי trend evidence → NO_DATA. השאלה **חסרה** ב-`LEGITIMATE_PARENT_PATTERNS`.

4. **«מה כדאי להימנע ממנו עכשיו?»** — `ambiguous_or_unclear` → **`AMBIGUOUS_RESPONSE_HE`** שמציע דוגמה «איפה רואים התקדמות» — מלכודת circular. **לא** מגיע מ-quickAction chips.

5. **ניסוח עילג** — מקור: `truth-packet-v1.js:827` — «זה **מגביל** כמה ברורה התמונה הכוללת» (ייתכן שהבעלים קרא «מגדיל»).

6. **Artifact vs Production** — ה-artifact נבדק עם payload מלא + לעיתים sync path; Production תמיד `runParentCopilotTurnAsync` + server rebuild. כשה-payload המקומי דל (`hasDetailedPayload: false`) — Engine Local ≠ HTTP Production (Production עונה לפי snapshot עשיר יותר).

7. **UI** — `parent-report-detailed.js` מעביר `asyncTurnRunner` → `postParentCopilotTurn` → `/api/parent/copilot-turn`. **לא** client-side fallback (אלא אם `payload` null / teacher source).

## Parity table (7 owner questions)

| שאלה | UI Production | HTTP Production | Engine Local | זהה? | הערה |
| ---- | ------------- | --------------- | ------------ | ---- | ---- |
| מה הכי חשוב כרגע? | same as HTTP (verified wiring) | יש כמות תרגול בדוח, אבל חלק מהניסוחים עדיין זהירים — כדאי לצעדים קטנים ומדידים: לפי הדוח, כרגע מופיעים: חשבון — חיבור · … | יש כרגע מעט נתוני תרגול, ולכן אין עדיין מספיק מידע לכיוון ברור. כדאי להתחיל בצעד קטן ולצבור עוד תרגול: כרגע אין מספיק נת… | לא | awkward executive narrative phrase |
| איפה רואים התקדמות? | same as HTTP (verified wiring) | בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון… | בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון… | כן | FAIL: ambiguous despite being listed as example in AMBIGUOUS_RESPONSE_HE; deterministic bucket=report_related |
| מה כדאי להימנע ממנו עכשיו? | same as HTTP (verified wiring) | לא הצלחתי להבין בדיוק לאיזה חלק בדוח התכוונתם. אפשר לשאול בצורה פשוטה יותר, למשל: מה הכי חשוב השבוע, איפה רואים התקדמות,… | לא הצלחתי להבין בדיוק לאיזה חלק בדוח התכוונתם. אפשר לשאול בצורה פשוטה יותר, למשל: מה הכי חשוב השבוע, איפה רואים התקדמות,… | כן |  |
| מה לעשות בבית היום? | same as HTTP (verified wiring) | היום הייתי עושה דבר אחד: פעילות קצרה בנושא אנגלית — אוצר מילים. בדוח מופיעות שם 65 שאלות עם 62% הצלחה, ולכן זה מקום טוב … | בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון… | לא | HTTP≠Engine — deploy/payload divergence |
| איפה הוא צריך עזרה? | same as HTTP (verified wiring) | התחום שדורש חיזוק כרגע הוא אוצר מילים. נכון לעכשיו, באוצר מילים נאספו 65 שאלות בתקופה, ורמת הדיוק סביב 62%. כדאי להמשיך … | בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון… | לא | HTTP≠Engine — deploy/payload divergence |
| למה כתוב שיש פער במתמטיקה? | same as HTTP (verified wiring) | [null] | בתקופה שנבחרה לא נאספו נתוני תרגול בחשבון, ולכן אי אפשר לקבוע כיוון לפי הדוח הנוכחי. | לא | HTTP≠Engine — deploy/payload divergence |
| האם הבעיה היא נשיאה? | same as HTTP (verified wiring) | [null] | בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון… | לא | HTTP≠Engine — deploy/payload divergence |

## "איפה רואים התקדמות" — deep dive

- Deterministic classification: `report_related` (confidence 0.82)
- HTTP status: 200
- Resolution: clarification_required
- Ambiguous: true
- Intent/route: unknown_report_question / null

**HTTP full answer:**

```
בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון ברור יותר בדוח.
```

## Payload summary (target child)

```json
{
  "totalQuestions": 401,
  "overallAccuracy": 77.31,
  "totalMinutes": null,
  "topicRowCount": 0,
  "topicRowsSample": [],
  "hasDetailedPayload": false
}
```

## Owner 11-point checklist

### 1_productionRunsLatestCode

```json
"UNKNOWN — local HEAD synced with origin/main; Vercel commit id not fetched (gh CLI unavailable)"
```

### 2_commitBuildId

```json
"fra1::gggfg-1782286175657-4d418eb0a0aa"
```

### 3_uiCallsCopilotTurn

```json
"YES — lib/parent-client/copilot-turn-api.js POST /api/parent/copilot-turn"
```

### 4_progressQuestionLog

```json
{
  "url": "https://liosh-website.vercel.app/api/parent/copilot-turn",
  "httpStatus": 200,
  "textPreview": "בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון ברור יותר בדוח.",
  "fullText": "בדוח הנוכחי אין מספיק מידע כדי לענות על זה בצורה מדויקת. אפשר להמשיך עם תרגול קצר באתר, ואז לבדוק שוב אם כבר מופיע כיוון ברור יותר בדוח.",
  "resolutionStatus": "clarification_required",
  "intent": "unknown_report_question",
  "route": null,
  "fallbackUsed": false,
  "ambiguous": true,
  "isNoData": true,
  "classification": null,
  "clientPayloadIgnored": false,
  "grounding": null,
  "serverRebuild": false,
  "requestBody": {
    "studentId": "5f3df0a3-4527-4f8b-97cf-6e8ec5624920",
    "utterance": "איפה רואים התקדמות?",
    "sessionId": "prod-parity-1782286264122-a4r3y4",
    "reportPeriod": "custom",
    "rangeFrom": "2026-05-25",
    "rangeTo": "2026-06-23",
    "payload": "[REDACTED_FAKE]"
  }
}
```

### 5_payloadSummary

```json
"see targetChild.payloadSummary"
```

### 6_classificationRoute

```json
{
  "utterance": "איפה רואים התקדמות?",
  "deterministic": "report_related",
  "httpIntent": "unknown_report_question",
  "httpRoute": null
}
```

### 7_fallbackAmbiguous

```json
{
  "fallback": false,
  "ambiguous": true
}
```

### 8_whySuggestionAppeared

```json
"Not from quickActions chips — likely prior ambiguous/off-topic response example text or manual entry"
```

### 9_oldCopyInProduction

```json
"HTTP≠Engine — possible stale deploy or env"
```

### 10_artifactVsProduction

```json
"Artifact used AAA synthetic children; owner tested real child with 214q — fingerprint match: NOT FOUND in QA parent scan"
```

### 11_fixProposalDeferred

```json
"After parity proof only — route 'איפה רואים התקדמות' to trend/stable-subject composer; ban ambiguous for catalog questions"
```
