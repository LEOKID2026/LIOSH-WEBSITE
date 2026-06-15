# Hebrew Launch Audit 03: AI / Copilot / Engine Copy Flow

Date: 2026-06-15  
Mode: read-only audit. No product code, UI, DB, migrations, tests, commits, or pushes were changed.  
Allowed output: report files under `docs/qa/hebrew-launch-audit/`.

## תקציר מנהלים

העברית שמגיעה להורה נוצרת בכמה שכבות: נתוני תרגול וראיות עוברים aggregation, מנוע אבחוני וגייטים, שכבת contracts/truth packet, ואז templates/composers deterministic. בחלק מהמסלולים יש LLM, אבל הוא מקבל FACTS/packet מצומצם, עובר validator, ובכשל נופל ל-fallback deterministic.

לא נמצא prompt שמותר לו במפורש להמציא נתונים. כן נמצאו סיכונים משמעותיים לפני השקה:

- יש כמה מקורות המלצות במקביל עם thresholds שונים: 3/5/8/10/12/15/24 שאלות לפי שכבה.
- יש LLM prompt שמבקש "אם cannotConcludeYet=false - הדגש שאין סיבה לדאגה גדולה"; זה עלול לייצר הרגעה חזקה מדי.
- יש fallbackים שנשמעים כמו "קושי" גם כשחלק מהראיות דלות או כלליות.
- יש טקסט engine-internal בעברית שעלול לזלוג אם עוקפים sanitizers.
- יש מסלול AI narrative נוסף שאינו זהה למסלול Copilot, ולכן צריך לשמור על parity בין report UI, PDF ו-Copilot.

שורת השקה: קיימים BLOCKER ברמת trust / launch safety אם המוצר מתכנן להשיק דוח הורים + Copilot כהמלצה אמינה מלאה. ה-BLOCKER אינם "עברית לא תקינה" בלבד, אלא traceability ו-consistency: אותה ראיה יכולה להגיע לטקסט דרך שכבות שונות עם גייטים שונים.

## רשימת כל קבצי AI / Copilot / Engine שנבדקו

### Copilot / LLM / Truth Packet

| קובץ | פונקציות / תפקיד |
|---|---|
| `utils/parent-copilot/truth-packet-v1.js` | `buildTruthPacketV1`, `buildTruthPacketV1NoAnchoredFallback`; מקור האמת למה מותר לומר |
| `utils/parent-copilot/llm-orchestrator.js` | `buildGroundedPrompt`, `validateLlmDraft`; prompt עברי ל-LLM ו-validation |
| `utils/parent-copilot/guardrail-validator.js` | חסימת אבחון קליני, leakage, next_step ללא זכאות, עברית שבורה |
| `utils/parent-copilot/fallback-templates.js` | fallback deterministic מ-textSlots בלבד |
| `utils/parent-copilot/intent-answer-composers.js` | composers deterministic לתשובות הורה, חוזקות, חולשות, התקדמות |
| `utils/parent-copilot/answer-composer.js` | clinical / peer / sensitive education boundaries, answer draft |
| `utils/parent-copilot/question-classifier.js` | boundary copy + intent classification |
| `utils/parent-copilot/evidence-polarity.js` | meaning לפי polarity של evidence |
| `utils/parent-copilot/redact-payload-for-copilot-grounding.js` | grounding payload ו-remap ל-parent-facing labels |
| `utils/parent-copilot/intent-answer-contract.js` | routing contracts, zero-evidence subject handling |

### Parent Report / Diagnostic Engine

| קובץ | פונקציות / תפקיד |
|---|---|
| `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js` | engine units, diagnosis, gradeEvidence, outputGating |
| `utils/diagnostic-engine-v2/output-gating.js` | `applyOutputGating`; diagnosis/intervention/cannotConclude gates |
| `utils/diagnostic-engine-v2/confidence-policy.js` | confidence levels |
| `utils/diagnostic-engine-v2/intervention-layer.js` | intervention text from taxonomy |
| `utils/diagnostic-engine-v2/taxonomy-hebrew.js` | Hebrew taxonomy metadata used before visible copy |
| `utils/diagnostic-engine-v2/taxonomy-math.js` | math taxonomy, including engine-internal pattern labels |
| `utils/diagnostic-engine-v2/taxonomy-geometry.js` | geometry taxonomy |
| `utils/diagnostic-engine-v2/taxonomy-english.js` | English taxonomy |
| `utils/diagnostic-engine-v2/taxonomy-moledet.js` | Moledet/geography taxonomy |
| `utils/parent-report-v2.js` | short report, diagnostic cards, mixed-grade metadata |
| `utils/detailed-parent-report.js` | detailed report composition |
| `lib/parent-server/report-data-aggregate.server.js` | DB/API aggregate to evidence rows |
| `lib/parent-server/parent-report-parent-facing.server.js` | server-side insights/recommendations |
| `lib/parent-server/parent-report-diagnostic-visible.server.js` | visible practice focus lines |
| `lib/parent-server/parent-facing-report-authority.js` | suppress client diagnostics when server authority blocks |

### Hebrew Language / Templates / Fallbacks

| קובץ | פונקציות / תפקיד |
|---|---|
| `utils/contracts/narrative-contract-v1.js` | narrative envelope WE0-WE4, observation/interpretation/action slots |
| `utils/parent-report-language/subject-evidence-policy.js` | zero/thin/valid subject evidence lines |
| `utils/parent-report-language/confidence-parent-he.js` | confidence labels to Hebrew |
| `utils/parent-report-language/short-report-v2-copy.js` | tier labels, cannot-conclude copy |
| `utils/parent-report-language/v2-parent-copy.js` | executive/detailed V2 copy |
| `utils/parent-report-language/grade-insight-he.js` | grade relation and evidence-source phrasing |
| `utils/parent-report-language/grade-aware-recommendation-templates.js` | taxonomy x grade-band recommendation templates |
| `utils/parent-report-language/grade-aware-recommendation-resolver.js` | resolves grade-aware templates |
| `utils/parent-report-language/parent-diagnostic-explanations-he.js` | owner-approved explanations only |
| `utils/parent-report-language/parent-facing-pattern-label-he.js` | parent-safe pattern labels, M-10 remap |
| `utils/parent-report-language/parent-facing-normalize-he.js` | final Hebrew normalization/sanitization |
| `utils/parent-report-language/subject-withhold-summary-he.js` | withhold/cautious summaries |
| `utils/diagnostic-labels-he.js` | generic weakness + engine taxonomy snippet rewriting |
| `utils/parent-report-ui-explain-he.js` | enum/internal status mapping to Hebrew UI copy |

### AI Narrative / Explainer

| קובץ | פונקציות / תפקיד |
|---|---|
| `utils/parent-report-ai/parent-report-ai-explainer.js` | OpenAI explainer + deterministic fallback |
| `utils/parent-report-ai/parent-report-ai-adapter.js` | attaches AI explanation to reports |
| `utils/parent-report-ai-narrative/prompt.js` | Hebrew prompt for structured AI narrative |
| `utils/parent-report-ai-narrative/index.js` | call/fallback orchestration |
| `utils/parent-report-ai-narrative/deterministic-fallback.js` | deterministic structured fallback |
| `utils/parent-report-ai-narrative/validate-narrative-output.js` | validator against hallucination/internal labels/thin-data overclaim |
| `utils/parent-report-insights/build-packet-from-v2-snapshot.js` | V2 snapshot to insight packet |
| `utils/parent-report-insights/index.js` | parent report insight packet builder |

## תרשים טקסטואלי של הזרימה

```text
answers / parent_activity_attempts / sessions / localStorage
  -> report-data aggregation
     input: subject, topic, accuracy, question counts, time, evidence source, content grade
     output: topics, byContentGrade, diagnosticAnswers, learningAnswers, evidenceSourceCounts

  -> diagnostic engine / row engine
     input: topic row, taxonomy candidates, recurrence, confidence, priority
     output: unit, taxonomyId, patternHe, gradeEvidence, outputGating

  -> gating / canonical state
     input: confidence, recurrence, priority, counter evidence, thin evidence
     output: diagnosisAllowed, interventionAllowed, cannotConcludeYet, actionState, recommendation.allowed

  -> Hebrew contract layer
     input: question count, accuracy, cannotConcludeYet, recommendation eligibility
     output: observation / interpretation / action / uncertainty textSlots

  -> truth packet / insight packet
     input: contracts, row facts, gradePracticeMeta, evidence source
     output: allowedClaimEnvelope, derivedLimits, forbiddenPhrases, requiredHedges, FACTS_JSON projection

  -> template / composer / prompt
     deterministic path:
       parent-report-language templates
       parent-report-recommendation-consistency
       parent-copilot intent composers
     AI path:
       llm-orchestrator prompt or parent-report-ai-narrative prompt

  -> validator / normalizer / fallback
     guardrail-validator or validate-narrative-output
     fallback-templates / deterministic-fallback

  -> visible sentence
     parent report UI
     detailed report
     PDF/print
     Copilot chat
     parentFacing API blocks
```

## Trace examples: data/evidence -> engine/gating -> prompt/template -> visible sentence

| Flow | Data / evidence | Engine / gating | Prompt / template | Visible sentence |
|---|---|---|---|---|
| Zero evidence subject | subject q=0 | `classifySubjectEvidenceTier` -> `none` | `zeroEvidenceSubjectLineHe` | `חשבון: לא תורגל בתקופה שנבחרה` |
| Thin subject | 1-7 questions | `SUBJECT_VALID_MIN_QUESTIONS=8` | `thinEvidenceSubjectLineHe` | `חשבון: 3 שאלות בתקופה שנבחרה — עדיין מעט מידע...` |
| Topic cannot conclude | `cannotConcludeYet=true` | narrative envelope WE0 | `buildInterpretationSlot` | `עדיין מוקדם לקבוע כאן כיוון ברור...` |
| Approved diagnosis | taxonomy match + approved status | `diagnosisAllowed=true` | `parent-diagnostic-explanations-he` | `המערכת זיהתה קושי...` |
| M-10 internal label | taxonomy pattern `בחירת כפל לא מתאים לחילוק` | sanitizer must run | `parent-facing-pattern-label-he` | `קושי בקישור בין כפל לחילוק` |
| Higher grade strength | gradeRelation=`higher`, isStrength=true | gradeEvidence enrichment | `gradeScopeMeaningHe` | `הילד הצליח גם מעל רמת הכיתה...` |
| Higher grade weakness | gradeRelation=`higher`, needsSupport=true | gradeEvidence enrichment | `gradeScopeMeaningHe` | `...לא בהכרח מעיד על פער בתוכן הכיתה` |
| Copilot LLM answer | truthPacket textSlots + limits | `recommendationEligible` / `RI` | `buildGroundedPrompt` FACTS_JSON | JSON answerBlocks in Hebrew |
| LLM rejected | guardrail fail | validator fail codes | `buildDeterministicFallbackAnswer` | textSlots only, source=`contract_slot` |
| AI narrative | insight packet | thinDataWarnings | `prompt.js` / deterministic fallback | structured summary/focus/homeTips |

## ממצאים חוסמי השקה

### BLOCKER-01: Threshold mismatch בין שכבות המלצה

נמצאו thresholds שונים:

- `subject-evidence-policy.js`: valid subject >= 8 questions.
- `parent-report-parent-facing.server.js`: subject insights >= 5 answers, weak topic >= 3 answers.
- `parent-facing-pattern-label-he.js`: M-10 thin fallback when q < 10.
- topic/report policies: 8/12/40 בשכבות שונות.
- Copilot strength/weakness: `STRONG_Q_MIN=8`, mastery reallocation >= 24.

משמעות: אותו data יכול לקבל טקסט "מומלץ / קושי / חיזוק" במסלול אחד, ובמסלול אחר "עדיין מעט מידע". לפני השקה, צריך owner decision על היררכיית סמכות אחת.

### BLOCKER-02: Engine-internal Hebrew can become parent-facing if sanitizer is bypassed

יש עברית engine-internal ב-`taxonomy-hebrew.js`, `taxonomy-math.js` ו-taxonomies נוספות. חלק מהטקסט קצר, טכני או לא מתאים להורה. קיימים remap/sanitizers, אבל אם surface חדש יקרא `patternHe` ישירות, עלול לזלוג:

- `בחירת כפל לא מתאים לחילוק`
- `מילה קרובה לא נכונה`
- `דיווח חוצהמקצועות`
- `תבניות מיניות` (נראה כמו typo/label פנימי)

זה חוסם אם יש surface חדש/AI grounding שלא עובר דרך `parentFacingPatternLabelHe` / `normalizeParentFacingHe`.

### BLOCKER-03: Multiple AI/copy authorities

יש לפחות שלושה מסלולים שמייצרים עברית:

1. Report V2 deterministic.
2. Copilot truth packet + composer/LLM.
3. Parent AI narrative/explainer.

כולם מגודרים, אבל לא כולם נשענים על אותה פונקציה סופית של recommendation/gating. ללא בדיקת parity UI/API/PDF/Copilot, הורה עשוי לראות המלצה שונה בין דוח, PDF וצ'אט.

### BLOCKER-04: LLM prompt contains over-reassurance instruction

ב-`llm-orchestrator.js` עבור `is_intervention_needed` מופיע: אם `cannotConcludeYet=false` להדגיש שאין סיבה לדאגה גדולה. גם אם זה עובר validation, זה עלול להיות חזק מדי כשיש ראיות לבעיה לא קלינית אך כן חשובה.

## ממצאים מסוכנים אך לא חוסמים

### RISK-01: Fallback weakness language may sound diagnostic

`GENERIC_WEAKNESS_HE = "יש טעויות שחוזרות כאן"` הוא last resort. אם אין מספיק mapping ספציפי, המשפט עלול להציג pattern כקיים בלי להסביר למה או כמה evidence יש.

### RISK-02: Grade-aware recommendation template gaps

ב-`grade-aware-recommendation-templates.js` יש ערכים `actionTextHe: null` ו-comments על engine fallback. זה intentional עבור grades לא מתאימים, אך אם fallback raw intervention מופעל, ההורה עשוי לקבל משפט פחות owner-approved.

### RISK-03: Parent-facing server recommendations run in parallel to V2

`buildParentInsightsHe` ו-`buildHomeRecommendationsHe` מייצרים משפטים כמו `נראה שיש קושי...`, `כדאי לשים לב...`, `מומלץ...` לפי thresholds נמוכים יותר מחלק מה-report V2 gates.

### RISK-04: Fallback action still suggests practice

כמה fallbackים אומרים "כדאי להמשיך לתרגל" גם כשהנתונים דלים. זה סביר product-wise, אבל צריך לוודא שזה לא מוצג כהמלצת אבחון.

### RISK-05: English/internal labels guarded but not impossible

יש validators נגד `truthPacket`, `contractsV1`, `RI0`, raw English keys, URLs ו-debug tokens. הסיכון קיים בעיקר אם surface עוקף validator או מציג raw payload.

### RISK-06: AI narrative requires exact thin-data caution, but LLM may fail and fallback

המסלול בנוי ליפול ל-deterministic fallback. זה טוב, אך אם UI מציג source=`ai` בלי להראות מגבלות, ההורה לא יודע אם זה AI או fallback.

### RISK-07: Evidence source mixing is only partially visible

`grade-insight-he.js` יודע להבדיל `self_practice`, `parent_assigned_activity`, `learning_book`, `classroom_assigned_activity`. לא כל sentence מציג את המקור. הורה עלול לא לדעת אם משפט הגיע מספר/תרגול עצמאי/פעילות מהורה.

### RISK-08: Positive progress language may be too actionable

Copilot progression יכול לומר `אפשר לשקול להעלות קושי...` על higherStrong. יש gates, אך זו עדיין המלצה חזקה וצריך להבטיח שהיא לא מופיעה כש-q נמוך או mixed evidence.

### RISK-09: PDF timing / async enrich

קיים fallback deterministic ל-first paint/PDF, אך AI enrichment asynchronous עלול ליצור הבדל בין מה שהורה ראה/הדפיס לבין מה שמופיע אחרי enrich.

### RISK-10: Hebrew naturalness has many patch rules

ה-prompt וה-validator כוללים איסורים על `ב. חשבון`, hanging preposition, ביטויים רובוטיים. עצם ריבוי התיקונים מעיד שהסיכון קיים ומטופל חלקית.

## שאלות החלטת בעלים

1. מה threshold הרשמי להצגת המלצה להורה: 3, 5, 8, 10, 12 או יותר?
2. האם `parentFacing` server blocks הם מקור אמת, או רק enrich מעל V2?
3. האם מותר לומר `המערכת זיהתה קושי` לכל approved taxonomy, או שצריך להחליף ל"שיטת התרגול מצביעה על..."?
4. האם prompt צריך להרגיע "אין סיבה לדאגה גדולה", או רק לומר "לא מדובר באבחנה"?
5. האם פעילות ספר יכולה להופיע כהקשר בלבד ולא כראיה המלצתית בכל surface?
6. האם הורה צריך לראות תמיד את evidence source ליד המלצה?
7. האם PDF חייב להיות deterministic בלבד, או שמותר לכלול AI narrative אם הגיע בזמן?
8. האם null grade-aware templates צריכים להוביל ל-no recommendation או ל-fallback כללי?
9. האם Copilot progression רשאי לתת "להעלות קושי" או רק "לשקול עם עוד תרגול"?
10. האם internal engine Hebrew מותר להישמר בעברית, או עדיף לשמור IDs בלבד ולמפות רק בשכבת language?

## נקודות שבהן AI עלול לכתוב עברית לא מדויקת

| נקודה | למה AI עלול לטעות | הגנה קיימת | סיכון שיורי |
|---|---|---|---|
| `buildGroundedPrompt` | ה-LLM מקבל FACTS_JSON אך יכול לחבר הסבר מעבר לשדות | `validateLlmDraft`, guardrails, fallback | ניסוח "למה" לא תמיד traceable למנוע |
| `is_intervention_needed` prompt | instruction להרגעה חזקה | איסור אבחון/פאניקה | over-reassurance |
| AI narrative prompt | מבקש 2-3 טיפים גם כשה-data דל | required caution note + validator | tips כלליים יכולים להישמע כהמלצה אישית |
| Grade/source phrasing | evidence source לא תמיד מוצג | `evidenceSourcePhraseHe` | mixing לא ברור להורה |
| Raw taxonomy fallback | אם resolver לא מוצא template | `shouldOmitRawDiagnosticRecommendationFallback`, normalizers | parent copy פחות approved |
| Thin data | LLM חייב לציין caution אם קיים | exact caution rule | אם packet לא מסמן thinDataWarnings, AI לא ידע |

## No-code conclusion

המערכת כוללת מנגנוני בטיחות חזקים יחסית: truth packet, allowedClaimEnvelope, validators, deterministic fallback, zero-evidence policy, clinical boundary, peer comparison boundary, parent-facing label remaps. עם זאת, לפני השקה מלאה של עברית הורה/AI/Copilot, צריך להחליט על מקור סמכות אחד ל-thresholds ולוודא parity בין report UI, API, PDF ו-Copilot.
