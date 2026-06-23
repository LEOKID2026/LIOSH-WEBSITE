/**
 * Read-only export: every parent-facing engine state → one CSV row.
 * Run: node scripts/export-parent-report-engine-full-map.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "docs", "qa", "_artifacts");
const OUT_CSV = join(OUT_DIR, "parent-report-engine-full-map.csv");
const OUT_MD = join(OUT_DIR, "parent-report-engine-full-map.md");

const HEADERS = [
  "category",
  "engine_action_or_state",
  "source_file",
  "exact_condition_in_code",
  "input_fields",
  "output_field",
  "parent_text_template_now",
  "example_rendered_text",
  "positive_or_negative_or_neutral",
  "shown_in_short_screen",
  "shown_in_short_pdf",
  "shown_in_detailed_screen",
  "shown_in_detailed_pdf",
  "hidden_or_truncated",
  "generic_or_specific",
  "can_duplicate_with",
  "can_conflict_with",
  "notes_for_hebrew_rewrite",
];

/** @type {Record<string, string>} */
const DISPLAY = {
  insights: "yes",
  overview: "yes",
  explain: "yes",
  foundation: "yes",
  why: "yes",
  home: "yes",
  rawStrength: "yes",
  pattern: "yes",
  topicTable: "yes",
  detailed: "yes",
  pdf: "yes",
  no: "no",
  partial: "partial",
  hidden: "hidden",
};

/**
 * @param {object} p
 */
function mk(p) {
  return {
    category: p.category ?? "",
    engine_action_or_state: p.state ?? "",
    source_file: p.file ?? "",
    exact_condition_in_code: p.cond ?? "",
    input_fields: p.in ?? "",
    output_field: p.out ?? "",
    parent_text_template_now: p.tpl ?? "",
    example_rendered_text: p.ex ?? "",
    positive_or_negative_or_neutral: p.pol ?? "neutral",
    shown_in_short_screen: p.short ?? DISPLAY.no,
    shown_in_short_pdf: p.pdfShort ?? p.short ?? DISPLAY.no,
    shown_in_detailed_screen: p.detailed ?? DISPLAY.no,
    shown_in_detailed_pdf: p.pdfDetailed ?? p.detailed ?? DISPLAY.no,
    hidden_or_truncated: p.hidden ?? "none",
    generic_or_specific: p.spec ?? "specific",
    can_duplicate_with: p.dup ?? "",
    can_conflict_with: p.conflict ?? "",
    notes_for_hebrew_rewrite: p.notes ?? "",
  };
}

/** @type {ReturnType<typeof mk>[]} */
const ROWS = [];

function add(p) {
  ROWS.push(mk(p));
}

// ─── 1. Evidence / data sufficiency ─────────────────────────────────────────
const EQ = "lib/learning/evidence-quality.js";
add({ category: "evidence_gate", state: "no_data", file: EQ, cond: "classifyDataSufficiency: n===0 → NO_DATA", in: "summary.totalAnswers, diagnosticAnswers", out: "meta.evidenceQuality.dataSufficiency", tpl: "(suppresses strong diagnosis)", ex: "אין תשובות אבחוניות — לא מוצגות מסקנות חזקות", pol: "neutral", short: DISPLAY.no, detailed: DISPLAY.partial, hidden: "gates downstream copy", spec: "specific", dup: "activity_gap_zero", conflict: "server weak-subject insight", notes: "Distinguish zero activity vs zero diagnostic" });
add({ category: "evidence_gate", state: "insufficient_data", file: EQ, cond: "n<=INSUFFICIENT_MAX_DIAGNOSTIC → INSUFFICIENT", in: "diagnosticAnswers count", out: "dataSufficiency", tpl: "(hedged only)", ex: "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע.", pol: "neutral", short: DISPLAY.insights, detailed: DISPLAY.yes, hidden: "patternDiagnostics suppressed", dup: "server thin insight", conflict: "strong topic line", notes: "Student-level hedge" });
add({ category: "evidence_gate", state: "preliminary_signal", file: EQ, cond: "n<SUPPORTED_MIN && !recurrenceMet → PRELIMINARY", in: "diagnosticAnswers, recurrenceMet", out: "dataSufficiency", tpl: "(tentative conclusions)", ex: "ב{subject} נראה קושי יחסי לפי התרגולים — כדאי לעקוב אחרי עוד תרגול קצר.", pol: "neutral", short: DISPLAY.insights, detailed: DISPLAY.yes, hidden: "strong diagnosis blocked", dup: "insufficient_data", conflict: "supported_diagnosis same topic", notes: "Use tentative wording" });
add({ category: "evidence_gate", state: "supported_diagnosis", file: EQ, cond: "n>=SUPPORTED_MIN && recurrenceMet → SUPPORTED", in: "diagnosticAnswers, recurrenceMet", out: "allowsStrongParentDiagnosisAtStudent=true", tpl: "נראה שיש קושי ב{subject}...", ex: "נראה שיש קושי במתמטיקה, בעיקר לפי התרגולים האחרונים.", pol: "negative", short: DISPLAY.insights, detailed: DISPLAY.yes, spec: "specific", dup: "engine topic insight", conflict: "preliminary same subject", notes: "Server path; may be overridden by engine" });
add({ category: "evidence_gate", state: "no_recurrence", file: EQ, cond: "reasonCode: PRELIMINARY && !recurrenceMet → no_recurrence", in: "recurrenceMet", out: "evidenceReasonCode", tpl: "(blocks strong pattern claims)", ex: "אין עדיין מספיק מידע כדי לזהות סוג טעות קבוע", pol: "neutral", short: DISPLAY.explain, detailed: DISPLAY.yes, hidden: "fake recurring mistake blocked", dup: "insufficient_mistake_evidence", conflict: "recurring mistakes insight", notes: "Critical honesty gate" });
add({ category: "evidence_gate", state: "too_few_questions", file: EQ, cond: "reasonCode: INSUFFICIENT → too_few_questions", in: "diagnosticAnswers", out: "evidenceReasonCode", tpl: "(topic insights withheld)", ex: "עדיין מוקדם לקבוע כיוון לפי כמות השאלות הנוכחית", pol: "neutral", short: DISPLAY.partial, detailed: DISPLAY.yes, hidden: "confidence badge low", dup: "min_questions_low_confidence", conflict: "knowledge_gap strong", notes: "" });
add({ category: "evidence_gate", state: "allowsStrongParentDiagnosisAtTopic", file: EQ, cond: "allowsStrongParentDiagnosisAtTopic: suff===SUPPORTED && topic gates", in: "payload, subject, topicKey", out: "topic copy authority", tpl: "(enables specific topic lines)", ex: "כדאי לשים לב ל{topic} — זה נושא שחוזר בתרגולים.", pol: "negative", short: DISPLAY.insights, home: DISPLAY.yes, detailed: DISPLAY.yes, dup: "engine rowNeedsAttention", conflict: "insufficient_dependency_evidence", notes: "" });
add({ category: "evidence_gate", state: "shouldSuppressClientPatternDiagnostics", file: EQ, cond: "NO_DATA||INSUFFICIENT → suppress pattern block", in: "dataSufficiency", out: "patternDiagnostics hidden", tpl: "(no pattern section)", ex: "(empty)", pol: "neutral", short: DISPLAY.hidden, detailed: DISPLAY.hidden, hidden: "entire patternDiagnostics", dup: "no_data", conflict: "pattern explain row", notes: "" });

// ─── 2. Server insights (buildParentInsightsHe) ───────────────────────────
const SRV = "lib/parent-server/parent-report-parent-facing.server.js";
add({ category: "server_insight", state: "no_activity", file: SRV, cond: "totalAnswers===0 && totalSessions===0", in: "summary.totalAnswers, totalSessions", out: "parentFacing.insights[]", tpl: "לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה.", ex: "לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה.", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, pdfDetailed: DISPLAY.yes, spec: "generic", dup: "activity_gap", conflict: "engine no_urgent", notes: "Overridden when engine rows present" });
add({ category: "server_insight", state: "inactive_7_days", file: SRV, cond: "inactiveDays>=INACTIVITY_DAYS(7)", in: "dailyActivity last date", out: "insights[]", tpl: "לא הייתה פעילות לאחרונה — מומלץ לחזור לתרגול קצר כדי לשמור על רצף למידה.", ex: "לא הייתה פעילות לאחרונה — מומלץ לחזור לתרגול קצר כדי לשמור על רצף למידה.", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "no_activity", conflict: "", notes: "" });
add({ category: "server_insight", state: "thin_student_data", file: SRV, cond: "totalAnswers>0 && totalAnswers<STUDENT_REPORT_THIN_MAX", in: "totalAnswers", out: "insights[]", tpl: "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע.", ex: "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע.", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "insufficient_data", conflict: "supported weak subject", notes: "" });
add({ category: "server_insight", state: "low_accuracy_weakest_subject", file: SRV, cond: "allowStrongStudent && weakest.accuracy<LOW_ACCURACY(60)", in: "subjects accuracy rank", out: "insights[]", tpl: "נראה שיש קושי ב{label}, בעיקר לפי התרגולים האחרונים.", ex: "נראה שיש קושי במתמטיקה, בעיקר לפי התרגולים האחרונים.", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "engine topic weak line", conflict: "strongestAreaLineHe same subject", notes: "Generic subject label — engine replaces with q/acc" });
add({ category: "server_insight", state: "recurring_mistakes_subject", file: SRV, cond: "allowStrongStudent && topMistakeSubjects[0]", in: "recentMistakes by subject", out: "insights[]", tpl: "יש טעויות חוזרות ב{label} — שווה לחזור עליהן בקצב איטי.", ex: "יש טעויות חוזרות בגאומטריה — שווה לחזור עליהן בקצב איטי.", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "mistake pattern narrative", conflict: "no_recurrence gate", notes: "Must not fire without recurrence evidence" });
add({ category: "server_insight", state: "low_overall_accuracy", file: SRV, cond: "overallAccuracy<60 && totalAnswers>=MIN", in: "summary accuracy", out: "insights[]", tpl: "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף.", ex: "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף.", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "low_accuracy_weakest_subject", conflict: "rawMetricStrength mid band", notes: "" });
add({ category: "server_insight", state: "subject_progress_strong", file: SRV, cond: "allowStrongStudent && strongest.accuracy>=STRONG_ACCURACY(80)", in: "subjects rank", out: "insights[]", tpl: "יש התקדמות יחסית ב{label} — כדאי לשמר את הרצף.", ex: "יש התקדמות יחסית בגאומטריה — כדאי לשמר את הרצף.", pol: "positive", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "strongestAreaLineHe", conflict: "weak same subject in engine", notes: "Vague 'progress' — engine gives q/acc" });
add({ category: "server_insight", state: "daily_improvement", file: SRV, cond: "detectImprovement(daily): second half acc - first >=8pp", in: "dailyActivity correct/answers", out: "insights[]", tpl: "נראה שיש שיפור ביחס לתרגולים קודמים — המשיכו בקצב הנוכחי.", ex: "נראה שיש שיפור ביחס לתרגולים קודמים — המשיכו בקצב הנוכחי.", pol: "positive", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "row trend up", conflict: "fragile_success", notes: "Does not prove stable mastery" });
add({ category: "server_insight", state: "hedged_weak_subject", file: SRV, cond: "allowsHedged && !allowStrong && weakest.accuracy<60", in: "dataSufficiency PRELIMINARY", out: "insights[]", tpl: "ב{label} נראה קושי יחסי לפי התרגולים — כדאי לעקוב אחרי עוד תרגול קצר.", ex: "במתמטיקה נראה קושי יחסי לפי התרגולים — כדאי לעקוב אחרי עוד תרגול קצר.", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "preliminary_signal", conflict: "supported_diagnosis", notes: "" });
add({ category: "server_insight", state: "weak_topic_hedged", file: SRV, cond: "weakTopics[0] && allowsHedgedParentTopicInsightForCopy", in: "topic accuracy<60, answers>=MIN", out: "insights[]", tpl: "כדאי לשים לב ל{topicLine} — זה נושא שחוזר בתרגולים.", ex: "כדאי לשים לב לחיבור — זה נושא שחוזר בתרגולים.", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "engine attention row", conflict: "insufficient_mistake_evidence", notes: "" });
add({ category: "server_insight", state: "default_fallback_insight", file: SRV, cond: "!insights.length", in: "(none)", out: "insights[]", tpl: "מומלץ לשמור על תרגול קצר וקבוע כדי ליצור רצף למידה.", ex: "מומלץ לשמור על תרגול קצר וקבוע כדי ליצור רצף למידה.", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "engine no_urgent fallback", conflict: "", notes: "" });

// ─── 3. Engine insights override ────────────────────────────────────────────
const ENG = "utils/parent-report-engine-insights-he.js";
add({ category: "engine_insight", state: "activity_gap_zero_diagnostic", file: ENG, cond: "diagnosticAnswers===0 && (totalAnswers>0||activity)", in: "summary.diagnosticAnswers, totalAnswers", out: "insights[] + summary.activityGapNoteHe", tpl: "היו {totalAnswers} תשובות באתר, אבל רק 0 נספרו לדוח הלימודי. כדי לקבל תמונה מדויקת יותר...", ex: "היו 42 תשובות באתר, אבל רק 0 נספרו לדוח הלימודי. כדי לקבל תמונה מדויקת יותר, כדאי לבצע גם תרגול שאלות רגיל במקצועות הליבה.", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, hidden: "also ParentReportDataHealthNote", spec: "specific", dup: "no_data", conflict: "supported diagnosis", notes: "AAA1/AAA7 case" });
add({ category: "engine_insight", state: "activity_gap_partial_diagnostic", file: ENG, cond: "diagnosticAnswers>0 && diagnosticAnswers<min(8,floor(total*0.35)) && total>=2*diag", in: "diagnosticAnswers, totalAnswers", out: "insights[]", tpl: "היו {total} תשובות באתר, אבל רק {diag} נספרו לדוח...", ex: "היו 30 תשובות באתר, אבל רק 5 נספרו לדוח הלימודי...", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "activity_gap_zero_diagnostic", conflict: "", notes: "" });
add({ category: "engine_insight", state: "activity_gap_non_diagnostic_only", file: ENG, cond: "hasNonDiagnosticActivity && diagnosticAnswers<5 && total<=diag", in: "learningMinutes, bookMinutes", out: "insights[]", tpl: "היו פעילויות באתר בתקופה הזו, אבל רק חלק קטן...", ex: "היו פעילויות באתר בתקופה הזו, אבל רק חלק קטן מהן מתאים לחישוב הדוח הלימודי...", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "activity_gap_zero_diagnostic", conflict: "", notes: "" });
add({ category: "engine_insight", state: "topic_attention_insight", file: ENG, cond: "rowNeedsAttention(row): q>=3 && (acc<55 || remediate+acc<72 || behavior+acc<70)", in: "topicEngineRowSignals, accuracy, questions", out: "parentFacing.insights[]", tpl: "ב{subject} — «{label}»: נפתרו {q} שאלות, והדיוק היה {acc}%. {pattern} משמעות: {decision}. מה לתרגל: {action}", ex: "במתמטיקה — «חיבור»: נפתרו 136 שאלות, והדיוק היה 38%. ...", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "ParentReportTopicExplainBlock", conflict: "subject_progress_strong same subject", notes: "Primary diagnostic insight path post-fix" });
add({ category: "engine_insight", state: "topic_wrong_ratio_high", file: ENG, cond: "topicWrongRatioPct>=25", in: "wrong, questions", out: "insight line fragment", tpl: "שיעור הטעויות: {wr}%.", ex: "שיעור הטעויות: 62%.", pol: "negative", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "explain data section", conflict: "", notes: "" });
add({ category: "engine_insight", state: "no_pattern_honest", file: ENG, cond: "rowNeedsAttention && !parentFacingPatternLineHe", in: "dominantMistakePattern", out: "insight fragment", tpl: "הנתונים מצביעים על ירידה בדיוק בנושא, אבל עדיין אין מספיק מידע כדי לזהות סוג טעות קבוע.", ex: "(same)", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "explain pattern section", conflict: "recurring_mistakes_subject", notes: "Honesty — no fake pattern" });
add({ category: "engine_insight", state: "mixed_subject_strong_weak", file: ENG, cond: "same subject slot.weak && slot.strong different topics", in: "bySubject dedupe map", out: "insights[] merged line", tpl: "ב{subject}: ב«{strong}» יש שיפור יחסית, אבל ב«{weak}» ...", ex: "במתמטיקה: ב«חיסור» יש שיפור יחסית, אבל ב«חיבור» נפתרו 136 שאלות...", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "requiresAttentionPreviewHe + strongestArea", conflict: "self-contained contradiction risk", notes: "Dedupe required" });
add({ category: "engine_insight", state: "no_urgent_topic", file: ENG, cond: "hasEngineRows && engineInsights.length===0 && !activityGap", in: "collectTopicEngineRows", out: "insights[]", tpl: "בתקופה שנבחרה יש תרגול, אך לפי המנוע לא זוהה נושא דחוף אחד — מומלץ להמשיך בתרגול קצר וקבוע.", ex: "(same)", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "default_fallback_insight", conflict: "topic_attention_insight", notes: "AAA1 post-fix" });
add({ category: "engine_insight", state: "insights_override_source", file: "lib/learning-supabase/parent-report-from-api-payload.js", cond: "applyTopicEngineParentFacingInsights after server authority", in: "topicEngineRowSignals present", out: "_parentFacingInsightsSource=topic_engine", tpl: "(replaces server insights[])", ex: "(engine lines replace server heuristics)", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, hidden: "server insights discarded", spec: "specific", dup: "server_insight *", conflict: "all server insights", notes: "Pipeline fork" });

// ─── 4. Legacy topic step rules ─────────────────────────────────────────────
const TNE = "utils/topic-next-step-engine.js";
const legacyRules = [
  ["min_questions_low_confidence", "q < cfg.minQuestionsLowConfidence && q>0", "maintain_and_strengthen", "יש רק {q} שאלות ב«{name}» — מוקדם מדי לשנות כיתה או רמת קושי.", "negative"],
  ["repeated_struggle_drop_level", "repeatedStruggle && li>=1", "drop_one_level_topic_only", "(buildHebrewCopy drop level)", "negative"],
  ["repeated_struggle_drop_grade", "repeatedStruggle && li===0 && gi>0", "drop_one_grade_topic_only", "(buildHebrewCopy drop grade)", "negative"],
  ["remediate_mid_band_no_drag", "q>=minRemediate && acc in remediate band && !mistakeDrag", "remediate_same_level", "(mid accuracy remediate)", "neutral"],
  ["advance_grade_topic", "hard level + acc/stability/confidence thresholds", "advance_grade_topic_only", "(advance grade copy)", "positive"],
  ["high_volume_advance_level", "highVolumeStrong && level not max", "advance_level", "(advance level copy)", "positive"],
  ["low_accuracy_drop_level", "acc low + level index", "drop_one_level_topic_only", "(drop level low acc)", "negative"],
  ["low_accuracy_unknown_level_remediate", "low acc unknown level", "remediate_same_level", "(remediate)", "negative"],
  ["low_accuracy_drop_grade", "low acc drop grade", "drop_one_grade_topic_only", "(drop grade)", "negative"],
  ["remediate_band", "default remediate band", "remediate_same_level", "(remediate band)", "negative"],
  ["default_maintain", "fallback", "maintain_and_strengthen", "(maintain copy)", "neutral"],
  ["evidence_sufficiency_cap", "suppressAggressiveStep post-cap", "maintain/remediate", "הנתון עדיין חלקי — לא משנים כיתה או רמת קושי כרגע", "neutral"],
];
for (const [id, cond, step, tpl, pol] of legacyRules) {
  add({
    category: "legacy_step_rule",
    state: id,
    file: TNE,
    cond,
    in: "row.questions, accuracy, mistakeEventCount, stability, confidence",
    out: `recommendedNextStep=${step}; reasonHe/parentHe`,
    tpl,
    ex: `ב«חיבור» ${tpl.includes("{q}") ? "יש רק 4 שאלות" : `→ ${step}`}`,
    pol,
    short: DISPLAY.topicTable,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    pdfDetailed: DISPLAY.yes,
    hidden: "trace in decisionTrace only",
    spec: "specific",
    dup: "whyThisRecommendationHe step label",
    conflict: "phase2 guard may reverse step",
    notes: "",
  });
}

// ─── 5. Phase2 guards ───────────────────────────────────────────────────────
const P2 = "utils/topic-next-step-phase2.js";
const phase2Guards = [
  ["hint_dependence_block_advance", "hintDependenceRisk && isAdvance", "maintain_and_strengthen", "הילד עדיין נעזר ברמזים גבוהה — לא מקדמים רמה/כיתה אוטומטically.", "neutral"],
  ["fragile_success_block_advance", "fragile_success && (!progressSupportsAdvance||hint||!sufficiencyStrong)", "maintain_and_strengthen", "ההצלחה עדיין לא תמיד נשמרת לבד — לא מתקדמים...", "neutral"],
  ["stable_mastery_guard_advance", "stable_mastery && (insufficientEvidenceRisk||falsePromotionRisk||unclearTrend)", "maintain_and_strengthen", "הילד מצליח בנושא — מקדמים רק כשיש מספיק תרגול...", "positive"],
  ["false_promotion_guard", "falsePromotionRisk && aggressive step", "maintain_and_strengthen", "יש חשש שהתקדמות תהיה מוקדמת מדי — לא מקדמים עכשיו.", "neutral"],
  ["unclear_trend_cap_aggressive", "unclearTrend && aggressive && !strongPerformanceNoTrend", "maintain_and_strengthen", "עדיין לא ברור כיוון הדיוק לאורך זמן...", "neutral"],
  ["accuracy_up_independence_down", "fragileProgressPattern && advance", "maintain_and_strengthen", "הדיוק עולה, אבל הילד עדיין צריך יותר עזרה...", "neutral"],
  ["speed_only_block_drop", "speedOnlyRisk && drop step", "maintain_and_strengthen", "קושי שמופיע בעיקר תחת לחץ זמן — לא מורידים רמה...", "neutral"],
  ["instruction_friction_soften_drop", "instruction_friction && drop && !strongKnowledgeGap", "remediate_same_level", "ייתכן שהקושי קשור להבנת המשימה...", "neutral"],
  ["careless_pattern_before_drop", "careless_pattern && drop", "remediate_same_level", "דפוס רשלנות — מעדיפים חיזוק ברמה לפני ירידה.", "negative"],
  ["knowledge_gap_respect_positive_trend", "knowledge_gap && drop && positiveAccuracy", "remediate_same_level", "יש סימן לקושי, אבל הדיוק משתפר...", "neutral"],
  ["false_remediation_guard", "falseRemediationRisk && drop", "remediate_same_level", "יש חשש לתרגול כבד מדי — עדיף חיזוק קצר.", "neutral"],
  ["recent_transition_caution", "negativeTrendAfterRecentDifficultyIncrease && drop_grade", "remediate_same_level", "אחרי קושי אחרון נראית ירידה...", "neutral"],
  ["fluency_positive_speed_context", "fluencySupportWithoutAccuracyDrop && speedOnly && drop_level", "maintain_and_strengthen", "יש שיפור בקצב בלי ירידה בדיוק...", "positive"],
  ["insufficient_evidence_cap_phase2", "insufficientEvidenceRisk && aggressive", "maintain_and_strengthen", "אין מספיק מידע לשינוי גדול עכשיו.", "neutral"],
  ["risk_profile_prefer_remediate_over_maintain", "fragileLike && maintain && q>=10 && wrongRR>=0.15 && acc<88", "remediate_same_level", "זוהה דפוס סיכון/שבריריות — מעדיפים חיזוק ממוקד...", "negative"],
  ["intelligence_decision_guards", "applyIntelligenceDecisionGuards applied", "(varies)", "(intelligence blockers)", "neutral"],
];
for (const [id, cond, step, tpl, pol] of phase2Guards) {
  add({
    category: "phase2_guard",
    state: id,
    file: P2,
    cond: `applyPhase2GuardsToStep: ${cond}`,
    in: "riskFlags, trendDer, behaviorType, row",
    out: `recommendedNextStep→${step}; phase2Blockers[]`,
    tpl,
    ex: tpl.slice(0, 80),
    pol,
    short: DISPLAY.why,
    pdfShort: DISPLAY.partial,
    detailed: DISPLAY.yes,
    pdfDetailed: DISPLAY.yes,
    hidden: "blocker detail in trace; may append to whyThisRecommendationHe",
    spec: "specific",
    dup: "risk flag labels",
    conflict: "legacy advance rule",
    notes: "",
  });
}

// ─── 6. Phase7 restraint ────────────────────────────────────────────────────
const phase7 = [
  ["phase7_restraint_cap_advance", "shouldAvoidStrongConclusion && advance step", "maintain_and_strengthen", "הנתונים עדיין חלקיים — לא מקדמים כיתה או רמת קושי כרגע."],
  ["phase7_restraint_soften_drop", "shouldAvoid && drop step", "remediate_same_level", "לא מורידים רמה כשעדיין אין מספיק מידע — ממשיכים בחיזוק."],
  ["phase7_insufficient_evidence_drop", "rootCause===insufficient_evidence && drop", "remediate_same_level", "אין עדיין מספיק מידע — לא מורידים רמה; ממשיכים בחיזוק מבוקר."],
  ["phase7_early_stage_soften_drop", "rootCause===early_stage_instability && drop && conclusionStrength!=='strong'", "remediate_same_level", "עדיין מוקדם להוריד רמה — קודם מנסים חיזוק קצר."],
  ["phase7_soft_copy_withheld", "mergePhase7SoftHebrewCopy: cs==='withheld'||level==='insufficient'", "parentHe append", "עדיין מוקדם לקבוע כיוון ברור — עדיף תרגול קצר ושגרתי באותה רמה."],
  ["phase7_soft_copy_tentative", "cs==='tentative'||shouldAvoidStrongConclusion", "parentHe append", "מסכמים בזהירות: צעדים קטנים וברורים, בלי קפיצות."],
];
for (const [id, cond, out, tpl] of phase7) {
  add({
    category: "phase7_restraint",
    state: id,
    file: P2,
    cond,
    in: "restraint.conclusionStrength, rootCause",
    out,
    tpl,
    ex: tpl,
    pol: "neutral",
    short: DISPLAY.topicTable,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "appended to parentHe not always visible in short",
    spec: "specific",
    dup: "preliminary_signal",
    conflict: "advance_grade_topic legacy",
    notes: "",
  });
}

// ─── 7. Root causes ───────────────────────────────────────────────────────────
const RC = "utils/parent-report-root-cause.js";
const rootCauses = [
  ["insufficient_evidence", "level==='insufficient'||conclusionStrength==='withheld'", "עדיין אין בסיס מספיק כדי לומר במדויק מה מקור הקושי", "neutral"],
  ["knowledge_gap", "behaviorType knowledge_gap + strong evidence OR default", "הנתונים תומכים בפער ידע ממוקד לצד דיוק נמוך", "negative"],
  ["speed_pressure", "speedOnlyRisk OR speed_pressure behavior", "נראה שהקושי נוגע בעיקר למסלול מהיר או לחץ זמן", "negative"],
  ["instruction_friction", "instruction_friction || hintDependenceRisk", "הדפוס תואם קריאת משימה ותלות ברמזים", "negative"],
  ["careless_execution", "careless_pattern OR acc>=68 wr band", "יש סימנים לרשלנות ביצוע לצד שליטה סבירה", "negative"],
  ["weak_independence", "fragile_success+trend OR independenceDeteriorating", "העצמאות בפתרון נמוכה יחסית לעומת הדיוק", "negative"],
  ["early_stage_instability", "q<12 || conclusionStrength==='tentative'", "עדיין מוקדם בטווח — התמונה עלולה להתייצב", "neutral"],
  ["mixed_signal", "restraint.level==='mixed' OR default", "כמה אותות מצביעים לכיוונים שונים", "neutral"],
];
for (const [id, cond, nar, pol] of rootCauses) {
  add({
    category: "root_cause",
    state: id,
    file: RC,
    cond: `estimateRowRootCause: ${cond}`,
    in: "behaviorType, riskFlags, trendDer, q, accuracy, wrongRatio, restraint",
    out: `rootCause, rootCauseLabelHe, rootCauseNarrativeHe`,
    tpl: `{rootCauseLabelHe}. {rootCauseNarrativeHe}`,
    ex: nar,
    pol,
    short: DISPLAY.explain,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "technical profile suffix in narrative (behaviorType id)",
    spec: "specific",
    dup: "diagnosticTypeLabelHe",
    conflict: "stable_mastery same row",
    notes: "Strip technical suffix for parents",
  });
}

// ─── 8. Behavior types ──────────────────────────────────────────────────────
const BEH = "utils/parent-report-row-behavior.js";
const behaviors = [
  ["knowledge_gap", "wrongRatio>=0.32 OR maxFamCount>=3 OR acc<62", "קושי בבסיס", "negative"],
  ["speed_pressure", "modeKey speed OR medWrongMs<2200", "לחץ מהירות", "negative"],
  ["instruction_friction", "hintRate>=0.42", "עוזר לו יותר כשיש ליווי או הסבר ליד", "negative"],
  ["careless_pattern", "acc 55-85 + fast wrong responses", "רגעים של חוסר ריכוז שחוזרים", "negative"],
  ["fragile_success", "acc 72-92 + firstTryMiss/avgRetry/changedRate", "הצלחה שבירה", "negative"],
  ["stable_mastery", "q>=8 acc>=88 wrongRatio<=0.14", "שליטה טובה בנושא לאורך זמן", "positive"],
  ["undetermined", "best score <1.15 && q<4", "לא נקבע", "neutral"],
  ["mixed_low_signal", "(UI label only)", "עדיין מעט מידע — אי אפשר להסיק בוודאות", "neutral"],
];
for (const [id, cond, label, pol] of behaviors) {
  add({
    category: "behavior_profile",
    state: id,
    file: BEH,
    cond: `computeRowBehaviorProfile scores: ${cond}`,
    in: "mistake events: hintRate, firstTryMissRate, changedRate, avgRetry, responseMs",
    out: `diagnosticType=${id}; behaviorDominantLabelHe`,
    tpl: label,
    ex: label,
    pol,
    short: DISPLAY.explain,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "winner strength01 in trace only",
    spec: "specific",
    dup: "root_cause same id",
    conflict: "stable_mastery vs fragile_success same row edge",
    notes: "",
  });
}

// ─── 9. Behavior metric branches in buildWhy ────────────────────────────────
const whyMetrics = [
  ["firstTryMissRate", "fragile_success && firstTryMiss>=0.4", "בניסיון הראשון יש פספוס ב-{pct}% מהשאלות הבעייתיות", "negative"],
  ["changedRate", "fragile_success && changedRate>=0.3", "הילד מחליף תשובה לעיתים קרובות ({pct}%)", "negative"],
  ["avgRetry", "fragile_success && avgRetry>=1.15", "ממוצע {avgRetry} ניסיונות לשאלה שגויה", "negative"],
  ["fragile_success_default", "fragile_success else branch", "הדיוק נראה סביר אבל התשובה לא תמיד משקפת שליטה יציבה", "negative"],
  ["mid_accuracy_60_74", "acc in remediate band (legacy+row)", "דיוק בינוני — חיזוק באותה רמה", "negative"],
  ["low_accuracy", "acc<55 or acc<62 knowledge_gap", "דיוק נמוך — ביסוס", "negative"],
  ["high_accuracy_85_plus_errors", "acc>=85 && wrongs recurring", "דיוק גבוה עם טעויות חוזרות — fragile/careless", "neutral"],
  ["maintained_accuracy", "stable_mastery in buildWhy", "הנושא נראה בשליטה טובה ויציבה (דיוק {acc}% מתוך {q} שאלות)", "positive"],
];
for (const [id, cond, tpl, pol] of whyMetrics) {
  add({
    category: "accuracy_behavior_metric",
    state: id,
    file: P2,
    cond: `buildWhyThisRecommendationHe: ${cond}`,
    in: "behaviorSignals.firstTryMissRateOnWrong, changedAnswerRateOnWrong, avgRetryOnWrong, acc, q",
    out: "whyThisRecommendationHe fragment",
    tpl,
    ex: tpl.replace("{pct}", "48").replace("{avgRetry}", "1.3").replace("{acc}", "82").replace("{q}", "24"),
    pol,
    short: DISPLAY.why,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "full why may be long",
    spec: "specific",
    dup: "ParentReportTopicExplainBlock meaning",
    conflict: "stable_mastery + mistake pattern",
    notes: "",
  });
}

// ─── 10. Dependency / foundation ────────────────────────────────────────────
const FD = "utils/parent-report-foundation-dependency.js";
const deps = [
  ["insufficient_dependency_evidence", "weak||gateReadiness==='insufficient'", "אין מספיק מידע כדי לקבוע אם הבעיה מקומית או ביסודית", "neutral"],
  ["likely_local_issue", "speedOnly&&!fragile OR localScore>=2", "נראה שהקושי מקומי לנושא", "neutral"],
  ["likely_foundational_block", "foundationScore>=3 OR (>=2 && fragile/persistent)", "נראה שיש חסם יסודי — כדאי לחזק בסיס לפני הרחבה", "negative"],
  ["mixed_dependency_signal", "foundationScore&&localScore mixed", "יש גם סימנים לבסיס וגם לקושי מקומי", "neutral"],
  ["accuracy_foundation_gap", "knowledgeGap+persistentMistakes blocker", "פער דיוק חוזר בבסיס", "negative"],
];
for (const [id, cond, tpl, pol] of deps) {
  add({
    category: "foundation_dependency",
    state: id,
    file: FD,
    cond: `buildFoundationDependencyPhase14: ${cond}`,
    in: "rootCause, learningStage, mistakeRecurrence, q, evidenceStrength",
    out: `dependencyState, foundationDependencyNarrativeHe, topicFoundationDependencyCompactLineHe`,
    tpl,
    ex: `ב«חיבור»: ${tpl}`,
    pol,
    short: DISPLAY.foundation,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "vague 'חלקים פשוטים' filtered by VAGUE_FOUNDATION_PHRASE",
    spec: "specific",
    dup: "parentFacingFoundationLineHe",
    conflict: "likely_local_issue vs likely_foundational_block",
    notes: "Must not invent prerequisite topic name",
  });
}

// ─── 11. Mistake patterns ───────────────────────────────────────────────────
const MI = "utils/parent-report-mistake-intelligence.js";
const patterns = [
  ["insufficient_mistake_evidence", "mC===0&&q<10 OR weakSignal", "עדיין אין מספיק דוגמאות כדי לראות טעות חוזרת ברורה", "neutral"],
  ["speed_driven_error", "speed_pressure root/behavior", "טעות שנובעת ממהירות", "negative"],
  ["instruction_misread", "instruction_friction/hintDependence", "טעות בקריאה או בהבנת המשימה", "negative"],
  ["support_dependent_success", "weak_independence/independenceDeteriorating", "הצלחה בעיקר כשיש ליווי ליד", "negative"],
  ["careless_flip", "careless_execution/careless_pattern", "טעות קטנה כשנמהרים או מדלגים על צעד", "negative"],
  ["concept_confusion", "knowledge_gap strong + wr>0.38", "בלבול מושגי חוזר", "negative"],
  ["procedure_break", "knowledge_gap strong + wr<=0.38", "בלבול בסדר הפעולות", "negative"],
  ["mixed_mistake_pattern", "fragileProgress OR default", "תערובת טעויות — בלי דפוס אחד ברור", "neutral"],
  ["early_learning_noise", "q<12 unclear trend", "רעש טבעי של למידה מוקדמת", "neutral"],
];
for (const [id, cond, tpl, pol] of patterns) {
  add({
    category: "mistake_pattern",
    state: id,
    file: MI,
    cond: `buildMistakeIntelligencePhase9: ${cond}`,
    in: "mistakeEventCount, rootCause, behaviorType, q, accuracy, wrongRatio",
    out: "dominantMistakePattern, dominantMistakePatternLabelHe, mistakePatternNarrativeHe",
    tpl: `ב«{name}» הדפוס הבולט: ${tpl}`,
    ex: `ב«חיבור» הדפוס הבולט: ${tpl}`,
    pol,
    short: DISPLAY.pattern,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "recurrence level appended in narrative",
    spec: "specific",
    dup: "parentFacingPatternLineHe",
    conflict: "no_pattern_honest when insufficient",
    notes: "",
  });
}

// ─── 12. Recommended steps (strength/neutral/weak) ──────────────────────────
const steps = [
  ["advance_level", "העלאת רמת קושי — בנושא זה בלבד", "positive"],
  ["advance_grade_topic_only", "העלאת כיתה — בנושא זה בלבד", "positive"],
  ["maintain_and_strengthen", "לבסס באותה רמה", "neutral"],
  ["remediate_same_level", "חיזוק באותה רמה", "negative"],
  ["drop_one_level_topic_only", "הורדת רמת קושי — בנושא זה בלבד", "negative"],
  ["drop_one_grade_topic_only", "הורדת רמת קושי — בנושא זה בלבד", "negative"],
];
for (const [step, label, pol] of steps) {
  add({
    category: "recommended_step",
    state: step,
    file: TNE,
    cond: `RECOMMENDED_STEP_LABEL_HE.${step}`,
    in: "final recommendedNextStep after all guards",
    out: "recommendedStepLabelHe, topicEngineRowSignals",
    tpl: label,
    ex: `מה זוהה: ${label} ב«חיבור».`,
    pol,
    short: DISPLAY.explain,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    pdfDetailed: DISPLAY.yes,
    spec: "specific",
    dup: "whyThisRecommendationHe opening",
    conflict: "phase2 may change step after label computed",
    notes: "",
  });
}

// ─── 13. Risk flags ─────────────────────────────────────────────────────────
const risks = [
  ["falsePromotionRisk", "חשש מעליית רמה מוקדמת מדי", "neutral"],
  ["falseRemediationRisk", "חשש מטיפול יתר", "neutral"],
  ["speedOnlyRisk", "נטייה למהירות", "negative"],
  ["hintDependenceRisk", "הילד עדיין נעזר ברמזים", "negative"],
  ["insufficientEvidenceRisk", "מידע חלקי בלבד", "neutral"],
  ["recentTransitionRisk", "שינוי קטן לאחרונה", "neutral"],
];
for (const [id, label, pol] of risks) {
  add({
    category: "risk_flag",
    state: id,
    file: P2,
    cond: `buildPhase2RiskFlags: ${id}===true`,
    in: "behavior, trend, restraint, row metrics",
    out: "riskFlags; appended to whyThisRecommendationHe as 'נקודות לתשומת לב'",
    tpl: label,
    ex: `נקודות לתשומת לב: ${label}.`,
    pol,
    short: DISPLAY.partial,
    pdfShort: DISPLAY.partial,
    detailed: DISPLAY.yes,
    hidden: "activeRiskFlagLabelsHe max 4 in some views",
    spec: "specific",
    dup: "phase2 guard same theme",
    conflict: "advance rule vs falsePromotionRisk",
    notes: "",
  });
}

// ─── 14. Intervention plan (doNow) ──────────────────────────────────────────
const IP = "utils/parent-report-intervention-plan.js";
const interventions = [
  ["insufficient_evidence", "collect_evidence", "תרגול קצר ומדיד: אותה משימה, אותה רמה, דגש על קריאה לפני תשובה.", "neutral"],
  ["speed_pressure", "accuracy_over_speed", "תרגול אחד קצר בלי טיימר, עם עצירה לפני שליחה.", "neutral"],
  ["instruction_friction", "clarity_first", "משימה קצרה, ניסוח ברור, פחות הסברים ארוכים בזמן התרגול.", "negative"],
  ["weak_independence", "fade_support", "להפריד בבירור בין «ניסיון לבד» לבין «בדיקה יחד בסוף».", "negative"],
  ["knowledge_gap", "core_skill_gap", "חזרה ממוקדת על טעויות דומות באותה רמת קושי.", "negative"],
  ["careless_execution", "execution_habits", "כל משימה עם עצירת בדיקה קצרה לפני סיום.", "neutral"],
  ["mixed_signal", "observe_and_stabilize", "להמשיך באותה רמה ולבדוק את הדיוק אחרי כל מפגש.", "neutral"],
  ["early_stage_instability", "observe_and_stabilize", "(same as mixed_signal branch)", "neutral"],
];
for (const [rc, goal, doNow, pol] of interventions) {
  add({
    category: "intervention_doNow",
    state: `${rc}_doNow`,
    file: IP,
    cond: `buildInterventionPlanPhase8 rootCause==='${rc}'`,
    in: "rootCause, conclusionStrength, q, phase9 overlays",
    out: "doNowHe, interventionPlanHe, recommendedParentActionHe",
    tpl: doNow,
    ex: doNow,
    pol,
    short: DISPLAY.explain,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    hidden: "avoidNowHe not always shown",
    spec: "specific",
    dup: "homeRecommendations",
    conflict: "doNow vs step contradiction if guards disagree",
    notes: "",
  });
}

// ─── 15. Overview V2 strengths ──────────────────────────────────────────────
const V2 = "utils/parent-report-v2.js";
add({ category: "overview_strength", state: "strongestAreaLineHe", file: V2, cond: "strengthCandidates[0]: positiveAuthorityLevel excellent/very_good/good OR actionState maintain/expand", in: "diagnosticEngineV2.units canonicalState", out: "summary.diagnosticOverviewHe.strongestAreaLineHe", tpl: "{subject}: {name}: {q} שאלות, דיוק {acc}%", ex: "גאומטריה: משולשים: 45 שאלות, דיוק 92%", pol: "positive", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "rawMetricStrengthsHe", conflict: "requiresAttentionPreview same subject", notes: "" });
add({ category: "overview_strength", state: "readyForProgressPreviewHe", file: V2, cond: "strengthCandidates[1..] up to 3 lines", in: "V2 units sorted by strength", out: "diagnosticOverviewHe.readyForProgressPreviewHe[]", tpl: "{subject}: {name}: {q} שאלות, דיוק {acc}%", ex: "מתמטיקה: חיסור: 30 שאלות, דיוק 88%", pol: "positive", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "advance_level step", conflict: "falsePromotionRisk on same topic", notes: "Preview only — not same as approved advance" });
add({ category: "overview_weakness", state: "mainFocusAreaLineHe", file: V2, cond: "attentionSorted[0] priority P1-P4 OR diagnosis.allowed", in: "V2 units priority", out: "diagnosticOverviewHe.mainFocusAreaLineHe", tpl: "{subject}: {name}: {pattern OR q/acc}", ex: "מתמטיקה: חיבור: בלבול בסדר הפעולות", pol: "negative", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, hidden: "appendThinOverviewHedge when thin", spec: "specific", dup: "engine topic_attention_insight", conflict: "strongestAreaLineHe same subject AAA5", notes: "" });
add({ category: "overview_weakness", state: "requiresAttentionPreviewHe", file: V2, cond: "attentionSorted[1..] up to 5", in: "V2 attention units", out: "diagnosticOverviewHe.requiresAttentionPreviewHe[]", tpl: "(same as mainFocus format)", ex: "עברית: קריאה: כ-12 שאלות, דיוק 58%", pol: "negative", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "insights topic lines", conflict: "mainFocusAreaLineHe", notes: "" });
add({ category: "overview_neutral", state: "insufficientDataSubjectsHe", file: V2, cond: "subjects with thin evidence list", in: "insufficientDataSubjectsHe", out: "diagnosticOverviewHe.insufficientDataSubjectsHe[]", tpl: "(subject names)", ex: "מדעים", pol: "neutral", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "thin_student_data", conflict: "", notes: "" });
add({ category: "overview_neutral", state: "no_urgent_topic_overview_fallback", file: V2, cond: "units.length===0 → fallback overview", in: "fallbackOverview", out: "diagnosticOverviewHe fields from fallback", tpl: "(legacy pattern diagnostics fallback)", ex: "(varies)", pol: "neutral", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "engine no_urgent", conflict: "", notes: "" });

// ─── 16. rawMetricStrengthsHe ───────────────────────────────────────────────
const PDP = "utils/parent-data-presence.js";
const subjects = ["אנגלית", "עברית", "מדעים", "חשבון", "גאומטריה", "מולדת וגאוגרפיה"];
for (const subj of subjects) {
  add({
    category: "raw_metric_strength",
    state: `high_accuracy_${subj}`,
    file: PDP,
    cond: `deriveRawMetricStrengthLinesHe: nq>=RAW_STRENGTH_MIN_Q && acc>=RAW_STRENGTH_HIGH_ACC`,
    in: `summary.${subj}Questions, ${subj}Accuracy`,
    out: "rawMetricStrengthsHe[]",
    tpl: `{label} נראה כמו מקצוע שהילד מצליח בו יותר כרגע: דיוק גבוה ({acc}%) לאורך {nq} שאלות בתקופה.`,
    ex: `${subj} נראה כמו מקצוע שהילד מצליח בו יותר כרגע: דיוק גבוה (91%) לאורך 40 שאלות בתקופה.`,
    pol: "positive",
    short: DISPLAY.rawStrength,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    spec: "specific",
    dup: "strongestAreaLineHe",
    conflict: "low_accuracy_weakest_subject same subject",
    notes: "Subject-level only — no topic",
  });
  add({
    category: "raw_metric_strength",
    state: `mid_accuracy_${subj}`,
    file: PDP,
    cond: `acc>=RAW_STRENGTH_MID_LO && acc<RAW_STRENGTH_HIGH_ACC`,
    in: `summary accuracy band 60-79 approx`,
    out: "rawMetricStrengthsHe[]",
    tpl: `ב{label} התוצאות נראות די עקביות ({acc}% דיוק, {nq} שאלות) — יש עדיין נושאים שכדאי לחזק.`,
    ex: `ב${subj} התוצאות נראות די עקביות (72% דיוק, 25 שאלות) — יש עדיין נושאים שכדאי לחזק.`,
    pol: "neutral",
    short: DISPLAY.rawStrength,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    spec: "specific",
    dup: "mid_accuracy band insight",
    conflict: "high_accuracy same subject if threshold edge",
    notes: "Strength with caveat — not full mastery claim",
  });
}

// ─── 17. UI explain block sections ──────────────────────────────────────────
const UI = "utils/parent-report-ui-explain-he.js";
const explainSections = [
  ["explain_identified", "buildTopicDiagnosticExplainSectionsHe identified", "מה זוהה: {stepLabel} ב«{label}».", "topic table + PDF"],
  ["explain_data", "q/acc/wr", "הנתונים: {q} שאלות, דיוק {acc}%, {wr}% טעויות.", "topic table + PDF"],
  ["explain_pattern_known", "parentFacingPatternLineHe present", "דפוס: {patternLabel/narrative}.", "topic table + PDF"],
  ["explain_pattern_unknown", "rowNeedsAttention && !pattern", "דפוס: אין עדיין מספיק מידע כדי לזהות סוג טעות קבוע...", "topic table + PDF"],
  ["explain_meaning", "parentFacingMeaningLineHe + foundation", "משמעות: {step/reason}. {foundation?}", "topic table + PDF"],
  ["explain_action", "doNowHe||interventionPlanHe||recommendedParentActionHe", "מה לתרגל: {action}", "topic table + PDF"],
  ["topicFoundationDependencyCompactLineHe", "parentFacingFoundationLineHe||dependencyStateLineHe", "(foundation compact)", "topic row compact"],
  ["trendCompactLineHe", "trend.summaryHe OR accuracy/independence directions", "מה קורה עם הדיוק: {dir}", "topic table truncated 100"],
  ["learningMemoryLineHe", "memoryNarrativeHe||learningStageLabelHe", "לאורך זמן: ...", "detailed partial truncate 150"],
  ["reviewBeforeAdvanceLineHe", "reviewBeforeAdvanceHe", "לחזור על אותה רמה...", "detailed truncate 160"],
  ["transferReadinessLineHe", "transferReadiness not unknown", "מעבר: ...", "detailed truncate 130"],
];
for (const [id, cond, tpl, where] of explainSections) {
  add({
    category: "ui_explain_layer",
    state: id,
    file: UI,
    cond,
    in: "row.topicEngineRowSignals, row accuracy/questions",
    out: `ParentReportTopicExplainBlock / ${id}`,
    tpl,
    ex: tpl.replace("{q}", "24").replace("{acc}", "68").replace("{label}", "חיבור"),
    pol: id.includes("pattern_unknown") ? "neutral" : id.includes("identified") ? "neutral" : "specific",
    short: where.includes("topic") ? DISPLAY.topicTable : DISPLAY.detailed,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    pdfDetailed: DISPLAY.yes,
    hidden: where.includes("truncate") ? "truncateHe 100-160 chars in compact lines; explain block full since fix" : "explain block NOT truncated at 140 post-fix",
    spec: "specific",
    dup: "engine_insight topic_attention",
    conflict: "truncated trend vs full explain",
    notes: id.includes("pattern") ? "Must stay aligned with engine honesty" : "",
  });
}

// ─── 18. Trend signals ──────────────────────────────────────────────────────
const TR = "utils/parent-report-row-trend.js";
const trends = [
  ["row_trend_up", "accuracyDirection==='up' OR progressSupportsAdvance", "בשיפור / אפשר לשקול התקדמות זהירה", "positive"],
  ["row_trend_down", "accuracyDirection==='down'", "בירידה", "negative"],
  ["row_trend_flat", "accuracyDirection==='flat'", "ללא שינוי", "neutral"],
  ["row_trend_unknown", "unclearTrend", "לא ברורה מספיק / נשארים זהירים", "neutral"],
  ["fragileProgressPattern", "accuracy up + independence down", "הדיוק עולה, אבל הילד עדיין צריך יותר עזרה", "neutral"],
  ["progressSupportsAdvance", "trend supports advance", "אם ההצלחה והעצמאות חוזרות יחד, אפשר לשקול התקדמות זהירה", "positive"],
  ["negativeTrendAfterRecentDifficultyIncrease", "recent difficulty increase", "triggers recent_transition_caution", "negative"],
  ["fluencySupportWithoutAccuracyDrop", "speed context positive", "blocks drop on speed alone", "positive"],
];
for (const [id, cond, tpl, pol] of trends) {
  add({
    category: "trend_signal",
    state: id,
    file: TR,
    cond: `buildTrendDerivedSignals / trend row: ${cond}`,
    in: "row daily slices, mistake events over time",
    out: "trendDer.* → whyThisRecommendationHe / phase2 guards",
    tpl,
    ex: tpl,
    pol,
    short: DISPLAY.partial,
    pdfShort: DISPLAY.partial,
    detailed: DISPLAY.yes,
    hidden: "trendCompactLineHe truncate 100",
    spec: "specific",
    dup: "daily_improvement server insight",
    conflict: "fragile_success vs progressSupportsAdvance",
    notes: "",
  });
}

// ─── 19. Home recommendations ───────────────────────────────────────────────
const homeRecs = [
  ["home_math_geometry", "weakest subject math|geometry", "להקדיש 10 דקות ביום לתרגול קצר במתמטיקה...", "neutral"],
  ["home_hebrew", "weakest hebrew", "לקרוא טקסט קצר ולבקש מהילד להסביר...", "neutral"],
  ["home_english", "weakest english", "לתרגל 5–10 דקות ביום אוצר מילים...", "neutral"],
  ["home_generic_weak", "other weak subject", "לחזור יחד על נושא אחד ב{label} בקצב איטי", "neutral"],
  ["home_word_problems", "weakTopic word problems", "יש לשים לב לבעיות מילוליות...", "negative"],
  ["home_review_mistakes", "totalAnswers>0", "לחזור יחד על טעויות אחרונות...", "neutral"],
  ["home_start_short", "totalAnswers===0", "להתחיל מתרגול קצר של 5–10 דקות...", "neutral"],
  ["home_routine", "always (fallback)", "מומלץ לשמור על תרגול קצר וקבוע...", "neutral"],
  ["home_hebrew_reading", "insights mention עברית", "לחזק קריאה והבנת הנקרא...", "neutral"],
];
for (const [id, cond, tpl, pol] of homeRecs) {
  add({
    category: "home_recommendation",
    state: id,
    file: SRV,
    cond: `buildHomeRecommendationsHe: ${cond}`,
    in: "subjects rank, weakTopics, insights text",
    out: "parentFacing.homeRecommendations[]",
    tpl,
    ex: tpl,
    pol,
    short: DISPLAY.home,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    spec: cond.includes("always") ? "generic" : "specific",
    dup: "intervention doNowHe",
    conflict: "generic routine vs specific doNow",
    notes: "",
  });
}

// ─── 20. Stable strength detection (engine) ─────────────────────────────────
add({ category: "strength_detection", state: "stable_mastery_row", file: ENG, cond: "rowIsStableStrength: q>=5 && acc>=80 && (behavior===stable_mastery||excellent)", in: "topicEngineRowSignals.diagnosticType, row.excellent", out: "(used in dedupe; may appear in mixed_subject line)", tpl: "NOT directly emitted as standalone insight unless paired with weak", ex: "(paired in mixed subject only)", pol: "positive", short: DISPLAY.no, detailed: DISPLAY.partial, hidden: "stable rows not promoted to insights[] alone", spec: "specific", dup: "strongestAreaLineHe", conflict: "weak topic same subject", notes: "Strength path under-represented in insights head — overview/rawMetric compensate" });
add({ category: "strength_detection", state: "stable_mastery_why", file: P2, cond: "buildWhy behaviorType===stable_mastery", in: "acc, q", out: "whyThisRecommendationHe", tpl: "הנושא נראה בשליטה טובה ויציבה (דיוק {acc}% מתוך {q} שאלות).", ex: "הנושא נראה בשליטה טובה ויציבה (דיוק 91% מתוך 32 שאלות).", pol: "positive", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "maintained_accuracy", conflict: "mistake pattern on same row", notes: "Good strength template to reuse in insights" });
add({ category: "strength_detection", state: "advance_level_positive", file: TNE, cond: "final step advance_level after guards pass", in: "high volume strong performance", out: "recommendedStepLabelHe + why", tpl: "העלאת רמת קושי — בנושא זה בלבד", ex: "משמעות: העלאת רמת קושי — חיזוק ממוקד...", pol: "positive", short: DISPLAY.explain, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "readyForProgressPreviewHe", conflict: "falsePromotionRisk", notes: "Only when guards allow" });
add({ category: "strength_detection", state: "advance_grade_topic_only", file: TNE, cond: "advance_grade_topic legacy rule + guards", in: "hard level high acc stability", out: "step label", tpl: "העלאת כיתה — בנושא זה בלבד", ex: "(same)", pol: "positive", short: DISPLAY.explain, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "readyForProgressPreviewHe", conflict: "phase7_restraint_cap_advance", notes: "" });
add({ category: "strength_detection", state: "strength_not_stable_enough", file: P2, cond: "fragile_success_block_advance OR stable_mastery_guard_advance", in: "good acc but hint/unclearTrend/insufficientEvidence", out: "step→maintain", tpl: "חוזקה שעדיין לא מספיק יציבה להתקדמות — נשארים בביסוס", ex: "ההצלחה עדיין לא תמיד נשמרת לבד — לא מתקדמים...", pol: "neutral", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "fragile_success", conflict: "advance_level + high acc", notes: "Critical parent message" });

// ─── 21. Display/truncation layer rows ──────────────────────────────────────
add({ category: "display_layer", state: "insights_max_4", file: ENG, cond: "buildParentInsightsFromTopicEngineHe.slice(0,4)", in: "insights array", out: "parentFacing.insights", tpl: "(max 4 lines)", ex: "(4 lines max in header)", pol: "neutral", short: DISPLAY.insights, pdfShort: DISPLAY.yes, detailed: DISPLAY.hidden, hidden: "additional topics not in header", spec: "specific", dup: "topic table rows", conflict: "overview previews show more subjects", notes: "" });
add({ category: "display_layer", state: "explain_no_truncate_140", file: "components/parent-report-topic-explain-row.jsx", cond: "ParentReportTopicExplainBlock renders full sections post-fix", in: "buildTopicDiagnosticExplainSectionsHe", out: "UI 5 lines", tpl: "(full identified/data/pattern/meaning/action)", ex: "(full text visible)", pol: "neutral", short: DISPLAY.topicTable, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, hidden: "OLD: truncate 140 removed for central explain", spec: "specific", dup: "insights line may duplicate", conflict: "", notes: "" });
add({ category: "display_layer", state: "trend_truncate_100", file: UI, cond: "trendCompactLineHe → truncateHe(..., 100)", in: "trend.summaryHe", out: "compact trend line", tpl: "(truncated at 100 chars)", ex: "מה קורה עם הדיוק: בשיפור; העצמאות...", pol: "neutral", short: DISPLAY.topicTable, pdfShort: DISPLAY.yes, detailed: DISPLAY.partial, hidden: "truncated mid-sentence possible", spec: "specific", dup: "why trend sentences full", conflict: "", notes: "" });
add({ category: "display_layer", state: "shortContractTop_hides_mainFocus", file: "pages/learning/parent-report.js", cond: "shortContractTop && mainFocusAreaLineHe hidden", in: "UI contract flag", out: "overview visibility", tpl: "(mainFocus hidden in short contract)", ex: "(line not rendered)", pol: "neutral", short: DISPLAY.hidden, pdfShort: DISPLAY.hidden, detailed: DISPLAY.yes, spec: "specific", dup: "", conflict: "PDF parity goal — should match", notes: "Verify PDF uses same authority" });
add({ category: "display_layer", state: "patternDiagnostics_block", file: "pages/learning/parent-report.js", cond: "patternDiagnostics section when not suppressed", in: "report.patternDiagnostics", out: "pattern section UI", tpl: "(legacy pattern cards)", ex: "(varies)", pol: "neutral", short: DISPLAY.pattern, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, hidden: "suppressed when shouldSuppressClientPatternDiagnostics", spec: "specific", dup: "explain pattern section", conflict: "duplicate pattern wording", notes: "" });
add({ category: "display_layer", state: "detailed_report_full", file: "pages/learning/parent-report-detailed.js", cond: "detailed page renders diagnosticOverviewHe + topic rows", in: "full client report", out: "detailed UI/PDF", tpl: "(all fields)", ex: "(full report)", pol: "neutral", short: DISPLAY.no, detailed: DISPLAY.yes, pdfDetailed: DISPLAY.yes, spec: "specific", dup: "short screen fields", conflict: "truncation differences", notes: "" });

// ─── 22. buildWhy branches not yet rowed ────────────────────────────────────
add({ category: "why_recommendation", state: "knowledge_gap_why", file: P2, cond: "buildWhy behaviorType===knowledge_gap", in: "acc,q,wr,pattern,dependency", out: "whyThisRecommendationHe", tpl: "הנתונים מראים קושי בחלקים בסיסיים... + pattern/foundation honesty", ex: "הנתונים מראים קושי בחלקים בסיסיים של הנושא (דיוק 38%, 136 שאלות, 62% טעויות).", pol: "negative", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "explain meaning", conflict: "likely_local_issue dependency", notes: "" });
add({ category: "why_recommendation", state: "undetermined_why", file: P2, cond: "behaviorType undetermined|insufficient_evidence", in: "q", out: "whyThisRecommendationHe", tpl: "עדיין אין מספיק נתונים כדי לזהות דפוס ברור...", ex: "עדיין אין מספיק נתונים כדי לזהות דפוס ברור בנושא הזה (יש 4 שאלות בלבד).", pol: "neutral", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "no_pattern_honest", conflict: "", notes: "" });
add({ category: "why_recommendation", state: "default_behavior_why", file: P2, cond: "else branch", in: "behaviorType label", out: "whyThisRecommendationHe", tpl: "הדפוס הנראה בביצוע: {diagnosticTypeLabelHe}", ex: "הדפוס הנראה בביצוע: לחץ מהירות (דיוק 64% מתוך 18 שאלות).", pol: "negative", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "behavior profile label", conflict: "", notes: "" });
add({ category: "why_recommendation", state: "legacy_rule_mention", file: P2, cond: "legacyRuleId truthy", in: "legacyRuleId", out: "why append", tpl: "נשמרו גם שיקולי זהירות.", ex: "נשמרו גם שיקולי זהירות.", pol: "neutral", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "phase2 blocker", conflict: "", notes: "" });

// ─── 23. Learning stage labels (Phase 9) ────────────────────────────────────
const stages = [
  ["early_acquisition", "עדיין לומד ומתנסה — הנושא חדש יחסית", "neutral"],
  ["partial_stabilization", "מתחיל להתייצב, עדיין לא במלואו", "neutral"],
  ["stable_control", "פתרון טוב שנשמר לאורך זמן", "positive"],
  ["fragile_retention", "החומר נשמר בקושי", "negative"],
  ["regression_signal", "נראית ירידה לאחרונה — שווה לשים לב", "negative"],
  ["transfer_emerging", "מתחילה התאמה גם מחוץ לתרגול המדויק", "positive"],
  ["insufficient_longitudinal_evidence", "עדיין חסר מידע לאורך זמן", "neutral"],
];
for (const [id, label, pol] of stages) {
  add({
    category: "learning_stage",
    state: id,
    file: UI,
    cond: `LEARNING_STAGE_LABEL_HE.${id}`,
    in: "buildLearningMemoryPhase9 learningStage",
    out: "learningStageLabelHe, memoryNarrativeHe",
    tpl: label,
    ex: `לאורך זמן: ${label}.`,
    pol,
    short: DISPLAY.no,
    detailed: DISPLAY.partial,
    hidden: "learningMemoryLineHe truncate 150",
    spec: "specific",
    dup: "stable_mastery behavior",
    conflict: "regression vs stable_control",
    notes: "",
  });
}

// ─── 24. V2 tier / language layer ───────────────────────────────────────────
const V2C = "utils/parent-report-language/short-report-v2-copy.js";
add({ category: "v2_tier_label", state: "tierStableStrengthHe", file: V2C, cond: "positiveAuthorityLevel excellent/very_good/good OR maintain action", in: "diagnosticEngineV2 unit canonicalState", out: "diagnostic card tierHe / detailed summaryHe", tpl: "חוזק יציב", ex: "בנושא חיבור: חוזק יציב", pol: "positive", short: DISPLAY.partial, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "stable_mastery_why", conflict: "tierWeakness same topic", notes: "Badge without q/acc unless caller adds" });
add({ category: "v2_tier_label", state: "tierWeaknessRecurringHe", file: V2C, cond: "weakness unit && wrongCountForRules>=5", in: "unit.recurrence.wrongCountForRules", out: "diagnostic card tierHe", tpl: "קושי שחוזר על עצמו", ex: "בנושא חיבור: קושי שחוזר על עצמו", pol: "negative", short: DISPLAY.partial, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "recurring_mistakes_subject", conflict: "no_recurrence gate", notes: "Needs wrong count evidence" });
add({ category: "v2_tier_label", state: "tierWeaknessSupportHe", file: V2C, cond: "weakness unit && wrongCount<5", in: "V2 weakness unit", out: "diagnostic card tierHe", tpl: "חיזוק עדין", ex: "בנושא קריאה: חיזוק עדין", pol: "negative", short: DISPLAY.partial, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "remediate_same_level", conflict: "", notes: "" });
add({ category: "v2_tier_label", state: "v2ShortOverviewCannotConcludeHe", file: V2C, cond: "unitRequiresShortThinOverviewHedge(unit)", in: "thin V2 unit evidence", out: "appended to mainFocusAreaLineHe", tpl: "(hedge phrase from v2ShortOverviewCannotConcludeHe)", ex: "— עדיין מוקדם לסכם בוודאות לפי כמות התרגול", pol: "neutral", short: DISPLAY.overview, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "generic", dup: "preliminary_signal", conflict: "mainFocusAreaLineHe assertive", notes: "" });
add({ category: "v2_tier_label", state: "v2SubjectDiagnosticRestraintHe", file: V2C, cond: "subject-level restraint copy", in: "diagnostic restraint", out: "subject diagnostic snippet", tpl: "עדיין מוקדם לקבוע כיוון ברור על כל הנושאים...", ex: "(same)", pol: "neutral", short: DISPLAY.partial, detailed: DISPLAY.yes, spec: "generic", dup: "phase7_soft_copy_tentative", conflict: "", notes: "" });

// ─── 25. whatCouldChangeThisHe ──────────────────────────────────────────────
add({ category: "topic_meta_copy", state: "whatCouldChangeThisHe", file: P2, cond: "buildWhatCouldChangeThisHe always after why", in: "q, behaviorType", out: "topicEngineRowSignals.whatCouldChangeThisHe", tpl: "לאסוף יותר מ {max(q,12)} שאלות... עוד פרטים על טעויות... כיוון דיוק ברור...", ex: "לאסוף יותר מ 24 שאלות בתקופה שנבחרה, עוד פרטים על טעויות...", pol: "neutral", short: DISPLAY.no, detailed: DISPLAY.yes, pdfDetailed: DISPLAY.yes, hidden: "often collapsed in short UI", spec: "specific", dup: "insufficient_evidence narrative", conflict: "", notes: "" });

// ─── 26. Hint dependence metric ─────────────────────────────────────────────
add({ category: "behavior_metric", state: "hint_dependence", file: BEH, cond: "hintRate>=0.42 && hintKnown>=3 → instruction_friction; risk flag hintDependenceRisk", in: "mistake events hintUsed", out: "behavior scores + riskFlags.hintDependenceRisk", tpl: "הילד עדיין נעזר ברמזים / שיעור רמזים {pct}%", ex: "נקודות לתשומת לב: הילד עדיין נעזר ברמזים.", pol: "negative", short: DISPLAY.why, pdfShort: DISPLAY.yes, detailed: DISPLAY.yes, spec: "specific", dup: "instruction_friction", conflict: "advance_level blocked", notes: "User-requested explicit mapping" });
add({ category: "behavior_metric", state: "speed_pressure_metric", file: BEH, cond: "modeKey speed OR medWrongMs<2200", in: "responseMsWrong, modeKey", out: "diagnosticType speed_pressure", tpl: "לחץ מהירות", ex: "הדפוס הנראה בביצוע: לחץ מהירות", pol: "negative", short: DISPLAY.explain, detailed: DISPLAY.yes, spec: "specific", dup: "speed_only_block_drop", conflict: "", notes: "" });
add({ category: "behavior_metric", state: "careless_execution_metric", file: RC, cond: "rootCause careless_execution", in: "acc 68-92, wr band", out: "rootCauseLabelHe", tpl: "טעויות מיהרות למרות שהחומר מוכר", ex: "(same)", pol: "negative", short: DISPLAY.explain, detailed: DISPLAY.yes, spec: "specific", dup: "careless_pattern", conflict: "stable_mastery", notes: "" });

// ─── 27. Detailed report only ───────────────────────────────────────────────
const DET = "utils/detailed-parent-report.js";
add({ category: "detailed_report", state: "detailed_summary_strength", file: DET, cond: "strongPosD && leadPosD → tierStableStrengthHe in summaryHe", in: "rankedPositiveD[0]", out: "subject section summaryHe", tpl: "בנושא {name}: חוזק יציב", ex: "בנושא משולשים: חוזק יציב", pol: "positive", short: DISPLAY.no, detailed: DISPLAY.yes, pdfDetailed: DISPLAY.yes, spec: "specific", dup: "strongestAreaLineHe", conflict: "weak topic same subject in short", notes: "" });
add({ category: "detailed_report", state: "detailed_trend_summaryHe", file: DET, cond: "alignSubjectTrendCopyWithRowTrend: trend.summaryHe", in: "row.trend.summaryHe", out: "detailed subject trend block", tpl: "(engine trend summaryHe sanitized)", ex: "(row trend text)", pol: "neutral", short: DISPLAY.no, detailed: DISPLAY.yes, hidden: "may differ from trendCompactLineHe truncate", spec: "specific", dup: "trendCompactLineHe", conflict: "", notes: "" });

// ─── 28. Subject table row fields ───────────────────────────────────────────
const topicFields = [
  ["topic_row_accuracy", "row.accuracy displayed", "{acc}%", "neutral"],
  ["topic_row_questions", "row.questions", "{q} שאלות", "neutral"],
  ["topic_row_recommended_step", "recommendedStepLabelHe", "step label badge", "neutral"],
  ["topic_row_diagnostic_type", "diagnosticTypeLabelHe", "behavior badge", "neutral"],
  ["topic_row_confidence_badge", "confidenceBadgeLabelHe", "יש מספיק שאלות / מוקדם...", "neutral"],
  ["topic_row_sufficiency_badge", "sufficiencyBadgeLabelHe", "כמות התרגול: טובה/בינונית/נמוכה", "neutral"],
];
for (const [id, cond, tpl, pol] of topicFields) {
  add({
    category: "topic_table_cell",
    state: id,
    file: "pages/learning/parent-report.js",
    cond,
    in: "topicEngineRowSignals + row metrics",
    out: "subject topic table column",
    tpl,
    ex: tpl.replace("{acc}", "72").replace("{q}", "18"),
    pol,
    short: DISPLAY.topicTable,
    pdfShort: DISPLAY.yes,
    detailed: DISPLAY.yes,
    spec: "specific",
    dup: "explain data section",
    conflict: "",
    notes: "",
  });
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push(HEADERS.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\n");
}

function toMd(rows) {
  const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const head = `| ${HEADERS.join(" | ")} |`;
  const sep = `| ${HEADERS.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${HEADERS.map((h) => esc(r[h])).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
}

mkdirSync(OUT_DIR, { recursive: true });
const csv = toCsv(ROWS);
writeFileSync(OUT_CSV, `\ufeff${csv}`, "utf8");
writeFileSync(OUT_MD, `# Parent report engine → parent text — full map\n\nGenerated: ${new Date().toISOString()}\n\nTotal rows: ${ROWS.length}\n\n${toMd(ROWS)}`, "utf8");

console.log(`Wrote ${ROWS.length} rows`);
console.log(OUT_CSV);
console.log(OUT_MD);
