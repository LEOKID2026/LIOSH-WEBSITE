/**
 * Cross-subject context-aware labeling + topic overview / focus matrix assertions.
 */

import {
  assertAggregateExplainsGradeSplit,
  assertHomePlanReflectsStrengthAndSupport,
  assertNarrativeSurfacesDisambiguateDuplicates,
  assertNoLongNarrativeTitles,
  assertTableLabelsStayClean,
  assertTopicOverviewCompleteness,
} from "./display-context-label-tests.js";
import { LONG_NARRATIVE_TITLE_RE, narrativeTitleFromRow } from "./row-display-label-context.js";
import { parseCanonicalTopicFromRowKey } from "./row-identity-v1.js";

const SUBJECT_MAP_KEYS = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

const SUBJECT_LABEL_HE = {
  math: "חשבון",
  geometry: "הנדסה",
  english: "אנגלית",
  science: "מדעים",
  hebrew: "עברית",
  "moledet-geography": "מולדת וגאוגרפיה",
};

const NARRATIVE_GRADE_TITLE_RE = / - כיתה /u;
const TABLE_GRADE_IN_TOPIC_RE = /(?:—|\()\s*(?:כיתה|תרגול ב)/u;

/**
 * @param {string} subjectId
 * @param {unknown} baseReport
 * @param {unknown} detailedReport
 * @param {{ splitG4: string; splitG5: string; soloG4: string; splitLabelHe: string }} keys
 */
function assertSubjectContextLabelingMatrix(subjectId, baseReport, detailedReport, keys) {
  const failures = [];
  const sp = (detailedReport?.subjectProfiles || []).find((s) => s?.subject === subjectId);
  if (!sp) {
    failures.push(`${subjectId}: missing subject profile`);
    return failures;
  }

  const mk = SUBJECT_MAP_KEYS[subjectId];
  const tm = baseReport?.[mk];
  if (!tm || typeof tm !== "object") {
    failures.push(`${subjectId}: missing topic map ${mk}`);
    return failures;
  }

  const practicedKeys = [keys.splitG4, keys.splitG5, keys.soloG4].filter((k) => (Number(tm[k]?.questions) || 0) > 0);
  const overview = Array.isArray(sp.topicOverviewRows) ? sp.topicOverviewRows : [];
  const focusRecs = Array.isArray(sp.topicRecommendations) ? sp.topicRecommendations : [];
  const overviewKeys = new Set(overview.map((r) => String(r.topicRowKey || "")));
  const focusKeys = new Set(focusRecs.map((r) => String(r.topicRowKey || "")));

  if (overview.length !== practicedKeys.length) {
    failures.push(
      `${subjectId}: topicOverviewRows expected ${practicedKeys.length}, got ${overview.length}`,
    );
  }
  for (const k of practicedKeys) {
    if (!overviewKeys.has(k)) failures.push(`${subjectId}: overview missing row ${k}`);
  }

  if (focusRecs.length !== 1) {
    failures.push(`${subjectId}: topicRecommendations expected 1 focus row, got ${focusRecs.length}`);
  }
  if (!focusKeys.has(keys.splitG5)) {
    failures.push(`${subjectId}: focus must be weak higher-grade split row ${keys.splitG5}`);
  }
  if (focusKeys.has(keys.splitG4)) {
    failures.push(`${subjectId}: strong registered-grade split row must not appear in focus`);
  }
  if (focusKeys.has(keys.soloG4)) {
    failures.push(`${subjectId}: solo strong row must not appear in focus`);
  }

  for (const k of [keys.splitG4, keys.splitG5]) {
    const row = tm[k];
    const clean = String(row?.cleanTopicLabelHe || row?.displayName || "");
    if (TABLE_GRADE_IN_TOPIC_RE.test(clean)) {
      failures.push(`${subjectId}: table topic cell must stay clean for ${k} (${clean})`);
    }
    const narrative = String(row?.narrativeTopicLabelHe || "");
    if (!NARRATIVE_GRADE_TITLE_RE.test(narrative)) {
      failures.push(`${subjectId}: chart/narrative label must disambiguate ${k} (${narrative || "empty"})`);
    }
    if (LONG_NARRATIVE_TITLE_RE.test(narrative)) {
      failures.push(`${subjectId}: long narrative label on ${k}`);
    }
  }

  const g4Narr = String(tm[keys.splitG4]?.narrativeTopicLabelHe || "");
  const g5Narr = String(tm[keys.splitG5]?.narrativeTopicLabelHe || "");
  if (g4Narr && g5Narr && g4Narr === g5Narr) {
    failures.push(`${subjectId}: chart labels for split topic must differ by grade`);
  }

  const ovG5 = overview.find((r) => r.topicRowKey === keys.splitG5);
  if (ovG5 && !String(ovG5.gradeRelationSublineHe || "").includes("מעל")) {
    failures.push(`${subjectId}: higher-grade weak row needs relation subline (מעל הכיתה הרשומה)`);
  }
  const ovG4 = overview.find((r) => r.topicRowKey === keys.splitG4);
  if (ovG4 && ovG4.placementKind === "focus") {
    failures.push(`${subjectId}: strong split g4 row must not be focus in overview`);
  }

  for (const tr of focusRecs) {
    const acc = Number(tr.accuracy) || 0;
    if (acc >= 55) failures.push(`${subjectId}: focus row accuracy too high (${acc}%)`);
    const title = narrativeTitleFromRow(tr);
    if (!NARRATIVE_GRADE_TITLE_RE.test(title)) {
      failures.push(`${subjectId}: focus card title must include grade (${title || "empty"})`);
    }
  }

  for (const s of sp.topStrengths || []) {
    if (String(s.topicRowKey) === keys.splitG5) {
      failures.push(`${subjectId}: weak g5 split row must not appear in topStrengths`);
    }
  }

  for (const w of sp.topWeaknesses || []) {
    if (String(w.topicRowKey) === keys.splitG4) {
      failures.push(`${subjectId}: strong g4 split row must not appear in topWeaknesses`);
    }
    if (String(w.topicRowKey) === keys.splitG5) {
      const title = narrativeTitleFromRow(w) || String(w.labelHe || "");
      if (title && !NARRATIVE_GRADE_TITLE_RE.test(title)) {
        failures.push(
          `${subjectId}: weakness must disambiguate higher grade, not collapse to registered grade (${title})`,
        );
      }
    }
  }

  const splitLabel = keys.splitLabelHe;
  const bundle = [
    String(sp.summaryHe || ""),
    ...(detailedReport?.executiveSummary?.topFocusAreasHe || []),
    ...(detailedReport?.executiveSummary?.topStrengthsAcrossHe || []),
    ...(detailedReport?.homePlan?.itemsHe || []),
  ].join("\n");
  const collapsed = new RegExp(
    `${splitLabel.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}[^.\\n]{0,18}דורש חיזוק`,
    "u",
  );
  const notices = detailedReport?.executiveSummary?.gradeSplitTopicNoticesHe || [];
  const hasNotice =
    notices.some((n) => String(n).includes(splitLabel)) ||
    notices.some((n) => String(n).includes(SUBJECT_LABEL_HE[subjectId] || subjectId));
  if (collapsed.test(bundle) && !hasNotice) {
    failures.push(
      `${subjectId}: aggregate collapses grade-split "${splitLabel}" without gradeSplit notice`,
    );
  }

  const subjectLabel = SUBJECT_LABEL_HE[subjectId] || subjectId;
  const homeLines = (detailedReport?.homePlan?.itemsHe || []).filter((line) =>
    String(line).includes(subjectLabel),
  );
  const hasSubjectGuidance =
    focusRecs.length > 0 ||
    homeLines.length > 0 ||
    Boolean(String(sp.parentActionHe || sp.subjectDoNowHe || sp.subjectImmediateActionHe || "").trim());
  if (!hasSubjectGuidance) {
    failures.push(`${subjectId}: missing subject-level guidance (focus block, home plan, or profile action)`);
  }

  const weakInHomeOrFocus = homeLines.some((line) => line.includes(keys.splitLabelHe)) || focusRecs.length > 0;
  if (!weakInHomeOrFocus) {
    failures.push(`${subjectId}: weak split topic not reflected in focus/home guidance`);
  }

  return failures;
}

/**
 * @param {unknown} baseReport
 */
export function findGradeSplitTopicLabelsInBaseReport(baseReport) {
  /** @type {Array<{ subjectId: string; displayName: string }>} */
  const out = [];
  for (const [subjectId, mk] of Object.entries(SUBJECT_MAP_KEYS)) {
    const tm = baseReport?.[mk];
    if (!tm) continue;
    /** @type {Map<string, Set<string>>} */
    const gradesByCanon = new Map();
    for (const [topicRowKey, row] of Object.entries(tm)) {
      const parsed = parseCanonicalTopicFromRowKey(topicRowKey);
      const canon = parsed.canonicalTopicKey || topicRowKey;
      const gk = row?.gradeKey || parsed.contentGradeKey;
      if (!gradesByCanon.has(canon)) gradesByCanon.set(canon, new Set());
      if (gk) gradesByCanon.get(canon).add(String(gk));
      if (gradesByCanon.get(canon).size >= 2) {
        const dn = String(row?.displayName || "").trim();
        if (dn && !out.some((x) => x.subjectId === subjectId && x.displayName === dn)) {
          out.push({ subjectId, displayName: dn });
        }
      }
    }
  }
  return out;
}

/**
 * @param {unknown} detailedReport
 * @param {unknown} baseReport
 */
export function assertAggregateExplainsAllGradeSplits(detailedReport, baseReport) {
  const failures = [];
  const notices = detailedReport?.executiveSummary?.gradeSplitTopicNoticesHe || [];
  const bundle = [
    ...(detailedReport?.executiveSummary?.topFocusAreasHe || []),
    ...(detailedReport?.executiveSummary?.topStrengthsAcrossHe || []),
    ...(detailedReport?.homePlan?.itemsHe || []),
  ].join("\n");

  for (const { subjectId, displayName } of findGradeSplitTopicLabelsInBaseReport(baseReport)) {
    const collapsed = new RegExp(
      `${displayName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}[^.\\n]{0,20}דורש חיזוק`,
      "u",
    );
    const hasNotice =
      notices.some((n) => String(n).includes(displayName)) ||
      notices.some((n) => String(n).includes(SUBJECT_LABEL_HE[subjectId] || subjectId));
    if (collapsed.test(bundle) && !hasNotice) {
      failures.push(
        `${subjectId}: aggregate may collapse "${displayName}" without split explanation`,
      );
    }
  }
  if (findGradeSplitTopicLabelsInBaseReport(baseReport).length > 0 && notices.length === 0) {
    failures.push("executiveSummary.gradeSplitTopicNoticesHe empty despite grade-split topics");
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 * @param {number} [minGradeDisambiguatedTitles]
 */
export function assertPrintBundleIncludesOverviewTitles(detailedReport, minGradeDisambiguatedTitles = 6) {
  const failures = [];
  const titles = [];
  for (const sp of detailedReport?.subjectProfiles || []) {
    for (const row of sp.topicOverviewRows || []) {
      const t = narrativeTitleFromRow(row);
      if (t) titles.push(t);
    }
  }
  if (titles.length === 0) failures.push("no topicOverview narrative titles in detailed report");
  const dupGradeTitles = titles.filter((t) => NARRATIVE_GRADE_TITLE_RE.test(t));
  if (dupGradeTitles.length < minGradeDisambiguatedTitles) {
    failures.push(
      `expected grade-disambiguated overview titles (got ${dupGradeTitles.length}, need >= ${minGradeDisambiguatedTitles})`,
    );
  }
  return failures;
}

/**
 * @param {unknown} detailedReport
 * @param {string[]} subjectIds
 */
export function assertAllSubjectsRepresentedInReport(detailedReport, subjectIds) {
  const failures = [];
  for (const subjectId of subjectIds) {
    const sp = (detailedReport?.subjectProfiles || []).find((s) => s?.subject === subjectId);
    if (!sp) {
      failures.push(`${subjectId}: missing subject profile`);
      continue;
    }
    if (!(sp.topicOverviewRows?.length > 0)) {
      failures.push(`${subjectId}: no topic overview rows — subject dropped from detailed picture`);
    }
  }
  return failures;
}

/**
 * @param {unknown} baseReport
 * @param {unknown} detailedReport
 * @param {{
 *   subjectIds: string[];
 *   matrixRowKeysForSubject: (subjectId: string) => { splitG4: string; splitG5: string; soloG4: string; splitLabelHe: string };
 *   minGradeDisambiguatedTitles?: number;
 * }} options
 */
export function runContextLabelingMatrixAssertions(baseReport, detailedReport, options) {
  const minGradeTitles =
    options.minGradeDisambiguatedTitles ??
    (options.subjectIds.length >= 6 ? 6 : Math.max(2, options.subjectIds.length));
  const failures = [];
  failures.push(...assertTableLabelsStayClean(baseReport));
  failures.push(...assertTopicOverviewCompleteness(detailedReport, baseReport));
  failures.push(...assertNarrativeSurfacesDisambiguateDuplicates(detailedReport));
  failures.push(...assertNoLongNarrativeTitles(detailedReport));
  failures.push(...assertHomePlanReflectsStrengthAndSupport(detailedReport));
  failures.push(...assertAllSubjectsRepresentedInReport(detailedReport, options.subjectIds));
  failures.push(...assertAggregateExplainsGradeSplit(detailedReport));
  failures.push(...assertAggregateExplainsAllGradeSplits(detailedReport, baseReport));
  failures.push(...assertPrintBundleIncludesOverviewTitles(detailedReport, minGradeTitles));

  for (const subjectId of options.subjectIds) {
    const keys = options.matrixRowKeysForSubject(subjectId);
    failures.push(...assertSubjectContextLabelingMatrix(subjectId, baseReport, detailedReport, keys));
  }
  return failures;
}

export default {
  runContextLabelingMatrixAssertions,
  assertAggregateExplainsAllGradeSplits,
  assertPrintBundleIncludesOverviewTitles,
  findGradeSplitTopicLabelsInBaseReport,
  SUBJECT_MAP_KEYS,
};
