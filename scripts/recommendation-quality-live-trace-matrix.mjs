#!/usr/bin/env node
/**
 * Live Recommendation Quality trace matrix — NO product fixes, diagnostic only.
 * Run: node scripts/recommendation-quality-live-trace-matrix.mjs
 * Env: .env.local (Supabase service role). Optional: TRACE_STUDENT_USERNAME=AAA7, TRACE_FROM, TRACE_TO
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase, defaultReportRange } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "docs", "audits");
const OUT_JSON = join(OUT_DIR, "recommendation-quality-live-trace-matrix.json");
const OUT_MD = join(OUT_DIR, "recommendation-quality-live-trace-matrix.md");

loadEnvFiles();

async function load(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { aggregateParentReportPayload } = await load("lib/parent-server/report-data-aggregate.server.js");
const { buildDetailedPayloadFromAggregatedReportBody, runWithParentReportRebuildLock } = await load(
  "lib/parent-server/db-input-to-detailed-report.server.js",
);
const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { seedLocalStorageFromDbReportInput } = await load("lib/learning-supabase/seed-db-report-local-storage.js");
const { applyParentReportGamificationOverlay } = await load("lib/learning-shared/student-account-state-view.js");
const { applyServerParentFacingAuthorityToClientReport } = await load("lib/parent-server/parent-facing-report-authority.js");
const { applyTopicEngineParentFacingInsights, collectTopicEngineRowsFromReport, buildTopicEngineInsightLineHe } =
  await load("utils/parent-report-engine-insights-he.js");
const { applyBridgeProvenanceToGeneratedReport } = await load("lib/learning-supabase/bridge-report-provenance.js");
const { syncReportVisiblePracticeFromServer } = await load("lib/learning/report-visible-practice-sync.js");
const { generateParentReportV2 } = await load("utils/parent-report-v2.js");
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { normalizeParentVisibleMetrics } = await load("utils/learning-pattern-decision/normalize-parent-practice-metrics.js");
const {
  resolveParentExplainRowCopy,
  buildLpdSafeTopicExplainSectionsHe,
  getLpdFromRow,
} = await load("utils/learning-pattern-decision/index.js");
const { buildSubjectParentLetter } = await load("utils/detailed-report-parent-letter-he.js");
const { traceRowThroughPipeline } = await load("utils/parent-report-output-integrity/trace-row-pipeline.js");
const { isParentReportPracticeAnswer } = await load("lib/learning/parent-report-evidence-gate.js");
const { classifyActivityEvidence, EVIDENCE_CATEGORIES } = await load("lib/learning/activity-classification.js");

/** @type {{ labelHe: string, bucketKeys: string[], expected: { q: number, c: number, w: number, acc: number } }[]} */
const TARGETS = [
  { labelHe: "חיבור", bucketKeys: ["addition"], expected: { q: 10, c: 2, w: 8, acc: 20 } },
  { labelHe: "שברים", bucketKeys: ["fractions", "fraction"], expected: { q: 206, c: 107, w: 99, acc: 52 } },
  { labelHe: "כפל", bucketKeys: ["multiplication", "multiply"], expected: { q: 32, c: 22, w: 10, acc: 69 } },
];

function normalizeMode(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  const cm = p.clientMeta && typeof p.clientMeta === "object" ? p.clientMeta : {};
  const raw = String(p.gameMode || p.mode || cm.gameMode || cm.mode || "unknown").trim().toLowerCase();
  return raw || "unknown";
}

function classifyRowForTrace(payload, sessionMode) {
  const ctx = payload?.contextFlags && typeof payload.contextFlags === "object" ? payload.contextFlags : {};
  const mode = normalizeMode(payload) !== "unknown" ? normalizeMode(payload) : String(sessionMode || "unknown").toLowerCase();
  const derived = classifyActivityEvidence(mode, "free_practice", {
    afterStepByStep: ctx.afterStepByStep === true,
    contextAfterBookReading: ctx.contextAfterBookReading === true,
    hintsUsed: Number(payload?.hintsUsed) || 0,
  });
  const cat = String(payload?.evidenceCategory || derived.evidenceCategory || "").trim();
  const gateInput = {
    evidenceCategory: cat || derived.evidenceCategory,
    isDiagnosticEligible: payload?.isDiagnosticEligible ?? derived.isDiagnosticEligible,
    contextFlags: ctx,
    resolvedMode: mode,
  };
  const parentVisible = isParentReportPracticeAnswer(gateInput);
  let excludeReason = null;
  if (!parentVisible) {
    if (ctx.contextAfterBookReading) excludeReason = "contextAfterBookReading";
    else if (cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) excludeReason = "competitive_mode";
    else if (cat === EVIDENCE_CATEGORIES.LEARNING_BOOK) excludeReason = "learning_book";
    else if (cat === EVIDENCE_CATEGORIES.LEARNING_CONTEXT) excludeReason = "learning_context";
    else if (!cat || cat === EVIDENCE_CATEGORIES.UNCLASSIFIED) excludeReason = "unclassified";
    else if (mode === "learning" || mode === "mistakes") excludeReason = `mode:${mode}`;
    else if (["challenge", "speed", "marathon", "learning_book"].includes(mode)) excludeReason = `mode:${mode}`;
    else excludeReason = `gate_reject:${cat || mode}`;
  }
  return { mode, evidenceCategory: cat || derived.evidenceCategory, parentVisible, excludeReason, gateInput };
}

function findTopicRowKey(mathMap, bucketKeys) {
  if (!mathMap || typeof mathMap !== "object") return null;
  for (const key of Object.keys(mathMap)) {
    const base = key.split("::grade:")[0].split("::")[0].toLowerCase();
    if (bucketKeys.some((b) => base === b || base.includes(b))) return key;
  }
  return null;
}

function matchTopicFilter(topic, bucketKeys) {
  const t = String(topic || "").toLowerCase();
  return bucketKeys.some((b) => t === b || t.startsWith(`${b}_`) || t.includes(b));
}

async function buildReportsFromApiBody(reportApiBody, periodLabel = "custom") {
  return runWithParentReportRebuildLock(async () => {
    const dbInput = buildReportInputFromDbData(reportApiBody, { period: periodLabel, timezone: "UTC" });
    const playerName = String(dbInput.student?.name || "").trim() || "Student";
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.window = globalThis;
    store.set("mleo_player_name", playerName);
    seedLocalStorageFromDbReportInput(store, dbInput);
    const from = String(dbInput.range?.from || "").slice(0, 10);
    const to = String(dbInput.range?.to || "").slice(0, 10);
    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base) return null;
    applyParentReportGamificationOverlay(base, reportApiBody);
    applyServerParentFacingAuthorityToClientReport(base, reportApiBody);
    applyTopicEngineParentFacingInsights(base, reportApiBody);
    base._reportApiPayload = reportApiBody;
    applyBridgeProvenanceToGeneratedReport(base, dbInput, reportApiBody);
    syncReportVisiblePracticeFromServer(base, { apiPayload: reportApiBody, dbInput });
    const detailed = buildDetailedParentReportFromBaseReport(base, { playerName, period: periodLabel });
    return { base, detailed, dbInput };
  });
}

async function traceAnswersForTopic(supabase, studentId, fromIso, toIso, bucketKeys) {
  const { data: answers, error } = await supabase
    .from("answers")
    .select("id,is_correct,answered_at,answer_payload,learning_session_id")
    .eq("student_id", studentId)
    .gte("answered_at", fromIso)
    .lte("answered_at", toIso);
  if (error) throw new Error(`answers query: ${error.message}`);

  const sessionIds = [...new Set((answers || []).map((a) => a.learning_session_id).filter(Boolean))];
  /** @type {Record<string, { subject?: string, topic?: string, metadata?: object }>} */
  const sessionById = {};
  if (sessionIds.length) {
    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("id,subject,topic,metadata,started_at")
      .in("id", sessionIds.slice(0, 500));
    for (const s of sessions || []) sessionById[s.id] = s;
  }

  /** @type {Record<string, number>} */
  const excludedByReason = {};
  let rawCount = 0;
  let included = 0;
  let includedCorrect = 0;

  for (const answer of answers || []) {
    const payload = answer.answer_payload && typeof answer.answer_payload === "object" ? answer.answer_payload : {};
    const sess = sessionById[answer.learning_session_id];
    const topic = String(payload.topic || sess?.topic || "");
    if (!matchTopicFilter(topic, bucketKeys)) continue;
    rawCount += 1;
    const { parentVisible, excludeReason } = classifyRowForTrace(payload, sess?.metadata?.mode);
    if (parentVisible) {
      included += 1;
      if (answer.is_correct) includedCorrect += 1;
    } else {
      const r = excludeReason || "unknown";
      excludedByReason[r] = (excludedByReason[r] || 0) + 1;
    }
  }

  return {
    rawAnswerRows: rawCount,
    includedParentVisible: included,
    includedCorrect,
    includedWrong: included - includedCorrect,
    excludedByReason,
    excludedTotal: rawCount - included,
  };
}

function diagnoseFailure(row) {
  const issues = [];
  const exp = row.expected;
  const m = row.normalizeParentVisibleMetrics;
  if (!m) issues.push("metrics:missing");
  else if (m.questions !== exp.q || Math.abs(m.accuracy - exp.acc) > 2) issues.push("metrics:drift_from_expected");
  if (row.lpdOutput?.topicStatus === "initial_data" && exp.q >= 5) issues.push("lpd:initial_data_at_high_q");
  if (row.lpdOutput?.topicStatus === "no_clear_pattern" && exp.q >= 5 && exp.acc < 70) issues.push("lpd:no_clear_pattern_despite_volume");
  const finding = String(row.lpdOutput?.parentVisibleFinding || "");
  if (/unknown/i.test(finding)) issues.push("lpd:unknown_in_finding");
  if (/מעט נתונים|אין תמונה|עדיין מוקדם/u.test(row.renderedTextCombined || "")) {
    if (exp.q >= 20) issues.push("copy:thin_data_wording_at_high_q");
    if (exp.q >= 50) issues.push("copy:thin_data_wording_at_very_high_q");
  }
  if (row.recommendation?.thinEvidenceDowngraded && exp.q >= 20) issues.push("rec:thin_evidence_downgraded");
  if (row.metricsVsLpdMismatch) issues.push("lpd:practicedQuestions_mismatch");
  if (row.headerDetailContradiction) issues.push("ui:header_detail_contradiction");
  return issues;
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase env (NEXT_PUBLIC_LEARNING_SUPABASE_URL + LEARNING_SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  const username = String(process.env.TRACE_STUDENT_USERNAME || "aaa7").trim().toLowerCase();
  const range =
    process.env.TRACE_FROM && process.env.TRACE_TO
      ? { from: process.env.TRACE_FROM, to: process.env.TRACE_TO }
      : defaultReportRange(365);

  const { data: codes, error: codeErr } = await supabase
    .from("student_access_codes")
    .select("student_id,login_username,is_active")
    .eq("login_username", username)
    .eq("is_active", true)
    .limit(1);
  if (codeErr) throw codeErr;

  let student = null;
  if (codes?.[0]?.student_id) {
    const { data: row } = await supabase
      .from("students")
      .select("id,full_name,grade_level,is_active,leo_number")
      .eq("id", codes[0].student_id)
      .maybeSingle();
    if (row?.id) student = { ...row, login_username: username };
  }

  if (!student?.id && process.env.TRACE_STUDENT_ID) {
    const { data: row } = await supabase
      .from("students")
      .select("id,full_name,grade_level,is_active,leo_number")
      .eq("id", process.env.TRACE_STUDENT_ID)
      .maybeSingle();
    if (row?.id) student = { ...row, login_username: username || "env" };
  }
  if (!student?.id) {
    console.error(`Student not found for username ${username}`);
    process.exit(1);
  }

  const fromIso = `${range.from}T00:00:00.000Z`;
  const toIso = `${range.to}T23:59:59.999Z`;
  const fromDate = new Date(`${range.from}T00:00:00.000Z`);
  const toDate = new Date(`${range.to}T00:00:00.000Z`);

  const reportApiBody = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });

  const reports = await buildReportsFromApiBody(reportApiBody, "custom");
  if (!reports?.base || !reports?.detailed) {
    console.error("Failed to build reports from live aggregate");
    process.exit(1);
  }

  const { base, detailed } = reports;
  const mathSp = (detailed.subjectProfiles || []).find((s) => String(s?.subject) === "math") || null;
  const engineRows = collectTopicEngineRowsFromReport(base);

  /** @type {object[]} */
  const matrix = [];

  for (const target of TARGETS) {
    const topicRowKey = findTopicRowKey(base.mathOperations, target.bucketKeys);
    const mapRow = topicRowKey ? base.mathOperations?.[topicRowKey] : null;
    const answerTrace = await traceAnswersForTopic(supabase, student.id, fromIso, toIso, target.bucketKeys);

    const rawForNormalize = {
      questions: mapRow?.questions,
      correct: mapRow?.correct,
      wrong: mapRow?.wrong,
      accuracy: mapRow?.accuracy,
      parentVisibleMetrics: mapRow?.parentVisibleMetrics,
    };
    const metrics = normalizeParentVisibleMetrics(rawForNormalize, mapRow);

    const lpd = getLpdFromRow(mapRow || {}) || mapRow?.learningPatternDecision || null;
    const lpdInput = {
      questions: metrics.questions,
      correct: metrics.correct,
      wrong: metrics.wrong,
      accuracy: metrics.accuracy,
      rawMistakesCount: mapRow?.rawMistakes?.length ?? null,
    };

    const pipeline = topicRowKey
      ? traceRowThroughPipeline({
          baseReport: base,
          detailedReport: detailed,
          subjectId: "math",
          topicRowKey,
        })
      : null;

    const tr =
      mathSp?.topicRecommendations?.find((t) => String(t?.topicRowKey || t?.topicKey) === topicRowKey) || null;

    const engineRow = engineRows.find((r) => String(r.topicKey || "").includes(target.bucketKeys[0])) || null;

    const explainCopy = mapRow
      ? resolveParentExplainRowCopy({ ...mapRow, label: target.labelHe, displayName: mapRow.displayName || target.labelHe, mapRow })
      : null;
    const explainSections = mapRow
      ? buildLpdSafeTopicExplainSectionsHe({ ...mapRow, label: target.labelHe, displayName: mapRow.displayName || target.labelHe, mapRow })
      : null;

    const shortInsight = engineRow ? buildTopicEngineInsightLineHe(engineRow) : "";
    const subjectLetter = mathSp ? buildSubjectParentLetter(mathSp) : null;

    const renderedShort = [
      shortInsight,
      explainCopy?.primaryFinding,
      explainSections?.identified,
      explainSections?.data,
      explainSections?.meaning,
      explainSections?.action,
    ]
      .filter(Boolean)
      .join(" | ");

    const renderedDetailed = [
      tr?.recommendedStepLabelHe,
      tr?.interventionPlanHe,
      tr?.doNowHe,
      tr?.parentVisibleFinding,
      explainSections?.identified,
      explainSections?.data,
      explainSections?.meaning,
      explainSections?.action,
    ]
      .filter(Boolean)
      .join(" | ");

    const subjectSummary = subjectLetter
      ? [
          subjectLetter.opening || subjectLetter.openingHe,
          subjectLetter.diagnosisHe || subjectLetter.focusHe,
          subjectLetter.homeAction || subjectLetter.actionHe,
        ]
          .filter(Boolean)
          .join(" | ")
      : "";

    const subjectEngineDecisionContract = mathSp?.subjectEngineDecisionContract || null;
    const topicEngineContracts = (mathSp?.topicRecommendations || [])
      .map((t) => ({
        topicKey: t?.topicRowKey || t?.topicKey,
        engineDecision: t?.engineDecisionContract?.engineDecision,
        detectedPattern: t?.engineDecisionContract?.detectedPattern,
        recommendedAction: t?.engineDecisionContract?.recommendedAction,
        parentSafeFinding: t?.engineDecisionContract?.parentSafeFinding,
      }))
      .filter((t) => t.topicKey);

    const subjectContractTrace = subjectEngineDecisionContract
      ? {
          subjectDecision: subjectEngineDecisionContract.subjectDecision,
          recommendedSubjectAction: subjectEngineDecisionContract.recommendedSubjectAction,
          blockedLegacySummary: subjectEngineDecisionContract.blockedLegacySummary,
          priorityTopicKeys: subjectEngineDecisionContract.priorityTopics?.map((t) => t.topicKey),
          strongestDetectedPatterns: subjectEngineDecisionContract.strongestDetectedPatterns,
          traceReason: subjectEngineDecisionContract.traceReason,
          summarySlots: subjectEngineDecisionContract.summarySlots,
          renderSource: subjectLetter?.renderSource || null,
        }
      : null;

    const metricsVsLpdMismatch =
      lpd &&
      (Number(lpd.practicedQuestions) !== metrics.questions ||
        Number(lpd.correctCount) !== metrics.correct ||
        Number(lpd.wrongCount) !== metrics.wrong);

    const headerAcc = Math.round(Number(mapRow?.accuracy ?? metrics.accuracy));
    const detailData = explainSections?.data || "";
    const headerDetailContradiction =
      metrics.accuracy > 0 &&
      detailData.includes("0 נכונות") &&
      detailData.includes(`${metrics.questions} שגויות`);

    const row = {
      topic: target.labelHe,
      topicRowKey,
      expected: target.expected,
      student: { id: student.id, username: student.login_username, grade: student.grade_level },
      range,
      answerTrace,
      normalizeParentVisibleMetrics: metrics,
      lpdInput,
      lpdOutput: lpd
        ? {
            topicStatus: lpd.topicStatus,
            findingType: lpd.findingType,
            evidenceStrength: lpd.evidenceStrength,
            parentWordingLevel: lpd.parentWordingLevel,
            parentVisibleFinding: lpd.parentVisibleFinding,
            practicedQuestions: lpd.practicedQuestions,
            correctCount: lpd.correctCount,
            wrongCount: lpd.wrongCount,
            blockedClaims: lpd.blockedClaims,
            repeatedMistakePatterns: lpd.repeatedMistakePatterns,
            recommendedFocus: lpd.recommendedFocus,
          }
        : null,
      recommendation: tr
        ? {
            questions: tr.questions,
            correct: tr.correct,
            wrong: tr.wrong,
            accuracy: tr.accuracy,
            parentVisibleMetrics: tr.parentVisibleMetrics,
            recommendedStepLabelHe: tr.recommendedStepLabelHe,
            recommendedNextStep: tr.recommendedNextStep,
            thinEvidenceDowngraded: tr.thinEvidenceDowngraded,
            dataSufficiencyLevel: tr.dataSufficiencyLevel,
            evidenceStrength: tr.evidenceStrength,
            conclusionStrength: tr.conclusionStrength,
            gateReadiness: tr.gateReadiness,
          }
        : null,
      pipelineStages: pipeline?.stages || null,
      topicEngineContracts,
      subjectEngineDecisionContract: subjectContractTrace,
      renderedText: {
        shortReport: renderedShort,
        detailedReport: renderedDetailed,
        subjectSummary,
      },
      renderedTextCombined: `${renderedShort} ${renderedDetailed} ${subjectSummary}`,
      metricsVsLpdMismatch,
      headerDetailContradiction,
      diagnosis: [],
    };
    row.diagnosis = diagnoseFailure(row);
    matrix.push(row);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), matrix }, null, 2), "utf8");

  const mdLines = [
    "# Recommendation Quality — Live Trace Matrix",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Student: ${student.login_username} (${student.id})`,
    `Range: ${range.from} → ${range.to}`,
    "",
    "## Summary diagnosis",
    "",
  ];

  for (const row of matrix) {
    mdLines.push(`### ${row.topic} (${row.topicRowKey || "NOT FOUND"})`);
    mdLines.push("");
    mdLines.push(`**Expected:** ${row.expected.q} / ${row.expected.c} / ${row.expected.w} / ${row.expected.acc}%`);
    mdLines.push(`**Diagnosis flags:** ${row.diagnosis.length ? row.diagnosis.join(", ") : "none"}`);
    mdLines.push("");
    mdLines.push("| Layer | Value |");
    mdLines.push("| --- | --- |");
    mdLines.push(`| Raw answer rows (topic) | ${row.answerTrace.rawAnswerRows} |`);
    mdLines.push(`| Included parentVisible | ${row.answerTrace.includedParentVisible} (${row.answerTrace.includedCorrect}✓ / ${row.answerTrace.includedWrong}✗) |`);
    mdLines.push(`| Excluded total | ${row.answerTrace.excludedTotal} |`);
    mdLines.push(`| Excluded breakdown | ${mdEscape(JSON.stringify(row.answerTrace.excludedByReason))} |`);
    mdLines.push(`| normalizeParentVisibleMetrics | ${mdEscape(JSON.stringify(row.normalizeParentVisibleMetrics))} |`);
    mdLines.push(`| LPD input | ${mdEscape(JSON.stringify(row.lpdInput))} |`);
    mdLines.push(`| LPD output | ${mdEscape(JSON.stringify(row.lpdOutput))} |`);
    mdLines.push(`| Recommendation | ${mdEscape(JSON.stringify(row.recommendation))} |`);
    mdLines.push(`| Topic engine contracts | ${mdEscape(JSON.stringify(row.topicEngineContracts))} |`);
    mdLines.push(`| Subject engine contract | ${mdEscape(JSON.stringify(row.subjectEngineDecisionContract))} |`);
    mdLines.push(`| Short report text | ${mdEscape(row.renderedText.shortReport)} |`);
    mdLines.push(`| Detailed report text | ${mdEscape(row.renderedText.detailedReport)} |`);
    mdLines.push(`| Subject summary text | ${mdEscape(row.renderedText.subjectSummary)} |`);
    mdLines.push("");
  }

  mdLines.push("## Root-cause classification");
  mdLines.push("");
  mdLines.push("| Topic | Metrics | LPD weak | Rec weakened | UI/legacy override |");
  mdLines.push("| --- | --- | --- | --- | --- |");
  for (const row of matrix) {
    const d = row.diagnosis;
    mdLines.push(
      `| ${row.topic} | ${d.some((x) => x.startsWith("metrics:")) ? "YES" : "—"} | ${d.some((x) => x.startsWith("lpd:")) ? "YES" : "—"} | ${d.some((x) => x.startsWith("rec:")) ? "YES" : "—"} | ${d.some((x) => x.startsWith("copy:") || x.startsWith("ui:")) ? "YES" : "—"} |`,
    );
  }

  writeFileSync(OUT_MD, mdLines.join("\n"), "utf8");
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  for (const row of matrix) {
    console.log(`\n=== ${row.topic} ===`);
    console.log(JSON.stringify({ expected: row.expected, metrics: row.normalizeParentVisibleMetrics, diagnosis: row.diagnosis }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
