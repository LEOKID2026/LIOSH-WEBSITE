/**
 * Context-aware label invariants for sign-off / integrity tests.
 */

import { parseCanonicalTopicFromRowKey } from "./row-identity-v1.js";
import { isCoreParentReportRow } from "../parent-report-core-grade-filter.js";
import {
  cleanTopicLabelHe,
  LONG_NARRATIVE_TITLE_RE,
  narrativeTitleFromRow,
} from "./row-display-label-context.js";

const GRADE_IN_TABLE_LABEL_RE = /(?:-|\()\s*(?:כיתה|תרגול ב)/u;
const NARRATIVE_GRADE_TITLE_RE = / - כיתה /u;

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
function narrativeCleanTopicName(row) {
  const dn = String(row?.displayName || row?.rowIdentityV1?.displayName || "").trim();
  if (dn) return cleanTopicLabelHe(dn);
  const title = narrativeTitleFromRow(row);
  const m = title.match(/^(.+?)\s-\sכיתה\s/u);
  if (m?.[1]) return cleanTopicLabelHe(m[1]);
  return cleanTopicLabelHe(title);
}

const SUBJECT_MAP_KEYS = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

/**
 * @param {unknown} baseReport
 */
export function assertTableLabelsStayClean(baseReport) {
  const failures = [];
  const maps = [
    ["math", "mathOperations"],
    ["geometry", "geometryTopics"],
    ["english", "englishTopics"],
    ["science", "scienceTopics"],
    ["hebrew", "hebrewTopics"],
    ["moledet-geography", "moledetGeographyTopics"],
  ];
  for (const [, mk] of maps) {
    const tm = baseReport?.[mk];
    if (!tm) continue;
    for (const [trk, row] of Object.entries(tm)) {
      const clean = String(row?.cleanTopicLabelHe || row?.displayName || "");
      if (GRADE_IN_TABLE_LABEL_RE.test(clean)) {
        failures.push(`table row ${trk}: topic cell must not include grade (${clean})`);
      }
    }
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 */
export function collectNarrativeTitleSurfaces(detailedReport) {
  /** @type {Array<{ kind: string; title: string; topicRowKey?: string; subject?: string }>} */
  const out = [];
  for (const sp of detailedReport?.subjectProfiles || []) {
    const collect = (row, kind) => {
      if (!row) return;
      out.push({
        kind,
        title: narrativeTitleFromRow(row) || String(row.labelHe || "").trim(),
        topicRowKey: row.topicRowKey,
        subject: sp.subject,
      });
    };
    for (const row of sp.topicOverviewRows || []) collect(row, "topicOverview");
    for (const tr of sp.topicRecommendations || []) collect(tr, "topicRec");
    for (const tr of sp.topStrengths || []) collect(tr, "strength");
    for (const tr of sp.topWeaknesses || []) collect(tr, "weakness");
  }
  return out;
}

/**
 * @param {unknown} detailedReport
 */
export function assertNoLongNarrativeTitles(detailedReport) {
  const failures = [];
  for (const { kind, title, topicRowKey, subject } of collectNarrativeTitleSurfaces(detailedReport)) {
    if (!title) continue;
    if (LONG_NARRATIVE_TITLE_RE.test(title)) {
      failures.push(
        `${subject || "?"} ${kind} ${topicRowKey || ""}: title must not use long relation-in-title format (${title})`,
      );
    }
    if (/(?:-|\()\s*תרגול ב/u.test(title)) {
      failures.push(`${subject || "?"} ${kind}: banned em-dash long title (${title})`);
    }
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 */
export function assertNarrativeSurfacesDisambiguateDuplicates(detailedReport) {
  const failures = [];
  for (const sp of detailedReport?.subjectProfiles || []) {
    const byClean = new Map();
    const collect = (row, kind) => {
      if (!row) return;
      const clean = narrativeCleanTopicName(row);
      const title = narrativeTitleFromRow(row) || String(row.labelHe || "").trim();
      if (!byClean.has(clean)) byClean.set(clean, []);
      byClean.get(clean).push({ kind, title, topicRowKey: row.topicRowKey });
    };
    for (const row of sp.topicOverviewRows || []) collect(row, "topicOverview");
    for (const tr of sp.topicRecommendations || []) collect(tr, "topicRec");
    for (const tr of sp.topStrengths || []) collect(tr, "strength");
    for (const tr of sp.topWeaknesses || []) collect(tr, "weakness");
    for (const [clean, entries] of byClean) {
      /** @type {Map<string, { kind: string; title: string }>} */
      const byRowKey = new Map();
      for (const e of entries) {
        const rk = String(e.topicRowKey || e.title || "");
        if (!rk) continue;
        if (!byRowKey.has(rk)) byRowKey.set(rk, e);
      }
      const distinctRows = [...byRowKey.values()];
      if (distinctRows.length < 2) continue;
      const titles = distinctRows.map((e) => e.title);
      const unique = new Set(titles);
      if (unique.size < distinctRows.length) {
        failures.push(
          `${sp.subject}: duplicate "${clean}" across grades without distinct titles (${distinctRows.map((e) => e.kind).join(",")})`,
        );
      }
      for (const t of titles) {
        if (!t || !NARRATIVE_GRADE_TITLE_RE.test(t)) {
          failures.push(
            `${sp.subject}: narrative title for "${clean}" must use short grade title (- כיתה …) (${t || "empty"})`,
          );
        }
      }
    }
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 * @param {unknown} baseReport
 */
export function assertTopicOverviewCompleteness(detailedReport, baseReport) {
  const failures = [];
  for (const sp of detailedReport?.subjectProfiles || []) {
    const mk = SUBJECT_MAP_KEYS[sp.subject];
    if (!mk) continue;
    const tm = baseReport?.[mk];
    if (!tm || typeof tm !== "object") continue;
    const expectedKeys = Object.entries(tm)
      .filter(([, row]) => (Number(row?.questions) || 0) > 0)
      .filter(([, row]) =>
        isCoreParentReportRow(
          {
            gradeRelation: row?.gradeRelation,
            contentGradeKey: row?.gradeKey ?? row?.contentGradeKey,
            registeredGradeKey: baseReport?.registeredGradeKey ?? row?.registeredGradeKey,
            questions: row?.questions,
          },
          baseReport?.registeredGradeKey,
        ),
      )
      .map(([k]) => k);
    const overview = Array.isArray(sp.topicOverviewRows) ? sp.topicOverviewRows : [];
    const overviewKeys = new Set(overview.map((r) => String(r.topicRowKey || "")));
    for (const k of expectedKeys) {
      if (!overviewKeys.has(k)) {
        failures.push(`${sp.subject}: topicOverviewRows missing practiced row ${k}`);
      }
    }
    if (expectedKeys.length > 0 && overview.length < expectedKeys.length) {
      failures.push(
        `${sp.subject}: topicOverviewRows count ${overview.length} < practiced rows ${expectedKeys.length}`,
      );
    }
    const focusRecKeys = new Set(
      (sp.topicRecommendations || []).map((r) => String(r.topicRowKey || "")),
    );
    for (const trk of focusRecKeys) {
      if (!overviewKeys.has(trk)) {
        failures.push(`${sp.subject}: focus row ${trk} missing from topicOverviewRows`);
      }
    }
    const focusOverview = overview.filter((r) => r.placementKind === "focus");
    for (const tr of sp.topicRecommendations || []) {
      const ov = overview.find((r) => r.topicRowKey === tr.topicRowKey);
      if (ov && ov.placementKind !== "focus" && (Number(tr.accuracy) || 0) < 55) {
        failures.push(`${sp.subject}: weak focus row ${tr.topicRowKey} not marked focus in overview`);
      }
    }
    if (focusOverview.length > 0 && focusRecKeys.size === 0) {
      failures.push(`${sp.subject}: overview has focus rows but topicRecommendations empty`);
    }
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 */
export function assertHomePlanReflectsStrengthAndSupport(detailedReport) {
  const items = detailedReport?.homePlan?.itemsHe || [];
  if (!items.length) return ["homePlan.itemsHe empty"];
  const bundle = items.join("\n");
  const failures = [];
  const hasCoreWeakness = (detailedReport?.subjectProfiles || []).some(
    (sp) =>
      (Array.isArray(sp?.topWeaknesses) && sp.topWeaknesses.length > 0) ||
      (Array.isArray(sp?.topicRecommendations) && sp.topicRecommendations.length > 0),
  );
  const hasSupport = /חיזוק|ליווי|מיקוד|לפני קידום|תמיכה/u.test(bundle);
  const hasMaintain =
    /להמשיך|שימור|יציב|חזק|בסיס טוב|אותו קצב/u.test(bundle) || items.length >= 2;
  const execStrengths = (detailedReport?.executiveSummary?.topStrengthsAcrossHe || []).join("\n");
  const profileStrengths = (detailedReport?.subjectProfiles || [])
    .flatMap((sp) => sp?.topStrengths || [])
    .map((r) => String(r.labelHe || r.narrativeTitleHe || r.displayName || ""))
    .join("\n");
  const hasExecutiveStrengthSignal =
    /להמשיך|שימור|יציב|חזק|בסיס טוב|אותו קצב|תמונה חיובית|נראית תמונה/u.test(execStrengths) ||
    profileStrengths.length > 0;
  if (hasCoreWeakness && !hasSupport) failures.push("homePlan missing support-oriented line for weak row");
  if (!hasMaintain && !hasExecutiveStrengthSignal) {
    failures.push("homePlan missing maintenance/continue line for strong row(s)");
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 */
export function assertAggregateExplainsGradeSplit(detailedReport) {
  const es = detailedReport?.executiveSummary;
  if (!es) return [];
  const notices = es.gradeSplitTopicNoticesHe || [];
  if (notices.length > 0) return [];
  const transparencyRows =
    (detailedReport?.outOfGradePracticeTransparency?.advancedPractice?.length || 0) +
    (detailedReport?.outOfGradePracticeTransparency?.foundationPractice?.length || 0);
  if (transparencyRows > 0) return [];
  const bundle = [
    ...(es.topFocusAreasHe || []),
    ...(es.topStrengthsAcrossHe || []),
    ...(detailedReport.homePlan?.itemsHe || []),
  ].join("\n");
  if (/שברים[^.\n]{0,24}(דורש חיזוק|נראה טוב|יציב)/u.test(bundle) && !/שתי תמונות|רמת הכיתה|כיתה ד/u.test(bundle)) {
    return ["aggregate text may collapse grade-split שברים without split explanation"];
  }
  return [];
}

export default {
  assertTableLabelsStayClean,
  assertNarrativeSurfacesDisambiguateDuplicates,
  assertNoLongNarrativeTitles,
  assertTopicOverviewCompleteness,
  assertHomePlanReflectsStrengthAndSupport,
  assertAggregateExplainsGradeSplit,
};
