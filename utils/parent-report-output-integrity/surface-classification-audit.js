/**
 * Parent-facing surface classification for row-identity sign-off.
 */

export const PARENT_FACING_SURFACES = [
  {
    id: "short_report_table",
    labelHe: "טבלת דוח קצר",
    classification: "row-scoped",
    requiresRowIdentity: true,
    implementation: "pages/learning/parent-report.js + baseReport topic maps",
  },
  {
    id: "short_report_smart_summary",
    labelHe: "סיכום חכם - דוח קצר",
    classification: "aggregate-only",
    requiresRowIdentity: false,
    requiresGradeSplitRespect: true,
    implementation: "parent-report contract strip / rawMetricStrengthsHe + executive via detailed payload",
  },
  {
    id: "detailed_smart_summary",
    labelHe: "סיכום חכם - דוח מפורט",
    classification: "aggregate-only",
    requiresRowIdentity: false,
    requiresGradeSplitRespect: true,
    implementation: "ParentAiInsight + executiveSummary",
  },
  {
    id: "detailed_strengths",
    labelHe: "חוזקות",
    classification: "row-scoped",
    requiresRowIdentity: true,
    implementation: "utils/detailed-parent-report.js topStrengths",
  },
  {
    id: "detailed_weaknesses",
    labelHe: "מיקוד / חולשות",
    classification: "row-scoped",
    requiresRowIdentity: true,
    implementation: "utils/detailed-parent-report.js topWeaknesses",
  },
  {
    id: "topic_recommendations",
    labelHe: "המלצות לנושא",
    classification: "row-scoped",
    requiresRowIdentity: true,
    implementation: "utils/detailed-parent-report.js topicRecommendations",
  },
  {
    id: "home_plan",
    labelHe: "מה לעשות בבית",
    classification: "mixed",
    requiresRowIdentity: false,
    requiresGradeSplitRespect: true,
    implementation: "buildHomePlanFromV2 - per-unit lines with parentFacingLabel",
  },
  {
    id: "executive_summary",
    labelHe: "סיכום מנהלים",
    classification: "aggregate-only",
    requiresRowIdentity: false,
    requiresGradeSplitRespect: true,
    implementation: "buildExecutiveSummaryFromV2 + gradeSplitTopicNoticesHe",
  },
  {
    id: "charts",
    labelHe: "גרפים / תוויות",
    classification: "row-scoped",
    requiresRowIdentity: true,
    implementation: "parent-report.js buildTopicRowsForChart",
  },
  {
    id: "pdf_print",
    labelHe: "PDF / הדפסה",
    classification: "mixed",
    requiresRowIdentity: true,
    requiresGradeSplitRespect: true,
    implementation: "Playwright print of pages above",
  },
  {
    id: "copilot_truth_packet",
    labelHe: "Copilot truth packet",
    classification: "row-scoped",
    requiresRowIdentity: true,
    implementation: "utils/parent-copilot/truth-packet-v1.js",
  },
  {
    id: "copilot_answer_composer",
    labelHe: "Copilot answer composer",
    classification: "mixed",
    requiresRowIdentity: true,
    requiresGradeSplitRespect: true,
    implementation: "utils/parent-copilot/* + gradeSplitTopicRowKeys",
  },
];

/**
 * @param {unknown} detailedReport
 * @param {unknown} baseReport
 */
export function auditParentFacingSurfaces(detailedReport, baseReport) {
  /** @type {Array<{ surfaceId: string; status: "pass"|"fail"|"warn"; reason: string }>} */
  const results = [];

  const checkRowList = (surfaceId, rows, path) => {
    const list = Array.isArray(rows) ? rows : [];
    const missing = list.filter((r) => !r?.rowIdentityV1?.sourceId && !r?.rowSourceId);
    if (missing.length) {
      results.push({
        surfaceId,
        status: "fail",
        reason: `${path}: ${missing.length} row(s) missing rowIdentityV1/sourceId`,
      });
    } else {
      results.push({ surfaceId, status: "pass", reason: `${path}: ${list.length} row(s) keyed` });
    }
  };

  for (const sp of detailedReport?.subjectProfiles || []) {
    checkRowList("topic_overview", sp?.topicOverviewRows, `${sp.subject}.topicOverviewRows`);
    checkRowList("topic_recommendations", sp?.topicRecommendations, `${sp.subject}.topicRecommendations`);
    checkRowList("detailed_strengths", sp?.topStrengths, `${sp.subject}.topStrengths`);
    checkRowList("detailed_weaknesses", sp?.topWeaknesses, `${sp.subject}.topWeaknesses`);
  }

  const es = detailedReport?.executiveSummary;
  if (es?.gradeSplitTopicNoticesHe?.length) {
    results.push({
      surfaceId: "executive_summary",
      status: "pass",
      reason: `grade-split notices present (${es.gradeSplitTopicNoticesHe.length})`,
    });
  } else {
    results.push({
      surfaceId: "executive_summary",
      status: "warn",
      reason: "no gradeSplitTopicNoticesHe (ok if no split in payload)",
    });
  }

  const maps = [
    ["math", "mathOperations"],
    ["geometry", "geometryTopics"],
    ["english", "englishTopics"],
    ["science", "scienceTopics"],
    ["hebrew", "hebrewTopics"],
    ["moledet-geography", "moledetGeographyTopics"],
  ];
  let shortTableMissing = 0;
  let shortTableTotal = 0;
  for (const [sid, mk] of maps) {
    const tm = baseReport?.[mk];
    if (!tm) continue;
    for (const [trk, row] of Object.entries(tm)) {
      shortTableTotal += 1;
      if (!row?.rowIdentityV1?.sourceId && !row?.rowSourceId) shortTableMissing += 1;
    }
  }
  let tableGradeInTopic = 0;
  let chartNarrativeDup = 0;
  for (const [, mk] of maps) {
    const tm = baseReport?.[mk];
    if (!tm) continue;
    const byClean = new Map();
    for (const [trk, row] of Object.entries(tm)) {
      const clean = String(row?.cleanTopicLabelHe || row?.displayName || "");
      if (/(?:-|\()\s*(?:כיתה|תרגול ב)/u.test(clean)) tableGradeInTopic += 1;
      const narrative = String(row?.narrativeTopicLabelHe || "");
      if (!byClean.has(clean)) byClean.set(clean, []);
      byClean.get(clean).push({ trk, narrative });
    }
    for (const [, entries] of byClean) {
      if (entries.length < 2) continue;
      const narratives = new Set(entries.map((e) => e.narrative).filter(Boolean));
      if (narratives.size < entries.length) chartNarrativeDup += 1;
    }
  }
  results.push({
    surfaceId: "short_report_table",
    status: shortTableMissing || tableGradeInTopic ? "fail" : "pass",
    reason: tableGradeInTopic
      ? `${tableGradeInTopic} table row(s) embed grade in topic cell (use grade column only)`
      : shortTableMissing
        ? `${shortTableMissing}/${shortTableTotal} missing rowIdentity`
        : `all ${shortTableTotal} rows: clean topic + rowIdentity`,
  });

  results.push({
    surfaceId: "charts",
    status: chartNarrativeDup ? "fail" : "pass",
    reason: chartNarrativeDup
      ? `${chartNarrativeDup} chart topic group(s) with duplicate narrative labels`
      : "chart narrative labels disambiguated when topic repeats across grades",
  });

  const copilotRows = (detailedReport?.subjectProfiles || []).flatMap((s) => s.topicRecommendations || []);
  const copilotMissing = copilotRows.filter((r) => !r?.rowIdentityV1?.sourceId && !r?.rowSourceId);
  results.push({
    surfaceId: "copilot_truth_packet",
    status: copilotMissing.length ? "fail" : "pass",
    reason: copilotMissing.length
      ? `${copilotMissing.length} copilot payload row(s) missing rowIdentity`
      : `copilot payload rows keyed (${copilotRows.length})`,
  });

  const blocking = results.filter((r) => r.status === "fail");
  return {
    surfaces: PARENT_FACING_SURFACES,
    results,
    blockingFailures: blocking,
    pass: blocking.length === 0,
  };
}

export default { PARENT_FACING_SURFACES, auditParentFacingSurfaces };
