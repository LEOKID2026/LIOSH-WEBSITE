/**
 * Topic alignment artifact — verifies fast_errors cohort uses one topic end-to-end.
 */

export function buildSpeedPressureTopicAlignmentDebug({ runId, bridgeDebug, patchAudit }) {
  const students = (bridgeDebug?.students || []).map((s) => {
    const a = s.alignment || {};
    return {
      login: s.login,
      grade: s.grade,
      subject: s.primarySubject,
      selectedTopicKey: a.selectedTopicKey ?? s.curriculumTopic,
      topicSource: s.topicSource ?? patchAudit?.students?.find((p) => p.login === s.login)?.topicSource,
      cohortAnswersTopicKey: a.cohortAnswersTopicKey ?? null,
      speedShellsTopicKey: a.speedShellsTopicKey ?? null,
      probeTopicKey: a.probeTopicKey ?? s.curriculumTopic,
      aggregateTopicExists: a.aggregateTopicExists ? "yes" : "no",
      aggregateSpeedCount: a.aggregateSpeedCount ?? 0,
      gradeSliceSpeedCount: a.gradeSliceSpeedCount ?? 0,
      V2RowExistsForSelectedTopic: a.V2RowExistsForSelectedTopic ? "yes" : "no",
      rowModeKey: a.rowModeKey ?? "—",
      rowSignalsExists: a.rowSignalsExists ? "yes" : "no",
      engineDecision: a.engineDecision ?? "—",
      speedPressureTriggered: s.speedPressureTriggered ? "yes" : "no",
      topicMismatch: a.topicMismatch ? "yes" : "no",
      whyMissing: a.whyMissing ?? (s.speedPressureTriggered ? null : s.table?.reasonSpeedPressureMissing),
    };
  });

  const fullyAligned = students.filter(
    (s) =>
      s.topicMismatch === "no" &&
      s.cohortAnswersTopicKey === s.selectedTopicKey &&
      (s.speedShellsTopicKey === s.selectedTopicKey || s.aggregateSpeedCount > 0) &&
      s.probeTopicKey === s.selectedTopicKey,
  ).length;

  const topicMismatchCount = students.filter((s) => s.topicMismatch === "yes").length;
  const aggSpeedNoV2 = students.filter(
    (s) => s.aggregateSpeedCount > 0 && s.V2RowExistsForSelectedTopic === "no",
  ).length;
  const v2RowWrongMode = students.filter(
    (s) => s.V2RowExistsForSelectedTopic === "yes" && s.rowModeKey !== "speed" && s.rowModeKey !== "—",
  ).length;
  const v2RowMissingMode = students.filter(
    (s) => s.V2RowExistsForSelectedTopic === "yes" && (s.rowModeKey === "—" || !s.rowModeKey),
  ).length;
  const aggSpeedWithV2 = students.filter(
    (s) => s.aggregateSpeedCount > 0 && s.V2RowExistsForSelectedTopic === "yes",
  ).length;
  const speedPressureCount = students.filter((s) => s.speedPressureTriggered === "yes").length;

  return {
    runId,
    curriculumTopicStrategy: patchAudit?.curriculumTopicStrategy || "defaultTopicForSubject",
    fastErrorsCount: students.length,
    summary: {
      fullyAligned,
      topicMismatchCount,
      aggregateSpeedButNoV2Row: aggSpeedNoV2,
      v2RowButModeKeyNotSpeed: v2RowWrongMode + v2RowMissingMode,
      aggSpeedWithV2Row: aggSpeedWithV2,
      speedPressurePatternCount: speedPressureCount,
    },
    students,
  };
}

export function buildSpeedPressureTopicAlignmentDebugMarkdown(debug) {
  const s = debug.summary;
  const lines = [
    "# Speed Pressure Topic Alignment Debug",
    "",
    `**Run ID:** ${debug.runId}`,
    `**Strategy:** ${debug.curriculumTopicStrategy}`,
    `**fast_errors students:** ${debug.fastErrorsCount}`,
    "",
    "## Summary",
    "",
    `| metric | count |`,
    `| ------ | ----: |`,
    `| fully aligned (same topic across seed/probe) | ${s.fullyAligned}/${debug.fastErrorsCount} |`,
    `| topic mismatch | ${s.topicMismatchCount} |`,
    `| aggregate speed > 0 but no V2 row | ${s.aggregateSpeedButNoV2Row} |`,
    `| V2 row exists but modeKey ≠ speed | ${s.v2RowButModeKeyNotSpeed} |`,
    `| aggSpeed > 0 + V2 row exists | ${s.aggSpeedWithV2Row} |`,
    `| speed_pressure_pattern | ${s.speedPressurePatternCount} |`,
    "",
    "## Per-student alignment",
    "",
    "| login | selectedTopic | cohort answers topic | shells topic | probe topic | agg exists | agg speed | gradeSlice speed | V2 row | modeKey | signals | decision | mismatch | why missing |",
    "| ----- | ------------- | -------------------- | ------------ | ----------- | ---------- | --------: | ---------------: | ------ | ------- | ------- | -------- | -------- | ----------- |",
  ];

  for (const row of debug.students) {
    const fmt = (v) => (Array.isArray(v) ? v.join(",") : v ?? "—");
    lines.push(
      `| ${row.login} | ${row.selectedTopicKey} | ${fmt(row.cohortAnswersTopicKey)} | ${fmt(row.speedShellsTopicKey)} | ${row.probeTopicKey} | ${row.aggregateTopicExists} | ${row.aggregateSpeedCount} | ${row.gradeSliceSpeedCount} | ${row.V2RowExistsForSelectedTopic} | ${row.rowModeKey} | ${row.rowSignalsExists} | ${row.engineDecision} | ${row.topicMismatch} | ${(row.whyMissing || "—").replace(/\|/g, "/")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}
