#!/usr/bin/env node
/**
 * Parent report copy template inventory — read-only audit, no copy changes.
 * Run: node scripts/parent-report-copy-template-inventory.mjs
 * Output: docs/audits/parent-report-copy-template-inventory.{json,md}
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-copy-template-inventory.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-copy-template-inventory.md");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

loadEnvFiles();

async function load(rel) {
  const m = await import(u(rel));
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { aggregateParentReportPayload } = await load("lib/parent-server/report-data-aggregate.server.js");
const { runWithParentReportRebuildLock } = await load("lib/parent-server/db-input-to-detailed-report.server.js");
const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { seedLocalStorageFromDbReportInput } = await load("lib/learning-supabase/seed-db-report-local-storage.js");
const { applyParentReportGamificationOverlay } = await load("lib/learning-shared/student-account-state-view.js");
const { applyServerParentFacingAuthorityToClientReport } = await load("lib/parent-server/parent-facing-report-authority.js");
const {
  applyTopicEngineParentFacingInsights,
  collectTopicEngineRowsFromReport,
  buildTopicEngineInsightLineHe,
} = await load("utils/parent-report-engine-insights-he.js");
const { applyBridgeProvenanceToGeneratedReport } = await load("lib/learning-supabase/bridge-report-provenance.js");
const { syncReportVisiblePracticeFromServer } = await load("lib/learning/report-visible-practice-sync.js");
const { generateParentReportV2, summarizeV2UnitsForSubjectForTests } = await load("utils/parent-report-v2.js");
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const {
  buildSubjectParentLetter,
  buildTopicRecommendationNarrative,
} = await load("utils/detailed-report-parent-letter-he.js");
const {
  resolveParentExplainRowCopy,
  buildLpdSafeTopicExplainSectionsHe,
  getLpdFromRow,
} = await load("utils/learning-pattern-decision/index.js");
const {
  EDC_CONTRACT_KEY,
  SP_SUBJECT_ENGINE_CONTRACT,
  readSubjectEngineContract,
} = await load("utils/learning-pattern-decision/engine-decision-codes.js");
const { normalizeParentVisibleMetrics } = await load(
  "utils/learning-pattern-decision/normalize-parent-practice-metrics.js",
);
const { filterCoreV2Units } = await load("utils/parent-report-core-grade-filter.js");

const LIVE_CASES = [
  { student: "omer", username: "omer", from: "2025-09-01", to: "2026-07-04", label: "OMER math" },
  { student: "aaa7", username: "aaa7", from: "2026-07-04", to: "2026-07-04", label: "Aaa7 math" },
];

const SLOT_KEYS = [
  "topicName",
  "subjectName",
  "questions",
  "correct",
  "wrong",
  "accuracy",
  "detectedPattern",
  "affectedSubskill",
  "misconceptionLabel",
  "recommendedAction",
  "priorityTopics",
  "evidenceStrength",
];

/** @param {object} reportApiBody */
async function buildReports(reportApiBody) {
  return runWithParentReportRebuildLock(async () => {
    const dbInput = buildReportInputFromDbData(reportApiBody, { period: "custom", timezone: "UTC" });
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
    const from = String(dbInput.range?.from || reportApiBody.fromDate || "").slice(0, 10);
    const to = String(dbInput.range?.to || reportApiBody.toDate || "").slice(0, 10);
    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base) return null;
    applyParentReportGamificationOverlay(base, reportApiBody);
    applyServerParentFacingAuthorityToClientReport(base, reportApiBody);
    applyTopicEngineParentFacingInsights(base, reportApiBody);
    base._reportApiPayload = reportApiBody;
    applyBridgeProvenanceToGeneratedReport(base, dbInput, reportApiBody);
    syncReportVisiblePracticeFromServer(base, { apiPayload: reportApiBody, dbInput });
    const detailed = buildDetailedParentReportFromBaseReport(base, { playerName, period: "custom" });
    return { base, detailed, dbInput };
  });
}

async function resolveStudent(supabase, username) {
  const un = String(username || "").trim().toLowerCase();
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id,login_username,is_active")
    .eq("login_username", un)
    .eq("is_active", true)
    .limit(1);
  if (!codes?.[0]?.student_id) return null;
  const { data: row } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active,leo_number")
    .eq("id", codes[0].student_id)
    .maybeSingle();
  return row?.id ? { ...row, login_username: un } : null;
}

function pickSlots(obj) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of SLOT_KEYS) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") out[k] = obj[k];
  }
  return out;
}

function buildSlotsFromTopic(edc, lpd, mapRow, subjectLabelHe) {
  const metrics = normalizeParentVisibleMetrics(mapRow || {}, mapRow);
  return pickSlots({
    topicName: mapRow?.displayName || edc?.topicName,
    subjectName: subjectLabelHe || "מתמטיקה",
    questions: edc?.questions ?? metrics.questions,
    correct: edc?.correct ?? metrics.correct,
    wrong: edc?.wrong ?? metrics.wrong,
    accuracy: edc?.accuracy ?? metrics.accuracy,
    detectedPattern: edc?.detectedPattern ?? null,
    affectedSubskill: edc?.affectedSubskill ?? null,
    misconceptionLabel: edc?.misconceptionLabel ?? null,
    recommendedAction: edc?.recommendedAction ?? lpd?.recommendedFocus ?? null,
    evidenceStrength: edc?.evidenceStrength ?? lpd?.evidenceStrength ?? null,
  });
}

function buildSlotsFromSubjectContract(subjectContract, subjectLabelHe) {
  const p0 = subjectContract?.priorityTopics?.[0];
  return pickSlots({
    subjectName: subjectLabelHe,
    questions: subjectContract?.totalQuestions,
    accuracy: subjectContract?.weightedAccuracy,
    recommendedAction: subjectContract?.recommendedSubjectAction,
    priorityTopics: (subjectContract?.priorityTopics || []).map((t) => t.topicKey),
    evidenceStrength: subjectContract?.evidenceStrength,
    detectedPattern: p0?.detectedPattern ?? null,
    topicName: p0?.topicLabelKey ?? null,
    affectedSubskill: p0?.affectedSubskill ?? null,
    misconceptionLabel: p0?.misconceptionLabel ?? null,
  });
}

/**
 * @param {object} p
 */
function makeEntry(p) {
  const text = String(p.currentRenderedText || "").trim();
  const templateId = p.templateId != null ? String(p.templateId) : null;
  const source = String(p.source || "unknown");
  const hasTemplateId = !!(templateId && templateId !== "null" && templateId !== "");
  const hasSource = source !== "unknown";
  const missingMetadata = [];
  if (!hasTemplateId) missingMetadata.push("missing_templateId");
  if (!hasSource || source === "unknown") missingMetadata.push("missing_source");
  if (!text) missingMetadata.push("empty_text");

  return {
    id: p.id,
    student: p.student,
    surface: p.surface,
    section: p.section,
    topicKey: p.topicKey || null,
    templateId: templateId || null,
    decisionCode: p.decisionCode != null ? String(p.decisionCode) : null,
    source,
    slotsAvailable: p.slotsAvailable || {},
    currentRenderedText: text || null,
    renderFunction: p.renderFunction,
    safeToReplaceWithOwnerCopy: p.safeToReplaceWithOwnerCopy ?? (hasTemplateId && hasSource && !!text),
    missingMetadata,
  };
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function topicKeysFromMap(mathMap) {
  if (!mathMap || typeof mathMap !== "object") return [];
  return Object.keys(mathMap).filter((k) => Number(mathMap[k]?.questions) > 0);
}

/**
 * @param {object} ctx
 */
function collectInventoryForStudent(ctx) {
  const { student, label, range, base, detailed } = ctx;
  /** @type {object[]} */
  const entries = [];
  const mathMap = base.mathOperations || {};
  const mathSp =
    (detailed.subjectProfiles || []).find((s) => String(s?.subject) === "math") || null;
  const subjectLabelHe = mathSp?.subjectLabelHe || "מתמטיקה";
  const subjectContract = readSubjectEngineContract(mathSp) || mathSp?.[SP_SUBJECT_ENGINE_CONTRACT] || null;

  // --- Short report: subject rollup ---
  const allUnits = Array.isArray(base?.diagnosticEngineV2?.units) ? base.diagnosticEngineV2.units : [];
  const mathUnits = filterCoreV2Units(
    allUnits.filter((u) => String(u?.subjectId) === "math"),
    mathMap,
    base?.registeredGradeKey,
  );
  const shortSubject =
    base.patternDiagnostics?.subjects?.math ||
    summarizeV2UnitsForSubjectForTests(mathUnits, {
      subjectId: "math",
      subjectReportQuestions: Number(base?.summary?.mathQuestions) || 0,
      subjectLabelHe,
      reportSubjectAccuracy:
        base?.summary?.mathAccuracy != null ? Math.round(Number(base.summary.mathAccuracy)) : null,
      reportTotalQuestions: Number(base?.summary?.totalQuestions) || 0,
      topicMap: mathMap,
      registeredGradeKey: base?.registeredGradeKey,
    });

  const shortSubjectContract =
    shortSubject?.[SP_SUBJECT_ENGINE_CONTRACT] ||
    readSubjectEngineContract(shortSubject) ||
    subjectContract;

  if (shortSubject?.summaryHe) {
    const usesSubjectContract =
      shortSubject.subjectSummaryRenderSource === "subjectEngineDecisionContract" ||
      shortSubjectContract?.blockedLegacySummary === true;
    entries.push(
      makeEntry({
        id: `${student}:shortReport:subjectSummary:math`,
        student,
        surface: "shortReport",
        section: "subjectSummary",
        topicKey: null,
        templateId: usesSubjectContract
          ? shortSubject.subjectSummaryTemplateId ||
            shortSubjectContract?.summarySlots?.openingTemplateId ||
            "SUBJECT_OPENING_PRIORITY_TOPIC_0"
          : "legacy_short_subject_summary",
        decisionCode:
          shortSubject.subjectSummaryDecisionCode || shortSubjectContract?.subjectDecision || null,
        source: usesSubjectContract ? "subjectEngineDecisionContract" : "legacy",
        slotsAvailable: buildSlotsFromSubjectContract(shortSubjectContract || subjectContract, subjectLabelHe),
        currentRenderedText: shortSubject.summaryHe,
        renderFunction:
          "utils/parent-report-v2.js → summarizeV2UnitsForSubject → resolveSubjectSummaryTextFromEngineContract",
        safeToReplaceWithOwnerCopy: usesSubjectContract,
      }),
    );
  }

  // --- Short report: per-topic insight lines ---
  const engineRows = collectTopicEngineRowsFromReport(base).filter(
    (r) => String(r.subjectId) === "math" && Number(r.questions) > 0,
  );
  for (const row of engineRows) {
    const line = buildTopicEngineInsightLineHe(row);
    if (!line) continue;
    const topicRowKey = String(row.topicKey || row.topicRowKey || row.rowKey || "").trim();
    const mapRow = (topicRowKey && mathMap[topicRowKey]) || null;
    const lpd =
      getLpdFromRow(mapRow || row) ||
      mapRow?.learningPatternDecision ||
      row?.learningPatternDecision ||
      null;
    const edc =
      mapRow?.[EDC_CONTRACT_KEY] ||
      lpd?.[EDC_CONTRACT_KEY] ||
      row?.[EDC_CONTRACT_KEY] ||
      null;
    entries.push(
      makeEntry({
        id: `${student}:shortReport:topicInsight:${topicRowKey || row.rowKey}`,
        student,
        surface: "shortReport",
        section: "topicInsightLine",
        topicKey: topicRowKey || null,
        templateId: lpd?.templateId || edc?.templateId || "lpd_parent_visible_finding",
        decisionCode: edc?.engineDecision || null,
        source: edc?.parentSafeFinding || lpd?.engineDecisionContract ? "engineDecisionContract" : "legacy",
        slotsAvailable: buildSlotsFromTopic(edc, lpd, mapRow || row, subjectLabelHe),
        currentRenderedText: line,
        renderFunction:
          "utils/parent-report-engine-insights-he.js → buildTopicEngineInsightLineHe → buildLpdSafeTopicInsightLineHe",
        safeToReplaceWithOwnerCopy: !!(lpd?.templateId || edc),
      }),
    );
  }

  // --- Per topic: explain + recommendation + detailed ---
  const topicKeys = [
    ...new Set([
      ...topicKeysFromMap(mathMap),
      ...(mathSp?.topicRecommendations || []).map((t) => t.topicRowKey || t.topicKey),
    ]),
  ].filter(Boolean);

  for (const topicRowKey of topicKeys) {
    const mapRow = mathMap[topicRowKey] || null;
    if (!mapRow || Number(mapRow.questions) <= 0) continue;
    const lpd = getLpdFromRow(mapRow) || mapRow.learningPatternDecision || null;
    const edc = mapRow[EDC_CONTRACT_KEY] || lpd?.[EDC_CONTRACT_KEY] || null;
    const tr = (mathSp?.topicRecommendations || []).find(
      (t) => String(t?.topicRowKey || t?.topicKey) === topicRowKey,
    );
    const explainCopy = resolveParentExplainRowCopy({
      ...mapRow,
      label: mapRow.displayName,
      displayName: mapRow.displayName,
      mapRow,
    });
    const explainSections = buildLpdSafeTopicExplainSectionsHe({
      ...mapRow,
      label: mapRow.displayName,
      displayName: mapRow.displayName,
      mapRow,
    });

    const explainSectionMap = {
      identified: "TOPIC_EXPLAIN_IDENTIFIED",
      data: "TOPIC_EXPLAIN_DATA",
      pattern: "TOPIC_EXPLAIN_PATTERN",
      meaning: "TOPIC_EXPLAIN_MEANING",
      action: "TOPIC_EXPLAIN_HOME_ACTION",
    };

    if (explainCopy?.primaryFinding) {
      entries.push(
        makeEntry({
          id: `${student}:topicExplain:primaryFinding:${topicRowKey}`,
          student,
          surface: "topicExplain",
          section: "primaryFinding",
          topicKey: topicRowKey,
          templateId: lpd?.templateId || "lpd_parent_visible_finding",
          decisionCode: edc?.engineDecision || null,
          source: edc?.parentSafeFinding ? "engineDecisionContract" : lpd ? "engineDecisionContract" : "fallback",
          slotsAvailable: buildSlotsFromTopic(edc, lpd, mapRow, subjectLabelHe),
          currentRenderedText: explainCopy.primaryFinding,
          renderFunction: "utils/learning-pattern-decision/lpd-parent-facing-copy.js → resolveParentExplainRowCopy",
          safeToReplaceWithOwnerCopy: !!lpd?.templateId,
        }),
      );
    }

    if (explainSections) {
      for (const [sec, templateSuffix] of Object.entries(explainSectionMap)) {
        const text = String(explainSections[sec] || "").trim();
        if (!text) continue;
        const contractDriven = !!(edc?.parentSafeFinding && sec === "identified");
        entries.push(
          makeEntry({
            id: `${student}:topicExplain:${sec}:${topicRowKey}`,
            student,
            surface: "topicExplain",
            section: sec,
            topicKey: topicRowKey,
            templateId: contractDriven
              ? `${lpd?.templateId || "engine_contract"}:${templateSuffix}`
              : `${lpd?.templateId || "lpd_fallback"}:${templateSuffix}`,
            decisionCode: edc?.engineDecision || null,
            source: contractDriven ? "engineDecisionContract" : edc ? "engineDecisionContract" : "legacy",
            slotsAvailable: buildSlotsFromTopic(edc, lpd, mapRow, subjectLabelHe),
            currentRenderedText: text,
            renderFunction: "utils/learning-pattern-decision/lpd-parent-facing-copy.js → buildLpdSafeTopicExplainSectionsHe",
            safeToReplaceWithOwnerCopy: contractDriven || !!lpd?.templateId,
          }),
        );
      }
    }

    if (tr) {
      const recFields = [
        ["recommendedStepLabelHe", "RECOMMENDATION_STEP_LABEL"],
        ["parentVisibleFinding", "RECOMMENDATION_FINDING"],
        ["interventionPlanHe", "RECOMMENDATION_INTERVENTION_PLAN"],
        ["doNowHe", "RECOMMENDATION_DO_NOW"],
        ["cautionLineHe", "RECOMMENDATION_CAUTION"],
      ];
      const trEdc = tr[EDC_CONTRACT_KEY] || tr?.learningPatternDecision?.[EDC_CONTRACT_KEY] || edc;
      for (const [field, suffix] of recFields) {
        const text = String(tr[field] || "").trim();
        if (!text) continue;
        entries.push(
          makeEntry({
            id: `${student}:recommendationCard:${field}:${topicRowKey}`,
            student,
            surface: "recommendationCard",
            section: field,
            topicKey: topicRowKey,
            templateId: `${lpd?.templateId || trEdc?.templateId || "topic_recommendation_v2"}:${suffix}`,
            decisionCode: trEdc?.engineDecision || null,
            source: trEdc ? "engineDecisionContract" : "legacy",
            slotsAvailable: buildSlotsFromTopic(trEdc, lpd, mapRow, subjectLabelHe),
            currentRenderedText: text,
            renderFunction: "utils/detailed-parent-report.js → recommendationFromV2Unit",
            safeToReplaceWithOwnerCopy: !!(trEdc || lpd?.templateId),
          }),
        );
      }

      const narrative = buildTopicRecommendationNarrative(tr);
      if (narrative && typeof narrative === "object") {
        for (const [sec, text] of Object.entries(narrative)) {
          const t = String(text || "").trim();
          if (!t || sec === "contractsV1") continue;
          entries.push(
            makeEntry({
              id: `${student}:detailedReport:topicNarrative:${sec}:${topicRowKey}`,
              student,
              surface: "detailedReport",
              section: `narrative_${sec}`,
              topicKey: topicRowKey,
              templateId: tr?.contractsV1?.narrative?.wordingEnvelope
                ? `NARRATIVE_${tr.contractsV1.narrative.wordingEnvelope}_${sec}`
                : `NARRATIVE_WE_UNKNOWN_${sec}`,
              decisionCode: trEdc?.engineDecision || null,
              source: tr?.contractsV1?.narrative ? "engineDecisionContract" : "legacy",
              slotsAvailable: buildSlotsFromTopic(trEdc, lpd, mapRow, subjectLabelHe),
              currentRenderedText: t,
              renderFunction: "utils/detailed-report-parent-letter-he.js → buildTopicRecommendationNarrative",
              safeToReplaceWithOwnerCopy: !!tr?.contractsV1?.narrative,
            }),
          );
        }
      }
    }
  }

  // --- Subject rollup (detailed) ---
  if (mathSp?.summaryHe) {
    entries.push(
      makeEntry({
        id: `${student}:subjectRollup:summaryHe:math`,
        student,
        surface: "subjectRollup",
        section: "summaryHe",
        topicKey: null,
        templateId: subjectContract?.summarySlots?.openingTemplateId || "SUBJECT_OPENING_PRIORITY_TOPIC_0",
        decisionCode: subjectContract?.subjectDecision || null,
        source: subjectContract?.blockedLegacySummary ? "subjectEngineDecisionContract" : "legacy",
        slotsAvailable: buildSlotsFromSubjectContract(subjectContract, subjectLabelHe),
        currentRenderedText: mathSp.summaryHe,
        renderFunction:
          "utils/detailed-parent-report.js → resolveSubjectSummaryTextFromEngineContract / buildSubjectProfilesFromV2",
        safeToReplaceWithOwnerCopy: !!subjectContract?.blockedLegacySummary,
      }),
    );
  }

  // --- Parent letter ---
  const letter = buildSubjectParentLetter(mathSp || { subject: "math", subjectLabelHe });
  const letterSections = [
    ["opening", subjectContract?.summarySlots?.openingTemplateId || "SUBJECT_OPENING_PRIORITY_TOPIC_0"],
    ["diagnosisHe", subjectContract?.summarySlots?.diagnosisTemplateId || "SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_1"],
    ["homeAction", subjectContract?.summarySlots?.homeActionTemplateId || "remediate_priority_topics_same_level"],
    ["closing", subjectContract?.summarySlots?.closingTemplateId || "SUBJECT_CLOSING_ENGINE_CONTRACT"],
  ];
  for (const [sec, slotTemplateId] of letterSections) {
    const text = String(letter[sec] || "").trim();
    if (!text) continue;
    const surface = sec === "homeAction" ? "homeAction" : "parentLetter";
    entries.push(
      makeEntry({
        id: `${student}:${surface}:${sec}:math`,
        student,
        surface,
        section: sec,
        topicKey: null,
        templateId: slotTemplateId,
        decisionCode: subjectContract?.subjectDecision || null,
        source:
          letter.renderSource === "subjectEngineDecisionContract" || subjectContract?.blockedLegacySummary
            ? "subjectEngineDecisionContract"
            : "legacy",
        slotsAvailable: buildSlotsFromSubjectContract(subjectContract, subjectLabelHe),
        currentRenderedText: text,
        renderFunction: "utils/detailed-report-parent-letter-he.js → buildSubjectParentLetter",
        safeToReplaceWithOwnerCopy: !!(subjectContract?.blockedLegacySummary && slotTemplateId),
      }),
    );
  }

  return {
    student,
    label,
    range,
    subjectEngineDecisionContract: subjectContract,
    entryCount: entries.length,
    entries,
    audit: {
      entriesWithoutTemplateId: entries.filter((e) => e.missingMetadata.includes("missing_templateId")).length,
      entriesWithoutSource: entries.filter((e) => e.missingMetadata.includes("missing_source")).length,
      entriesEmptyText: entries.filter((e) => e.missingMetadata.includes("empty_text")).length,
      legacySourceCount: entries.filter((e) => e.source === "legacy" || e.source === "fallback").length,
      contractSourceCount: entries.filter(
        (e) => e.source === "engineDecisionContract" || e.source === "subjectEngineDecisionContract",
      ).length,
    },
  };
}

function buildMarkdown(report) {
  const lines = [
    "# Parent Report — Copy Template Inventory",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "Read-only audit. No Hebrew copy was modified. Owner-authored templates can replace entries marked `safeToReplaceWithOwnerCopy: true`.",
    "",
    "## Global audit",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Students | ${report.students.length} |`,
    `| Total entries | ${report.totals.totalEntries} |`,
    `| Contract-driven source | ${report.totals.contractSourceCount} |`,
    `| Legacy/fallback source | ${report.totals.legacySourceCount} |`,
    `| Missing templateId | ${report.totals.entriesWithoutTemplateId} |`,
    `| Missing source | ${report.totals.entriesWithoutSource} |`,
    "",
    "## Known legacy gaps (not yet contract-wired)",
    "",
    "| Surface | Section | Reason |",
    "| --- | --- | --- |",
  ];
  for (const gap of report.knownLegacyGaps || []) {
    lines.push(`| ${gap.surface} | ${gap.section} | ${mdEscape(gap.reason)} |`);
  }
  lines.push("");

  for (const block of report.students) {
    lines.push(`## ${block.label} (${block.range.from} → ${block.range.to})`);
    lines.push("");
    lines.push(
      `Subject contract: \`${block.subjectEngineDecisionContract?.subjectDecision || "none"}\` · blockedLegacySummary=${block.subjectEngineDecisionContract?.blockedLegacySummary ?? false}`,
    );
    lines.push("");
    lines.push("| Surface | Section | Topic | templateId | decisionCode | source | safe | renderFunction |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const e of block.entries) {
      lines.push(
        `| ${mdEscape(e.surface)} | ${mdEscape(e.section)} | ${mdEscape(e.topicKey || "—")} | ${mdEscape(e.templateId || "—")} | ${mdEscape(e.decisionCode || "—")} | ${mdEscape(e.source)} | ${e.safeToReplaceWithOwnerCopy ? "yes" : "no"} | ${mdEscape(e.renderFunction)} |`,
      );
    }
    lines.push("");
    lines.push("### Rendered text samples");
    lines.push("");
    for (const e of block.entries.filter((x) => x.currentRenderedText)) {
      lines.push(`#### \`${e.id}\``);
      lines.push("");
      lines.push(`- **templateId:** \`${e.templateId || "—"}\``);
      lines.push(`- **source:** \`${e.source}\``);
      lines.push(`- **slots:** \`${JSON.stringify(e.slotsAvailable)}\``);
      lines.push("");
      lines.push("```");
      lines.push(String(e.currentRenderedText).slice(0, 500));
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  /** @type {object[]} */
  const studentBlocks = [];

  for (const liveCase of LIVE_CASES) {
    const student = await resolveStudent(supabase, liveCase.username);
    if (!student?.id) {
      console.error(`Student not found: ${liveCase.username}`);
      process.exit(1);
    }
    const fromDate = new Date(`${liveCase.from}T00:00:00.000Z`);
    const toDate = new Date(`${liveCase.to}T00:00:00.000Z`);
    const reportApiBody = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
      includeParentActivities: true,
      includePrivateTeacherActivities: true,
    });
    reportApiBody.fromDate = liveCase.from;
    reportApiBody.toDate = liveCase.to;
    const reports = await buildReports(reportApiBody);
    if (!reports?.detailed) {
      console.error(`Failed to build report for ${liveCase.username}`);
      process.exit(1);
    }
    studentBlocks.push(
      collectInventoryForStudent({
        student: liveCase.student,
        label: liveCase.label,
        range: { from: liveCase.from, to: liveCase.to },
        base: reports.base,
        detailed: reports.detailed,
      }),
    );
    console.log(`Collected ${studentBlocks.at(-1).entryCount} entries for ${liveCase.label}`);
  }

  const totals = studentBlocks.reduce(
    (acc, b) => {
      acc.totalEntries += b.entryCount;
      acc.entriesWithoutTemplateId += b.audit.entriesWithoutTemplateId;
      acc.entriesWithoutSource += b.audit.entriesWithoutSource;
      acc.legacySourceCount += b.audit.legacySourceCount;
      acc.contractSourceCount += b.audit.contractSourceCount;
      return acc;
    },
    {
      totalEntries: 0,
      entriesWithoutTemplateId: 0,
      entriesWithoutSource: 0,
      legacySourceCount: 0,
      contractSourceCount: 0,
    },
  );

  const report = {
    generatedAt: new Date().toISOString(),
    purpose: "copy_template_inventory",
    constraints: [
      "no_hebrew_copy_changes",
      "no_engine_decision_changes",
      "no_metrics_changes",
      "mapping_only",
    ],
    slotKeys: SLOT_KEYS,
    surfaces: [
      "shortReport",
      "detailedReport",
      "topicExplain",
      "subjectRollup",
      "parentLetter",
      "homeAction",
      "recommendationCard",
    ],
    sources: ["engineDecisionContract", "subjectEngineDecisionContract", "legacy", "fallback"],
    knownLegacyGaps: [],
    totals,
    students: studentBlocks,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(OUT_MD, buildMarkdown(report), "utf8");
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(
    JSON.stringify(
      {
        totalEntries: totals.totalEntries,
        contractSourceCount: totals.contractSourceCount,
        legacySourceCount: totals.legacySourceCount,
        missingTemplateId: totals.entriesWithoutTemplateId,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
