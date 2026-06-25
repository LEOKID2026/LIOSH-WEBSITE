/** Documented fields written by speed-pressure cohort seed / patch. */
export const SPEED_PRESSURE_FIELDS_WRITTEN = [
  "learning_sessions.metadata.mode (speed shells)",
  "learning_sessions.metadata.gameMode",
  "learning_sessions.metadata.patch (speed_mode_shell | speed_pressure_probe)",
  "learning_sessions.metadata.massVirtualStudents (runId)",
  "answers.answer_payload.mode (practice)",
  "answers.answer_payload.gameMode (practice)",
  "answers.answer_payload.timeSpentMs (variable, fast wrong <2200ms)",
  "answers.answer_payload.questionEngine",
  "answers.answer_payload.diagnosticMetadata",
  "answers.answer_payload.skillId / subSkill",
  "answers.is_correct",
  "answers.question_id (runId-scoped)",
];

export function buildSpeedPressurePatchMarkdown(audit) {
  if (!audit) return "# Speed Pressure Patch\n\n(no audit recorded)\n";

  const lines = [
    "# Speed Pressure Patch Audit",
    "",
    "**Mutates database:** yes — inserts `learning_sessions` + `answers` rows (does not update existing rows).",
    "",
    "## Scope",
    `- target profile: \`${audit.targetProfile || "fast_errors"}\``,
    `- probe topic: \`${audit.probeTopic || "speed_pressure_probe_v4"}\``,
    `- students targeted: ${audit.studentsTargeted ?? "—"}`,
    `- students patched (new data): ${audit.studentsPatched ?? "—"}`,
    `- students skipped (probe already present): ${audit.studentsSkipped ?? "—"}`,
    `- students failed: ${audit.studentsFailed ?? "—"}`,
    `- practice answers inserted: ${audit.answersInserted ?? "—"}`,
    `- speed session shells inserted: ${audit.speedShellsInserted ?? "—"}`,
    `- practice sessions inserted: ${audit.practiceSessionsInserted ?? "—"}`,
    "",
    "## Fields written",
    ...SPEED_PRESSURE_FIELDS_WRITTEN.map((f) => `- ${f}`),
    "",
    "## Students patched",
  ];

  for (const s of audit.students || []) {
    if (s.skipped) {
      lines.push(`- \`${s.login}\` — skipped (${s.reason || "already seeded"})`);
    } else if (s.ok) {
      lines.push(
        `- \`${s.login}\` — ${s.subject}/${s.topic}: ${s.practiceAnswerCount} answers, ${s.speedShellCount} speed shells`,
      );
    } else {
      lines.push(`- \`${s.login}\` — FAILED: ${s.error}`);
    }
  }

  lines.push("", "## Engine decisions — before / after");
  const b = audit.before || {};
  const a = audit.after || {};
  lines.push(`- speed_pressure_pattern: **${b.speed_pressure_pattern ?? 0} → ${a.speed_pressure_pattern ?? "?"}**`);
  lines.push(`- missingDecisions: ${JSON.stringify(b.missingDecisions || [])} → ${JSON.stringify(a.missingDecisions || [])}`);
  lines.push(`- decisionsSeen count: ${(b.decisionsSeen || []).length} → ${(a.decisionsSeen || []).length}`);
  lines.push("");
  lines.push("### actualCounts (engine-decision-debug)");
  lines.push("| decision | before | after |");
  lines.push("| -------- | -----: | ----: |");
  const keys = new Set([
    ...Object.keys(b.actualCounts || {}),
    ...Object.keys(a.actualCounts || {}),
  ]);
  for (const k of [...keys].sort()) {
    lines.push(`| ${k} | ${b.actualCounts?.[k] ?? 0} | ${a.actualCounts?.[k] ?? 0} |`);
  }

  lines.push("", "## Why patch exists");
  lines.push(
    "Self-practice `mode=speed` answers are excluded by `isCountableSelfPracticeAnswer`. Cohort uses practice answers + speed session shells on isolated topic `speed_pressure_probe_v4` so V2 `modeKey=speed` triggers `speed_pressure_pattern`.",
  );
  lines.push("", "## Built-in seed (1000+)");
  lines.push(
    "Full runs call the same function after activity seed (`seedSpeedPressureCohort`, on by default). Opt out: `--no-seed-speed-pressure`. Manual re-patch: `--verify-only --patch-speed-pressure`.",
  );

  return `${lines.join("\n")}\n`;
}
