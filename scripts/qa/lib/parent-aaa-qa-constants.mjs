/** Shared AAA1–AAA12 parent QA constants (admin@admin.com context). */

export const QA_PARENT_EMAIL = "admin@admin.com";
export const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

export const AAA_CHILDREN = [
  { label: "AAA1", login: "aaa1", grade: 1, scenario: "A_no_data" },
  { label: "AAA2", login: "aaa2", grade: 1, scenario: "B_insufficient_data" },
  { label: "AAA3", login: "aaa3", grade: 2, scenario: "C_preliminary_by_count" },
  { label: "AAA4", login: "aaa4", grade: 2, scenario: "D_preliminary_no_recurrence" },
  { label: "AAA5", login: "aaa5", grade: 3, scenario: "E_supported_diagnosis" },
  { label: "AAA6", login: "aaa6", grade: 3, scenario: "F_parent_assigned" },
  { label: "AAA7", login: "aaa7", grade: 4, scenario: "G_non_diagnostic_exclusion" },
  { label: "AAA8", login: "aaa8", grade: 4, scenario: "H_questionType_contrast" },
  { label: "AAA9", login: "aaa9", grade: 5, scenario: "I_weak_metadata_suppression" },
  { label: "AAA10", login: "aaa10", grade: 5, scenario: "J_english_metadata" },
  { label: "AAA11", login: "aaa11", grade: 6, scenario: "K_hebrew_metadata" },
  { label: "AAA12", login: "aaa12", grade: 6, scenario: "L_science_moledet" },
];

export const FLAG_ENV = {
  subskill: "DIAGNOSTIC_METADATA_SUBSKILL_ENABLED",
  gating: "DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED",
  promotion: "DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED",
};

export const FLAG_MODES = [
  {
    id: "A",
    name: "baseline",
    env: { subskill: "false", gating: "false", promotion: "false" },
  },
  {
    id: "B",
    name: "subskill_only",
    env: { subskill: "true", gating: "false", promotion: "false" },
  },
  {
    id: "C",
    name: "subskill_gating",
    env: { subskill: "true", gating: "true", promotion: "false" },
  },
  {
    id: "D",
    name: "subskill_gating_promotion",
    env: { subskill: "true", gating: "true", promotion: "true" },
  },
];

export const COMPARISON_RANGES = [
  { id: "one_day", label: "one day", from: "2026-06-08", to: "2026-06-08" },
  { id: "one_week", label: "one week", from: "2026-06-02", to: "2026-06-08" },
  { id: "may_month", label: "May 2026", from: "2026-05-01", to: "2026-05-31" },
  { id: "full", label: "full range", from: "2026-05-01", to: "2026-06-08" },
];

export async function resolveAaaStudents(supabase) {
  const loginUsernames = AAA_CHILDREN.map((s) => s.login);
  const { data: codes, error } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username, is_active, revoked_at")
    .in("login_username", loginUsernames)
    .eq("is_active", true)
    .is("revoked_at", null);
  if (error) throw new Error(`access code lookup: ${error.message}`);

  const byUsername = new Map();
  for (const row of codes || []) {
    const u = String(row.login_username || "").trim().toLowerCase();
    if (u && row.student_id) byUsername.set(u, row.student_id);
  }

  const studentIds = [...new Set([...byUsername.values()])];
  const { data: students, error: stErr } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .in("id", studentIds);
  if (stErr) throw new Error(`students lookup: ${stErr.message}`);

  const byId = new Map((students || []).map((s) => [s.id, s]));
  const resolved = [];
  for (const entry of AAA_CHILDREN) {
    const studentId = byUsername.get(entry.login);
    if (!studentId) throw new Error(`Missing access code for ${entry.label} (${entry.login})`);
    const row = byId.get(studentId);
    if (!row?.id) throw new Error(`Missing student row for ${entry.label}`);
    if (row.parent_id !== QA_PARENT_ID) {
      throw new Error(`${entry.label} parent_id mismatch (expected admin QA parent)`);
    }
    resolved.push({
      ...entry,
      studentId: row.id,
      fullName: row.full_name,
      gradeLevel: row.grade_level,
      isActive: row.is_active !== false,
    });
  }
  return resolved;
}

export function parseIsoDate(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}
