import { execFileSync } from "node:child_process";
import path from "node:path";
import { test, expect, type APIRequestContext } from "@playwright/test";

const E2E_ROOT = process.cwd();

const TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "747975";
const STUDENT_USER =
  process.env.ACTIVITY_SIM_STUDENT_USER ||
  process.env.E2E_STUDENT_USERNAME ||
  "leo-s01";
const STUDENT_PIN =
  process.env.ACTIVITY_SIM_STUDENT_PIN || process.env.E2E_STUDENT_PIN || "1234";

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

  test("[SEC-11] unsupported subject key rejected at create", async ({ request }) => {
    test.skip(!classId, "no class");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: "Invalid subject E2E",
        subject: "history",
        topic: "reading",
        mode: "guided_practice",
        questionSelection: "same_exact",
        questionCount: 2,
        questionSet: sampleQuestions(2),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.error?.code || body?.code).toBe("validation_failed");
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

/** Phase B0 gate: Science adapter + full teacher→student API flow (Universal Gate item 11). */
test.describe("classroom activities science B0 @science-b0", () => {
  test.describe.configure({ mode: "serial" });

  const SCIENCE_GRADE = "g3";
  const SCIENCE_TOPIC = "body";
  const SCIENCE_DIFFICULTY = "easy";
  const SCIENCE_COUNT = 3;

  let teacherBearer = "";
  let classId = "";
  let scienceActivityId = "";
  let studentCookie = "";
  let scienceQuestionSet: Array<{
    question: string;
    correctAnswer: string;
    choices: string[];
    subject: string;
    topic: string;
  }> = [];

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
    test.skip(!cls?.classId, "No teacher class for science activity tests");
    classId = cls.classId;

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    if (loginRes.ok()) {
      const setCookie = loginRes.headers()["set-cookie"] || "";
      const m = setCookie.match(/liosh_student_session=([^;]+)/);
      if (m) studentCookie = decodeURIComponent(m[1]);
    }

    const helper = path.join(E2E_ROOT, "tests/e2e/helpers/generate-science-activity-preview.mjs");
    const json = execFileSync(process.execPath, [helper], {
      cwd: E2E_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        E2E_SCIENCE_GRADE: SCIENCE_GRADE,
        E2E_SCIENCE_TOPIC: SCIENCE_TOPIC,
        E2E_SCIENCE_DIFFICULTY: SCIENCE_DIFFICULTY,
        E2E_SCIENCE_COUNT: String(SCIENCE_COUNT),
      },
    });
    scienceQuestionSet = JSON.parse(json);
  });

  test("[B0-SCI-01] science preview generates N real questions via fixed adapter", async () => {
    expect(scienceQuestionSet.length).toBe(SCIENCE_COUNT);
    for (const q of scienceQuestionSet) {
      expect(q.subject).toBe("science");
      expect(q.topic).toBe(SCIENCE_TOPIC);
      expect(String(q.question).trim().length).toBeGreaterThan(0);
      expect(String(q.correctAnswer).trim().length).toBeGreaterThan(0);
      expect(Array.isArray(q.choices)).toBe(true);
      expect(q.choices.length).toBeGreaterThan(1);
      expect(q.choices).toContain(q.correctAnswer);
    }
    const fps = scienceQuestionSet.map((q) => `${q.question}|${q.correctAnswer}`);
    expect(new Set(fps).size).toBe(fps.length);
  });

  test("[B0-SCI-02] save science draft returns activityId", async ({ request }) => {
    test.skip(!classId || !scienceQuestionSet.length, "missing class or preview");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E Science B0 ${Date.now()}`,
        subject: "science",
        topic: SCIENCE_TOPIC,
        gradeLevel: SCIENCE_GRADE,
        mode: "guided_practice",
        questionSelection: "same_exact",
        difficultyLevel: SCIENCE_DIFFICULTY,
        questionCount: SCIENCE_COUNT,
        questionSet: scienceQuestionSet,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    scienceActivityId = body?.data?.activityId;
    expect(scienceActivityId).toBeTruthy();
  });

  test("[B0-SCI-03] activate science activity", async ({ request }) => {
    test.skip(!scienceActivityId, "no science activity from prior test");
    const res = await request.patch(`/api/teacher/activities/${scienceActivityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body?.data?.status).toBe("active");
  });

  test("[B0-SCI-04] student start strips correctAnswer", async ({ request }) => {
    test.skip(!scienceActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${scienceActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("correct_answer");
    const body = JSON.parse(text);
    expect(body.ok).toBe(true);
    expect(body.studentStatus).toBe("in_progress");
    const qs = body.questionSet || [];
    expect(qs.length).toBe(SCIENCE_COUNT);
    for (const q of qs) {
      expect(q.correctAnswer).toBeUndefined();
      expect(q.correct_answer).toBeUndefined();
    }
  });

  test("[B0-SCI-05] correct science answer scores isCorrect true", async ({ request }) => {
    test.skip(!scienceActivityId || !studentCookie, "student session missing");
    const correct = scienceQuestionSet[0].correctAnswer;
    const res = await request.post(`/api/student/activities/${scienceActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: correct },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(true);
  });

  test("[B0-SCI-06] wrong science answer scores isCorrect false", async ({ request }) => {
    test.skip(!scienceActivityId || !studentCookie, "student session missing");
    const correct = scienceQuestionSet[1].correctAnswer;
    const wrong = scienceQuestionSet[1].choices.find((c) => c !== correct);
    expect(wrong).toBeTruthy();
    const res = await request.post(`/api/student/activities/${scienceActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 1, selectedAnswer: wrong },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(false);
  });

  test("[B0-SCI-07] submit science activity completes without error", async ({ request }) => {
    test.skip(!scienceActivityId || !studentCookie, "student session missing");
    const submitRes = await request.post(`/api/student/activities/${scienceActivityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(submitRes.ok()).toBeTruthy();
    const body = await submitRes.json();
    expect(body.ok).toBe(true);
    expect(typeof body.questionCount).toBe("number");

    const startRes = await request.post(`/api/student/activities/${scienceActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(startRes.ok()).toBeTruthy();
    const startBody = await startRes.json();
    expect(startBody.alreadyCompleted).toBe(true);
    expect(startBody.studentStatus).toBe("submitted");
    expect(startBody.questionSet).toEqual([]);
  });

});

/** Phase B1 gate: moledet_geography classroom activities (canonical subject key). */
test.describe("classroom activities moledet B1 @moledet-b1", () => {
  test.describe.configure({ mode: "serial" });

  const MOLEDET_GRADE = "g3";
  const MOLEDET_TOPIC = "homeland";
  const MOLEDET_DIFFICULTY = "easy";
  const MOLEDET_COUNT = 3;

  let teacherBearer = "";
  let classId = "";
  let moledetActivityId = "";
  let studentCookie = "";
  let moledetQuestionSet: Array<{
    question: string;
    correctAnswer: string;
    choices: string[];
    subject: string;
    topic: string;
  }> = [];

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
    test.skip(!cls?.classId, "No teacher class for moledet activity tests");
    classId = cls.classId;

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    if (loginRes.ok()) {
      const setCookie = loginRes.headers()["set-cookie"] || "";
      const m = setCookie.match(/liosh_student_session=([^;]+)/);
      if (m) studentCookie = decodeURIComponent(m[1]);
    }

    const helper = path.join(E2E_ROOT, "tests/e2e/helpers/generate-moledet-geography-activity-preview.mjs");
    const json = execFileSync(process.execPath, [helper], {
      cwd: E2E_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        E2E_MOLEDET_GRADE: MOLEDET_GRADE,
        E2E_MOLEDET_TOPIC: MOLEDET_TOPIC,
        E2E_MOLEDET_DIFFICULTY: MOLEDET_DIFFICULTY,
        E2E_MOLEDET_COUNT: String(MOLEDET_COUNT),
      },
    });
    moledetQuestionSet = JSON.parse(json);
  });

  test("[B1-MOL-01] moledet preview generates N Hebrew MCQ items", async () => {
    expect(moledetQuestionSet.length).toBe(MOLEDET_COUNT);
    for (const q of moledetQuestionSet) {
      expect(q.subject).toBe("moledet_geography");
      expect(q.topic).toBe(MOLEDET_TOPIC);
      expect(String(q.question).trim().length).toBeGreaterThan(0);
      expect(Array.isArray(q.choices)).toBe(true);
      expect(q.choices.length).toBe(4);
      expect(q.choices).toContain(q.correctAnswer);
    }
  });

  test("[B1-MOL-02] save moledet draft returns activityId", async ({ request }) => {
    test.skip(!classId || !moledetQuestionSet.length, "missing class or preview");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E Moledet B1 ${Date.now()}`,
        subject: "moledet_geography",
        topic: MOLEDET_TOPIC,
        gradeLevel: MOLEDET_GRADE,
        mode: "guided_practice",
        questionSelection: "same_exact",
        difficultyLevel: MOLEDET_DIFFICULTY,
        questionCount: MOLEDET_COUNT,
        questionSet: moledetQuestionSet,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    moledetActivityId = body?.data?.activityId;
    expect(moledetActivityId).toBeTruthy();
  });

  test("[B1-MOL-03] activate moledet activity", async ({ request }) => {
    test.skip(!moledetActivityId, "no moledet activity");
    const res = await request.patch(`/api/teacher/activities/${moledetActivityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json())?.data?.status).toBe("active");
  });

  test("[B1-MOL-04] student start strips correctAnswer", async ({ request }) => {
    test.skip(!moledetActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${moledetActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("correct_answer");
    const body = JSON.parse(text);
    expect(body.questionSet?.length).toBe(MOLEDET_COUNT);
    for (const q of body.questionSet || []) {
      expect(q.choices?.length).toBe(4);
    }
  });

  test("[B1-MOL-05] correct moledet answer isCorrect true", async ({ request }) => {
    test.skip(!moledetActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${moledetActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: moledetQuestionSet[0].correctAnswer },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(true);
  });

  test("[B1-MOL-06] wrong moledet answer isCorrect false", async ({ request }) => {
    test.skip(!moledetActivityId || !studentCookie, "student session missing");
    const correct = moledetQuestionSet[1].correctAnswer;
    const wrong = moledetQuestionSet[1].choices.find((c) => c !== correct);
    expect(wrong).toBeTruthy();
    const res = await request.post(`/api/student/activities/${moledetActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 1, selectedAnswer: wrong },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(false);
  });

  test("[B1-MOL-07] submit moledet activity completes", async ({ request }) => {
    test.skip(!moledetActivityId || !studentCookie, "student session missing");
    const submitRes = await request.post(`/api/student/activities/${moledetActivityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(submitRes.ok()).toBeTruthy();
    expect((await submitRes.json()).ok).toBe(true);

    const startRes = await request.post(`/api/student/activities/${moledetActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect((await startRes.json()).alreadyCompleted).toBe(true);
  });
});

test.describe("classroom activities geometry B2 @geometry-b2", () => {
  test.describe.configure({ mode: "serial" });

  const GEOMETRY_GRADE = "g3";
  const GEOMETRY_TOPIC = "area";
  const GEOMETRY_DIFFICULTY = "easy";
  const GEOMETRY_COUNT = 3;

  let teacherBearer = "";
  let classId = "";
  let geometryActivityId = "";
  let studentCookie = "";
  let geometryQuestionSet: Array<{
    question: string;
    correctAnswer: string;
    choices: string[];
    subject: string;
    topic: string;
    params?: { kind?: string };
  }> = [];

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
    test.skip(!cls?.classId, "No teacher class for geometry activity tests");
    classId = cls.classId;

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    if (loginRes.ok()) {
      const setCookie = loginRes.headers()["set-cookie"] || "";
      const m = setCookie.match(/liosh_student_session=([^;]+)/);
      if (m) studentCookie = decodeURIComponent(m[1]);
    }

    const helper = path.join(E2E_ROOT, "tests/e2e/helpers/generate-geometry-activity-preview.mjs");
    const json = execFileSync(process.execPath, [helper], {
      cwd: E2E_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        E2E_GEOMETRY_GRADE: GEOMETRY_GRADE,
        E2E_GEOMETRY_TOPIC: GEOMETRY_TOPIC,
        E2E_GEOMETRY_DIFFICULTY: GEOMETRY_DIFFICULTY,
        E2E_GEOMETRY_COUNT: String(GEOMETRY_COUNT),
      },
    });
    geometryQuestionSet = JSON.parse(json);
  });

  test("[B2-GEO-01] geometry preview generates N real geometry items with diagram params", async () => {
    expect(geometryQuestionSet.length).toBe(GEOMETRY_COUNT);
    for (const q of geometryQuestionSet) {
      expect(q.subject).toBe("geometry");
      expect(q.topic).toBe(GEOMETRY_TOPIC);
      expect(String(q.question).trim().length).toBeGreaterThan(0);
      expect(q.params?.kind).toBeTruthy();
      expect(Array.isArray(q.choices)).toBe(true);
      expect(q.choices).toContain(q.correctAnswer);
    }
  });

  test("[B2-GEO-02] save geometry draft returns activityId", async ({ request }) => {
    test.skip(!classId || !geometryQuestionSet.length, "missing class or preview");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E Geometry B2 ${Date.now()}`,
        subject: "geometry",
        topic: GEOMETRY_TOPIC,
        gradeLevel: GEOMETRY_GRADE,
        mode: "guided_practice",
        questionSelection: "same_exact",
        difficultyLevel: GEOMETRY_DIFFICULTY,
        questionCount: GEOMETRY_COUNT,
        questionSet: geometryQuestionSet,
      },
    });
    const bodyText = await res.text();
    if (res.status() !== 201) {
      // eslint-disable-next-line no-console
      console.error("[B2-GEO-02] create failed", res.status(), bodyText.slice(0, 2000));
    }
    expect(res.status(), bodyText).toBe(201);
    const body = JSON.parse(bodyText);
    geometryActivityId = body?.data?.activityId;
    expect(geometryActivityId).toBeTruthy();
  });

  test("[B2-GEO-03] activate geometry activity", async ({ request }) => {
    test.skip(!geometryActivityId, "no geometry activity");
    const res = await request.patch(`/api/teacher/activities/${geometryActivityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json())?.data?.status).toBe("active");
  });

  test("[B2-GEO-04] student start strips correctAnswer", async ({ request }) => {
    test.skip(!geometryActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${geometryActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("correct_answer");
    const body = JSON.parse(text);
    expect(body.questionSet?.length).toBe(GEOMETRY_COUNT);
    for (const q of body.questionSet || []) {
      expect(q.params?.kind).toBeTruthy();
    }
  });

  test("[B2-GEO-07] student page renders geometry diagram SVG without answer in diagram", async ({
    page,
  }) => {
    test.skip(!geometryActivityId || !studentCookie, "student session missing");
    const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3002";
    const host = new URL(base).hostname;
    await page.context().addCookies([
      {
        name: "liosh_student_session",
        value: studentCookie,
        domain: host,
        path: "/",
      },
    ]);
    await page.goto(`${base}/student/activity/${geometryActivityId}`);
    await expect(page.locator('[data-testid="classroom-geometry-diagram"]').first()).toBeVisible({
      timeout: 30000,
    });
    const diagram = page.locator('[data-testid="classroom-geometry-diagram"] svg').first();
    await expect(diagram).toBeVisible({ timeout: 10000 });
    const secret = String(geometryQuestionSet[0].correctAnswer || "").trim();
    if (secret.length >= 1) {
      const svgTextNodes = await page
        .locator('[data-testid="classroom-geometry-diagram"] svg text')
        .allTextContents();
      const visibleLabels = svgTextNodes.map((t) => String(t).trim()).filter(Boolean);
      expect(visibleLabels.every((label) => label !== secret)).toBe(true);
    }
  });

  test("[B2-GEO-05] correct geometry answer isCorrect true", async ({ request }) => {
    test.skip(!geometryActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${geometryActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: geometryQuestionSet[0].correctAnswer },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(true);
  });

  test("[B2-GEO-06] wrong geometry answer isCorrect false", async ({ request }) => {
    test.skip(!geometryActivityId || !studentCookie, "student session missing");
    const correct = geometryQuestionSet[1].correctAnswer;
    const wrong = geometryQuestionSet[1].choices.find((c) => c !== correct);
    expect(wrong).toBeTruthy();
    const res = await request.post(`/api/student/activities/${geometryActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 1, selectedAnswer: wrong },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(false);
  });

  test("[B2-GEO-08] submit geometry activity completes", async ({ request }) => {
    test.skip(!geometryActivityId || !studentCookie, "student session missing");
    const submitRes = await request.post(`/api/student/activities/${geometryActivityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(submitRes.ok()).toBeTruthy();
    expect((await submitRes.json()).ok).toBe(true);

    const startRes = await request.post(`/api/student/activities/${geometryActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect((await startRes.json()).alreadyCompleted).toBe(true);
  });
});

/** Phase B3 gate: Hebrew classroom activities (MCQ-only). */
test.describe("classroom activities hebrew B3 @hebrew-b3", () => {
  test.describe.configure({ mode: "serial" });

  const HEBREW_GRADE = "g4";
  const HEBREW_TOPIC = "comprehension";
  const HEBREW_DIFFICULTY = "easy";
  const HEBREW_COUNT = 3;

  let teacherBearer = "";
  let classId = "";
  let hebrewActivityId = "";
  let studentCookie = "";
  let hebrewQuestionSet: Array<{
    question: string;
    correctAnswer: string;
    choices: string[];
    subject: string;
    topic: string;
    params?: { answerMode?: string };
  }> = [];

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
    test.skip(!cls?.classId, "No teacher class for hebrew activity tests");
    classId = cls.classId;

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    if (loginRes.ok()) {
      const setCookie = loginRes.headers()["set-cookie"] || "";
      const m = setCookie.match(/liosh_student_session=([^;]+)/);
      if (m) studentCookie = decodeURIComponent(m[1]);
    }

    const helper = path.join(E2E_ROOT, "tests/e2e/helpers/generate-hebrew-activity-preview.mjs");
    const json = execFileSync(process.execPath, [helper], {
      cwd: E2E_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        E2E_HEBREW_GRADE: HEBREW_GRADE,
        E2E_HEBREW_TOPIC: HEBREW_TOPIC,
        E2E_HEBREW_DIFFICULTY: HEBREW_DIFFICULTY,
        E2E_HEBREW_COUNT: String(HEBREW_COUNT),
      },
    });
    hebrewQuestionSet = JSON.parse(json);
  });

  test("[B3-HEB-01] hebrew preview generates N Hebrew MCQ items", async () => {
    expect(hebrewQuestionSet.length).toBe(HEBREW_COUNT);
    for (const q of hebrewQuestionSet) {
      expect(q.subject).toBe("hebrew");
      expect(q.topic).toBe(HEBREW_TOPIC);
      expect(String(q.question).trim().length).toBeGreaterThan(0);
      expect(Array.isArray(q.choices)).toBe(true);
      expect(q.choices.length).toBeGreaterThanOrEqual(2);
      expect(q.choices).toContain(q.correctAnswer);
      expect(q.params?.answerMode).toBe("choice");
    }
  });

  test("[B3-HEB-02] save hebrew draft returns activityId", async ({ request }) => {
    test.skip(!classId || !hebrewQuestionSet.length, "missing class or preview");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E Hebrew B3 ${Date.now()}`,
        subject: "hebrew",
        topic: HEBREW_TOPIC,
        gradeLevel: HEBREW_GRADE,
        mode: "guided_practice",
        questionSelection: "same_exact",
        difficultyLevel: HEBREW_DIFFICULTY,
        questionCount: HEBREW_COUNT,
        questionSet: hebrewQuestionSet,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    hebrewActivityId = body?.data?.activityId;
    expect(hebrewActivityId).toBeTruthy();
  });

  test("[B3-HEB-03] activate hebrew activity", async ({ request }) => {
    test.skip(!hebrewActivityId, "no hebrew activity");
    const res = await request.patch(`/api/teacher/activities/${hebrewActivityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json())?.data?.status).toBe("active");
  });

  test("[B3-HEB-04] student start strips correctAnswer", async ({ request }) => {
    test.skip(!hebrewActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${hebrewActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("correct_answer");
    const body = JSON.parse(text);
    expect(body.questionSet?.length).toBe(HEBREW_COUNT);
    for (const q of body.questionSet || []) {
      expect(q.choices?.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("[B3-HEB-05] correct hebrew answer isCorrect true", async ({ request }) => {
    test.skip(!hebrewActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${hebrewActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: hebrewQuestionSet[0].correctAnswer },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(true);
  });

  test("[B3-HEB-06] wrong hebrew answer isCorrect false", async ({ request }) => {
    test.skip(!hebrewActivityId || !studentCookie, "student session missing");
    const correct = hebrewQuestionSet[1].correctAnswer;
    const wrong = hebrewQuestionSet[1].choices.find((c) => c !== correct);
    expect(wrong).toBeTruthy();
    const res = await request.post(`/api/student/activities/${hebrewActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 1, selectedAnswer: wrong },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(false);
  });

  test("[B3-HEB-07] submit hebrew activity completes", async ({ request }) => {
    test.skip(!hebrewActivityId || !studentCookie, "student session missing");
    const submitRes = await request.post(`/api/student/activities/${hebrewActivityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(submitRes.ok()).toBeTruthy();
    expect((await submitRes.json()).ok).toBe(true);

    const startRes = await request.post(`/api/student/activities/${hebrewActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect((await startRes.json()).alreadyCompleted).toBe(true);
  });
});

/** Phase B4 gate: English classroom activities (MCQ-only, pre-expanded choices). */
test.describe("classroom activities english B4 @english-b4", () => {
  test.describe.configure({ mode: "serial" });

  const ENGLISH_GRADE = "g3";
  const ENGLISH_TOPIC = "grammar";
  const ENGLISH_DIFFICULTY = "easy";
  const ENGLISH_COUNT = 3;

  let teacherBearer = "";
  let classId = "";
  let englishActivityId = "";
  let studentCookie = "";
  let englishQuestionSet: Array<{
    question: string;
    correctAnswer: string;
    choices: string[];
    subject: string;
    topic: string;
    params?: { answerMode?: string };
  }> = [];

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
    test.skip(!cls?.classId, "No teacher class for english activity tests");
    classId = cls.classId;

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    if (loginRes.ok()) {
      const setCookie = loginRes.headers()["set-cookie"] || "";
      const m = setCookie.match(/liosh_student_session=([^;]+)/);
      if (m) studentCookie = decodeURIComponent(m[1]);
    }

    const helper = path.join(E2E_ROOT, "tests/e2e/helpers/generate-english-activity-preview.mjs");
    const json = execFileSync(process.execPath, [helper], {
      cwd: E2E_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        E2E_ENGLISH_GRADE: ENGLISH_GRADE,
        E2E_ENGLISH_TOPIC: ENGLISH_TOPIC,
        E2E_ENGLISH_DIFFICULTY: ENGLISH_DIFFICULTY,
        E2E_ENGLISH_COUNT: String(ENGLISH_COUNT),
      },
    });
    englishQuestionSet = JSON.parse(json);
  });

  test("[B4-ENG-01] english preview generates N English MCQ items", async () => {
    expect(englishQuestionSet.length).toBe(ENGLISH_COUNT);
    for (const q of englishQuestionSet) {
      expect(q.subject).toBe("english");
      expect(q.topic).toBe(ENGLISH_TOPIC);
      expect(Array.isArray(q.choices)).toBe(true);
      expect(q.choices.length).toBeGreaterThanOrEqual(2);
      expect(q.choices).toContain(q.correctAnswer);
      expect(q.params?.answerMode).toBe("choice");
    }
  });

  test("[B4-ENG-02] save english draft returns activityId", async ({ request }) => {
    test.skip(!classId || !englishQuestionSet.length, "missing class or preview");
    const res = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: {
        classId,
        title: `E2E English B4 ${Date.now()}`,
        subject: "english",
        topic: ENGLISH_TOPIC,
        gradeLevel: ENGLISH_GRADE,
        mode: "guided_practice",
        questionSelection: "same_exact",
        difficultyLevel: ENGLISH_DIFFICULTY,
        questionCount: ENGLISH_COUNT,
        questionSet: englishQuestionSet,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    englishActivityId = body?.data?.activityId;
    expect(englishActivityId).toBeTruthy();
  });

  test("[B4-ENG-03] activate english activity", async ({ request }) => {
    test.skip(!englishActivityId, "no english activity");
    const res = await request.patch(`/api/teacher/activities/${englishActivityId}/status`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
      data: { action: "activate" },
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json())?.data?.status).toBe("active");
  });

  test("[B4-ENG-04] student start strips correctAnswer", async ({ request }) => {
    test.skip(!englishActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${englishActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("correct_answer");
    const body = JSON.parse(text);
    expect(body.questionSet?.length).toBe(ENGLISH_COUNT);
  });

  test("[B4-ENG-05] correct english answer isCorrect true", async ({ request }) => {
    test.skip(!englishActivityId || !studentCookie, "student session missing");
    const res = await request.post(`/api/student/activities/${englishActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: englishQuestionSet[0].correctAnswer },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(true);
  });

  test("[B4-ENG-06] wrong english answer isCorrect false", async ({ request }) => {
    test.skip(!englishActivityId || !studentCookie, "student session missing");
    const correct = englishQuestionSet[1].correctAnswer;
    const wrong = englishQuestionSet[1].choices.find((c) => c !== correct);
    expect(wrong).toBeTruthy();
    const res = await request.post(`/api/student/activities/${englishActivityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 1, selectedAnswer: wrong },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isCorrect).toBe(false);
  });

  test("[B4-ENG-07] submit english activity completes", async ({ request }) => {
    test.skip(!englishActivityId || !studentCookie, "student session missing");
    const submitRes = await request.post(`/api/student/activities/${englishActivityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect(submitRes.ok()).toBeTruthy();
    expect((await submitRes.json()).ok).toBe(true);

    const startRes = await request.post(`/api/student/activities/${englishActivityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    expect((await startRes.json()).alreadyCompleted).toBe(true);
  });
});

/** Monitor: teacher inspects per-student answers (UI smoke). */
test.describe("monitor student answers UI @monitor-student-answers", () => {
  test.describe.configure({ mode: "serial" });

  let classId = "";
  let activityId = "";
  let teacherBearer = "";
  let studentCookie = "";
  let questionSet: Array<{
    question: string;
    correctAnswer: string;
    choices: string[];
  }> = [];

  test.beforeAll(async ({ request }) => {
    const token = await teacherToken(request);
    test.skip(!token, "Supabase teacher credentials unavailable");
    teacherBearer = token!;

    const classesRes = await request.get("/api/teacher/classes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(!classesRes.ok(), "Teacher classes API unavailable");
    const cls = (await classesRes.json())?.data?.classes?.[0];
    test.skip(!cls?.classId, "No teacher class");
    classId = cls.classId;

    const helper = path.join(E2E_ROOT, "tests/e2e/helpers/generate-science-activity-preview.mjs");
    questionSet = JSON.parse(
      execFileSync(process.execPath, [helper], {
        cwd: E2E_ROOT,
        encoding: "utf-8",
        env: {
          ...process.env,
          E2E_SCIENCE_GRADE: "g3",
          E2E_SCIENCE_TOPIC: "body",
          E2E_SCIENCE_DIFFICULTY: "easy",
          E2E_SCIENCE_COUNT: "2",
        },
      })
    );

    const createRes = await request.post("/api/teacher/activities", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        classId,
        title: `E2E Monitor UI ${Date.now()}`,
        subject: "science",
        topic: "body",
        gradeLevel: "g3",
        mode: "guided_practice",
        questionSelection: "same_exact",
        difficultyLevel: "easy",
        questionCount: 2,
        questionSet,
      },
    });
    test.skip(!createRes.ok(), "create activity failed");
    activityId = (await createRes.json())?.data?.activityId;
    test.skip(!activityId, "no activityId");

    await request.patch(`/api/teacher/activities/${activityId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { action: "activate" },
    });

    const loginRes = await request.post("/api/student/login", {
      data: { username: STUDENT_USER, pin: STUDENT_PIN },
    });
    test.skip(!loginRes.ok(), "student login failed");
    const setCookie = loginRes.headers()["set-cookie"] || "";
    const m = setCookie.match(/liosh_student_session=([^;]+)/);
    test.skip(!m, "student cookie missing");
    studentCookie = decodeURIComponent(m[1]);

    await request.post(`/api/student/activities/${activityId}/start`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
    const correct = questionSet[0].correctAnswer;
    const wrong = questionSet[1].choices.find((c) => c !== questionSet[1].correctAnswer);
    await request.post(`/api/student/activities/${activityId}/answer`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
      data: { questionIndex: 0, selectedAnswer: correct },
    });
    if (wrong) {
      await request.post(`/api/student/activities/${activityId}/answer`, {
        headers: { Cookie: `liosh_student_session=${studentCookie}` },
        data: { questionIndex: 1, selectedAnswer: wrong },
      });
    }
    await request.post(`/api/student/activities/${activityId}/submit`, {
      headers: { Cookie: `liosh_student_session=${studentCookie}` },
    });
  });

  test("[MON-01] teacher fetches student answer details with correctAnswer", async ({ request }) => {
    test.skip(!activityId || !teacherBearer, "missing session");
    const monitorRes = await request.get(`/api/teacher/activities/${activityId}/monitor`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
    });
    expect(monitorRes.ok()).toBeTruthy();
    const monitorBody = await monitorRes.json();
    const studentId = monitorBody?.data?.students?.find(
      (s: { answersCount: number }) => s.answersCount > 0
    )?.studentId;
    expect(studentId).toBeTruthy();

    const res = await request.get(
      `/api/teacher/activities/${activityId}/students/${studentId}/answers`,
      { headers: { Authorization: `Bearer ${teacherBearer}` } }
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const q0 = (body?.data?.questions || []).find(
      (q: { questionIndex: number }) => q.questionIndex === 0
    );
    expect(q0?.question).toBeTruthy();
    expect(q0?.selectedAnswer).toBe(questionSet[0].correctAnswer);
    expect(q0?.correctAnswer).toBe(questionSet[0].correctAnswer);
    expect(q0?.isCorrect).toBe(true);
    const q1 = (body?.data?.questions || []).find(
      (q: { questionIndex: number }) => q.questionIndex === 1
    );
    if (q1?.selectedAnswer) expect(q1?.isCorrect).toBe(false);
    expect(body?.data?.student?.status).toBe("submitted");
  });

  test("[MON-02] student cannot access teacher student-answers endpoint", async ({ request }) => {
    test.skip(!activityId || !studentCookie, "missing session");
    const monitorRes = await request.get(`/api/teacher/activities/${activityId}/monitor`, {
      headers: { Authorization: `Bearer ${teacherBearer}` },
    });
    const studentId = (await monitorRes.json())?.data?.students?.[0]?.studentId;
    test.skip(!studentId, "no student on roster");
    const res = await request.get(
      `/api/teacher/activities/${activityId}/students/${studentId}/answers`,
      { headers: { Cookie: `liosh_student_session=${studentCookie}` } }
    );
    expect([401, 403]).toContain(res.status());
  });

  test("[MON-UI-01] monitor page opens student answers modal", async ({ page }) => {
    test.skip(!classId || !activityId, "setup missing");
    await page.goto("/teacher/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("המייל שלך").fill(TEACHER_EMAIL);
    await page.locator('input[type="password"]').fill(TEACHER_PASSWORD);
    await page.getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL(/\/teacher\/dashboard\/?/, { timeout: 45_000 });

    await page.goto(
      `/teacher/class/${encodeURIComponent(classId)}/activities/${encodeURIComponent(activityId)}/monitor`,
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.getByTestId("teacher-view-student-answers").first()).toBeVisible({
      timeout: 20_000,
    });
    const answersResponse = page.waitForResponse(
      (r) => r.url().includes("/answers") && r.request().method() === "GET" && r.ok(),
      { timeout: 30_000 }
    );
    await page
      .locator("tbody tr")
      .filter({ hasText: "הוגש" })
      .getByTestId("teacher-view-student-answers")
      .click();
    await expect(page.getByTestId("teacher-student-answers-modal")).toBeVisible({
      timeout: 20_000,
    });
    await answersResponse;
    await expect(page.getByTestId("teacher-student-answer-row-0")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("student-selected-answer").first()).not.toHaveText("-");
    await expect(page.getByTestId("student-correct-answer").first()).not.toHaveText("-");
    await expect(page.getByText("נכון").first()).toBeVisible();
  });
});
