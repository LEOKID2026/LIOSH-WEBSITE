/**
 * Final run summary + teacher insights via existing report builders.
 */
import { buildTeacherClassReportPayload } from "../../../lib/teacher-server/teacher-class-report.server.js";
import { buildClassTeacherGuidance } from "../../../lib/teacher-server/teacher-recommendations.server.js";
import { SIM_PARENT_EMAIL, SIM_TEACHER_EMAIL } from "./config.mjs";

function sampleStudents(manifest, slots) {
  return slots
    .map((slot) => manifest.students.find((s) => s.slot === slot))
    .filter(Boolean);
}

export async function fetchTeacherInsights(admin, manifest) {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const report = await buildTeacherClassReportPayload({
    serviceRole: admin,
    teacherId: manifest.teacherId,
    classId: manifest.classId,
    fromDate,
    toDate,
  });

  if (!report.ok) {
    return { ok: false, error: report.code || "report_failed" };
  }

  const guidance = report.payload?.teacherGuidanceBlock || buildClassTeacherGuidance(report.payload);
  return {
    ok: true,
    weakTopics: (guidance?.priorityTopics || guidance?.nextLessonFocus || [])
      .slice(0, 5)
      .map((t) => t.topic || t.topicKey || JSON.stringify(t)),
    attentionStudents: (guidance?.attentionStudents || [])
      .slice(0, 5)
      .map((s) => s.studentName || s.fullNameMasked || s.studentId),
    suggestedGroups: guidance?.suggestedGroups || null,
    nextLessonFocus: (guidance?.nextLessonFocus || [])
      .slice(0, 3)
      .map((t) => (typeof t === "string" ? t : t.topic || t.subject)),
    reportPayload: report.payload,
  };
}

export async function printRunSummary({
  config,
  manifest,
  bootstrapStats,
  plan,
  runResult,
  insights,
  passwordNote,
}) {
  const sample = sampleStudents(manifest, [1, 10, 18]);
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  console.log("\n=== Teacher Classroom Daily Simulation — Summary ===");
  console.log(`Date:                  ${config.date}`);
  console.log(`Grade:                 ${config.grade}`);
  console.log(`Subject of the day:      ${plan.subject}`);
  console.log(`Topics simulated:      ${plan.topics.join(", ")}`);
  console.log("");
  console.log(`QA teacher email:      ${SIM_TEACHER_EMAIL}`);
  console.log(`QA teacher password:   ${passwordNote.teacher}`);
  console.log(`QA sim parent email:   ${SIM_PARENT_EMAIL}`);
  console.log(`QA sim parent password:${passwordNote.parent}`);
  console.log(`Student PIN:           ${config.studentPin} (or SIM_TEACHER_STUDENT_PIN env)`);
  console.log("");
  console.log(`Class ID:              ${manifest.classId}`);
  console.log(`Class report URL:      ${baseUrl}/teacher/class/${manifest.classId}`);
  console.log("Sample student URLs:");
  for (const s of sample) {
    console.log(`  ${baseUrl}/teacher/student/${s.id}   (slot ${String(s.slot).padStart(2, "0")}, ${s.fullName})`);
  }
  console.log("");
  console.log(`Students reused:       ${bootstrapStats?.studentsReused ?? "n/a"}`);
  console.log(`Students created:      ${bootstrapStats?.studentsCreated ?? "n/a"}`);
  console.log(`Students studied:      ${plan.summary.studied}`);
  console.log(`Students skipped:      ${plan.summary.skipped}`);
  console.log(`Sessions completed:    ${runResult?.sessionsCreated ?? 0}`);
  console.log(`Answers recorded:      ${runResult?.answersCreated ?? 0}`);
  console.log(`Run verdict:           ${runResult?.verdict ?? "skipped"}`);
  console.log("");

  if (insights?.ok) {
    console.log("Expected teacher insights:");
    console.log(`  Weak topics:         ${insights.weakTopics.join(", ") || "(none yet)"}`);
    console.log(
      `  Attention students:  ${insights.attentionStudents.length ? insights.attentionStudents.join("; ") : "(none)"}`
    );
    if (insights.suggestedGroups) {
      const g = insights.suggestedGroups;
      console.log(
        `  Suggested groups:    struggling=${(g.struggling || []).length} on_track=${(g.onTrack || g.on_track || []).length} advanced=${(g.advanced || []).length}`
      );
    }
    console.log(`  Next lesson focus:   ${insights.nextLessonFocus.join(", ") || "(none yet)"}`);
  } else if (insights) {
    console.log(`Teacher insights:      unavailable (${insights.error})`);
  }

  console.log("=== Done ===\n");
}

export function passwordNoteFromConfig(config) {
  const teacherFromEnv = Boolean(String(process.env.SIM_TEACHER_PASSWORD || "").trim());
  const parentFromEnv = Boolean(String(process.env.SIM_TEACHER_PARENT_PASSWORD || "").trim());
  return {
    teacher: teacherFromEnv ? "(from SIM_TEACHER_PASSWORD env)" : `${config.teacherPassword} (default — set SIM_TEACHER_PASSWORD to override)`,
    parent: parentFromEnv ? "(from SIM_TEACHER_PARENT_PASSWORD env)" : `${config.parentPassword} (default dev password — set SIM_TEACHER_PARENT_PASSWORD)`,
  };
}
