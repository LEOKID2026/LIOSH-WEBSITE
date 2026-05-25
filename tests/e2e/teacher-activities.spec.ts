import { test, expect, type APIRequestContext } from "@playwright/test";

const TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";
const STUDENT_USER = process.env.E2E_STUDENT_USERNAME || "simg3-01";
const STUDENT_PIN = process.env.E2E_STUDENT_PIN || "1234";

function sampleQuestions(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    question: `${i + 2} + 3 = __`,
    correctAnswer: String(i + 2 + 3),
    subject: "math",
    topic: "addition",
  }));
}

async function teacherToken(request: APIRequestContext): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const res = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
  });
  if (!res.ok()) return null;
  const json = await res.json();
  return json.access_token || null;
}

test.describe("classroom activities @teacher-activities", () => {
  test.describe.configure({ mode: "serial" });

  let teacherBearer = "";
  let classId = "";
  let activityId = "";
  let studentCookie = "";

  test.beforeAll(async ({ request }) => {
    const token = await teacherToken(request);
    test.skip(!token, "Supabase teacher credentials unavailable");
    teacherBearer = token!;

    const classesRes = await request.get("/api/teacher/classes", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
    });
    if (!classesRes.ok()) {
      test.skip(true, "Teacher classes API unavailable (schema or auth)");
    }
    const classesBody = await classesRes.json();
    const cls = classesBody?.data?.classes?.[0];
    test.skip(!cls?.classId, "No teacher class for activity tests");
    classId = cls.classId;

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    if (loginRes.ok()) {
      const setCookie = loginRes.headers()["set-cookie"] || "";
      const m = setCookie.match(/liosh_student_session=([^;]+)/);
      if (m) studentCookie = decodeURIComponent(m[1]);
    }
  });

  test("[T-ACT-01] create draft activity", async ({ request }) => {
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E Activity ${Date.now()}`,
        subject: "math",
        topic: "addition",
        mode: "guided_practice",
        questionSelection: "same_exact",
        questionCount: 3,
        questionSet: sampleQuestions(3),
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    activityId = body?.data?.activityId;
    expect(activityId).toBeTruthy();

    const listRes = await request.get(`/api/teacher/activities?classId=${classId}`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const found = (list?.data?.activities || []).some(
      (a: { activityId: string; status: string }) =>
        a.activityId === activityId && a.status === "draft"
    );
    expect(found).toBe(true);
  });

  test("[T-ACT-02] activate activity", async ({ request }) => {
    test.skip(!activityId, "no activity from prior test");
    const res = await request.patch(`/api/teacher/activities/${activityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body?.data?.status).toBe("active");
  });

  test("[SEC-08] controlled_variants returns 501", async ({ request }) => {
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: "Variants",
        subject: "math",
        topic: "x",
        mode: "quiz",
        questionSelection: "controlled_variants",
        questionCount: 2,
        questionSet: sampleQuestions(2),
        timeLimitSeconds: 300,
      },
    });
    expect(res.status()).toBe(501);
  });

  test("[S-ACT-03] student starts activity", async ({ request }) => {
    test.skip(!activityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${activityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.studentStatus).toBe("in_progress");
  });

  test("[SEC-09] start does not expose correct_answer", async ({ request }) => {
    test.skip(!activityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${activityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    const text = await res.text();
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("correct_answer");
  });

  test("[SEC-10] quiz start omits hint and explanation", async ({ request }) => {
    test.skip(!classId || !studentCookie, "class or student missing");
    const createRes = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E Quiz ${Date.now()}`,
        subject: "math",
        topic: "addition",
        mode: "quiz",
        questionSelection: "same_exact",
        questionCount: 1,
        timeLimitSeconds: 300,
        questionSet: [
          {
            question: "1+1",
            correctAnswer: "2",
            hint: "e2e-secret-hint",
            explanation: "e2e-secret-explanation",
          },
        ],
      },
    });
    expect(createRes.status()).toBe(201);
    const quizId = (await createRes.json())?.data?.activityId;
    expect(quizId).toBeTruthy();

    await request.patch(`/api/teacher/activities/${quizId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });

    const startRes = await request.post(`/api/student/activities/${quizId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(startRes.ok()).toBeTruthy();
    const body = await startRes.json();
    expect(body.activity?.mode).toBe("quiz");
    const qs = body.questionSet || [];
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.hint).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
    expect(JSON.stringify(body)).not.toContain("e2e-secret-hint");
    expect(JSON.stringify(body)).not.toContain("e2e-secret-explanation");
  });

  test("[SEC-11] unsupported subject rejected at create", async ({ request }) => {
    test.skip(!classId, "no class");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: "Hebrew blocked",
        subject: "hebrew",
        topic: "reading",
        mode: "guided_practice",
        questionSelection: "same_exact",
        questionCount: 2,
        questionSet: sampleQuestions(2),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.error?.code || body?.code).toBe("subject_preview_not_supported");
  });

  test("[S-ACT-04] correct answer scored server-side", async ({ request }) => {
    test.skip(!activityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${activityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: "5" },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(true);
  });

  test("[SEC-07] tampered body ignored", async ({ request }) => {
    test.skip(!activityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${activityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: {
        questionIndex: 1,
        selectedAnswer: "999",
        is_correct: true,
        correct_answer: "999",
      },
    });
    const body = await res.json();
    expect(body.isCorrect).toBe(false);
  });

  test("[T-ACT-05] monitor returns student progress", async ({ request }) => {
    test.skip(!activityId, "no activity");
    const res = await request.get(`/api/teacher/activities/${activityId}/monitor`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body?.data?.summary).toBeTruthy();
    expect(Array.isArray(body?.data?.students)).toBe(true);
  });

  test("[S-ACT-05] submit then start stays completed", async ({ request }) => {
    test.skip(!activityId || !studentCookie, "student session missing");
    const submitRes = await request.post(`/api/student/activities/${activityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(submitRes.ok()).toBeTruthy();
    const startRes = await request.post(`/api/student/activities/${activityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(startRes.ok()).toBeTruthy();
    const body = await startRes.json();
    expect(body.alreadyCompleted).toBe(true);
    expect(body.studentStatus).toBe("submitted");
    expect(body.questionSet).toEqual([]);
  });

  test("[T-ACT-04] close activity blocks answers", async ({ request }) => {
    test.skip(!activityId, "no activity");
    await request.patch(`/api/teacher/activities/${activityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "close" },
    });
    test.skip(!studentCookie, "no student cookie");
    const ans = await request.post(`/api/student/activities/${activityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 2, selectedAnswer: "7" },
    });
    expect(ans.status()).toBe(409);
  });

  test("[T-ACT-06] report after close", async ({ request }) => {
    test.skip(!activityId, "no activity");
    const res = await request.get(`/api/teacher/activities/${activityId}/report`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body?.data?.perQuestion?.length).toBe(3);
  });

  test("[SEC-06] unauthenticated teacher activities 401", async ({ request }) => {
    const res = await request.get("/api/teacher/activities");
    expect([401, 403]).toContain(res.status());
  });

  test("[REG-04] student activities list ok when empty", async ({ request }) => {
    test.skip(!studentCookie, "no student");
    const res = await request.get("/api/student/activities", {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.activities)).toBe(true);
  });
});
