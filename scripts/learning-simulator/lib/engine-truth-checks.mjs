/**
 * Engine truth layer — structural assertions between aggregate storage, diagnosis engine V2,
 * decision/canonical state, and parent-report data model (no Hebrew copy QA).
 */
import {
  collectSessionsFromStorageSnapshot,
  accuracyTrendDirectionFromSessions,
} from "./report-runner.mjs";
import { parentFacingPatternLabelHe } from "../../../utils/parent-report-language/parent-facing-pattern-label-he.js";
const MAP_KEYS = [
  "mathOperations",
  "geometryTopics",
  "englishTopics",
  "scienceTopics",
  "hebrewTopics",
  "moledetGeographyTopics",
];

const SUBJECT_ID_FROM_MAP = {
  mathOperations: "math",
  geometryTopics: "geometry",
  englishTopics: "english",
  scienceTopics: "science",
  hebrewTopics: "hebrew",
  moledetGeographyTopics: "moledet-geography",
};

/**
 * Global totals from session rows (ground truth for summary.totalQuestions / totalCorrect).
 * @param {Record<string, unknown>} storage
 */
export function sumSessionsFromStorage(storage) {
  let totalQ = 0;
  let correctQ = 0;
  let totalSec = 0;
  const bump = (sessions) => {
    for (const s of sessions || []) {
      const t = Number(s.total) || 0;
      const c = Number(s.correct) || 0;
      if (t <= 0) continue;
      totalQ += t;
      correctQ += c;
      const d = Number(s.duration);
      if (Number.isFinite(d) && d > 0) totalSec += d;
    }
  };
  for (const b of Object.values(storage?.mleo_time_tracking?.operations || {})) bump(b?.sessions);
  for (const tk of [
    "mleo_geometry_time_tracking",
    "mleo_english_time_tracking",
    "mleo_science_time_tracking",
    "mleo_hebrew_time_tracking",
    "mleo_moledet_geography_time_tracking",
  ]) {
    for (const b of Object.values(storage?.[tk]?.topics || {})) bump(b?.sessions);
  }
  const wrongQ = Math.max(0, totalQ - correctQ);
  const accPct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
  return { totalQ, correctQ, wrongQ, accPct, totalSec };
}

/**
 * @param {object} summary — baseReport.summary
 * @param {{ totalQ: number, correctQ: number, accPct: number }} oracle
 */
export function assertSummaryMatchesAggregate(summary, oracle) {
  const tq = Number(summary?.totalQuestions) || 0;
  const tc = Number(summary?.totalCorrect) || 0;
  const oa = Number(summary?.overallAccuracy) || 0;
  const fails = [];
  if (tq !== oracle.totalQ) {
    fails.push({ check: "totalQuestions", report: tq, oracle: oracle.totalQ });
  }
  if (tc !== oracle.correctQ) {
    fails.push({ check: "totalCorrect", report: tc, oracle: oracle.correctQ });
  }
  if (oa !== oracle.accPct) {
    fails.push({ check: "overallAccuracy", report: oa, oracle: oracle.accPct });
  }
  return { pass: fails.length === 0, fails };
}

/**
 * Simulator aggregate stats (materialized sessions) must match the parent-report summary totals.
 * @param {object} summary
 * @param {{ questionTotal?: number, correctTotal?: number } | null} stats
 */
export function assertSummaryMatchesSimulatorStats(summary, stats) {
  if (!stats || typeof stats !== "object") return { pass: true, skipped: true };
  const fails = [];
  const tq = Number(summary?.totalQuestions) || 0;
  const tc = Number(summary?.totalCorrect) || 0;
  const mq = Number(stats.questionTotal) || 0;
  const mc = Number(stats.correctTotal) || 0;
  if (tq !== mq) fails.push({ check: "totalQuestions", report: tq, stats: mq });
  if (tc !== mc) fails.push({ check: "totalCorrect", report: tc, stats: mc });
  return { pass: fails.length === 0, fails };
}

/**
 * Subject-level totals on summary must sum to global totals (report internal consistency).
 */
export function assertSummarySubjectsSumToGlobal(summary) {
  const s = summary || {};
  const fails = [];
  const sumQ =
    (Number(s.mathQuestions) || 0) +
    (Number(s.geometryQuestions) || 0) +
    (Number(s.englishQuestions) || 0) +
    (Number(s.scienceQuestions) || 0) +
    (Number(s.hebrewQuestions) || 0) +
    (Number(s.moledetGeographyQuestions) || 0);
  const sumC =
    (Number(s.mathCorrect) || 0) +
    (Number(s.geometryCorrect) || 0) +
    (Number(s.englishCorrect) || 0) +
    (Number(s.scienceCorrect) || 0) +
    (Number(s.hebrewCorrect) || 0) +
    (Number(s.moledetGeographyCorrect) || 0);
  const tq = Number(s.totalQuestions) || 0;
  const tc = Number(s.totalCorrect) || 0;
  if (sumQ !== tq) fails.push({ check: "subjectQuestionsSum", sumQ, totalQuestions: tq });
  if (sumC !== tc) fails.push({ check: "subjectCorrectSum", sumC, totalCorrect: tc });
  const oa = Number(s.overallAccuracy) || 0;
  const expectedOa = tq > 0 ? Math.round((tc / tq) * 100) : 0;
  if (tq > 0 && oa !== expectedOa) {
    fails.push({ check: "overallAccuracy", report: oa, expected: expectedOa });
  }
  return { pass: fails.length === 0, fails };
}

/**
 * @param {object} summary
 * @param {Record<string, { totalQ: number, correctQ: number, accuracyPct: number }>} subj
 */
export function assertPerSubjectTotals(summary, subj) {
  const pairs = [
    ["math", "mathQuestions", "mathCorrect", "mathAccuracy"],
    ["geometry", "geometryQuestions", "geometryCorrect", "geometryAccuracy"],
    ["english", "englishQuestions", "englishCorrect", "englishAccuracy"],
    ["science", "scienceQuestions", "scienceCorrect", "scienceAccuracy"],
    ["hebrew", "hebrewQuestions", "hebrewCorrect", "hebrewAccuracy"],
    ["moledet_geography", "moledetGeographyQuestions", "moledetGeographyCorrect", "moledetGeographyAccuracy"],
  ];
  const fails = [];
  for (const [key, qk, ck, ak] of pairs) {
    const o = subj[key] || subj[key === "moledet_geography" ? "moledet_geography" : key];
    if (!o) continue;
    const rq = Number(summary?.[qk]) || 0;
    const rc = Number(summary?.[ck]) || 0;
    const ra = Number(summary?.[ak]) || 0;
    if (rq !== o.totalQ) fails.push({ subject: key, field: qk, report: rq, oracle: o.totalQ });
    if (rc !== o.correctQ) fails.push({ subject: key, field: ck, report: rc, oracle: o.correctQ });
    if (o.totalQ > 0) {
      const oracleInt = Math.round(o.accuracyPct);
      if (ra !== oracleInt && Math.abs(ra - o.accuracyPct) > 0.75) {
        fails.push({ subject: key, field: ak, report: ra, oracle: o.accuracyPct, oracleInt });
      }
    }
  }
  return { pass: fails.length === 0, fails };
}

/**
 * Topic-map rollups must equal subject totals on `summary` (same source as parent-report UI).
 */
export function assertSubjectRollupsMatchSummary(baseReport) {
  const s = baseReport?.summary || {};
  const fails = [];
  const pairs = [
    ["mathOperations", "mathQuestions", "mathCorrect"],
    ["geometryTopics", "geometryQuestions", "geometryCorrect"],
    ["englishTopics", "englishQuestions", "englishCorrect"],
    ["scienceTopics", "scienceQuestions", "scienceCorrect"],
    ["hebrewTopics", "hebrewQuestions", "hebrewCorrect"],
    ["moledetGeographyTopics", "moledetGeographyQuestions", "moledetGeographyCorrect"],
  ];
  const sumQ = (m) =>
    Object.values(m || {}).reduce((a, r) => a + (Number(r?.questions) || 0), 0);
  const sumC = (m) =>
    Object.values(m || {}).reduce((a, r) => a + (Number(r?.correct) || 0), 0);

  for (const [mapName, qk, ck] of pairs) {
    const m = baseReport?.[mapName];
    const rq = sumQ(m);
    const rc = sumC(m);
    const sq = Number(s[qk]) || 0;
    const sc = Number(s[ck]) || 0;
    if (rq !== sq) fails.push({ map: mapName, field: qk, rolledUp: rq, summary: sq });
    if (rc !== sc) fails.push({ map: mapName, field: ck, rolledUp: rc, summary: sc });
  }
  return { pass: fails.length === 0, fails };
}

/**
 * Per-row accuracy = round(correct/questions*100); correct + wrong ≈ questions when both present.
 */
export function assertRowAccuracyArithmetic(baseReport) {
  const fails = [];
  for (const mapName of MAP_KEYS) {
    const m = baseReport?.[mapName];
    if (!m || typeof m !== "object") continue;
    for (const [rowKey, row] of Object.entries(m)) {
      const q = Number(row?.questions) || 0;
      const c = Number(row?.correct) || 0;
      const w = Number(row?.wrong);
      const acc = Number(row?.accuracy);
      if (q <= 0) continue;
      const expectedAcc = Math.round((c / q) * 100);
      if (Number.isFinite(acc) && Math.abs(acc - expectedAcc) > 1) {
        fails.push({ map: mapName, rowKey, reportAcc: acc, expectedAcc, q, c });
      }
      if (Number.isFinite(w) && Number.isFinite(c) && c + w !== q) {
        fails.push({ map: mapName, rowKey, issue: "correct+wrong !== questions", c, w, q });
      }
    }
  }
  return { pass: fails.length === 0, fails };
}

/**
 * Sum of row `timeMinutes` across maps should match `summary.totalTimeMinutes`.
 */
export function assertPracticeMinutesAligned(baseReport) {
  let sumMin = 0;
  for (const mapName of MAP_KEYS) {
    const m = baseReport?.[mapName];
    if (!m || typeof m !== "object") continue;
    for (const row of Object.values(m)) {
      sumMin += Number(row?.timeMinutes) || 0;
    }
  }
  const rep = Number(baseReport?.summary?.totalTimeMinutes) || 0;
  const delta = Math.abs(sumMin - rep);
  return { pass: delta <= 8, sumMin, report: rep, delta };
}

/**
 * Subjects with zero questions in summary must not list substantive weaknesses (only monitoring / empty).
 */
export function assertNoDataSubjectsNotFailed(detailedReport, summary) {
  const fails = [];
  const pairs = [
    ["math", "mathQuestions"],
    ["geometry", "geometryQuestions"],
    ["english", "englishQuestions"],
    ["science", "scienceQuestions"],
    ["hebrew", "hebrewQuestions"],
    ["moledet-geography", "moledetGeographyQuestions"],
  ];
  const profiles = Array.isArray(detailedReport?.subjectProfiles) ? detailedReport.subjectProfiles : [];
  const bySub = Object.fromEntries(profiles.map((p) => [p.subject, p]));
  for (const [sid, qk] of pairs) {
    const n = Number(summary?.[qk]) || 0;
    if (n > 0) continue;
    const sp = bySub[sid];
    if (!sp) continue;
    const tw = sp.topWeaknesses || [];
    if (tw.length > 0) {
      fails.push({ subject: sid, issue: "weakness rows while subject question count is 0", topWeaknesses: tw });
    }
  }
  return { pass: fails.length === 0, fails };
}

/**
 * Rows with zero questions must not carry actionable weakness/strength flags that imply failure.
 * @param {object} baseReport
 */
export function assertZeroQuestionRowsNotScoredAsFailures(baseReport) {
  const fails = [];
  for (const mapName of MAP_KEYS) {
    const m = baseReport?.[mapName];
    if (!m || typeof m !== "object") continue;
    for (const [rowKey, row] of Object.entries(m)) {
      const q = Number(row?.questions) || 0;
      if (q !== 0) continue;
      if (row?.needsPractice === true) {
        fails.push({ map: mapName, rowKey, issue: "needsPractice true with 0 questions" });
      }
      const acc = Number(row?.accuracy);
      if (Number.isFinite(acc) && acc === 0 && q === 0) {
        fails.push({ map: mapName, rowKey, issue: "accuracy 0% with 0 questions (phantom failure band)" });
      }
    }
  }
  return { pass: fails.length === 0, fails };
}

function normHe(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Report strengths/weaknesses must trace to engine units (pattern/display names).
 * @param {object} baseReport
 * @param {object} detailedReport
 */
export function assertEngineReportSubjectSync(baseReport, detailedReport) {
  const unitsAll = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units : [];

  const fails = [];
  const profiles = Array.isArray(detailedReport?.subjectProfiles) ? detailedReport.subjectProfiles : [];
  for (const sp of profiles) {
    const sid = String(sp?.subject || "");
    const units = unitsAll.filter((u) => String(u.subjectId || "") === sid);
    const diagnosed = units.filter((u) => u?.diagnosis?.allowed && String(u?.taxonomy?.patternHe || "").trim());
    const patternSet = new Set();
    const taxonomyIdSet = new Set();
    for (const u of diagnosed) {
      const rawPattern = normHe(u?.taxonomy?.patternHe);
      if (rawPattern) patternSet.add(rawPattern);
      const parentPattern = normHe(parentFacingPatternLabelHe(u));
      if (parentPattern) patternSet.add(parentPattern);
      const tid = String(u?.taxonomy?.id || u?.diagnosis?.taxonomyId || "").trim();
      if (tid) taxonomyIdSet.add(tid);
    }
    const strengthNames = new Set();
    for (const u of units) {
      const a = u?.canonicalState?.actionState || "";
      if (a === "maintain" || a === "expand_cautiously") {
        strengthNames.add(normHe(u.displayName));
      }
    }

    for (const w of sp.topWeaknesses || []) {
      const label = normHe(w?.labelHe);
      if (!label) continue;
      let hit = false;
      const weaknessTaxonomyId = String(w?.taxonomyId || "").trim();
      if (weaknessTaxonomyId && taxonomyIdSet.has(weaknessTaxonomyId)) {
        hit = true;
      }
      for (const p of patternSet) {
        if (hit) break;
        if (!p) continue;
        if (p.includes(label) || label.includes(p)) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        fails.push({
          kind: "weakness_not_in_engine_patterns",
          subject: sid,
          labelHe: w?.labelHe,
        });
      }
    }
    for (const s of sp.topStrengths || []) {
      const label = normHe(s?.labelHe);
      if (!label) continue;
      let hit = strengthNames.has(label);
      if (!hit) {
        for (const sn of strengthNames) {
          if (sn.includes(label) || label.includes(sn)) {
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        fails.push({
          kind: "strength_displayName_not_in_engine",
          subject: sid,
          labelHe: s?.labelHe,
        });
      }
    }
  }
  return { pass: fails.length === 0, fails };
}

/**
 * Facets.executive.majorTrendsHe / rowTrends should not contradict session oracle for longitudinal scenarios.
 */
export function assertTrendVsStorageOracle(facets, storage, expectation) {
  const oracle = accuracyTrendDirectionFromSessions(collectSessionsFromStorageSnapshot(storage));
  const rows = facets?.rowTrends || [];
  const maj = (facets?.executive?.majorTrendsHe || []).join(" ");

  if (!expectation || expectation === "any") {
    return { pass: true, oracle, skipped: true };
  }

  const sufficientUp = rows.filter((r) => r.accuracyDirection === "up" && r.trendEvidenceStatus !== "insufficient").length;
  const sufficientDown = rows.filter((r) => r.accuracyDirection === "down" && r.trendEvidenceStatus !== "insufficient").length;
  const flatOnly =
    rows.length > 0 &&
    rows.every((r) => r.accuracyDirection === "flat" || r.trendEvidenceStatus === "insufficient");

  let pass = true;
  let detail = { expectation, oracle: oracle.direction, sufficientUp, sufficientDown, flatOnly };

  if (expectation === "up" || expectation === "improving") {
    pass =
      sufficientUp >= 1 ||
      oracle.direction === "up" ||
      /שיפור|עולה/i.test(maj);
  } else if (expectation === "down" || expectation === "declining") {
    pass =
      sufficientDown >= 1 ||
      oracle.direction === "down" ||
      /ירידה|יורד/i.test(maj);
  } else if (expectation === "flat" || expectation === "stable") {
    pass = flatOnly || oracle.direction === "flat" || /יציב/i.test(maj);
  } else if (expectation === "insufficient") {
    pass = oracle.direction === "insufficient" || rows.every((r) => r.trendEvidenceStatus === "insufficient");
  }

  return { pass, oracle, detail };
}

/**
 * Thin sample: no unit should claim excellent authority on <8 questions (mirrors report-assertion-engine).
 * @param {object} baseReport
 */
export function assertNoFalseStrongConclusion(baseReport) {
  const units = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units : [];
  const bad = units.filter(
    (u) =>
      u?.canonicalState?.evidence?.positiveAuthorityLevel === "excellent" &&
      Number(u?.canonicalState?.evidence?.questions) > 0 &&
      Number(u?.canonicalState?.evidence?.questions) < 8
  );
  return { pass: bad.length === 0, badUnits: bad.map((u) => ({ subjectId: u.subjectId, displayName: u.displayName, q: u?.canonicalState?.evidence?.questions })) };
}

/**
 * @param {object} baseReport
 * @param {{ minQuestions?: number }} [opts]
 */
export function assertThinProfileStaysCautious(baseReport, opts = {}) {
  const minQ = opts.minQuestions ?? 60;
  const summaryQ = Number(baseReport?.summary?.totalQuestions) || 0;
  if (summaryQ >= minQ) return { pass: true, skipped: true, summaryQ };

  const units = Array.isArray(baseReport?.diagnosticEngineV2?.units) ? baseReport.diagnosticEngineV2.units : [];
  const strongDiagnosis = units.filter(
    (u) =>
      u?.diagnosis?.allowed &&
      String(u?.priority?.level || "") === "P4" &&
      Number(u?.evidenceTrace?.[0]?.value?.questions) > 0 &&
      Number(u?.evidenceTrace?.[0]?.value?.questions) < 10
  );
  return {
    pass: strongDiagnosis.length === 0,
    strongDiagnosis,
    summaryQ,
  };
}

const LEAK_PATTERNS = [
  /\bDEBUG\b/,
  /\[object Object\]/,
  /\bNaN\b/,
  /error\.stack/i,
  /undefined/i,
];

/**
 * @param {string} corpus
 */
export function assertNoCorpusLeaks(corpus) {
  const hits = [];
  const s = String(corpus || "");
  for (const re of LEAK_PATTERNS) {
    if (re.test(s)) hits.push(re.source);
  }
  return { pass: hits.length === 0, hits };
}

/**
 * Serialize selected report slices and forbid internal debug keys in user-facing structures.
 * @param {object} baseReport
 * @param {object} detailedReport
 */
export function assertNoDebugKeysInReportPayload(baseReport, detailedReport) {
  const fails = [];
  const walk = (obj, path) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((x, i) => walk(x, `${path}[${i}]`));
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      const p = `${path}.${k}`;
      const blockParents =
        path.includes("contractsV1") ||
        path.includes("topicEngineRowSignals") ||
        path.includes("diagnosticEngineV2") ||
        path.includes("_priorityScore");
      if (!blockParents && String(k).startsWith("_deprecated")) {
        fails.push({ path: p, key: k });
      }
      if (typeof v === "object" && v) walk(v, p);
    }
  };
  walk(detailedReport?.subjectProfiles, "subjectProfiles");
  walk(detailedReport?.executiveSummary, "executiveSummary");
  walk(detailedReport?.crossSubjectInsights, "crossSubjectInsights");
  walk(detailedReport?.parentProductContractV1, "parentProductContractV1");
  return { pass: fails.length === 0, fails };
}

/**
 * Contract / facets evidence should align with engine window totals when present.
 */
export function assertEvidenceContractConsistent(facets, baseReport) {
  const wq = Number(facets?.executive?.windowTotalQuestions) || 0;
  const tq = Number(facets?.summary?.totalQuestions) || Number(baseReport?.summary?.totalQuestions) || 0;
  const contractQ = Number(facets?.contract?.topEvidenceQuestionCount) || 0;
  const pass = contractQ === 0 || contractQ <= Math.max(wq, tq) + 2;
  return { pass, wq, tq, contractQ };
}

/**
 * Pace separation: fast_wrong aggregate mean session duration should be below slow_correct when both sampled.
 * @param {{ meanSessionDurationSec?: number|null }} fastOracle
 * @param {{ meanSessionDurationSec?: number|null }} slowOracle
 */
export function assertFastWrongVsSlowCorrectPace(fastOracle, slowOracle) {
  const a = fastOracle?.meanSessionDurationSec;
  const b = slowOracle?.meanSessionDurationSec;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { pass: true, skipped: true, a, b };
  return { pass: a < b, fast: a, slow: b };
}

/** @type {Record<string, { summaryQ: string, mapName: string }>} */
const SUBJECT_LOOKUP = {
  math: { summaryQ: "mathQuestions", mapName: "mathOperations" },
  geometry: { summaryQ: "geometryQuestions", mapName: "geometryTopics" },
  english: { summaryQ: "englishQuestions", mapName: "englishTopics" },
  science: { summaryQ: "scienceQuestions", mapName: "scienceTopics" },
  hebrew: { summaryQ: "hebrewQuestions", mapName: "hebrewTopics" },
  "moledet-geography": { summaryQ: "moledetGeographyQuestions", mapName: "moledetGeographyTopics" },
};

/**
 * Normalize fixture subject ids (`moledet_geography`) to report subject ids (`moledet-geography`).
 */
export function normalizeScenarioSubjectId(raw) {
  const s = String(raw || "").trim();
  if (s === "moledet_geography" || s === "moledet-geography") return "moledet-geography";
  return s;
}

function topicQuestionSumForHint(baseReport, mapName, hint) {
  const m = baseReport?.[mapName];
  if (!m || typeof m !== "object" || hint == null || String(hint).trim() === "") return 0;
  const h = normHe(hint);
  if (!h) return 0;
  let sum = 0;
  for (const [rowKey, row] of Object.entries(m)) {
    const topicPart = String(rowKey).split("\u0001")[0];
    const hay = normHe(`${topicPart} ${rowKey}`);
    if (hay.includes(h) || h.includes(hay)) {
      sum += Number(row?.questions) || 0;
    }
  }
  return sum;
}

/**
 * Guards against internal consistency while simulated volume or intended topic/subject was dropped by filters.
 *
 * @param {object} params
 * @param {object} params.scenario — fixture scenario (subjects, topicTargets, expected)
 * @param {object|null} params.golden — merged golden row
 * @param {{ questionTotal?: number }|null} params.stats — aggregate-runner stats
 * @param {object} params.baseReport
 * @param {object} params.detailedReport
 * @param {object} params.facets
 */
export function evaluateScenarioIntent({ scenario, golden, stats, baseReport, detailedReport, facets }) {
  const fails = [];
  const g = golden && typeof golden === "object" ? golden : {};
  const summary = baseReport?.summary || {};
  const summaryQ = Number(summary.totalQuestions) || 0;
  const simQ = Number(stats?.questionTotal) || 0;
  const repQ = summaryQ;

  const minRatio = g.minRetentionRatio != null ? Number(g.minRetentionRatio) : 0.88;
  const skipRetention = !!g.skipVolumeRetentionCheck;

  if (!skipRetention && simQ > 30 && minRatio > 0) {
    const ratio = repQ / simQ;
    if (ratio < minRatio) {
      fails.push({
        check: "volumeRetention",
        note: "report included far fewer questions than simulator materialized (possible filter/window drop)",
        simulated: simQ,
        included: repQ,
        ratio: Math.round(ratio * 1000) / 1000,
        minRatio,
      });
    }
  }

  if (g.kind === "thin_data" || scenario.scenarioId?.includes("thin_data")) {
    const maxQ = g.maxTotalQuestions != null ? Number(g.maxTotalQuestions) : 90;
    if (summaryQ > maxQ) {
      fails.push({ check: "thinDataMaxQuestions", maxQ, actual: summaryQ });
    }
    const contractQ = Number(facets?.contract?.topEvidenceQuestionCount) || 0;
    const thinFlag = !!facets?.contract?.topThinDowngraded;
    if (summaryQ >= 40 && contractQ >= 40 && !thinFlag) {
      fails.push({
        check: "thinDataEvidenceNotCapped",
        note: "thin profile should not present broad contract evidence without thin downgrade",
        contractQ,
        summaryQ,
      });
    }
  }

  const subs = Array.isArray(scenario.subjects) ? scenario.subjects.map(normalizeScenarioSubjectId) : [];
  const minPerSub = g.minQuestionsEachScenarioSubject != null ? Number(g.minQuestionsEachScenarioSubject) : null;

  if (minPerSub != null && minPerSub > 0 && subs.length > 0) {
    for (const sid of subs) {
      const lu = SUBJECT_LOOKUP[sid];
      if (!lu) continue;
      const n = Number(summary[lu.summaryQ]) || 0;
      if (n < minPerSub) {
        fails.push({
          check: "minQuestionsEachScenarioSubject",
          subject: sid,
          expected: minPerSub,
          actual: n,
        });
      }
    }
  }

  const focus = g.subjectFocus ? normalizeScenarioSubjectId(g.subjectFocus) : null;
  const minFocus =
    g.minQuestionsOnFocusedSubject != null ? Number(g.minQuestionsOnFocusedSubject) : focus && g.kind?.includes("weak") ? 32 : null;

  if (focus && minFocus != null && minFocus > 0) {
    const lu = SUBJECT_LOOKUP[focus];
    if (lu) {
      const n = Number(summary[lu.summaryQ]) || 0;
      if (n < minFocus) {
        fails.push({
          check: "minQuestionsOnFocusedSubject",
          subject: focus,
          expected: minFocus,
          actual: n,
        });
      }
    }
  }

  const topicHint = g.weaknessTopicHint || g.topicHint;
  const minTopicQ =
    g.minQuestionsOnTopicHint != null ? Number(g.minQuestionsOnTopicHint) : topicHint && focus ? 18 : null;

  if (focus && topicHint && minTopicQ != null && minTopicQ > 0) {
    const lu = SUBJECT_LOOKUP[focus];
    if (lu) {
      const tq = topicQuestionSumForHint(baseReport, lu.mapName, topicHint);
      if (tq < minTopicQ) {
        fails.push({
          check: "minQuestionsOnTopicHint",
          subject: focus,
          hint: topicHint,
          expected: minTopicQ,
          actual: tq,
        });
      }
    }
  }

  if (g.expectMultiSubjectSignal && scenario.engineTruthKind === "mixed_strengths") {
    const mq = Number(summary.mathQuestions) || 0;
    const hq = Number(summary.hebrewQuestions) || 0;
    const minM = g.minQuestionsMath != null ? Number(g.minQuestionsMath) : 28;
    const minH = g.minQuestionsHebrew != null ? Number(g.minQuestionsHebrew) : 28;
    if (mq < minM) fails.push({ check: "mixedStrengthsMathVolume", expected: minM, actual: mq });
    if (hq < minH) fails.push({ check: "mixedStrengthsHebrewVolume", expected: minH, actual: hq });
  }

  const expectWeak = g.expectWeakProfile === true || (g.kind && String(g.kind).includes("weak"));
  if (expectWeak && focus) {
    const profiles = Array.isArray(detailedReport?.subjectProfiles) ? detailedReport.subjectProfiles : [];
    const sp = profiles.find((p) => normalizeScenarioSubjectId(p.subject) === focus);
    const weakRows = sp?.topWeaknesses?.length || 0;
    const needs = (baseReport?.analysis?.needsPractice || []).length;
    const diagN = Number(facets?.diagnostic?.diagnosedCount) || 0;
    const weakTopicTargets = (scenario.topicTargets || []).filter((t) => !t.optional);
    if (weakTopicTargets.length > 0 && weakRows === 0 && diagN === 0 && needs === 0) {
      fails.push({
        check: "expectWeakSignal",
        note: "scenario targets a weak topic but report shows no weakness/diagnosis/practice signal",
        subject: focus,
      });
    }
  }

  const exp = scenario.expected && typeof scenario.expected === "object" ? scenario.expected : {};
  const mustWeak = exp.topWeaknessExpected;
  if (Array.isArray(mustWeak) && mustWeak.length > 0) {
    const corpusRaw = [
      ...(facets?.topicLayer?.topWeaknessLabels || []),
      ...(facets?.executive?.topFocusAreasHe || []),
      ...((baseReport?.analysis?.needsPractice || []).map(String)),
      JSON.stringify(facets?.diagnostic?.unitSummaries || []),
    ].join(" | ");
    const corpusNorm = normHe(corpusRaw);
    const hits = mustWeak.filter((ph) => typeof ph === "string" && ph.trim() && corpusNorm.includes(normHe(ph.trim())));
    if (hits.length === 0) {
      fails.push({ check: "expectedTopWeaknessInModel", phrases: mustWeak });
    }
  }

  const hardFails = fails.filter((r) => r.severity !== "warn");
  return { pass: hardFails.length === 0, fails };
}

export { MAP_KEYS, SUBJECT_ID_FROM_MAP };
