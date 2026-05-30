# Assigned Activities — Resume/Progress Fix Review Package

Generated **2026-05-30**. Fixes student-side progress loss on refresh/reopen for all assigned activity scopes. Includes the math layout toggle fix on the same play page (prior follow-up). No SQL. No commit / push / deploy.

## Problem

Manual QA confirmed: parent-assigned (and other) activity **answers persist on the server**, but the student play page **always restarted at question 1** after refresh, browser close, or navigating away and back.

Root cause: `POST /api/student/activities/[activityId]/start` did not return saved attempts; `pages/student/activity/[activityId].js` always initialized `currentIdx = 0`.

## Fix summary

### Server — resume payload on start (all scopes)

| Scope | Start handler | Attempt table |
|-------|---------------|---------------|
| `parent` | `startParentActivity` | `parent_activity_attempts` |
| `student` | `startIndividualStudentActivity` | `student_activity_attempts` |
| `class` | `startStudentActivity` (class branch) | `classroom_activity_attempts` |

In-progress start responses now include:

```js
{
  attempts: [{ questionIndex, selectedAnswer, isCorrect }, ...],
  resumeQuestionIndex: number,  // first unanswered, or last if all answered
  questionSet,
  studentStatus,
  ...
}
```

Submitted activities still return `alreadyCompleted: true` (unchanged).

### Server — anti-exploit duplicate guard

`record*ActivityAnswer` handlers reject re-answering an already-saved question with `question_already_answered` (409). Prevents refresh/reopen from overwriting wrong answers.

### Client — restore progress on load

`pages/student/activity/[activityId].js`:

- Builds `savedAttempts` map from start response
- Sets `currentIdx` from `resumeQuestionIndex` (live_lesson still uses teacher broadcast index)
- Restores answer text + feedback for saved questions
- Disables resubmit on answered questions (`התשובה נשמרה`)
- Restores numeric zero answers via nullish check (`selectedAnswer != null`, not truthy)
- Locks free-text input (`readOnly`/`disabled`) and choice buttons when question already answered

### Math layout toggle (same play page, prior fix)

- `StudentActivityQuestionSurface` + `student-activity-question-ui.client.js`
- Reads operands from `params.a/b` and parses horizontal text (`3 + 13 = __`)
- Same ↕️ מאונך / ↔️ מאוזן toggle as regular math practice

## Files in this package

| Path | Change |
|------|--------|
| `lib/classroom-activities/student-activity-resume.shared.js` | **New** — pure resume index helpers |
| `lib/classroom-activities/student-activity-resume.server.js` | **New** — load attempts + duplicate guard |
| `lib/classroom-activities/student-activity-error-labels.client.js` | `question_already_answered` Hebrew label |
| `lib/classroom-activities/student-activity-question-ui.client.js` | Math layout normalization (params.a/b) |
| `lib/parent-server/parent-activity.server.js` | Resume payload + duplicate guard |
| `lib/teacher-server/student-activity-play.server.js` | Resume payload + duplicate guard (scope `student`) |
| `lib/teacher-server/teacher-activities.server.js` | Resume payload + duplicate guard (scope `class`) |
| `pages/student/activity/[activityId].js` | Restore progress + layout surface |
| `components/student/StudentActivityQuestionSurface.jsx` | Math layout toggle UI |
| `tests/classroom-activities/student-activity-resume.test.mjs` | **New** — resume regression tests |
| `tests/classroom-activities/student-activity-scope-labels.test.mjs` | Layout toggle + scope tests |
| `tests/parent-server/parent-assigned-activities.test.mjs` | Parent activity server/API tests |

## Verification commands

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/classroom-activities/student-activity-scope-labels.test.mjs tests/classroom-activities/student-activity-resume.test.mjs
npm run build
```

### Automated results (2026-05-30, final)

```
node --test tests/parent-server/parent-assigned-activities.test.mjs tests/classroom-activities/student-activity-scope-labels.test.mjs tests/classroom-activities/student-activity-resume.test.mjs
# tests 35
# pass 35
# fail 0
# duration_ms ~217

npm run build
# exit code 0
# Next.js 15.5.18 — lint OK, compile OK, 122 static pages generated
# (pre-existing warning: question-metadata-scanner critical dependency expression)
```

### Final UI polish (same package)

- **Numeric zero:** `savedAnswerDisplayText()` uses `selectedAnswer != null` so math answer `0` restores correctly
- **Read-only answered UI:** free-text input and choice buttons disabled when question already saved; feedback remains visible

## Manual browser QA checklist

**Required before closure.** Repeat scenarios A–E for **each scope**: parent-assigned, teacher individual (`scope: student`), classroom/school (`scope: class`).

### Scenario A — refresh during activity

| Step | Action | Expected |
|------|--------|----------|
| A1 | Start activity | Status `in_progress` |
| A2 | Answer question 1 | Answer saved, advance to Q2 |
| A3 | Refresh page (F5) | Page reloads, no error |
| A4 | Same activity reopens | Q1 answer still saved (visible if navigated back) |
| A5 | Current position | Student on **first unanswered** (Q2 if Q1 answered) |
| A6 | Status | Remains `in_progress` |

### Scenario B — leave and return

| Step | Action | Expected |
|------|--------|----------|
| B1 | Start activity, answer ≥1 question | Progress saved |
| B2 | Navigate to student home | — |
| B3 | Reopen same activity from list | Progress restored to first unanswered |
| B4 | Previously answered questions | Not shown as fresh/unanswered |

### Scenario C — incorrect answer anti-exploit

| Step | Action | Expected |
|------|--------|----------|
| C1 | Answer incorrectly | Wrong feedback shown |
| C2 | Refresh or leave/reopen | Wrong answer still saved |
| C3 | Try to answer same question again | Cannot resubmit (`התשובה נשמרה` or server rejects) |
| C4 | Press start again (re-enter activity) | Does not erase prior attempts |

### Scenario D — submitted activity

| Step | Action | Expected |
|------|--------|----------|
| D1 | Complete and submit | Completion screen |
| D2 | Reopen activity | Shows completed/result state |
| D3 | Does not restart | No fresh attempt, no Q1 reset |

### Scenario E — parent monitoring (parent scope only)

| Step | Action | Expected |
|------|--------|----------|
| E1 | Student starts parent activity | Parent sees **בתהליך** |
| E2 | Student answers, then refreshes | Parent answer count unchanged / consistent |
| E3 | Student submits | Parent sees **הושלם** with correct counts |

### Scope-specific entry points

| Scope | How to open activity | Parent/teacher monitor |
|-------|---------------------|------------------------|
| **parent** | Student home → **פעילויות אישית** → parent activity | Parent dashboard → **פעילויות שנשלחו** |
| **student** | Student home → **פעילויות אישית** → teacher individual | Teacher student page / individual activity monitor |
| **class** | Student home → **פעילויות כיתה** | Teacher class activity monitor |

### Math layout (all scopes with math arithmetic)

| Step | Expected |
|------|----------|
| Open math assigned activity | ↕️ מאונך toggle visible near question |
| Toggle | Vertical/horizontal layout changes for e.g. `3 + 13 = __` |
| After refresh | Layout toggle still works; progress resume still works |

## Unchanged by design

- No SQL / schema changes
- Parent answers stay in `parent_activity_attempts` only (never `answers` table)
- Parent report architecture (`includeParentActivities` opt-in only)
- Teacher/school reports unchanged
- Teacher/classroom activity creation and assignment flows unchanged
- No UI redesign beyond progress restore + existing layout toggle

## No commit / push / deploy

Per owner instructions.
