import { aggregateParentReportPayload } from "../../../../lib/parent-server/report-data-aggregate.server.js";
import { collectTopicEngineRowsFromReport } from "../../../../utils/parent-report-engine-insights-he.js";
import { buildEngineDecisionParentTopicCopyHe } from "../../../../utils/parent-report-language/engine-decision-parent-copy-he.js";
import { ENGINE_DECISIONS, SEED_META_KEY } from "./constants.mjs";
import { resolveAlignedSpeedPressureTopic, SPEED_COHORT_PATCH_TAG } from "./curriculum-speed-pressure.mjs";
import { buildParentReportV2FromAggregate } from "./report-v2-bridge.mjs";
import { createServiceClient } from "./supabase.mjs";

function parseReportDate(value) {
  if (value instanceof Date) return value;
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`);
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) throw new Error(`invalid report date: ${value}`);
  return d;
}

function statsFromAnswers(answers) {
  const times = answers.map((a) => a.timeSpentMs).filter((n) => Number.isFinite(n));
  const correct = answers.filter((a) => a.isCorrect).length;
  return {
    count: answers.length,
    correct,
    wrong: answers.length - correct,
    accuracyPct: answers.length ? Math.round((correct / answers.length) * 1000) / 10 : null,
    timeSpentMs: {
      min: times.length ? Math.min(...times) : null,
      max: times.length ? Math.max(...times) : null,
      median: times.length ? times.sort((a, b) => a - b)[Math.floor(times.length / 2)] : null,
    },
    topics: [...new Set(answers.map((a) => a.topic))],
    grades: [...new Set(answers.map((a) => a.gradeLevel))],
    hasQuestionEngine: answers.filter((a) => a.hasQuestionEngine).length,
    hasDiagnosticMetadata: answers.filter((a) => a.hasDiagnosticMetadata).length,
    hasSkillId: answers.filter((a) => a.hasSkillId).length,
    hasSubskillId: answers.filter((a) => a.hasSubskillId).length,
    sources: [...new Set(answers.map((a) => a.source))],
    answeredAtSpread: answers.length
      ? { first: answers[answers.length - 1]?.answeredAt, last: answers[0]?.answeredAt }
      : null,
  };
}

function findCurriculumTopicInAggregate(raw, subject, topic) {
  const topicAgg = raw?.subjects?.[subject]?.topics?.[topic];
  if (!topicAgg) {
    const hits = [];
    for (const [sub, agg] of Object.entries(raw?.subjects || {})) {
      if (agg?.topics?.[topic]) hits.push(sub);
    }
    return { found: false, subject, topic, alternateSubjects: hits, topicAgg: null };
  }
  const gradeSlices = Object.entries(topicAgg.byContentGrade || {}).map(([gradeKey, slice]) => ({
    gradeKey,
    answers: slice.answers,
    accuracy: slice.accuracy,
    modeCounts: slice.modeCounts,
    gradeRelation: slice.gradeRelation,
    registeredGradeLevel: slice.registeredGradeLevel,
  }));
  return {
    found: true,
    subject,
    topic,
    parentModeCounts: topicAgg.modeCounts,
    gradeSlices,
    topicAgg,
  };
}

function resolveEngineDecision(row, gradeKey) {
  const sig = row.topicEngineRowSignals?.engineDiagnosticDecision;
  const fromEngine = sig?.engineDecision;
  const fromHeuristic = buildEngineDecisionParentTopicCopyHe({ ...row, gradeKey })?.engineDecision;
  return {
    engineDecision: fromEngine || fromHeuristic || null,
    source: fromEngine ? "engineDiagnosticDecision" : fromHeuristic ? "heuristic_fallback" : null,
    hasRowSignals: !!row.topicEngineRowSignals,
    modeKey: row.modeKey,
    topicKey: row.topicKey,
    questions: row.questions,
    accuracy: row.accuracy,
    signals: sig || null,
  };
}

function reasonSpeedPressureMissing({
  db,
  aggregateProbe,
  curriculumTopic,
  v2Summary,
  v2Rows,
  probeRow,
  speedRow,
  allDecisions,
}) {
  if (db.seededAnswers === 0 && db.seededShells === 0) {
    return { stage: "seed", reason: "No probe answers or speed shells in DB for this student." };
  }
  if (v2Summary?.totalQuestions === 0) {
    return {
      stage: "v2",
      reason: `V2 report empty (totalQuestions=0, diagnosticPrimarySource=${v2Summary?.diagnosticPrimarySource || "unknown"}). Entire report pipeline failed before probe topic could surface.`,
    };
  }
  if (!aggregateProbe.found) {
    return {
      stage: "aggregate",
      reason: `Curriculum topic ${curriculumTopic} not in aggregate for subject ${aggregateProbe.subject}. Alternate subjects with topic: ${aggregateProbe.alternateSubjects?.join(", ") || "none"}.`,
    };
  }
  if (!probeRow && !speedRow) {
    const sampleTopics = v2Rows.slice(0, 5).map((r) => r.topicKey);
    return {
      stage: "v2",
      reason: `Aggregate has ${curriculumTopic} but no V2 row for that topic or modeKey=speed. V2 topic rows=${v2Rows.length}. Sample topics: ${sampleTopics.join(", ") || "none"}.`,
    };
  }
  const row = probeRow || speedRow;
  const resolved = resolveEngineDecision(row, row.gradeKey);
  if (resolved.engineDecision === "speed_pressure_pattern") {
    return { stage: "engine", reason: null };
  }
  if (resolved.modeKey !== "speed") {
    return {
      stage: "v2",
      reason: `Probe V2 row exists but modeKey=${resolved.modeKey || "missing"} (need speed). Parent aggregate speed count=${aggregateProbe.parentModeCounts?.speed ?? 0}.`,
    };
  }
  if (allDecisions.length && !allDecisions.includes("speed_pressure_pattern")) {
    return {
      stage: "engine",
      reason: `modeKey=speed but engineDecision=${resolved.engineDecision || "none"}. Other decisions on student: ${allDecisions.join(", ")}. Threshold/override did not produce speed_pressure_pattern.`,
    };
  }
  return {
    stage: "engine",
    reason: `Probe row present (modeKey=${resolved.modeKey}, decision=${resolved.engineDecision || "none"}) but speed_pressure_pattern not assigned.`,
  };
}

async function fetchDbSpeedCohortLayer(supabase, studentId, runId, { subject, topic }) {
  const { data: probeAnswersRaw } = await supabase
    .from("answers")
    .select("id, is_correct, answered_at, answer_payload, learning_session_id")
    .eq("student_id", studentId)
    .filter("answer_payload->>topic", "eq", topic)
    .filter("answer_payload->>subject", "eq", subject)
    .order("answered_at", { ascending: false });

  const { data: cohortAnswersRaw } = await supabase
    .from("answers")
    .select("id, answer_payload, learning_sessions!inner(topic, subject, metadata)")
    .eq("student_id", studentId)
    .eq("learning_sessions.subject", subject)
    .contains("learning_sessions.metadata", { patch: SPEED_COHORT_PATCH_TAG });

  const { data: probeShellsRaw } = await supabase
    .from("learning_sessions")
    .select("id, subject, topic, started_at, metadata")
    .eq("student_id", studentId)
    .eq("subject", subject)
    .eq("topic", topic)
    .contains("metadata", { mode: "speed" });

  const { data: probePracticeSessions } = await supabase
    .from("learning_sessions")
    .select("id, subject, topic, started_at, metadata")
    .eq("student_id", studentId)
    .eq("subject", subject)
    .eq("topic", topic)
    .contains("metadata", { patch: SPEED_COHORT_PATCH_TAG });

  const cohortAnswerTopics = [
    ...new Set(
      (cohortAnswersRaw || []).map(
        (a) => a.learning_sessions?.topic || a.answer_payload?.topic || "unknown",
      ),
    ),
  ];
  const cohortShellTopics = [
    ...new Set((probeShellsRaw || []).map((s) => s.topic || "unknown")),
  ];

  const answers = (probeAnswersRaw || []).map((a) => {
    const p = a.answer_payload || {};
    return {
      isCorrect: a.is_correct,
      answeredAt: a.answered_at,
      topic: p.topic,
      subject: p.subject,
      gradeLevel: p.gradeLevel,
      timeSpentMs: p.timeSpentMs,
      mode: p.mode || p.gameMode,
      hasQuestionEngine: !!(p.questionEngine || p.diagnosticMetadata?.metadataSource),
      hasDiagnosticMetadata: !!p.diagnosticMetadata,
      hasSkillId: !!(p.skillId || p.params?.skillId || p.questionEngine?.skillId),
      hasSubskillId: !!(p.subSkill || p.params?.subskillId || p.questionEngine?.subskillId),
      source: p.evidenceCategory || p.clientMeta?.[SEED_META_KEY] === runId ? "seed" : "unknown",
      runTagged: p.clientMeta?.[SEED_META_KEY] === runId,
    };
  });

  return {
    seededAnswers: answers.length,
    seededShells: (probeShellsRaw || []).length,
    seededPracticeSessions: (probePracticeSessions || []).length,
    cohortAnswerTopics,
    cohortShellTopics,
    answerStats: statsFromAnswers(answers),
    shellsSample: (probeShellsRaw || []).slice(0, 3).map((s) => ({
      subject: s.subject,
      topic: s.topic,
      startedAt: s.started_at,
      mode: s.metadata?.mode,
    })),
  };
}

function countAggregateMistakes(raw, subject) {
  let count = 0;
  const sub = raw?.subjects?.[subject];
  if (!sub) return 0;
  for (const topic of Object.values(sub.topics || {})) {
    for (const slice of Object.values(topic.byContentGrade || {})) {
      count += slice.wrong || 0;
    }
  }
  return count;
}

/**
 * Trace speed-pressure pipeline for one fast_errors student.
 */
export async function traceFastErrorsBridge({ student, runId, fromDate, toDate, selectedTopic }) {
  const supabase = createServiceClient();
  const from = parseReportDate(fromDate);
  const to = parseReportDate(toDate);
  const curriculum = resolveAlignedSpeedPressureTopic(student, selectedTopic);
  const { subject, topic, grade, taxonomy, topicSource } = curriculum;

  const { data: row } = await supabase
    .from("students")
    .select("id, full_name, grade_level")
    .eq("id", student.studentId)
    .maybeSingle();

  const db = await fetchDbSpeedCohortLayer(supabase, student.studentId, runId, { subject, topic });
  const raw = await aggregateParentReportPayload(supabase, row, from, to, {
    includeParentActivities: true,
  });
  const aggregateProbe = findCurriculumTopicInAggregate(raw, subject, topic);
  const aggregateProbeAnswers = aggregateProbe.found
    ? Object.values(aggregateProbe.topicAgg?.byContentGrade || {}).reduce((s, sl) => s + (sl.answers || 0), 0)
    : 0;

  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: row.full_name,
    fromDate: from,
    toDate: to,
  });
  const v2Rows = collectTopicEngineRowsFromReport(v2);
  const gradeSliceSpeedCount = (aggregateProbe.gradeSlices || []).reduce(
    (max, slice) => Math.max(max, slice.modeCounts?.speed || 0),
    0,
  );
  const v2RowForTopic =
    v2Rows.find((r) => (r.topicKey || "").startsWith(`${topic}::grade:g${grade}`)) ||
    v2Rows.find((r) => (r.topicKey || "").startsWith(`${topic}::`)) ||
    v2Rows.find((r) => (r.topicKey || "").includes(topic)) ||
    null;

  const probeRow = v2RowForTopic;
  const speedRow = v2Rows.find((r) => r.modeKey === "speed") || null;
  const resolvedProbe = probeRow ? resolveEngineDecision(probeRow, row.grade_level) : null;
  const resolvedSpeed = speedRow ? resolveEngineDecision(speedRow, row.grade_level) : null;
  const allDecisions = [
    ...new Set(
      v2Rows
        .map((r) => resolveEngineDecision(r, row.grade_level).engineDecision)
        .filter(Boolean),
    ),
  ];

  const missing = reasonSpeedPressureMissing({
    db,
    aggregateProbe,
    curriculumTopic: topic,
    v2Summary: {
      totalQuestions: v2.summary?.totalQuestions,
      diagnosticPrimarySource: v2.diagnosticPrimarySource,
      registeredGradeKey: v2.gradePracticeMeta?.registeredGradeKey,
    },
    v2Rows,
    probeRow,
    speedRow,
    allDecisions,
  });

  const gotSpeedPressure =
    resolvedProbe?.engineDecision === "speed_pressure_pattern" ||
    resolvedSpeed?.engineDecision === "speed_pressure_pattern" ||
    allDecisions.includes("speed_pressure_pattern");

  return {
    login: student.login,
    studentId: student.studentId,
    grade,
    primarySubject: subject,
    curriculumTopic: topic,
    topicSource,
    taxonomy,
    alignment: {
      selectedTopicKey: topic,
      cohortAnswersTopicKey: db.cohortAnswerTopics?.length === 1 ? db.cohortAnswerTopics[0] : db.cohortAnswerTopics,
      speedShellsTopicKey: db.cohortShellTopics?.length === 1 ? db.cohortShellTopics[0] : db.cohortShellTopics,
      probeTopicKey: topic,
      topicMismatch:
        (db.cohortAnswerTopics?.length && !db.cohortAnswerTopics.every((t) => t === topic)) ||
        (db.cohortShellTopics?.length && !db.cohortShellTopics.every((t) => t === topic)),
      aggregateTopicExists: aggregateProbe.found,
      aggregateSpeedCount: aggregateProbe.parentModeCounts?.speed ?? 0,
      gradeSliceSpeedCount,
      V2RowExistsForSelectedTopic: !!v2RowForTopic,
      rowModeKey: probeRow?.modeKey || null,
      rowSignalsExists: !!(probeRow?.topicEngineRowSignals || speedRow?.topicEngineRowSignals),
      engineDecision: gotSpeedPressure
        ? "speed_pressure_pattern"
        : resolvedProbe?.engineDecision || resolvedSpeed?.engineDecision || null,
      whyMissing: gotSpeedPressure ? null : missing.reason,
    },
    pipeline: {
      dbSeed: {
        seededAnswers: db.seededAnswers,
        seededShells: db.seededShells,
        seededPracticeSessions: db.seededPracticeSessions,
        answerStats: db.answerStats,
        shellsSample: db.shellsSample,
      },
      aggregate: {
        probeFound: aggregateProbe.found,
        probeSubject: aggregateProbe.subject,
        probeAnswers: aggregateProbeAnswers,
        aggregateMistakesWrong: countAggregateMistakes(raw, subject),
        totalAnswers: raw.summary?.totalAnswers,
        parentModeCounts: aggregateProbe.parentModeCounts,
        gradeSlices: aggregateProbe.gradeSlices,
        alternateProbeSubjects: aggregateProbe.alternateSubjects,
      },
      v2: {
        totalQuestions: v2.summary?.totalQuestions ?? 0,
        diagnosticPrimarySource: v2.diagnosticPrimarySource,
        registeredGradeKey: v2.gradePracticeMeta?.registeredGradeKey,
        topicRowCount: v2Rows.length,
        probeRow: resolvedProbe,
        speedModeRow: resolvedSpeed,
        allDecisions,
      },
      topicEngineRowSignals: {
        probeRowExists: !!probeRow,
        speedRowExists: !!speedRow,
        rowSignalExists: !!(probeRow?.topicEngineRowSignals || speedRow?.topicEngineRowSignals),
        engineDecision: gotSpeedPressure
          ? "speed_pressure_pattern"
          : resolvedProbe?.engineDecision || resolvedSpeed?.engineDecision || null,
      },
    },
    table: {
      seededAnswers: db.seededAnswers,
      seededShells: db.seededShells,
      aggregateAnswers: aggregateProbeAnswers,
      aggregateMistakes: countAggregateMistakes(raw, subject),
      v2TopicRows: v2Rows.length,
      rowSignalExists: !!(probeRow?.topicEngineRowSignals || speedRow?.topicEngineRowSignals),
      engineDecision: gotSpeedPressure
        ? "speed_pressure_pattern"
        : resolvedProbe?.engineDecision || resolvedSpeed?.engineDecision || null,
      reasonSpeedPressureMissing: gotSpeedPressure ? null : missing.reason,
      failureStage: gotSpeedPressure ? null : missing.stage,
    },
    speedPressureTriggered: gotSpeedPressure,
  };
}

function inferRootCause(students) {
  const failed = students.filter((s) => !s.speedPressureTriggered);
  if (!failed.length) {
    return {
      rootCause: "All fast_errors students reached speed_pressure_pattern.",
      problemIn: [],
      capOrTruncation: false,
      decisionOverride: false,
    };
  }

  const byStage = {};
  for (const s of failed) {
    const stage = s.table.failureStage || "unknown";
    byStage[stage] = (byStage[stage] || 0) + 1;
  }
  const dominantStage = Object.entries(byStage).sort((a, b) => b[1] - a[1])[0];

  const v2Empty = failed.filter((s) => s.pipeline.v2.totalQuestions === 0).length;
  const aggMissing = failed.filter((s) => !s.pipeline.aggregate.probeFound).length;
  const v2NoProbeRow = failed.filter(
    (s) => s.pipeline.aggregate.probeFound && s.pipeline.v2.topicRowCount > 0 && !s.pipeline.v2.probeRow && !s.pipeline.v2.speedModeRow,
  ).length;
  const engineThreshold = failed.filter(
    (s) => (s.pipeline.v2.probeRow || s.pipeline.v2.speedModeRow) && s.table.failureStage === "engine",
  ).length;

  let rootCause = `Dominant failure stage: ${dominantStage?.[0] || "unknown"} (${dominantStage?.[1] || 0}/${failed.length} failed students).`;
  if (v2Empty > failed.length * 0.5) {
    rootCause = `V2 report empty for ${v2Empty}/${failed.length} fast_errors students — generateParentReportV2 returns totalQuestions=0 before probe topic can appear.`;
  } else if (aggMissing > 0) {
    rootCause = `Aggregate missing probe topic for ${aggMissing}/${failed.length} students.`;
  } else if (v2NoProbeRow > 0) {
    rootCause = `Aggregate has curriculum topic but V2 omits that topic row for ${v2NoProbeRow}/${failed.length} students (topic not in V2 weakness/top row set — concentrate seed on one topic).`;
  } else if (engineThreshold > 0) {
    rootCause = `V2 rows exist with modeKey=speed but engine threshold/override blocked speed_pressure_pattern for ${engineThreshold}/${failed.length} students.`;
  }

  const problemIn = [];
  if (failed.some((s) => s.table.seededAnswers === 0)) problemIn.push("seed");
  if (aggMissing > 0) problemIn.push("aggregate");
  if (v2Empty > 0 || v2NoProbeRow > 0) problemIn.push("v2");
  if (engineThreshold > 0) problemIn.push("engine_threshold");

  return {
    rootCause,
    problemIn: [...new Set(problemIn)],
    failureStageCounts: byStage,
    v2EmptyCount: v2Empty,
    aggregateMissingProbe: aggMissing,
    v2MissingProbeRow: v2NoProbeRow,
    engineThresholdCount: engineThreshold,
    capOrTruncation: v2Empty > 0,
    decisionOverride: engineThreshold > 0,
  };
}

export async function buildSpeedPressureBridgeDebug({ students, runId, fromDate, toDate, patchAudit }) {
  const fastErrors = students.filter((s) => s.profile === "fast_errors");
  const topicByLogin = new Map();
  for (const row of patchAudit?.students || patchAudit?.results || []) {
    if (row?.login && row?.topic) topicByLogin.set(row.login, row.topic);
  }
  const traces = [];
  for (const student of fastErrors) {
    traces.push(
      await traceFastErrorsBridge({
        student,
        runId,
        fromDate,
        toDate,
        selectedTopic: student.speedPressureTopic || topicByLogin.get(student.login),
      }),
    );
  }

  const triggered = traces.filter((t) => t.speedPressureTriggered).length;
  const analysis = inferRootCause(traces);

  return {
    runId,
    dateRange: { from: String(fromDate).slice(0, 10), to: String(toDate).slice(0, 10) },
    fastErrorsCount: fastErrors.length,
    speedPressureTriggeredCount: triggered,
    speedPressureTriggeredRate: fastErrors.length ? triggered / fastErrors.length : 0,
    students: traces,
    analysis,
    chain: [
      "DB seed → learning_sessions / answers / shells",
      "aggregateParentReportPayload",
      "generateParentReportV2",
      "topicEngineRowSignals",
      "engineDiagnosticDecision",
    ],
  };
}

export function buildSpeedPressureBridgeDebugMarkdown(debug) {
  const lines = [
    "# Speed Pressure Bridge Debug",
    "",
    `**Run ID:** ${debug.runId}`,
    `**Date range:** ${debug.dateRange.from} → ${debug.dateRange.to}`,
    `**fast_errors students:** ${debug.fastErrorsCount}`,
    `**speed_pressure_pattern triggered:** ${debug.speedPressureTriggeredCount}/${debug.fastErrorsCount}`,
    "",
    "## Pipeline chain",
    ...debug.chain.map((c) => `- ${c}`),
    "",
    "## Root cause",
    "",
    debug.analysis.rootCause,
    "",
    `- problem in: ${debug.analysis.problemIn?.join(", ") || "—"}`,
    `- failure stages: ${JSON.stringify(debug.analysis.failureStageCounts || {})}`,
    `- V2 empty reports: ${debug.analysis.v2EmptyCount ?? "—"}`,
    `- aggregate missing probe: ${debug.analysis.aggregateMissingProbe ?? "—"}`,
    `- V2 missing probe row: ${debug.analysis.v2MissingProbeRow ?? "—"}`,
    `- engine threshold blocks: ${debug.analysis.engineThresholdCount ?? "—"}`,
    `- cap/truncation suspected: ${debug.analysis.capOrTruncation ? "yes" : "no"}`,
    `- decision override suspected: ${debug.analysis.decisionOverride ? "yes" : "no"}`,
    "",
    "## Per-student bridge table",
    "",
    "| login | grade | subject | curriculum topic | seeded answers | seeded shells | aggregate answers | aggregate mistakes | V2 topic rows | row signal | engine decision | failure stage | reason |",
    "| ----- | ----: | ------- | ---------------- | -------------: | ------------: | ----------------: | -----------------: | ------------: | ---------- | --------------- | ------------- | ------ |",
  ];

  for (const s of debug.students) {
    const t = s.table;
    lines.push(
      `| ${s.login} | ${s.grade} | ${s.primarySubject} | ${s.curriculumTopic} | ${t.seededAnswers} | ${t.seededShells} | ${t.aggregateAnswers} | ${t.aggregateMistakes} | ${t.v2TopicRows} | ${t.rowSignalExists ? "yes" : "no"} | ${t.engineDecision || "—"} | ${t.failureStage || "—"} | ${(t.reasonSpeedPressureMissing || "OK").replace(/\|/g, "/")} |`,
    );
  }

  lines.push("", "## Detailed traces", "");
  for (const s of debug.students) {
    lines.push(`### ${s.login} (${s.primarySubject}/${s.curriculumTopic}, g${s.grade})`);
    lines.push(`- taxonomy: skillId=${s.taxonomy?.skillId || "—"} subskillId=${s.taxonomy?.subskillId || "—"}`);
    lines.push(`- DB: ${s.pipeline.dbSeed.seededAnswers} answers, ${s.pipeline.dbSeed.seededShells} shells`);
    lines.push(`- aggregate ${s.curriculumTopic}: ${s.pipeline.aggregate.probeFound ? "yes" : "no"} (${s.pipeline.aggregate.probeAnswers} answers, speed modes=${s.pipeline.aggregate.parentModeCounts?.speed ?? 0})`);
    lines.push(`- V2: totalQuestions=${s.pipeline.v2.totalQuestions}, rows=${s.pipeline.v2.topicRowCount}, source=${s.pipeline.v2.diagnosticPrimarySource}`);
    lines.push(`- decisions: ${s.pipeline.v2.allDecisions.join(", ") || "none"}`);
    lines.push(`- speed pressure: ${s.speedPressureTriggered ? "YES" : "NO"} — ${s.table.reasonSpeedPressureMissing || "triggered"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function buildSpeedPressureBridgeCompareMarkdown({ passRun, failRun }) {
  const lines = [
    "# Speed Pressure Bridge — Pass vs Fail Comparison",
    "",
    `| metric | PASS ${passRun.runId} | FAIL ${failRun.runId} |`,
    "| ------ | -------------------: | -------------------: |",
    `| fast_errors | ${passRun.fastErrorsCount} | ${failRun.fastErrorsCount} |`,
    `| speed_pressure triggered | ${passRun.speedPressureTriggeredCount} | ${failRun.speedPressureTriggeredCount} |`,
    `| V2 empty (failed only) | ${passRun.analysis.v2EmptyCount ?? 0} | ${failRun.analysis.v2EmptyCount ?? 0} |`,
    `| dominant failure stage | ${Object.keys(passRun.analysis.failureStageCounts || {})[0] || "none"} | ${Object.keys(failRun.analysis.failureStageCounts || {})[0] || "none"} |`,
    "",
    "## PASS root cause",
    passRun.analysis.rootCause,
    "",
    "## FAIL root cause",
    failRun.analysis.rootCause,
    "",
  ];
  return `${lines.join("\n")}\n`;
}
