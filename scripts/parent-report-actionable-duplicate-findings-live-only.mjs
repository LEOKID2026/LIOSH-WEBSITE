#!/usr/bin/env node
/**
 * Parent Report Actionable Duplicate Findings — Live Only Clean Pass
 * Read-only second pass over parent-report-full-visible-copy-decision-map.json
 *
 * Run: node scripts/parent-report-actionable-duplicate-findings-live-only.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_JSON = join(ROOT, "docs", "audits", "parent-report-full-visible-copy-decision-map.json");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-actionable-duplicate-findings-live-only.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-actionable-duplicate-findings-live-only.md");
const OUT_NOISE_MD = join(ROOT, "docs", "audits", "parent-report-audit-noise-findings.md");

const u = (rel) => pathToFileURL(join(ROOT, rel)).href;
const { isDuplicateParentReportText, normalizeParentReportTextForDedupe } = await import(
  u("utils/parent-report-text-dedupe.js"),
);

/** @typedef {'LIVE_VISIBLE_DUPLICATE'|'LIVE_VS_STATIC_TEMPLATE_MATCH'|'STATIC_TEMPLATE_ONLY'|'AUDIT_NOISE_IGNORE'} DuplicateCategory */

/** @typedef {'decision_summary'|'data_metrics'|'pattern_label'|'home_action'|'next_step'|'caution'|'parent_letter_opening'|'parent_letter_diagnosis'|'parent_letter_closing'|'subject_rollup_summary'|'executive_summary'|'other'|'payload_not_rendered'} IdeaCategory */

/**
 * Code-trace render map (read-only audit; no product changes).
 * false = field may exist in payload but is NOT mounted in parent UI/PDF shell today.
 */
const FIELD_RENDER_TRACE = {
  notPracticedSubjectsSummaryHe: {
    renderedToParent: false,
    reportTypes: [],
    uiEvidence:
      "components/parent/ParentReportDataHealthNote.jsx renders thinEvidenceSubjectsHe, dataQualityNoteHe, mixedGradePracticeNoteHe only — NOT notPracticedSubjectsSummaryHe (JSDoc mentions field but no JSX). pages/learning/parent-report.js diagnostic overview (lines ~2242–2281) renders practicedSubjectsSummaryHe only.",
    sourceFiles: [
      "components/parent/ParentReportDataHealthNote.jsx",
      "pages/learning/parent-report.js",
      "utils/parent-report-v2.js",
    ],
    productRuleNote:
      "Absolute product rule: unpracticed subjects should not appear to parent. Field is payload-only in current UI — audit pass 1 incorrectly counted it as visible.",
    blockerIfRendered: true,
  },
  practicedSubjectsSummaryHe: {
    renderedToParent: true,
    reportTypes: ["parentReportScreen", "shortReport"],
    uiEvidence: "pages/learning/parent-report.js ~2242–2245",
    sourceFiles: ["pages/learning/parent-report.js"],
    blockerIfRendered: false,
  },
  mainFocusAreaLineHe: {
    renderedToParent: true,
    reportTypes: ["parentReportScreen", "shortReport"],
    uiEvidence: "pages/learning/parent-report.js ~2247–2255",
    sourceFiles: ["pages/learning/parent-report.js"],
    blockerIfRendered: false,
  },
  requiresAttentionPreviewHe: {
    renderedToParent: true,
    reportTypes: ["parentReportScreen", "shortReport"],
    uiEvidence: "pages/learning/parent-report.js ~2276–2280 (attention_* sections)",
    sourceFiles: ["pages/learning/parent-report.js"],
    blockerIfRendered: false,
  },
};

const STATIC_SURFACES = new Set(["gradeAwareTemplate", "staticTemplateCatalog"]);
const SUBJECT_LEVEL_SURFACES = new Set([
  "subjectSummary",
  "subjectRollup",
  "parentLetter",
  "homeAction",
  "executiveSummary",
  "crossSubjectInsights",
  "homePlan",
  "nextPeriodGoals",
  "insights",
  "diagnosticOverview",
]);

/** @param {object} row */
function isStaticRow(row) {
  return row.dataSource === "static_template" || STATIC_SURFACES.has(row.surface);
}

/** @param {object} row */
function isLiveRow(row) {
  return row.dataSource === "live";
}

/** @param {object} row */
function resolveRenderedToParent(row) {
  const section = String(row.section || "");
  if (FIELD_RENDER_TRACE[section]) {
    return { ...FIELD_RENDER_TRACE[section], resolvedFrom: `section:${section}` };
  }
  if (isStaticRow(row)) {
    return {
      renderedToParent: false,
      reportTypes: ["templateCatalog"],
      uiEvidence: "Static/template catalog row — not live parent render path",
      sourceFiles: [],
      blockerIfRendered: false,
      resolvedFrom: "static_surface",
    };
  }
  if (row.surface === "nextPeriodGoals") {
    return {
      renderedToParent: true,
      reportTypes: ["detailedReport"],
      uiEvidence: "Detailed report payload section (parent-report-detailed.js)",
      sourceFiles: ["pages/learning/parent-report-detailed.js"],
      blockerIfRendered: false,
      resolvedFrom: "surface:nextPeriodGoals",
    };
  }
  return {
    renderedToParent: true,
    reportTypes: row.reportTypes || [],
    uiEvidence: `Live row collected from render pipeline; surface=${row.surface}`,
    sourceFiles: [row.renderFunction || row.contractSource || ""].filter(Boolean),
    blockerIfRendered: false,
    resolvedFrom: "live_default",
  };
}

/** @param {object} row */
function classifyIdeaCategory(row) {
  const surface = String(row.surface || "");
  const section = String(row.section || "");

  if (section === "notPracticedSubjectsSummaryHe") return "payload_not_rendered";
  if (section === "opening" || section === "compact_opening") return "parent_letter_opening";
  if (section === "diagnosisHe" || section === "compact_diagnosisHe") return "parent_letter_diagnosis";
  if (section === "closing" || section === "compact_closing") return "parent_letter_closing";
  if (surface === "homeAction" || section === "action" || section === "TOPIC_EXPLAIN_HOME_ACTION") {
    return "home_action";
  }
  if (
    section === "data" ||
    section.includes("TOPIC_EXPLAIN_DATA") ||
    section.includes("_DATA")
  ) {
    return "data_metrics";
  }
  if (
    section === "pattern" ||
    section.includes("PATTERN") ||
    section === "identified" ||
    section.includes("IDENTIFIED")
  ) {
    return "pattern_label";
  }
  if (
    section.includes("doNow") ||
    section.includes("DO_NOW") ||
    section.includes("intervention") ||
    section.includes("INTERVENTION") ||
    section.includes("RECOMMENDATION_STEP") ||
    section === "recommendedStepLabelHe"
  ) {
    return "next_step";
  }
  if (section.includes("caution") || section.includes("CAUTION")) return "caution";
  if (surface === "executiveSummary") return "executive_summary";
  if (surface === "subjectRollup" && section === "summaryHe") return "subject_rollup_summary";
  if (surface === "subjectSummary" && section === "summaryHe") return "decision_summary";
  if (surface === "topicInsightLine") return "decision_summary";
  if (section === "primaryFinding" || section === "parentVisibleFinding" || section === "RECOMMENDATION_FINDING") {
    return "decision_summary";
  }
  if (surface === "detailedNarrative" && section === "snapshot") return "decision_summary";
  if (surface === "recommendationCard") return "next_step";
  if (surface === "topicExplain" && section === "meaning") return "decision_summary";
  return "other";
}

/** @param {object} row */
function topicScopeKey(row) {
  if (row.topicKey && !String(row.topicKey).startsWith("fixture:")) {
    return `${row.student || ""}:${row.subject || ""}:${row.topicKey}`;
  }
  if (row.subject && SUBJECT_LEVEL_SURFACES.has(row.surface)) {
    return `${row.student || ""}:${row.subject}:__subject__`;
  }
  return `${row.student || ""}:cross:${row.surface}:${row.section}`;
}

function uniqueSubjects(rows) {
  return [...new Set(rows.map((r) => r.subject).filter(Boolean))];
}

function uniqueTopics(rows) {
  return [...new Set(rows.map((r) => r.displayName || r.topicKey).filter(Boolean))];
}

function uniqueStudents(rows) {
  return [...new Set(rows.map((r) => r.student).filter(Boolean))];
}

/** @param {object[]} members */
function classifyGroupCategory(members) {
  const live = members.filter(isLiveRow);
  const stat = members.filter(isStaticRow);
  const liveRendered = live.filter((r) => resolveRenderedToParent(r).renderedToParent);

  if (stat.length === members.length) return "STATIC_TEMPLATE_ONLY";
  if (liveRendered.length >= 2 && stat.length === 0) return "LIVE_VISIBLE_DUPLICATE";
  if (liveRendered.length >= 1 && stat.length >= 1) return "LIVE_VS_STATIC_TEMPLATE_MATCH";
  return "AUDIT_NOISE_IGNORE";
}

/** @param {object[]} members @param {DuplicateCategory} category */
function assessGroupCleanliness(members, category) {
  /** @type {string[]} */
  const noiseReasons = [];

  if (category === "STATIC_TEMPLATE_ONLY") {
    return {
      isCleanGroup: false,
      noiseReason: "Static/template catalog only — not live parent-visible duplicate",
      shouldOwnerReview: false,
    };
  }

  if (category === "LIVE_VS_STATIC_TEMPLATE_MATCH") {
    return {
      isCleanGroup: false,
      noiseReason: "Mixes live rendered rows with static grade-aware/owner template catalog",
      shouldOwnerReview: false,
    };
  }

  if (category === "AUDIT_NOISE_IGNORE") {
    return {
      isCleanGroup: false,
      noiseReason: "No pair of live rendered rows, or payload-only / non-actionable members",
      shouldOwnerReview: false,
    };
  }

  const liveRendered = members.filter(
    (r) => isLiveRow(r) && resolveRenderedToParent(r).renderedToParent,
  );
  if (liveRendered.length < 2) {
    return {
      isCleanGroup: false,
      noiseReason: "Fewer than 2 live rendered rows after render-trace filter",
      shouldOwnerReview: false,
    };
  }

  const students = uniqueStudents(liveRendered);
  if (students.length > 1) {
    noiseReasons.push("Multiple students in one group");
  }

  const subjects = uniqueSubjects(liveRendered);
  const topics = uniqueTopics(liveRendered).filter((t) => !String(t).startsWith("fixture:"));

  const topicKeys = [
    ...new Set(liveRendered.map((r) => r.topicKey).filter((k) => k && !String(k).startsWith("fixture:"))),
  ];

  const hasSubjectLevel = liveRendered.some((r) => SUBJECT_LEVEL_SURFACES.has(r.surface) && !r.topicKey);
  const hasTopicLevel = liveRendered.some((r) => r.topicKey);

  if (subjects.length > 1) {
    noiseReasons.push(`Unrelated subjects mixed: ${subjects.join(", ")}`);
  }

  if (topicKeys.length > 1 && !hasSubjectLevel) {
    noiseReasons.push(`Unrelated topicKeys in one group: ${topicKeys.slice(0, 4).join(", ")}`);
  }

  if (hasSubjectLevel && hasTopicLevel && topicKeys.length > 1) {
    noiseReasons.push("Subject-level summary mixed with multiple unrelated topic rows");
  }

  if (topics.length > 3 && topicKeys.length > 2) {
    noiseReasons.push(`Too many unrelated topics (${topics.length}) — likely transitive collision from pass-1`);
  }

  const ideaCats = [...new Set(liveRendered.map(classifyIdeaCategory))];
  const allSameIdea = ideaCats.length === 1;
  const hasRealIdeaRepeat =
    ideaCats.filter((c) => !["data_metrics", "payload_not_rendered"].includes(c)).length >= 1 &&
    liveRendered.length >= 2;

  if (!hasRealIdeaRepeat && ideaCats.every((c) => c === "data_metrics")) {
    noiseReasons.push("Only data_metrics repetition — may be legitimate layered explain structure");
  }

  const payloadOnly = liveRendered.filter((r) => classifyIdeaCategory(r) === "payload_not_rendered");
  if (payloadOnly.length > 0) {
    noiseReasons.push("Contains payload-only rows (notPracticedSubjectsSummaryHe)");
  }

  const isCleanGroup = noiseReasons.length === 0;
  return {
    isCleanGroup,
    noiseReason: noiseReasons.length ? noiseReasons.join("; ") : null,
    shouldOwnerReview: isCleanGroup && category === "LIVE_VISIBLE_DUPLICATE",
    ideaCategories: ideaCats,
    allSameIdea,
    liveRenderedCount: liveRendered.length,
  };
}

/** @param {object} group */
function scoreSeverity(group) {
  const rows = group.liveRenderedMembers || [];
  if (!rows.length) return "low";

  const reportTypes = new Set(rows.flatMap((r) => r.reportTypes || []));
  const surfaces = new Set(rows.map((r) => r.surface));
  const ideaCats = new Set(rows.map(classifyIdeaCategory));

  const hasShort = reportTypes.has("shortReport") || reportTypes.has("parentReportScreen");
  const hasDetailed = reportTypes.has("detailedReport");
  const summaryTrio = ["subjectSummary", "subjectRollup", "parentLetter"].filter((s) => surfaces.has(s));
  const patternRepeats = rows.filter((r) => r.detectedPattern).length;

  if (group.possibleBlocker) return "high";

  if (
    hasShort &&
    hasDetailed &&
    (summaryTrio.length >= 2 || surfaces.size >= 4 || patternRepeats >= 4)
  ) {
    return "high";
  }
  if (summaryTrio.length >= 3) return "high";
  if (surfaces.size >= 4 && patternRepeats >= 3) return "high";

  if (
    surfaces.size >= 2 &&
    (ideaCats.has("decision_summary") || ideaCats.has("pattern_label")) &&
    (surfaces.has("topicExplain") || surfaces.has("recommendationCard"))
  ) {
    return "medium";
  }
  if (surfaces.size >= 2 && surfaces.size <= 3) return "medium";

  return "low";
}

function whyItHurtsClarity(group) {
  const surfaces = group.surfacesInvolved || [];
  const idea = group.repeatedIdeaCategory || "decision_summary";
  if (surfaces.includes("subjectSummary") && surfaces.includes("parentLetter")) {
    return "Parent reads the same subject opening in short report and again in detailed letter — feels like the report 'starts over'.";
  }
  if (surfaces.includes("topicExplain") && surfaces.includes("recommendationCard")) {
    return "Topic finding appears in explain strip and again in recommendation card with similar wording.";
  }
  if (surfaces.includes("topicInsightLine") && surfaces.includes("topicExplain")) {
    return "Insight line and explain primaryFinding repeat the same diagnosis before parent scrolls further.";
  }
  if (idea === "pattern_label") {
    return "Same detected pattern label repeated across overview, explain, and recommendation without added nuance.";
  }
  return "Same core idea repeated across multiple surfaces without clear hierarchy of what to read first.";
}

function suggestTreatment(group) {
  const sev = group.severity;
  const surfaces = new Set(group.surfacesInvolved || []);
  if (surfaces.has("subjectSummary") && surfaces.has("subjectRollup") && surfaces.has("parentLetter")) {
    return "keep one full summary surface; shorten others to cross-reference (owner approval)";
  }
  if (sev === "high") return "move to one surface later";
  if (surfaces.has("topicExplain") && surfaces.has("recommendationCard")) return "shorten later";
  if (sev === "medium") return "merge later";
  return "keep";
}

/** Rebuild clean live-only duplicate clusters (strict: same student + same topic scope + same idea or near-dup text) */
function rebuildLiveVisibleDuplicateGroups(rowById, liveRenderedRows) {
  /** @type {object[]} */
  const groups = [];
  let gSeq = 0;

  /** @type {Map<string, object[]>} */
  const buckets = new Map();
  for (const row of liveRenderedRows) {
    const idea = classifyIdeaCategory(row);
    if (idea === "payload_not_rendered" || idea === "data_metrics") continue;
    const key = `${row.student}:${row.subject || "x"}:${row.topicKey || "__subject__"}:${idea}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  for (const [bucketKey, bucketRows] of buckets.entries()) {
    if (bucketRows.length < 2) continue;

    /** @type {object[][]} */
    const clusters = [];
    for (const row of bucketRows) {
      let placed = false;
      for (const cluster of clusters) {
        const anchor = cluster[0];
        if (
          isDuplicateParentReportText(row.exactParentVisibleHebrewText, anchor.exactParentVisibleHebrewText) ||
          tokenOverlap(row.exactParentVisibleHebrewText, anchor.exactParentVisibleHebrewText) >= 0.45
        ) {
          cluster.push(row);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([row]);
    }

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const surfaces = [...new Set(cluster.map((r) => r.surface))];
      if (surfaces.length < 2) continue;

      gSeq += 1;
      const idea = classifyIdeaCategory(cluster[0]);
      groups.push({
        duplicateGroupId: `live_clean_${gSeq}`,
        category: "LIVE_VISIBLE_DUPLICATE",
        isCleanGroup: true,
        noiseReason: null,
        shouldOwnerReview: true,
        bucketKey,
        repeatedIdeaCategory: idea,
        subject: cluster[0].subject,
        topic: cluster[0].displayName || cluster[0].topicKey,
        topicKey: cluster[0].topicKey,
        engineDecision: cluster.find((r) => r.engineDecision)?.engineDecision || null,
        detectedPattern: cluster.find((r) => r.detectedPattern)?.detectedPattern || null,
        studentSample: cluster[0].student,
        reportTypesInvolved: [...new Set(cluster.flatMap((r) => r.reportTypes || []))],
        surfacesInvolved: surfaces,
        sectionsInvolved: cluster.map((r) => `${r.surface}/${r.section}`),
        rowIds: cluster.map((r) => r.rowId),
        textsInvolved: cluster.map((r) => ({
          rowId: r.rowId,
          surface: r.surface,
          section: r.section,
          ideaCategory: classifyIdeaCategory(r),
          text: r.exactParentVisibleHebrewText,
        })),
        liveRenderedMembers: cluster,
        metrics: {
          questions: cluster[0].questions,
          correct: cluster[0].correct,
          wrong: cluster[0].wrong,
          accuracy: cluster[0].accuracy,
        },
        whyDuplicated: `Same '${idea}' idea for ${cluster[0].displayName || cluster[0].topicKey || cluster[0].subject} appears on ${surfaces.length} surfaces`,
        severity: null,
        whyItHurtsParentClarity: null,
        suggestedFutureTreatment: null,
        approvalNeeded: true,
        source: "rebuilt_live_clean_pass",
      });
    }
  }

  // Exact subject summary trio: subjectSummary ↔ subjectRollup ↔ parentLetter/opening
  /** @type {Map<string, object[]>} */
  const exactTextBuckets = new Map();
  for (const row of liveRenderedRows) {
    const isTrioRow =
      (row.surface === "subjectSummary" && row.section === "summaryHe") ||
      (row.surface === "subjectRollup" && row.section === "summaryHe") ||
      (row.surface === "parentLetter" && row.section === "opening");
    if (!isTrioRow || !row.exactParentVisibleHebrewText) continue;
    const norm = normalizeParentReportTextForDedupe(row.exactParentVisibleHebrewText);
    if (!norm) continue;
    const key = `${row.student}:${row.subject}:${norm}`;
    if (!exactTextBuckets.has(key)) exactTextBuckets.set(key, []);
    exactTextBuckets.get(key).push(row);
  }

  for (const [, cluster] of exactTextBuckets.entries()) {
    const surfaces = [...new Set(cluster.map((r) => r.surface))];
    if (surfaces.length < 2) continue;
    if (!surfaces.some((s) => ["subjectSummary", "subjectRollup", "parentLetter"].includes(s))) continue;

    gSeq += 1;
    groups.push({
      duplicateGroupId: `live_clean_trio_${gSeq}`,
      category: "LIVE_VISIBLE_DUPLICATE",
      isCleanGroup: true,
      noiseReason: null,
      shouldOwnerReview: true,
      bucketKey: "subject_summary_trio_exact",
      repeatedIdeaCategory: "decision_summary",
      subject: cluster[0].subject,
      topic: null,
      topicKey: null,
      engineDecision: cluster.find((r) => r.subjectDecision)?.subjectDecision || null,
      detectedPattern: cluster.find((r) => r.detectedPattern)?.detectedPattern || null,
      studentSample: cluster[0].student,
      reportTypesInvolved: [...new Set(cluster.flatMap((r) => r.reportTypes || []))],
      surfacesInvolved: surfaces,
      sectionsInvolved: cluster.map((r) => `${r.surface}/${r.section}`),
      rowIds: cluster.map((r) => r.rowId),
      textsInvolved: cluster.map((r) => ({
        rowId: r.rowId,
        surface: r.surface,
        section: r.section,
        ideaCategory:
          r.surface === "parentLetter"
            ? "parent_letter_opening"
            : r.surface === "subjectRollup"
              ? "subject_rollup_summary"
              : "decision_summary",
        text: r.exactParentVisibleHebrewText,
      })),
      liveRenderedMembers: cluster,
      metrics: {
        questions: cluster[0].questions,
        correct: cluster[0].correct,
        wrong: cluster[0].wrong,
        accuracy: cluster[0].accuracy,
      },
      whyDuplicated: `Exact same subject summary text on ${surfaces.join(", ")}`,
      severity: null,
      whyItHurtsParentClarity: null,
      suggestedFutureTreatment: "keep one full summary surface; shorten others to cross-reference (owner approval)",
      approvalNeeded: true,
      source: "rebuilt_subject_summary_trio_exact",
    });
  }

  for (const g of groups) {
    if (!g.severity) {
      g.severity = scoreSeverity(g);
      if (g.source === "rebuilt_subject_summary_trio_exact") {
        g.severity = "high";
        g.whyItHurtsParentClarity =
          "Parent reads the same subject opening in short report and again in detailed letter — feels like the report 'starts over'.";
      } else if (!g.whyItHurtsParentClarity) {
        g.whyItHurtsParentClarity = whyItHurtsClarity(g);
      }
    }
    if (!g.suggestedFutureTreatment) {
      g.suggestedFutureTreatment = suggestTreatment(g);
    }
  }

  const seen = new Set();
  const deduped = groups.filter((g) => {
    const key = [...g.rowIds].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return (rank[b.severity] || 0) - (rank[a.severity] || 0) || b.surfacesInvolved.length - a.surfacesInvolved.length;
  });
}

function tokenOverlap(a, b) {
  const ta = new Set(normalizeParentReportTextForDedupe(a).split(/\s+/).filter((w) => w.length > 3));
  const tb = new Set(normalizeParentReportTextForDedupe(b).split(/\s+/).filter((w) => w.length > 3));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

/** @param {object[]} pass1Groups @param {Map<string, object>} rowById */
function reclassifyPass1Groups(pass1Groups, rowById) {
  /** @type {object[]} */
  const reclassified = [];

  for (const g of pass1Groups) {
    const members = (g.rowIds || [])
      .map((id) => rowById.get(id))
      .filter(Boolean)
      .map((row) => ({
        ...row,
        renderTrace: resolveRenderedToParent(row),
        ideaCategory: classifyIdeaCategory(row),
      }));

    const category = classifyGroupCategory(members);
    const clean = assessGroupCleanliness(members, category);
    const liveRenderedMembers = members.filter(
      (r) => isLiveRow(r) && r.renderTrace.renderedToParent,
    );

    reclassified.push({
      duplicateGroupId: g.duplicateGroupId,
      pass1DuplicateType: g.duplicateType,
      category,
      isCleanGroup: clean.isCleanGroup,
      noiseReason: clean.noiseReason,
      shouldOwnerReview: clean.shouldOwnerReview,
      subject: g.subject,
      topic: g.topic,
      engineDecision: g.engineDecision,
      detectedPattern: g.detectedPattern,
      surfacesInvolved: g.surfacesInvolved,
      sectionsInvolved: g.sectionsInvolved,
      rowIds: g.rowIds,
      memberSummary: members.map((r) => ({
        rowId: r.rowId,
        dataSource: r.dataSource,
        renderedToParent: r.renderTrace.renderedToParent,
        surface: r.surface,
        section: r.section,
        subject: r.subject,
        topicKey: r.topicKey,
        ideaCategory: r.ideaCategory,
      })),
      liveRenderedCount: liveRenderedMembers.length,
      staticMemberCount: members.filter(isStaticRow).length,
      textsInvolved: g.textsInvolved,
      whyPass1Flagged: g.whyDuplicated,
      pass1ProposedTreatment: g.proposedFutureTreatment,
    });
  }

  return reclassified;
}

function findBlockers(allRows, rowById) {
  /** @type {object[]} */
  const blockers = [];

  const notPracticedRows = allRows.filter((r) => r.section === "notPracticedSubjectsSummaryHe");
  const trace = FIELD_RENDER_TRACE.notPracticedSubjectsSummaryHe;
  blockers.push({
    id: "notPracticedSubjectsSummaryHe",
    field: "report.summary.diagnosticOverviewHe.notPracticedSubjectsSummaryHe",
    renderedToParent: false,
    verdict: "NOT_RENDERED_CURRENT_UI",
    productRuleViolationIfRendered: true,
    blockerSeverity: "policy_check_passed_ui_hides_field",
    uiEvidence: trace.uiEvidence,
    sourceFiles: trace.sourceFiles,
    livePayloadExamples: notPracticedRows.map((r) => ({
      student: r.student,
      text: r.exactParentVisibleHebrewText,
      auditPass1CountedAsVisible: true,
      correctedInPass2: "Excluded from live visible duplicate analysis",
    })),
    note:
      "Pass-1 audit counted payload text as parent-visible. Code trace shows field is NOT rendered in parent-report.js or ParentReportDataHealthNote.jsx. If this ever renders — treat as BLOCKER per product rule.",
  });

  /** Subjects with no practice but parentLetter/homeAction */
  const liveRows = allRows.filter(isLiveRow);
  for (const sid of ["geometry", "science", "history", "english"]) {
    const letterRows = liveRows.filter(
      (r) =>
        r.subject === sid &&
        (r.surface === "parentLetter" || r.surface === "homeAction") &&
        r.exactParentVisibleHebrewText,
    );
    const subjectSummary = liveRows.find((r) => r.subject === sid && r.surface === "subjectSummary");
    const hasPractice = subjectSummary?.slotsAvailable?.questions > 0;
    if (letterRows.length && !hasPractice) {
      blockers.push({
        id: `no_practice_but_letter_${sid}`,
        field: `subjectProfiles.${sid}.parentLetter`,
        renderedToParent: true,
        verdict: "REVIEW_NEEDED",
        productRuleViolationIfRendered: true,
        blockerSeverity: "medium",
        livePayloadExamples: letterRows.slice(0, 2).map((r) => ({
          rowId: r.rowId,
          surface: r.surface,
          text: (r.exactParentVisibleHebrewText || "").slice(0, 200),
        })),
        note: `Subject ${sid} may show parentLetter/homeAction without subjectSummary practice volume — verify gating.`,
      });
    }
  }

  return blockers;
}

/** Spot-check bundles for owner review */
function buildSpotChecks(rowById, cleanGroups) {
  const specs = [
    {
      id: "omer_fractions",
      label: "שברים — OMER — 206/108/98/52% — השוואה לפי מונה בלבד",
      match: (r) =>
        r.student === "omer" &&
        r.subject === "math" &&
        (String(r.topicKey || "").includes("fractions") ||
          (["subjectSummary", "subjectRollup", "parentLetter", "homeAction", "diagnosticOverview"].includes(
            r.surface,
          ) &&
            (String(r.exactParentVisibleHebrewText || "").includes("שברים") ||
              String(r.section || "").includes("attention")))) &&
        isLiveRow(r) &&
        resolveRenderedToParent(r).renderedToParent,
      surfacesToCheck: [
        "diagnosticOverview",
        "subjectSummary",
        "topicInsightLine",
        "topicExplain",
        "recommendationCard",
        "detailedNarrative",
        "subjectRollup",
        "parentLetter",
        "homeAction",
      ],
    },
    {
      id: "omer_multiplication",
      label: "כפל — OMER — 32/22/10/69% — אותם זוגות שגויים",
      match: (r) =>
        r.student === "omer" &&
        String(r.topicKey || "").includes("multiplication") &&
        isLiveRow(r) &&
        resolveRenderedToParent(r).renderedToParent,
      surfacesToCheck: [
        "diagnosticOverview",
        "subjectSummary",
        "topicInsightLine",
        "topicExplain",
        "recommendationCard",
        "detailedNarrative",
        "subjectRollup",
        "parentLetter",
      ],
    },
    {
      id: "omer_decimals",
      label: "עשרוניים — OMER — 17/11/6/65% — בלבול בכיוון העיגול",
      match: (r) =>
        r.student === "omer" &&
        String(r.topicKey || "").includes("decimals") &&
        isLiveRow(r) &&
        resolveRenderedToParent(r).renderedToParent,
      surfacesToCheck: [
        "topicInsightLine",
        "topicExplain",
        "recommendationCard",
        "detailedNarrative",
      ],
    },
    {
      id: "aaa7_addition",
      label: "חיבור — Aaa7 — 10/2/8/20% — clear_topic_gap",
      match: (r) =>
        r.student === "aaa7" &&
        String(r.topicKey || "").includes("addition") &&
        isLiveRow(r) &&
        resolveRenderedToParent(r).renderedToParent,
      surfacesToCheck: [
        "topicInsightLine",
        "topicExplain",
        "recommendationCard",
        "detailedNarrative",
        "subjectRollup",
        "parentLetter",
      ],
    },
    {
      id: "omer_hebrew_reading",
      label: "עברית קריאה — OMER — השוואה חלקית שגויה",
      match: (r) =>
        r.student === "omer" &&
        r.subject === "hebrew" &&
        String(r.topicKey || "").includes("reading") &&
        isLiveRow(r) &&
        resolveRenderedToParent(r).renderedToParent,
      surfacesToCheck: [
        "subjectSummary",
        "topicInsightLine",
        "topicExplain",
        "recommendationCard",
        "subjectRollup",
        "parentLetter",
      ],
    },
    {
      id: "subject_summary_trio",
      label: "subjectSummary ↔ subjectRollup ↔ parentLetter/opening (exact duplicates)",
      match: (r) =>
        isLiveRow(r) &&
        resolveRenderedToParent(r).renderedToParent &&
        ((r.surface === "subjectSummary" && r.section === "summaryHe") ||
          (r.surface === "subjectRollup" && r.section === "summaryHe") ||
          (r.surface === "parentLetter" && r.section === "opening")),
      surfacesToCheck: ["subjectSummary", "subjectRollup", "parentLetter"],
    },
  ];

  return specs.map((spec) => {
    const rows = [...rowById.values()].filter(spec.match);
    const bySurface = {};
    for (const s of spec.surfacesToCheck) {
      bySurface[s] = rows.filter((r) => r.surface === s);
    }
    const relatedGroups = cleanGroups.filter((g) =>
      g.rowIds.some((id) => rows.some((r) => r.rowId === id)),
    );
    return {
      spotCheckId: spec.id,
      label: spec.label,
      liveRenderedRowCount: rows.length,
      bySurface: Object.fromEntries(
        Object.entries(bySurface).map(([s, rs]) => [
          s,
          rs.map((r) => ({
            rowId: r.rowId,
            section: r.section,
            ideaCategory: classifyIdeaCategory(r),
            engineDecision: r.engineDecision,
            text: r.exactParentVisibleHebrewText,
          })),
        ]),
      ),
      relatedCleanDuplicateGroups: relatedGroups.map((g) => g.duplicateGroupId),
    };
  });
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildActionableMd(report) {
  const s = report.summary;
  const lines = [
    "# Parent Report Actionable Duplicate Findings — Live Only Clean Pass",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "Read-only cleanup pass. **No product / Hebrew / commit changes.**",
    "",
    "## Summary",
    "",
    `- **live visible entries reviewed:** ${s.liveVisibleEntriesReviewed} (of ${s.totalLiveRows} live rows in pass-1)`,
    `- **payload-only excluded from duplicate analysis:** ${s.payloadOnlyExcluded}`,
    `- **clean live duplicate groups (rebuilt):** ${s.cleanLiveDuplicateGroups}`,
    `- **noisy pass-1 groups excluded:** ${s.noisyPass1GroupsExcluded}`,
    `- **top problematic surfaces:** ${s.topProblematicSurfaces.map((x) => `${x.surface} (${x.count})`).join(", ")}`,
    `- **possible blockers reviewed:** ${report.possibleBlockers.length}`,
    "",
    "## Possible Blockers",
    "",
  ];

  for (const b of report.possibleBlockers) {
    lines.push(`### ${b.id}`);
    lines.push("");
    lines.push(`- **renderedToParent:** ${b.renderedToParent}`);
    lines.push(`- **verdict:** ${b.verdict}`);
    lines.push(`- **product rule violation if rendered:** ${b.productRuleViolationIfRendered}`);
    if (b.blockerSeverity) lines.push(`- **severity:** ${b.blockerSeverity}`);
    lines.push(`- **UI evidence:** ${b.uiEvidence || b.note}`);
    if (b.livePayloadExamples?.length) {
      lines.push("- **live payload examples (not necessarily shown):**");
      for (const ex of b.livePayloadExamples) {
        lines.push(`  - ${ex.student || ex.rowId}: \`${mdEscape((ex.text || "").slice(0, 120))}\``);
      }
    }
    lines.push("");
  }

  lines.push("## Top 10 Actionable Duplicates", "");
  lines.push("_Only `LIVE_VISIBLE_DUPLICATE` · `isCleanGroup: true` · live rendered rows_");
  lines.push("");

  report.top10.forEach((g, i) => {
    lines.push(`### #${i + 1} — ${g.duplicateGroupId} (${g.severity})`);
    lines.push("");
    lines.push(`- **subject:** ${g.subject || "—"} · **topic:** ${g.topic || "—"}`);
    lines.push(`- **student sample:** ${g.studentSample || "—"}`);
    lines.push(`- **engineDecision:** ${g.engineDecision || "—"} · **pattern:** ${g.detectedPattern || "—"}`);
    lines.push(`- **repeated idea:** ${g.repeatedIdeaCategory}`);
    lines.push(`- **report types:** ${g.reportTypesInvolved.join(", ")}`);
    lines.push(`- **surfaces:** ${g.surfacesInvolved.join(", ")}`);
    lines.push(`- **metrics:** q=${g.metrics?.questions} c=${g.metrics?.correct} w=${g.metrics?.wrong} acc=${g.metrics?.accuracy}%`);
    lines.push(`- **why it hurts clarity:** ${g.whyItHurtsParentClarity}`);
    lines.push(`- **suggested future treatment:** ${g.suggestedFutureTreatment}`);
    lines.push(`- **approvalNeeded:** true`);
    lines.push("");
    lines.push("**Texts:**");
    for (const t of g.textsInvolved.slice(0, 6)) {
      lines.push(`- \`${t.surface}/${t.section}\` (${t.ideaCategory}): ${mdEscape((t.text || "").slice(0, 100))}…`);
    }
    lines.push("");
  });

  lines.push("## Spot Checks (required samples)", "");
  for (const sc of report.spotChecks) {
    lines.push(`### ${sc.label}`);
    lines.push("");
    lines.push(`- live rendered rows: ${sc.liveRenderedRowCount}`);
    lines.push(`- related clean groups: ${sc.relatedCleanDuplicateGroups.join(", ") || "—"}`);
    for (const [surface, entries] of Object.entries(sc.bySurface)) {
      if (!entries?.length) {
        lines.push(`- **${surface}:** _(no live rendered row)_`);
        continue;
      }
      lines.push(`- **${surface}:** ${entries.length} row(s)`);
      for (const e of entries.slice(0, 2)) {
        lines.push(`  - \`${e.rowId}\` (${e.ideaCategory}): ${mdEscape((e.text || "").slice(0, 90))}…`);
      }
    }
    lines.push("");
  }

  lines.push("## Pass-1 Group Reclassification Summary", "");
  lines.push("| category | count | clean | owner review |");
  lines.push("| --- | --- | --- | --- |");
  for (const [cat, stats] of Object.entries(report.pass1CategoryStats)) {
    lines.push(`| ${cat} | ${stats.count} | ${stats.clean} | ${stats.ownerReview} |`);
  }

  return lines.join("\n");
}

/** @param {object} g */
function mapExclusionCategory(g) {
  if (g.category === "STATIC_TEMPLATE_ONLY") return "static-only";
  if (g.category === "LIVE_VS_STATIC_TEMPLATE_MATCH") return "live-vs-static";
  const reason = String(g.noiseReason || g.whyExcluded || "");
  if (reason.includes("Unrelated subjects") || reason.includes("Unrelated topicKeys")) {
    return "unrelated-topic-mix";
  }
  if (reason.includes("transitive collision")) return "duplicate-id-collision";
  if (g.category === "AUDIT_NOISE_IGNORE") return "audit-noise-ignore";
  if (!g.isCleanGroup && g.category === "LIVE_VISIBLE_DUPLICATE") return "unrelated-topic-mix";
  return "audit-noise-ignore";
}

function buildNoiseMd(report) {
  const lines = [
    "# Parent Report — Audit Noise Findings",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "Groups excluded from Top-10 actionable list. **No changes made.**",
    "",
    "## Summary",
    "",
    `- pass-1 groups reclassified: ${report.pass1Reclassified.length}`,
    `- excluded from owner review: ${report.auditNoiseExcluded.length}`,
    "",
    "## Audit Noise Excluded",
    "",
  ];

  for (const g of report.auditNoiseExcluded) {
    lines.push(`### ${g.duplicateGroupId}`);
    lines.push("");
    lines.push(`- **category:** ${g.category}`);
    lines.push(`- **exclusion category:** ${g.exclusionCategory}`);
    lines.push(`- **why excluded:** ${g.noiseReason || g.whyExcluded}`);
    lines.push(`- **pass-1 duplicate type:** ${g.pass1DuplicateType || "—"}`);
    lines.push(`- **isCleanGroup:** ${g.isCleanGroup}`);
    lines.push(`- **live rendered / static members:** ${g.liveRenderedCount} / ${g.staticMemberCount}`);
    lines.push(`- **example rowIds:** ${(g.rowIds || []).slice(0, 5).join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const map = JSON.parse(readFileSync(MAP_JSON, "utf8"));
  const allRows = map.fullRows || [];
  /** @type {Map<string, object>} */
  const rowById = new Map(allRows.map((r) => [r.rowId, r]));

  const annotatedRows = allRows.map((row) => {
    const renderTrace = resolveRenderedToParent(row);
    return {
      ...row,
      renderTrace,
      renderedToParent: renderTrace.renderedToParent,
      ideaCategory: classifyIdeaCategory(row),
    };
  });

  const liveRows = annotatedRows.filter(isLiveRow);
  const liveRenderedRows = liveRows.filter((r) => r.renderedToParent);
  const payloadOnlyRows = liveRows.filter((r) => !r.renderedToParent);

  const pass1Reclassified = reclassifyPass1Groups(map.duplicateFindings || [], rowById);

  const auditNoiseExcluded = pass1Reclassified.filter((g) => !g.shouldOwnerReview);

  const cleanLiveGroups = rebuildLiveVisibleDuplicateGroups(rowById, liveRenderedRows);

  const top10 = cleanLiveGroups.slice(0, 10);

  const blockers = findBlockers(allRows, rowById);

  const spotChecks = buildSpotChecks(rowById, cleanLiveGroups);

  const surfaceDupCounts = {};
  for (const g of cleanLiveGroups) {
    for (const s of g.surfacesInvolved) {
      surfaceDupCounts[s] = (surfaceDupCounts[s] || 0) + 1;
    }
  }
  const topProblematicSurfaces = Object.entries(surfaceDupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([surface, count]) => ({ surface, count }));

  /** @type {Record<string, { count: number, clean: number, ownerReview: number }>} */
  const pass1CategoryStats = {};
  for (const g of pass1Reclassified) {
    if (!pass1CategoryStats[g.category]) {
      pass1CategoryStats[g.category] = { count: 0, clean: 0, ownerReview: 0 };
    }
    pass1CategoryStats[g.category].count++;
    if (g.isCleanGroup) pass1CategoryStats[g.category].clean++;
    if (g.shouldOwnerReview) pass1CategoryStats[g.category].ownerReview++;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    purpose: "parent_report_actionable_duplicate_findings_live_only",
    constraints: [
      "no_product_changes",
      "no_hebrew_changes",
      "no_commit",
      "read_only_cleanup_pass",
    ],
    sourceAudit: MAP_JSON,
    summary: {
      totalLiveRows: liveRows.length,
      liveVisibleEntriesReviewed: liveRenderedRows.length,
      payloadOnlyExcluded: payloadOnlyRows.length,
      cleanLiveDuplicateGroups: cleanLiveGroups.length,
      noisyPass1GroupsExcluded: auditNoiseExcluded.length,
      pass1GroupsTotal: pass1Reclassified.length,
      topProblematicSurfaces,
    },
    renderTraceFindings: {
      notPracticedSubjectsSummaryHe: FIELD_RENDER_TRACE.notPracticedSubjectsSummaryHe,
      payloadOnlyRowIds: payloadOnlyRows.map((r) => r.rowId),
    },
    possibleBlockers: blockers,
    pass1CategoryStats,
    pass1Reclassified,
    cleanLiveDuplicateGroups: cleanLiveGroups,
    top10,
    spotChecks,
    auditNoiseExcluded: auditNoiseExcluded.map((g) => ({
      duplicateGroupId: g.duplicateGroupId,
      category: g.category,
      exclusionCategory: mapExclusionCategory(g),
      pass1DuplicateType: g.pass1DuplicateType,
      isCleanGroup: g.isCleanGroup,
      noiseReason: g.noiseReason,
      whyExcluded: g.noiseReason,
      liveRenderedCount: g.liveRenderedCount,
      staticMemberCount: g.staticMemberCount,
      rowIds: g.rowIds,
      memberSummary: g.memberSummary,
    })),
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(OUT_MD, buildActionableMd(report), "utf8");
  writeFileSync(OUT_NOISE_MD, buildNoiseMd(report), "utf8");

  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_NOISE_MD}`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(
    "notPracticedSubjectsSummaryHe renderedToParent:",
    FIELD_RENDER_TRACE.notPracticedSubjectsSummaryHe.renderedToParent,
  );
}

main();
