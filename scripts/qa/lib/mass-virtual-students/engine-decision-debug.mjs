import { collectTopicEngineRowsFromReport } from "../../../../utils/parent-report-engine-insights-he.js";
import { buildEngineDecisionParentTopicCopyHe } from "../../../../utils/parent-report-language/engine-decision-parent-copy-he.js";
import { BEHAVIOR_PROFILES, ENGINE_DECISIONS, SEED_META_KEY } from "./constants.mjs";
import { createServiceClient } from "./supabase.mjs";
import { buildParentReportV2FromAggregate } from "./report-v2-bridge.mjs";

/** Expected engine decision per QA behavior profile (best-effort). */
const PROFILE_EXPECTED_DECISION = {
  strong: "mastery_stable",
  weak: "clear_topic_gap",
  average: "partial_stable",
  single_topic_gap: "clear_topic_gap",
  multi_topic_gap: "topic_needs_strengthening",
  slow_accurate: "mastery_stable",
  fast_errors: "speed_pressure_pattern",
  improving: "topic_needs_strengthening",
  declining: "partial_stable",
  unstable: "topic_needs_strengthening",
  sparse_data: "insufficient_data",
  self_practice_only: "partial_stable",
  parent_assigned_only: "insufficient_data",
  mixed_sources: "partial_stable",
};

function extractDecisionsFromV2Report(v2Report, gradeKey) {
  const rows = collectTopicEngineRowsFromReport(v2Report);
  const findings = [];
  for (const row of rows) {
    const sig = row.topicEngineRowSignals?.engineDiagnosticDecision;
    const fromEngine = sig?.engineDecision;
    const fromHeuristic = buildEngineDecisionParentTopicCopyHe({ ...row, gradeKey })?.engineDecision;
    const engineDecision = fromEngine || fromHeuristic;
    if (!engineDecision) continue;
    findings.push({
      subjectId: row.subjectId,
      topicKey: row.topicKey,
      questions: row.questions,
      accuracy: row.accuracy,
      engineDecision,
      source: fromEngine ? "engineDiagnosticDecision" : "heuristic_fallback",
      hasTopicEngineRowSignals: !!row.topicEngineRowSignals,
    });
  }
  return { rows, findings };
}

async function fetchStudentEvidenceSnapshot(supabase, studentId, runId) {
  const [{ count: answerCount }, { count: sessionCount }, { data: answers }, { data: sessions }] =
    await Promise.all([
      supabase.from("answers").select("id", { count: "exact", head: true }).eq("student_id", studentId),
      supabase
        .from("learning_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId),
      supabase
        .from("answers")
        .select("id, is_correct, answered_at, answer_payload, learning_session_id")
        .eq("student_id", studentId)
        .order("answered_at", { ascending: false })
        .limit(3),
      supabase
        .from("learning_sessions")
        .select("id, subject, topic, started_at, metadata")
        .eq("student_id", studentId)
        .order("started_at", { ascending: false })
        .limit(3),
    ]);

  const { count: parentAttempts } = await supabase
    .from("parent_activity_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  const samplePayload = answers?.[0]?.answer_payload || {};
  const payloadKeys = Object.keys(samplePayload);
  const missingMetadata = [];
  for (const key of ["subject", "topic", "gradeLevel", "isDiagnosticEligible", "evidenceCategory"]) {
    if (samplePayload[key] == null) missingMetadata.push(key);
  }
  if (!samplePayload.questionEngine && !samplePayload.diagnosticMetadata) {
    missingMetadata.push("questionEngine|diagnosticMetadata");
  }
  if (!samplePayload.params?.skillId && !samplePayload.skillId) missingMetadata.push("skillId");
  if (!samplePayload.params?.subskillId && !samplePayload.subSkill) missingMetadata.push("subskillId");

  return {
    dbAnswerCount: answerCount || 0,
    dbSessionCount: sessionCount || 0,
    dbParentAttempts: parentAttempts || 0,
    sampleAnswer: answers?.[0]
      ? {
          isCorrect: answers[0].is_correct,
          answeredAt: answers[0].answered_at,
          payloadKeys,
          subject: samplePayload.subject,
          topic: samplePayload.topic,
          gradeLevel: samplePayload.gradeLevel,
          timeSpentMs: samplePayload.timeSpentMs,
          evidenceCategory: samplePayload.evidenceCategory,
          isDiagnosticEligible: samplePayload.isDiagnosticEligible,
          hasSeedMeta: samplePayload.clientMeta?.[SEED_META_KEY] === runId,
        }
      : null,
    sampleSessions: (sessions || []).map((s) => ({
      subject: s.subject,
      topic: s.topic,
      startedAt: s.started_at,
      mode: s.metadata?.mode || s.metadata?.gameMode,
    })),
    missingMetadata,
  };
}

function pickRepresentativeStudent(students, profileId) {
  return students.find((s) => s.profile === profileId) || null;
}

/**
 * Build engine-decision-debug artifact for summary + JSON export.
 */
export async function buildEngineDecisionDebug({
  students,
  fromDate,
  toDate,
  runId,
  aggregateLoader,
}) {
  const supabase = createServiceClient();
  const actualCounts = Object.fromEntries(ENGINE_DECISIONS.map((d) => [d, 0]));
  const allFindings = [];
  const verificationGap = {
    priorMethod: "extractEngineDecisions on stripInternalReportPayloadFields output",
    priorIssue:
      "engineDecision keys are stripped from parent API payload; mathOperations maps exist only after generateParentReportV2 bridge.",
    fixedMethod: "collectTopicEngineRowsFromReport on V2 report + engineDiagnosticDecision/heuristic",
  };

  for (const student of students) {
    const loaded = await aggregateLoader(student);
    const v2 = await buildParentReportV2FromAggregate(loaded.raw, {
      studentName: loaded.row.full_name,
      fromDate,
      toDate,
    });
    const { findings } = extractDecisionsFromV2Report(v2, loaded.row.grade_level);
    for (const f of findings) {
      actualCounts[f.engineDecision] = (actualCounts[f.engineDecision] || 0) + 1;
      allFindings.push({ ...f, login: student.login, profile: student.profile, studentId: student.studentId });
    }
  }

  const byDecisionType = [];
  for (const decisionType of ENGINE_DECISIONS) {
    const expectedProfiles = BEHAVIOR_PROFILES.filter(
      (p) => PROFILE_EXPECTED_DECISION[p.id] === decisionType,
    ).map((p) => p.id);
    const actualCount = actualCounts[decisionType] || 0;
    const repProfile = expectedProfiles[0] || null;
    const repStudent = repProfile ? pickRepresentativeStudent(students, repProfile) : null;

    let whyNotTriggered = null;
    let sample = null;

    if (actualCount === 0 && repStudent) {
      const loaded = await aggregateLoader(repStudent);
      const evidence = await fetchStudentEvidenceSnapshot(supabase, repStudent.studentId, runId);
      const v2 = await buildParentReportV2FromAggregate(loaded.raw, {
        studentName: loaded.row.full_name,
        fromDate,
        toDate,
      });
      const { rows, findings } = extractDecisionsFromV2Report(v2, loaded.row.grade_level);

      if (decisionType === "speed_pressure_pattern") {
        const speedRow = rows.find((r) => r.modeKey === "speed" || r.mode === "מהירות");
        whyNotTriggered = speedRow
          ? `V2 rows exist but no speed_pressure_pattern (modeKey=${speedRow.modeKey}, acc=${speedRow.accuracy}, q=${speedRow.questions}). Engine requires speedOnlyRisk + modeKey=speed + topic_needs_strengthening|clear_topic_gap. Speed answers are excluded by evidence gate — seed uses practice answers + speed session shells for dominantMode.`
          : "No V2 row with modeKey=speed. Self-practice speed answers are excluded by isCountableSelfPracticeAnswer; patch uses practice answers + speed session shells to set dominantMode=speed.";
      } else if (repProfile === "parent_assigned_only" && evidence.dbParentAttempts === 0) {
        whyNotTriggered =
          "parent_assigned_activities exist but parent_activity_attempts=0 (legacy seed used answer_payload column). Run --patch-parent-assigned to backfill attempts.";
      } else if (rows.length === 0) {
        whyNotTriggered = "No V2 topic rows after aggregate→localStorage→generateParentReportV2 bridge.";
      } else if (findings.length === 0) {
        whyNotTriggered = "V2 topic rows exist but no engineDiagnosticDecision resolved (missing topicEngineRowSignals).";
      } else {
        whyNotTriggered = `Expected ${decisionType} for profile ${repProfile} but got: ${findings.map((f) => f.engineDecision).join(", ") || "none"}.`;
      }

      sample = {
        login: repStudent.login,
        profile: repProfile,
        expectedDecision: decisionType,
        aggregateSummary: loaded.raw.summary,
        aggregateSufficiency: loaded.raw.meta?.evidenceQuality?.student?.dataSufficiency,
        v2TopicRowCount: rows.length,
        v2DecisionsFound: findings.map((f) => f.engineDecision),
        evidence,
        reportPayloadExcerpt: {
          subjectTopicSample: rows.slice(0, 2).map((r) => ({
            subjectId: r.subjectId,
            topicKey: r.topicKey,
            questions: r.questions,
            accuracy: r.accuracy,
            signals: r.topicEngineRowSignals ? "present" : "missing",
          })),
        },
      };
    } else if (actualCount > 0 && repStudent) {
      const match =
        allFindings.find((f) => f.engineDecision === decisionType && f.profile === repProfile) ||
        allFindings.find((f) => f.engineDecision === decisionType);
      sample = match
        ? {
            login: match.login,
            profile: match.profile,
            subjectId: match.subjectId,
            topicKey: match.topicKey,
            questions: match.questions,
            accuracy: match.accuracy,
            engineDecision: match.engineDecision,
            source: match.source,
          }
        : null;
    }

    byDecisionType.push({
      decisionType,
      expectedCount: expectedProfiles.length,
      expectedProfiles,
      actualCount,
      whyNotTriggered,
      sampleStudent: sample,
      missingData: sample?.evidence?.missingMetadata || [],
    });
  }

  return {
    verificationGap,
    decisionsSeen: ENGINE_DECISIONS.filter((d) => (actualCounts[d] || 0) > 0),
    missingDecisions: ENGINE_DECISIONS.filter((d) => !(actualCounts[d] || 0)),
    actualCounts,
    byDecisionType,
    totalTopicFindings: allFindings.length,
  };
}

export function buildEngineDecisionDebugMarkdown(debug) {
  const lines = [
    "# Engine Decision Debug",
    "",
    "## Verification gap (fixed)",
    "",
    `- Prior: ${debug.verificationGap.priorMethod}`,
    `- Issue: ${debug.verificationGap.priorIssue}`,
    `- Fixed: ${debug.verificationGap.fixedMethod}`,
    "",
    "## Summary",
    "",
    `Decisions seen: ${debug.decisionsSeen.join(", ") || "—"}`,
    `Missing: ${debug.missingDecisions.join(", ") || "—"}`,
    `Total topic-level findings: ${debug.totalTopicFindings}`,
    "",
    "## By decision type",
    "",
  ];

  for (const row of debug.byDecisionType) {
    lines.push(`### ${row.decisionType}`);
    lines.push(`- Expected profiles: ${row.expectedProfiles.join(", ") || "—"}`);
    lines.push(`- Actual topic-level count: ${row.actualCount}`);
    if (row.whyNotTriggered) lines.push(`- Why not triggered: ${row.whyNotTriggered}`);
    if (row.sampleStudent?.login) {
      lines.push(`- Sample: ${row.sampleStudent.login} (${row.sampleStudent.profile || "—"})`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export { extractDecisionsFromV2Report, PROFILE_EXPECTED_DECISION };
