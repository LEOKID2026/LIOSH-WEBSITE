import { createServiceClient } from "./supabase.mjs";

const runStartedAt = process.argv[2] || "2026-06-25T22:30:00Z";
const supabase = createServiceClient();

const { data: codes, error } = await supabase
  .from("student_access_codes")
  .select("student_id, login_username, created_at, students!inner(parent_id, full_name)")
  .like("login_username", "qp%")
  .gte("created_at", runStartedAt)
  .order("created_at", { ascending: true });

if (error) throw error;

const studentIds = [...new Set((codes || []).map((c) => c.student_id))];
console.log(
  JSON.stringify(
    {
      runStartedAt,
      qpStudentsSinceRun: studentIds.length,
      first: codes?.[0],
      last: codes?.[codes.length - 1],
    },
    null,
    2,
  ),
);
