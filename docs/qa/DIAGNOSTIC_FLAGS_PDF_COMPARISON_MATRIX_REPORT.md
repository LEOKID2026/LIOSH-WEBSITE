# Diagnostic Flags — Visual PDF Comparison Matrix

**Date:** 2026-06-08
**Scope:** Visual comparison only — no staging/production activation, no deploy, no code changes.

**Route:** `/learning/parent-report` (ParentReportParentSections)

**Artifacts:** `docs/qa/_artifacts/diagnostic-flags-pdf-comparison-matrix/`

Each cell: `mode-X.png` + `mode-X.pdf` under scenario folder.

---

## Summary matrix

| Scenario | A | B | C | D | Expected diff | Actual diff | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AAA4 | soft | soft | soft, gating, suppressed | soft, gating, suppressed | A/B strong or activity lines; C/D soften/remove strong; report not empty | A:soft; B:soft; C:soft, gating, suppressed; D:soft, gating, suppressed | **PASS** — C/D gating visible vs A/B |
| GATE-LOW | strong, soft | strong, soft | soft, gating, suppressed | soft, gating, suppressed | A/B may show strong; C/D suppress + soft fallback | A:strong, soft; B:strong, soft; C:soft, gating, suppressed; D:soft, gating, suppressed | **PASS** — C/D suppress strong + soft fallback |
| SUBSKILL-FOCUS | soft | soft, focus, pf=1 | soft, focus, pf=1 | soft, focus, pf=1 | A no focus; B/C/D show נושא לחיזוק + מוקד לתרגול; no raw keys | A:soft; B:soft, focus, pf=1; C:soft, focus, pf=1; D:soft, focus, pf=1 | **PASS** — A focus=false; B/C/D focus=true/true/true |
| SUBSKILL-CONFLICT | soft | soft | soft | soft | All modes: no practice focus (conflict suppresses B/C/D) | A:soft; B:soft; C:soft; D:soft | **PASS** — conflict suppresses all modes |
| PROMOTE-STRONG | soft | soft | soft | soft | D may show promotion-visible delta; else internal-only promotion | A:soft; B:soft; C:soft; D:soft | **PASS** — promotion internal only — D identical to A/C on parentFacing (policy/fixture) |

---

## Leak scan (all 20 PDFs)

**PASS** — no forbidden keys in any PDF text extract.

---

## Per-scenario detail

### AAA4 (AAA4, 2026-05-01..2026-06-08)

**Mode A** (S=false G=false P=false)
- Files: `AAA4/mode-A.png`, `mode-A.pdf`
- Payload insights (3): "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."; "יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי."; "נראה שיש שיפור ביחס לתרגולים קודמים — המשיכו בקצב הנוכחי."
- PDF signals: soft
- Leak: PASS

**Mode B** (S=true G=false P=false)
- Files: `AAA4/mode-B.png`, `mode-B.pdf`
- Payload insights (3): "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."; "יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי."; "נראה שיש שיפור ביחס לתרגולים קודמים — המשיכו בקצב הנוכחי."
- PDF signals: soft
- Leak: PASS

**Mode C** (S=true G=true P=false)
- Files: `AAA4/mode-C.png`, `mode-C.pdf`
- Payload insights (1): "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."
- PDF signals: soft, gating, suppressed
- Leak: PASS

**Mode D** (S=true G=true P=true)
- Files: `AAA4/mode-D.png`, `mode-D.pdf`
- Payload insights (1): "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."
- PDF signals: soft, gating, suppressed
- Leak: PASS

### GATE-LOW (AAA9, 2026-05-10..2026-05-18)

**Mode A** (S=false G=false P=false)
- Files: `GATE-LOW/mode-A.png`, `mode-A.pdf`
- Payload insights (3): "נראה שיש קושי במתמטיקה, בעיקר לפי התרגולים האחרונים."; "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף."; "כדאי לשים לב לשברים — זה נושא שחוזר בתרגולים."
- PDF signals: strong, soft
- Leak: PASS

**Mode B** (S=true G=false P=false)
- Files: `GATE-LOW/mode-B.png`, `mode-B.pdf`
- Payload insights (3): "נראה שיש קושי במתמטיקה, בעיקר לפי התרגולים האחרונים."; "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף."; "כדאי לשים לב לשברים — זה נושא שחוזר בתרגולים."
- PDF signals: strong, soft
- Leak: PASS

**Mode C** (S=true G=true P=false)
- Files: `GATE-LOW/mode-C.png`, `mode-C.pdf`
- Payload insights (1): "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."
- PDF signals: soft, gating, suppressed
- Leak: PASS

**Mode D** (S=true G=true P=true)
- Files: `GATE-LOW/mode-D.png`, `mode-D.pdf`
- Payload insights (1): "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."
- PDF signals: soft, gating, suppressed
- Leak: PASS

### SUBSKILL-FOCUS (AAA10, 2026-05-06..2026-05-20)

**Mode A** (S=false G=false P=false)
- Files: `SUBSKILL-FOCUS/mode-A.png`, `mode-A.pdf`
- Payload insights (1): "יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode B** (S=true G=false P=false)
- Files: `SUBSKILL-FOCUS/mode-B.png`, `mode-B.pdf`
- Payload insights (3): "יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי."; "נושא לחיזוק: דקדוק"; "מוקד לתרגול: סממן זמן"
- PDF signals: soft, focus, pf=1
- Leak: PASS

**Mode C** (S=true G=true P=false)
- Files: `SUBSKILL-FOCUS/mode-C.png`, `mode-C.pdf`
- Payload insights (3): "יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי."; "נושא לחיזוק: דקדוק"; "מוקד לתרגול: סממן זמן"
- PDF signals: soft, focus, pf=1
- Leak: PASS

**Mode D** (S=true G=true P=true)
- Files: `SUBSKILL-FOCUS/mode-D.png`, `mode-D.pdf`
- Payload insights (3): "יש טעויות חוזרות באנגלית — שווה לחזור עליהן בקצב איטי."; "נושא לחיזוק: דקדוק"; "מוקד לתרגול: סממן זמן"
- PDF signals: soft, focus, pf=1
- Leak: PASS

### SUBSKILL-CONFLICT (AAA8, 2026-05-20..2026-05-24)

**Mode A** (S=false G=false P=false)
- Files: `SUBSKILL-CONFLICT/mode-A.png`, `mode-A.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode B** (S=true G=false P=false)
- Files: `SUBSKILL-CONFLICT/mode-B.png`, `mode-B.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode C** (S=true G=true P=false)
- Files: `SUBSKILL-CONFLICT/mode-C.png`, `mode-C.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode D** (S=true G=true P=true)
- Files: `SUBSKILL-CONFLICT/mode-D.png`, `mode-D.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

### PROMOTE-STRONG (AAA5, 2026-05-04..2026-05-11)

**Mode A** (S=false G=false P=false)
- Files: `PROMOTE-STRONG/mode-A.png`, `mode-A.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode B** (S=true G=false P=false)
- Files: `PROMOTE-STRONG/mode-B.png`, `mode-B.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode C** (S=true G=true P=false)
- Files: `PROMOTE-STRONG/mode-C.png`, `mode-C.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

**Mode D** (S=true G=true P=true)
- Files: `PROMOTE-STRONG/mode-D.png`, `mode-D.pdf`
- Payload insights (1): "יש טעויות חוזרות במתמטיקה — שווה לחזור עליהן בקצב איטי."
- PDF signals: soft
- Leak: PASS

---

## Flag mode reference

| Mode | SUBSKILL | GATING | PROMOTION |
| --- | --- | --- | --- |
| A | false | false | false |
| B | true | false | false |
| C | true | true | false |
| D | true | true | true |

---

*Generated by `scripts/qa/parent-report-diagnostic-flags-pdf-comparison-matrix.mjs`*