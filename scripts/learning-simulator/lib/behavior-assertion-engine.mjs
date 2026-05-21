/**
 * Phase 5 — behavior assertions on oracle metrics + slim report facets (structured first).
 * Does not modify product code; failures include a likely-cause hint for triage.
 */

import { PACE_PROFILE_ORACLE_THRESHOLDS as PACE } from "./pace-profile-oracle.mjs";

/** @typedef {'simulator_data' | 'behavior_oracle_threshold' | 'engine_report' | 'unknown'} LikelyCause */

/**
 * @param {string} assertionId
 * @param {boolean} pass
 * @param {object} expected
 * @param {object} actual
 * @param {LikelyCause} likelyCause
 * @param {object} [evidence]
 */
function row(assertionId, pass, expected, actual, likelyCause, evidence = {}) {
  return {
    assertionId,
    pass: !!pass,
    expected,
    actual,
    likelyCause,
    evidence,
  };
}

/** Matches legacy plain topic keys and grade-aware keys (`topic::grade:g5`). */
function topicBucketKeysIncludeTarget(bucketKeys, topic) {
  const t = String(topic || "").trim();
  if (!t || !Array.isArray(bucketKeys)) return false;
  for (const raw of bucketKeys) {
    const k = String(raw || "").trim();
    if (!k) continue;
    if (k === t || k.startsWith(`${t}::grade:`)) return true;
    const base = k.split("::grade:")[0];
    if (base === t) return true;
  }
  return false;
}

/**
 * When storage trend contradicts profile trendPolicy, data generation may be wrong.
 * When thresholds are arbitrary, flag oracle.
 * When metrics align but report.contract disagrees, flag engine/report pipeline.
 */

function worstRankAmongSubject(topicMetrics, subject, targetTopic, minQ = 12) {
  const keys = Object.keys(topicMetrics).filter((k) => k.startsWith(`${subject}:`));
  const rows = keys
    .map((k) => {
      const m = topicMetrics[k];
      const topic = k.split(":").slice(1).join(":");
      return { key: k, topic, accuracyPct: m.accuracyPct, totalQ: m.totalQ };
    })
    .filter((x) => x.totalQ >= minQ)
    .sort((a, b) => a.accuracyPct - b.accuracyPct);
  if (!rows.length) return { rank: null, ordered: [], targetRow: null };
  const targetRow = rows.find((r) => r.topic === targetTopic) || null;
  const rank = targetRow ? rows.findIndex((r) => r.topic === targetTopic) + 1 : null;
  return { rank, ordered: rows, targetRow };
}

/**
 * @param {object} scenario — QUICK_SCENARIOS entry
 * @param {object} oracle — computeBehaviorOracle(...)
 * @param {Record<string, unknown>|null} report
 */
export function evaluateScenarioBehavior(scenario, oracle, report) {
  /** @type {ReturnType<typeof row>[]} */
  const assertions = [];
  const sid = scenario.scenarioId;
  const exp = scenario.expected && typeof scenario.expected === "object" ? scenario.expected : {};
  const rs = oracle.reportSignals;

  function add(...args) {
    assertions.push(row(...args));
  }

  const qTot = oracle.evidence.questionTotal;
  const overallPct = oracle.evidence.overallAccuracyPct;

  // --- strong_all_subjects_g3_7d ---
  if (sid === "strong_all_subjects_g3_7d") {
    add(
      "evidence_volume_high",
      qTot >= 320,
      { minQuestions: 320 },
      { questionTotal: qTot },
      qTot < 150 ? "simulator_data" : "behavior_oracle_threshold",
      { hint: "Aggregate should simulate rich multi-subject volume." }
    );
    add(
      "overall_accuracy_high",
      overallPct != null && overallPct >= 72,
      { minPct: 72 },
      { overallAccuracyPct: overallPct },
      overallPct != null && overallPct < 55 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const subjects = Array.isArray(scenario.subjects) ? scenario.subjects : [];
    let subjOk = true;
    const subjActual = {};
    for (const sub of subjects) {
      const m = oracle.subjectMetrics[sub];
      const pct = m?.accuracyPct;
      subjActual[sub] = pct ?? null;
      if (pct != null && pct < 58) subjOk = false;
    }
    add(
      "per_subject_accuracy_not_collapsed",
      subjOk,
      { minPctPerSubjectWithData: 58 },
      subjActual,
      !subjOk ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const tr = oracle.trendOracle;
    const trendOk =
      tr.direction === "up" ||
      tr.direction === "flat" ||
      tr.direction === "insufficient" ||
      (tr.direction === "down" && (tr.delta ?? 0) > -0.06);
    add(
      "storage_trend_not_strongly_down",
      trendOk,
      { forbidStrongDecline: true },
      { direction: tr.direction, delta: tr.delta, n: tr.sessionSamples },
      tr.direction === "down" ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const alignQs = rs ? Math.abs((rs.totalQuestions || 0) - qTot) <= 5 : true;
    add(
      "report_total_questions_aligns_meta",
      alignQs,
      { maxAbsDelta: 5 },
      { metaQuestionTotal: qTot, reportTotalQuestions: rs?.totalQuestions ?? null },
      !alignQs ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
    const accAlign =
      overallPct != null && rs
        ? Math.abs((rs.overallAccuracy || 0) - overallPct) <= 12
        : true;
    add(
      "report_overall_accuracy_bracket_matches_meta",
      accAlign,
      { maxAbsDeltaPct: 12 },
      { metaOverall: overallPct, reportOverall: rs?.overallAccuracy ?? null },
      !accAlign ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
  }

  // --- thin_data_g3_1d ---
  if (sid === "thin_data_g3_1d") {
    add(
      "evidence_volume_low",
      qTot < 45,
      { maxQuestions: 45 },
      { questionTotal: qTot },
      qTot > 80 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const cautious =
      rs &&
      (rs.contractTopThinDowngraded === true ||
        rs.contractTopEvidenceQuestionCount < 35 ||
        (exp.confidenceShouldBeCautious !== false && rs.contractTopEvidenceQuestionCount < 40));
    add(
      "thin_downgrade_or_low_evidence_contract",
      !!cautious,
      { thinDowngradeOrLowEvidence: true },
      rs
        ? {
            contractTopThinDowngraded: rs.contractTopThinDowngraded,
            contractTopEvidenceQuestionCount: rs.contractTopEvidenceQuestionCount,
          }
        : null,
      !cautious ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
    const thinAlign = rs ? Math.abs((rs.totalQuestions || 0) - qTot) <= 3 : true;
    add(
      "report_questions_match_meta_thin",
      thinAlign,
      { maxAbsDelta: 3 },
      { metaQuestionTotal: qTot, reportTotalQuestions: rs?.totalQuestions ?? null },
      !thinAlign ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
  }

  // --- strong_all_subjects_g3_30d (deep longitudinal) ---
  if (sid === "strong_all_subjects_g3_30d") {
    add(
      "evidence_volume_deep",
      qTot >= 800,
      { minQuestions: 800 },
      { questionTotal: qTot },
      qTot < 400 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    add(
      "overall_accuracy_high_deep",
      overallPct != null && overallPct >= 70,
      { minPct: 70 },
      { overallAccuracyPct: overallPct },
      overallPct != null && overallPct < 52 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const subjects = Array.isArray(scenario.subjects) ? scenario.subjects : [];
    let subjOk = true;
    const subjActual = {};
    for (const sub of subjects) {
      const m = oracle.subjectMetrics[sub];
      const pct = m?.accuracyPct;
      subjActual[sub] = pct ?? null;
      if (pct != null && pct < 56) subjOk = false;
    }
    add(
      "per_subject_accuracy_strong_deep",
      subjOk,
      { minPctPerSubjectWithData: 56 },
      subjActual,
      !subjOk ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const alignQs = rs ? Math.abs((rs.totalQuestions || 0) - qTot) <= 8 : true;
    add(
      "report_total_questions_aligns_meta_deep",
      alignQs,
      { maxAbsDelta: 8 },
      { metaQuestionTotal: qTot, reportTotalQuestions: rs?.totalQuestions ?? null },
      !alignQs ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
    const accAlign =
      overallPct != null && rs ? Math.abs((rs.overallAccuracy || 0) - overallPct) <= 14 : true;
    add(
      "report_overall_accuracy_bracket_deep",
      accAlign,
      { maxAbsDeltaPct: 14 },
      { metaOverall: overallPct, reportOverall: rs?.overallAccuracy ?? null },
      !accAlign ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
  }

  // --- weak_all_subjects_g3_30d ---
  if (sid === "weak_all_subjects_g3_30d") {
    add(
      "evidence_volume_weak_all_deep",
      qTot >= 680,
      { minQuestions: 680 },
      { questionTotal: qTot },
      qTot < 400 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    add(
      "overall_accuracy_low_weak_all",
      overallPct != null && overallPct <= 62,
      { maxPct: 62 },
      { overallAccuracyPct: overallPct },
      overallPct != null && overallPct > 72 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    const subjects = Array.isArray(scenario.subjects) ? scenario.subjects : [];
    let weakOk = true;
    const subjActual = {};
    for (const sub of subjects) {
      const m = oracle.subjectMetrics[sub];
      const pct = m?.accuracyPct;
      subjActual[sub] = pct ?? null;
      if (pct != null && pct > 68) weakOk = false;
    }
    add(
      "per_subject_stays_weak_vs_strong_baseline",
      weakOk,
      { maxPctPerSubjectWithData: 68 },
      subjActual,
      !weakOk ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
  }

  // --- improving_student_g4_30d / g4_90d ---
  if (sid === "improving_student_g4_30d" || sid === "improving_student_g4_90d") {
    const tr = oracle.trendOracle;
    add(
      "storage_trend_oracle_up",
      tr.direction === "up",
      { direction: "up" },
      { direction: tr.direction, delta: tr.delta, earlyMean: tr.earlyMean, lateMean: tr.lateMean, n: tr.sessionSamples },
      tr.direction !== "up" ? "simulator_data" : "behavior_oracle_threshold",
      { note: "Profile p_improving_student uses accuracy trend start→end; sessions should reflect rising accuracy." }
    );
  }

  // --- declining_student_g4_30d / g4_90d ---
  if (sid === "declining_student_g4_30d" || sid === "declining_student_g4_90d") {
    const tr = oracle.trendOracle;
    add(
      "storage_trend_oracle_down",
      tr.direction === "down",
      { direction: "down" },
      { direction: tr.direction, delta: tr.delta, earlyMean: tr.earlyMean, lateMean: tr.lateMean, n: tr.sessionSamples },
      tr.direction !== "down" ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
  }

  /**
   * @param {{ minTopicQuestions?: number, minRankQuestions?: number, skipBucket?: boolean, skipRank?: boolean }} [opts]
   */
  function weakTopicAssertions(subject, topic, label, opts = {}) {
    const minVol = opts.minTopicQuestions ?? 10;
    const minRankQ = opts.minRankQuestions ?? minVol;
    const key = `${subject}:${topic}`;
    const tm = oracle.topicMetrics[key];
    add(
      `${label}_topic_has_volume`,
      !!(tm && tm.totalQ >= minVol),
      { minTopicQuestions: minVol },
      tm ? { totalQ: tm.totalQ, accuracyPct: tm.accuracyPct } : { missing: key },
      !tm ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    if (opts.skipRank !== true) {
      const { rank, ordered } = worstRankAmongSubject(oracle.topicMetrics, subject, topic, minRankQ);
      const nTopics = ordered.length;
      const rkOk =
        nTopics <= 1 ||
        rank === 1 ||
        (rank != null && rank <= Math.max(2, Math.ceil(nTopics / 2)));
      add(
        `${label}_topic_weak_among_subject`,
        rkOk,
        { maxWeakRank: Math.max(1, Math.ceil((ordered.length || 1) / 2)) },
        { rank, orderedTopicsByAccuracy: ordered.map((x) => ({ t: x.topic, acc: x.accuracyPct, q: x.totalQ })) },
        !rkOk ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }
    if (opts.skipBucket === true) return;
    const bk = rs?.topicBucketKeys || [];
    const reportHintsWeak =
      bk.length === 0 ||
      topicBucketKeysIncludeTarget(bk, topic) ||
      (subject === "science" && topic === "experiments" && topicBucketKeysIncludeTarget(bk, "experiments"));
    add(
      `${label}_report_topic_bucket_alignment`,
      reportHintsWeak,
      { topicBucketKeysIncludesTarget: topic },
      { topicBucketKeys: bk },
      !reportHintsWeak ? "engine_report" : "behavior_oracle_threshold",
      { secondary: true }
    );
  }

  if (sid === "weak_math_fractions_g5_7d") weakTopicAssertions("math", "fractions", "fractions");

  if (sid === "weak_hebrew_comprehension_g3_7d") weakTopicAssertions("hebrew", "comprehension", "comprehension");

  if (sid === "weak_english_grammar_g4_7d") weakTopicAssertions("english", "grammar", "grammar");

  if (sid === "weak_science_cause_effect_g5_7d") weakTopicAssertions("science", "experiments", "experiments");

  if (sid === "weak_geometry_area_g5_7d") weakTopicAssertions("geometry", "area", "area");

  if (sid === "weak_moledet_geography_maps_g4_7d") weakTopicAssertions("moledet_geography", "maps", "maps");

  // --- random_guessing_student_g3_30d ---
  if (sid === "random_guessing_student_g3_30d") {
    add(
      "guess_profile_low_overall_accuracy",
      overallPct != null && overallPct < 56,
      { maxPct: 56 },
      { overallAccuracyPct: overallPct },
      overallPct != null && overallPct >= 65 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    add(
      "guess_profile_not_overconfident_contract",
      !!(rs && (rs.contractTopThinDowngraded === true || (rs.overallAccuracy ?? 100) < 62)),
      { thinOrLowAccuracySummary: true },
      rs
        ? {
            contractTopThinDowngraded: rs.contractTopThinDowngraded,
            overallAccuracy: rs.overallAccuracy,
          }
        : null,
      rs && rs.contractTopThinDowngraded === false && (rs.overallAccuracy ?? 0) >= 78 ? "engine_report" : "behavior_oracle_threshold",
      {}
    );
  }

  // --- inconsistent_student_g5_30d ---
  if (sid === "inconsistent_student_g5_30d") {
    const st = oracle.volatility?.stdev ?? 0;
    add(
      "session_accuracy_volatility_visible",
      st >= 0.048,
      { minSessionAccStdev: 0.048 },
      { stdev: st, n: oracle.volatility?.n },
      st < 0.035 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
  }

  // Deep weak-topic scenarios (same checks as 7d weak_*)
  if (/^weak_.*_g[1-6]_30d$/.test(sid)) {
    const tt = scenario.topicTargets?.find((t) => !t.optional) || scenario.topicTargets?.[0];
    if (tt?.subjectCanonical && tt?.topic) {
      weakTopicAssertions(tt.subjectCanonical, tt.topic, "deep_weak_target");
    }
  }

  // Critical matrix deep harness — scenarioIds critical_deep_*
  if (/^critical_deep_/.test(sid)) {
    const pt = scenario.criticalDeepProfileType || "";
    add(
      "critical_deep_evidence_positive",
      qTot >= 6,
      { minQ: 6 },
      { questionTotal: qTot },
      qTot < 3 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    add(
      "critical_deep_subject_metrics_present",
      Object.keys(oracle.subjectMetrics || {}).length >= 1,
      { minSubjects: 1 },
      { subjects: Object.keys(oracle.subjectMetrics || {}) },
      "simulator_data",
      {}
    );
    if (pt === "weak_on_target_cell") {
      add(
        "critical_weak_volume_or_accuracy_sane",
        qTot < 260 || (overallPct != null && overallPct <= 90),
        {},
        { qTot, overallAccuracyPct: overallPct },
        "engine_report",
        {}
      );
    }
    if (pt === "strong_on_target_cell") {
      add(
        "critical_strong_accuracy_not_collapsed",
        overallPct == null || overallPct >= 35,
        { minPct: 35 },
        { overallAccuracyPct: overallPct },
        "simulator_data",
        {}
      );
    }
    if (pt === "thin_data_on_target_cell") {
      add(
        "critical_thin_evidence_cap",
        qTot <= 650,
        { maxQ: 650 },
        { questionTotal: qTot },
        "simulator_data",
        {}
      );
    }
  }

  // Cross-cutting: contradictory diagnostic confidence flag should stay rare on large windows
  if (rs && oracle.evidence.questionTotal > 400) {
    add(
      "no_diagnostic_contradictory_confidence_spike",
      (rs.contradictoryConfidenceCount || 0) <= 8,
      { maxContradictions: 8 },
      { contradictoryConfidenceCount: rs.contradictoryConfidenceCount },
      (rs.contradictoryConfidenceCount || 0) > 8 ? "engine_report" : "behavior_oracle_threshold",
      { scope: "global_sanity" }
    );
  }

  // Profile stress harness — scenarioIds profile_stress_*
  if (/^profile_stress_/.test(sid)) {
    const pst = scenario.profileStressType || "";

    add(
      "profile_stress_evidence_floor",
      qTot >= 5,
      { minQ: 5 },
      { questionTotal: qTot },
      qTot < 2 ? "simulator_data" : "behavior_oracle_threshold",
      {}
    );
    add(
      "profile_stress_subject_metrics_present",
      Object.keys(oracle.subjectMetrics || {}).length >= 1,
      { minSubjects: 1 },
      { subjects: Object.keys(oracle.subjectMetrics || {}) },
      "simulator_data",
      {}
    );

    if (pst === "thin_data") {
      const cautious =
        rs &&
        (rs.contractTopThinDowngraded === true ||
          rs.contractTopEvidenceQuestionCount < 38 ||
          (exp.confidenceShouldBeCautious !== false && rs.contractTopEvidenceQuestionCount < 42));
      add(
        "profile_stress_thin_cautious",
        !!cautious,
        { thinOrLowEvidence: true },
        rs,
        !cautious ? "engine_report" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "random_guessing") {
      add(
        "profile_stress_low_accuracy_guesslike",
        overallPct != null && overallPct < 62,
        { maxPct: 62 },
        { overallAccuracyPct: overallPct },
        overallPct != null && overallPct >= 72 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
      add(
        "profile_stress_not_overconfident_summary",
        !!(rs && (rs.contractTopThinDowngraded === true || (rs.overallAccuracy ?? 100) < 68)),
        {},
        rs ? { contractTopThinDowngraded: rs.contractTopThinDowngraded, overallAccuracy: rs.overallAccuracy } : null,
        rs && rs.contractTopThinDowngraded === false && (rs.overallAccuracy ?? 0) >= 82 ? "engine_report" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "fast_wrong") {
      const spqFw = oracle.paceOracle?.meanSecondsPerQuestion ?? null;
      const mrate = oracle.evidence?.mistakeRateApprox ?? oracle.paceOracle?.mistakeRateApprox ?? null;
      const repAcc = rs != null ? Number(rs.overallAccuracy) || overallPct : overallPct;

      const lowAcc =
        overallPct != null &&
        overallPct <= PACE.FAST_WRONG_MAX_OVERALL_ACCURACY_PCT &&
        (mrate == null || mrate >= PACE.FAST_WRONG_MIN_MISTAKE_RATE);
      add(
        "fast_wrong_has_low_accuracy",
        lowAcc,
        {
          maxOverallAccuracyPct: PACE.FAST_WRONG_MAX_OVERALL_ACCURACY_PCT,
          minMistakeRateApprox: PACE.FAST_WRONG_MIN_MISTAKE_RATE,
        },
        { overallAccuracyPct: overallPct, mistakeRateApprox: mrate },
        overallPct != null && overallPct > 65 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
      add(
        "fast_wrong_has_fast_pace",
        spqFw != null && spqFw <= PACE.FAST_WRONG_MAX_SPQ,
        { maxMeanSecondsPerQuestion: PACE.FAST_WRONG_MAX_SPQ },
        { meanSecondsPerQuestion: spqFw },
        spqFw != null && spqFw > PACE.FAST_WRONG_MAX_SPQ + 40 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
      add(
        "fast_wrong_not_confused_with_slow_correct",
        !(repAcc != null && spqFw != null && repAcc >= 66 && spqFw >= PACE.SLOW_CORRECT_MIN_SPQ * 0.92),
        { forbidSlowCarefulPattern: true },
        { reportOverallAccuracy: repAcc, meanSecondsPerQuestion: spqFw, thresholdRef: PACE.SLOW_CORRECT_MIN_SPQ },
        repAcc != null && repAcc >= 68 && spqFw != null && spqFw >= PACE.SLOW_CORRECT_MIN_SPQ ? "engine_report" : "behavior_oracle_threshold",
        {}
      );
      add(
        "profile_stress_not_overconfident_summary",
        !!(rs && (rs.contractTopThinDowngraded === true || (rs.overallAccuracy ?? 100) < 62)),
        {},
        rs ? { contractTopThinDowngraded: rs.contractTopThinDowngraded, overallAccuracy: rs.overallAccuracy } : null,
        rs && rs.contractTopThinDowngraded === false && (rs.overallAccuracy ?? 0) >= 78 ? "engine_report" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "slow_correct") {
      const spqSc = oracle.paceOracle?.meanSecondsPerQuestion ?? null;
      const mrateSc = oracle.evidence?.mistakeRateApprox ?? oracle.paceOracle?.mistakeRateApprox ?? null;
      const repAccSc = rs != null ? Number(rs.overallAccuracy) || overallPct : overallPct;

      const highAcc =
        overallPct != null &&
        overallPct >= PACE.SLOW_CORRECT_MIN_OVERALL_ACCURACY_PCT &&
        (mrateSc == null || mrateSc <= PACE.SLOW_CORRECT_MAX_MISTAKE_RATE);
      add(
        "slow_correct_has_high_accuracy",
        highAcc,
        {
          minOverallAccuracyPct: PACE.SLOW_CORRECT_MIN_OVERALL_ACCURACY_PCT,
          maxMistakeRateApprox: PACE.SLOW_CORRECT_MAX_MISTAKE_RATE,
        },
        { overallAccuracyPct: overallPct, mistakeRateApprox: mrateSc },
        overallPct != null && overallPct < 58 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
      add(
        "slow_correct_has_slow_pace",
        spqSc != null && spqSc >= PACE.SLOW_CORRECT_MIN_SPQ,
        { minMeanSecondsPerQuestion: PACE.SLOW_CORRECT_MIN_SPQ },
        { meanSecondsPerQuestion: spqSc },
        spqSc != null && spqSc < PACE.SLOW_CORRECT_MIN_SPQ - 35 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
      add(
        "slow_correct_not_confused_with_fast_wrong",
        !(repAccSc != null && spqSc != null && repAccSc <= 54 && spqSc <= PACE.FAST_WRONG_MAX_SPQ * 1.05),
        { forbidWeakFastPattern: true },
        { reportOverallAccuracy: repAccSc, meanSecondsPerQuestion: spqSc },
        repAccSc != null && repAccSc <= 48 && spqSc != null && spqSc <= PACE.FAST_WRONG_MAX_SPQ ? "engine_report" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "inconsistent") {
      const st = oracle.volatility?.stdev ?? 0;
      add(
        "profile_stress_inconsistent_volatility",
        st >= 0.038,
        { minSessionAccStdev: 0.038 },
        { stdev: st, n: oracle.volatility?.n },
        st < 0.028 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "improving") {
      const tr = oracle.trendOracle;
      const bad = tr.n >= 12 && tr.direction === "down" && (tr.delta ?? 0) < -0.06;
      add(
        "profile_stress_improving_not_strongly_down",
        !bad,
        { forbidStrongDeclineWhenEnoughSessions: true },
        { direction: tr.direction, delta: tr.delta, n: tr.n },
        bad ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }
    if (pst === "declining") {
      const tr = oracle.trendOracle;
      const bad = tr.n >= 12 && tr.direction === "up" && (tr.delta ?? 0) > 0.06;
      add(
        "profile_stress_declining_not_strongly_up",
        !bad,
        { forbidStrongGainWhenEnoughSessions: true },
        { direction: tr.direction, delta: tr.delta, n: tr.n },
        bad ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "strong_all_subjects" || pst === "subject_specific_strong" || pst === "slow_correct") {
      add(
        "profile_stress_strongish_accuracy",
        overallPct == null || overallPct >= 32,
        { minPct: 32 },
        { overallAccuracyPct: overallPct },
        "simulator_data",
        {}
      );
    }

    if (pst === "weak_all_subjects" || pst === "subject_specific_weak" || pst === "topic_specific_weak") {
      add(
        "profile_stress_weakish_accuracy_cap",
        overallPct == null || overallPct <= 92,
        { relaxedMaxPct: 92 },
        { overallAccuracyPct: overallPct },
        overallPct != null && overallPct >= 97 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "average_student") {
      add(
        "profile_stress_average_mid_band",
        overallPct == null || (overallPct >= 38 && overallPct <= 88),
        { band: [38, 88] },
        { overallAccuracyPct: overallPct },
        "behavior_oracle_threshold",
        {}
      );
    }

    if (pst === "mixed_strengths") {
      const mm = oracle.subjectMetrics.math?.accuracyPct;
      const mh = oracle.subjectMetrics.hebrew?.accuracyPct;
      add(
        "profile_stress_mixed_subject_spread",
        mm != null && mh != null && Math.abs(mm - mh) >= 4,
        { minAbsSpread: 4 },
        { math: mm, hebrew: mh },
        mm == null || mh == null ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }

    if (
      (pst === "topic_specific_weak" || pst === "subject_specific_weak") &&
      scenario.stressMatrixSubject &&
      scenario.stressMatrixTopic
    ) {
      weakTopicAssertions(scenario.stressMatrixSubject, scenario.stressMatrixTopic, "stress_weak_target", {
        minTopicQuestions: 6,
        minRankQuestions: 6,
        skipBucket: true,
        skipRank: true,
      });
    }

    if (pst === "subject_specific_strong" && scenario.stressMatrixSubject) {
      const subj = scenario.stressMatrixSubject;
      const keys = Object.keys(oracle.topicMetrics || {}).filter((k) => k.startsWith(`${subj}:`));
      const maxQ = keys.length ? Math.max(...keys.map((k) => oracle.topicMetrics[k]?.totalQ || 0)) : 0;
      add(
        "profile_stress_strong_subject_has_topic_mass",
        maxQ >= 4,
        { minMaxTopicQuestionsAcrossSubject: 4 },
        { subject: subj, keysSampled: keys.slice(0, 8), maxQ },
        maxQ === 0 ? "simulator_data" : "behavior_oracle_threshold",
        {}
      );
    }
  }

  const passed = assertions.every((a) => a.pass);
  return { assertions, passed, scenarioId: sid };
}

/**
 * Summarize likely causes from failed assertions.
 * @param {ReturnType<typeof row>[]} assertions
 */
export function summarizeFailureCauses(assertions) {
  const failed = assertions.filter((a) => !a.pass);
  const counts = { simulator_data: 0, behavior_oracle_threshold: 0, engine_report: 0, unknown: 0 };
  for (const f of failed) {
    const k = f.likelyCause;
    if (counts[k] !== undefined) counts[k] += 1;
    else counts.unknown += 1;
  }
  let dominant = "unknown";
  let best = -1;
  for (const [k, v] of Object.entries(counts)) {
    if (v > best) {
      best = v;
      dominant = k;
    }
  }
  return { failedCount: failed.length, counts, dominantLikelyCause: best > 0 ? dominant : "none" };
}
