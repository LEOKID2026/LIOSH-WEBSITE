#!/usr/bin/env node
/**
 * HTTP proof for school student report API (no classId) against running server.
 * Requires DEMO_TEACHER_PASSWORD or SCHOOL_QA_PASSWORD in env.
 */
const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3005";
const pw =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  "";
const STUDENT_ID = process.env.SCHOOL_BLOCKER_STUDENT_ID || "9abd3ec4-56e9-4af6-9ac0-82806a3a664e";
const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";

async function main() {
  if (!pw) {
    console.error("Skip HTTP proof: no password in env");
    process.exit(0);
  }
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "school@leo-k.com", password: pw }),
  });
  const tokenJson = await tokenRes.json();
  const token = tokenJson.access_token;
  if (!token) throw new Error("auth failed");

  const path = `/api/school/students/${STUDENT_ID}/report-data?windowDays=30`;
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  console.log(
    JSON.stringify(
      {
        before: { totalAnswers: 0, note: "prior bug: base aggregate only" },
        after: {
          studentId: STUDENT_ID,
          schoolId: DEMO_SCHOOL_ID,
          classId: null,
          status: res.status,
          summary: body?.summary,
          studentName: body?.student?.full_name,
        },
      },
      null,
      2
    )
  );
  if (res.status !== 200 || Number(body?.summary?.totalAnswers || 0) <= 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
