# Parent Report Visible Truth Audit

**Verdict: PASS** — 212/212 payload cases pass; PDF scan 0 hit(s) on 0 file(s).

## Blocking rule

If subject visible questions = 0 in range, parent-facing text must not imply practice in that subject (mistakes, thin data, focus, difficulty).

## Root cause (AAA4 / english 0 + insight)

Scenario: **AAA4**, range `2026-05-01` – `2026-06-08`, mode **A**.

- `english.visibleQuestions`: 0
- `recentMistakesSubjects`: math
- Before fix: `parentFacing.insights` could include `יש טעויות חוזרות באנגלית` while card shows 0 questions.
- Source: `recentMistakes` included learning (non-diagnostic) wrong answers; cards count `diagnosticAnswers` only.
- Fix: filter `recentMistakes` + subject-specific insights by `subjectQuestionCountsFromPayload`.

Public payload trace: `docs/qa/_artifacts/parent-report-visible-truth/root-cause-AAA4.json`

## Failed cases

None.

## Visible Truth Map (sample)

| visible text | section | subject | topic | source field | visible Q | source Q | allowed? | verdict |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה. | מה חשוב לדעת | — | — | parentFacing.insights | 0 | 0 | yes | PASS |
| להתחיל מתרגול קצר של 5–10 דקות, פעם ביום, כדי לבנות הרגל נעים. | מה מומלץ לעשות בבית | — | — | parentFacing.homeRecommendations | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | math | — | subjects.math.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | geometry | — | subjects.geometry.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | english | — | subjects.english.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | science | — | subjects.science.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | hebrew | — | subjects.hebrew.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | moledet-geography | — | subjects.moledet-geography.visibleCard | 0 | 0 | yes | PASS |
| לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה. | מה חשוב לדעת | — | — | parentFacing.insights | 0 | 0 | yes | PASS |
| להתחיל מתרגול קצר של 5–10 דקות, פעם ביום, כדי לבנות הרגל נעים. | מה מומלץ לעשות בבית | — | — | parentFacing.homeRecommendations | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | math | — | subjects.math.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | geometry | — | subjects.geometry.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | english | — | subjects.english.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | science | — | subjects.science.visibleCard | 0 | 0 | yes | PASS |
| לא תורגל בתקופה שנבחרה | כרטיסי מקצוע | hebrew | — | subjects.hebrew.visibleCard | 0 | 0 | yes | PASS |

## Verification suite (after fix)

| Check | Result |
| --- | --- |
| `npm run build` | PASS |
| `parent-report-visible-truth-audit.mjs` | **212/212 PASS** |
| `parent-report-diagnostic-flags-pdf-comparison-matrix.mjs` | **20/20 PASS**, leak PASS |
| `parent-report-numeric-sanity-audit.mjs` | **115/115 PASS** |
| `parent-report-diagnostic-visible-impact-hardening.mjs` | leak + invariants PASS |
| `parent-report-numeric-pdf-scan.mjs` | EBUSY on Windows copy (file lock); manual AAA4 PDF check: no `טעויות חוזרות באנגלית` when english card = 0 |

## Artifacts

- `docs/qa/_artifacts/parent-report-visible-truth/visible-truth-results.json`
- `docs/qa/_artifacts/parent-report-visible-truth/visible-truth-map.json`
- `docs/qa/_artifacts/parent-report-visible-truth/root-cause-AAA4.json`
