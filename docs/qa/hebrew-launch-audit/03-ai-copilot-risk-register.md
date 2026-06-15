# Hebrew Launch Audit 03: AI / Copilot Risk Register

Date: 2026-06-15  
Scope: Hebrew generated or influenced by engine, AI, Copilot, prompts, templates, truth packets, diagnostic logic and recommendations.  
Mode: report only. No product code changes.

## Severity Legend

| Severity | Meaning |
|---|---|
| BLOCKER | Should block launch unless owner explicitly accepts risk or mitigation exists |
| HIGH | Serious trust/safety issue; should be fixed or gated before broad launch |
| MEDIUM | Risky but containable with tests/copy policy |
| LOW | Minor copy/traceability issue |

## Risk Register

### R01 — Recommendations can appear with inconsistent evidence thresholds

**Severity:** BLOCKER  
**Category:** המלצות בלי evidence מספיק / קשר engine-to-copy  
**Files:** `subject-evidence-policy.js`, `parent-report-parent-facing.server.js`, `intent-answer-composers.js`, `parent-facing-pattern-label-he.js`, topic evidence/gating modules  

**Evidence found:**

- Subject valid threshold: 8 questions.
- Server parent insights: subject threshold 5, topic threshold 3.
- M-10 thin fallback: q < 10.
- Copilot strength/weakness: q >= 8.
- Mastery reallocation: q >= 24.

**Why it matters:** הורה יכול לקבל "כדאי לשים לב / נראה שיש קושי / מומלץ" במסלול אחד, ובמסלול אחר "עדיין מעט מידע". זה מערער אמון ויכול ליצור המלצה בלי ראיות מספקות.

**Recommendation:** Define one launch authority for evidence thresholds. Any layer with lower threshold must phrase output as preliminary, not as recommendation.

---

### R02 — Prompt asks AI to over-reassure

**Severity:** BLOCKER  
**Category:** prompts מסוכנים  
**File:** `utils/parent-copilot/llm-orchestrator.js` line 186  

**Problematic prompt text:** `אם cannotConcludeYet=false — הדגש שאין סיבה לדאגה גדולה.`

**Why it matters:** `cannotConcludeYet=false` only means the engine can conclude something; it does not mean there is no concern. If the data points to a learning weakness, the AI may over-reassure.

**Recommendation:** Replace policy in future with: "הדגש שזה אינו אבחון קליני; אם יש חולשה לימודית, הסבר אותה בזהירות ובאופן מעשי."

---

### R03 — Engine-internal Hebrew leakage

**Severity:** BLOCKER  
**Category:** leakage של internal labels  
**Files:** `taxonomy-hebrew.js`, `taxonomy-math.js`, `parent-facing-pattern-label-he.js`, `diagnostic-labels-he.js`, `output-gating.js`  

**Examples at risk:**

- `בחירת כפל לא מתאים לחילוק`
- `מילה קרובה לא נכונה`
- `תבניות מיניות`
- `ביטחון נמוך — כדאי לאסוף עוד תרגול לפני אבחנה מלאה`
- raw `RI0` / `truthPacket` / `contractsV1`

**Mitigation exists:** `parentFacingPatternLabelHe`, `rewriteEngineTaxonomySnippetForParentHe`, `guardrail-validator`, `normalizeParentFacingHe`.

**Why still BLOCKER:** Any new UI/AI surface that reads raw taxonomy or gating reasons directly can leak internal/unsafe Hebrew. This is a launch blocker unless every parent-visible field is verified through the language layer.

**Recommendation:** Add a release checklist: no `patternHe`, `outputGating.reasons`, raw `canonicalState`, raw `contractsV1`, raw `truthPacket` in parent-visible UI/PDF/Copilot.

---

### R04 — Raw intervention fallback may bypass owner-approved copy

**Severity:** HIGH  
**Category:** AI/engine may decide wording not backed by owner-approved copy  
**File:** `utils/parent-report-recommendation-consistency.js` lines 147-160  

**Flow:** if no canonical maintain/expand copy and no grade-aware template exists, resolver can use `unit.intervention.immediateActionHe` or `unit.probe.specificationHe`, unless `shouldOmitRawDiagnosticRecommendationFallback` blocks it.

**Why it matters:** `grade-aware-recommendation-templates.js` intentionally has `actionTextHe: null` for some taxonomy/grade combinations. Falling back to raw engine text can undo that policy.

**Recommendation:** For launch, prefer `null` recommendation over raw fallback unless taxonomy+grade fallback is explicitly approved.

---

### R05 — Parent-facing server insights run parallel to V2 gates

**Severity:** HIGH  
**Category:** המלצות בלי evidence / קשר engine-to-copy  
**File:** `lib/parent-server/parent-report-parent-facing.server.js`  

**Examples:**

- `נראה שיש קושי ב{label}` when subject accuracy < 60 and visible questions > 0.
- `כדאי לשים לב ל{topicLine}` when weak topic has >= 3 diagnostic answers.
- `הביצועים הכלליים... צורך בחיזוק נוסף` at totalAnswers >= 5.

**Why it matters:** These statements can be stronger than V2/canonical gates and may appear as parent-facing insights independent of the engine's stricter contracts.

**Recommendation:** Align `parentFacing` with V2 `canonicalState` or mark it as soft/general only.

---

### R06 — "המערכת זיהתה קושי" is strong diagnostic-style wording

**Severity:** HIGH  
**Category:** משפטים שמציגים אבחון בלי מספיק נתונים / parent-facing copy  
**File:** `utils/parent-report-language/parent-diagnostic-explanations-he.js`  

**Observed pattern:** approved explanations start with `המערכת זיהתה קושי...`.

**Mitigation exists:** renders only when entry status is `approved` and the engine diagnosed the finding.

**Risk:** The wording "זיהתה" can read like a diagnosis, especially near clinical boundary language. It may be acceptable, but owner should explicitly approve tone for launch.

**Recommendation:** Owner decision: keep "זיהתה" or soften to "בתרגול הופיע דפוס שמרמז על...".

---

### R07 — Thin/unclear M-10 fallback says "קושי חוזר"

**Severity:** MEDIUM  
**Category:** fallbacks בעייתיים / thin data overclaim  
**File:** `utils/parent-report-language/parent-facing-pattern-label-he.js`  

**Text:** `קושי חוזר בחילוק — כדאי לחזק את הקשר לכפל`

**Gate:** used when M-10 evidence is low/contradictory/cannot conclude/q<10/weak fallback blocked.

**Risk:** The fallback itself says "קושי חוזר" even though the function name and condition include thin/unclear evidence.

**Recommendation:** For thin/unclear evidence, use "ייתכן קושי בקישור בין חילוק לכפל — כדאי לאסוף עוד תרגול".

---

### R08 — Generic weakness fallback can imply a real pattern

**Severity:** MEDIUM  
**Category:** fallbacks בעייתיים  
**File:** `utils/diagnostic-labels-he.js` line 18  

**Text:** `יש טעויות שחוזרות כאן`

**Risk:** If this is used as last resort, it can imply recurrence even when the system only failed to map a label safely.

**Recommendation:** Prefer `נושא שכדאי לבדוק שוב` for unknown/unsafe snippets; reserve "טעויות חוזרות" only when recurrence evidence is explicit.

---

### R09 — AI narrative prompt requires practical tips even with thin data

**Severity:** MEDIUM  
**Category:** AI may decide unsupported wording  
**File:** `utils/parent-report-ai-narrative/prompt.js`  

**Observed:** prompt requires 2-3 `homeTips`. It also requires exact `required_caution_note_he` when thin data exists.

**Risk:** Even with caution, tips can feel like personalized recommendations. This is lower risk because fallback/validator exist, but owner should decide if generic tips are allowed under thin data.

**Recommendation:** For thin overall data, tips should be explicitly labeled "תרגול כללי לבניית נתונים", not a targeted recommendation.

---

### R10 — Copilot progression may recommend promotion

**Severity:** MEDIUM  
**Category:** recommendation / promotion  
**File:** `utils/parent-copilot/intent-answer-composers.js` lines 865-871 and 912-919  

**Texts:**

- `כן — הילד עבד והצליח גם מעל הכיתה הרשומה...`
- `אפשר לשקול להעלות קושי או להתקדם לנושא מתקדם יותר...`

**Mitigation:** q>=8 and acc>=75 for strong rows; grade relation handling exists.

**Risk:** Promotion language can be too direct if evidence is narrow, mixed-source, or mostly parent-assigned guided practice.

**Recommendation:** Add explicit source/category guard: diagnostic independent or sufficiently repeated self-practice; otherwise "אפשר לבדוק בהדרגה".

---

### R11 — Evidence source is not always visible

**Severity:** MEDIUM  
**Category:** ערבוב בין פעילות ספר / פעילות מהורה / תרגול עצמי / אבחון אמיתי  
**File:** `utils/parent-report-language/grade-insight-he.js`  

**Source phrases exist:**

- `בפעילות שנשלחה מההורה`
- `בתרגול עצמאי`
- `לאחר עבודה בספר`
- `בפעילות מהכיתה`

**Risk:** Not every recommendation/sentence shows evidence source. A parent may read book/context or guided practice evidence as independent diagnostic evidence.

**Recommendation:** For any recommendation or "קושי/חוזק" sentence, surface either source phrase or diagnostic eligibility note.

---

### R12 — Book activity can be referenced as evidence context

**Severity:** MEDIUM  
**Category:** ערבוב source types  
**Files:** `grade-insight-he.js`, `activity-classification.js`, report aggregation layers  

**Known protection:** book/guided/context are non-diagnostic in classifier.

**Risk:** Hebrew sentence may not explain that `learning_book` is contextual, not diagnostic.

**Recommendation:** When source is `learning_book`, phrase as "לאחר עבודה בספר הופיע צורך להמשיך לתרגל", not "המערכת זיהתה קושי".

---

### R13 — PDF / first paint can differ from async AI enrich

**Severity:** MEDIUM  
**Category:** visible surface parity  
**Files:** `parent-report-ai-adapter.js`, `parent-report-ai-narrative/index.js`, `deterministic-fallback.js`  

**Risk:** PDF may capture deterministic fallback while UI later shows AI narrative. Both should be safe, but parent may see different Hebrew.

**Recommendation:** Launch policy: PDF uses deterministic narrative only, or UI marks "updated insight" clearly.

---

### R14 — Off-topic / clinical boundaries are safe but must remain pre-LLM

**Severity:** MEDIUM  
**Category:** AI hallucination / boundary routing  
**Files:** `question-classifier.js`, `answer-composer.js`, `llm-orchestrator.js`  

**Risk:** If classifier fails and LLM receives a clinical or peer-comparison question as normal report question, it may attempt helpful explanation.

**Mitigation:** clinical regexes also exist in LLM validator and guardrail.

**Recommendation:** Keep deterministic boundary routes before all LLM calls; add adversarial Hebrew variants tests.

---

### R15 — Guardrails rely on regexes for Hebrew quality

**Severity:** MEDIUM  
**Category:** עברית טבעית ופשוטה  
**File:** `utils/parent-copilot/guardrail-validator.js`  

**Observed protections:** broken `ב. חשבון`, hanging prepositions, emotional confidence, internal tokens, overconfident diagnosis, raw `RI0`.

**Risk:** Regexes catch known failures, not all unnatural Hebrew. Prompt has many style rules, indicating recurring generation issues.

**Recommendation:** Keep deterministic composers preferred for launch; enable LLM only behind staged rollout with transcript review.

---

### R16 — Parent AI explainer uses separate prompt and strict input

**Severity:** MEDIUM  
**Category:** AI may decide wording not backed by same truth packet  
**File:** `utils/parent-report-ai/parent-report-ai-explainer.js`  

**Risk:** It uses strict input and validation, but it is a separate AI path from Copilot `TruthPacketV1`. Different wording can appear for same report.

**Recommendation:** Document AI explainer as secondary narrative; verify against same zero/thin evidence cases as Copilot.

---

### R17 — With no focus areas, fallback still gives weekly action

**Severity:** LOW-MEDIUM  
**Category:** fallbacks בעייתיים  
**File:** `utils/parent-report-language/v2-parent-copy.js` line 13  

**Text:** `עדיין אין מוקד ברור — השבוע כדאי לתרגל מעט בכמה נושאים...`

**Risk:** This is general practice advice, not evidence-based recommendation. Could be acceptable if labeled that way.

**Recommendation:** Prefix future copy with "כהרגל כללי".

---

### R18 — Some Hebrew copy has minor naturalness issues

**Severity:** LOW  
**Category:** עברית טבעית ופשוטה  

**Examples:**

- `הדוח יכול להצביע על תחומים שמצביעים על נושאים...`
- `עדיין אין מספיק פרטים כאן כדי להאריך` likely should be `להעריך`.

**Recommendation:** Owner Hebrew copy pass. Not blocking unless visible frequently.

---

## Required Risk Categories Checklist

| Required category | Covered by |
|---|---|
| המלצות בלי evidence | R01, R05, R09, R10, R17 |
| prompts מסוכנים | R02, R09, R14 |
| fallbacks בעייתיים | R04, R07, R08, R13, R17 |
| אבחון בלי מספיק נתונים | R01, R05, R06, R07 |
| leakage של internal labels | R03, R15 |
| AI מחליט ניסוח לבד בלי מידע | R02, R09, R16 |
| ערבוב ספר/הורה/עצמי/אבחון | R11, R12 |
| fallback מציג בעיה במקום אין מידע | R07, R08 |
| האם ההורה מבין למה המלצה הופיעה | R01, R05, R11 |
| קשר engine decision -> visible copy | R01, R03, R04, R05 |

## Top Launch Decision

**BLOCKER exists before launch** if broad release includes AI/Copilot/recommendations as trusted parent guidance.

Minimum launch conditions:

1. One evidence threshold policy across report, parentFacing, Copilot, PDF.
2. No raw taxonomy/gating/reason fields directly rendered.
3. Raw intervention fallback disabled or owner-approved.
4. Over-reassurance prompt changed or gated.
5. Parity test: same fixture -> report UI, API payload, PDF, Copilot answer.

## Handoff Recommendation

Send to:

- **Parent Reports owner**: threshold authority, parentFacing vs V2, PDF parity.
- **Parent Copilot / Questions owner**: LLM prompt policy, boundary tests, truth packet coverage.
- **Hebrew copy owner**: diagnostic wording, fallback tone, naturalness issues.
