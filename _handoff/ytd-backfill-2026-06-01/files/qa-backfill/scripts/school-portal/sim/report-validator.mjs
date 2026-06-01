/**
 * Phase 3 — Report validation (R2, R4, R3 API+browser, R1, isolation, no-empty).
 */
import { teacherKeyForSubject } from "../demo-school-data.mjs";
import { createServiceRole } from "../demo-school-lib.mjs";
import {
  DEMO_PARENT_EMAIL,
  SCHOOL_MANAGER_EMAIL,
  TEACHER_EMAILS,
  TEACHER_SUBJECTS,
  defaultBaseUrl,
} from "./school-sim-config.mjs";
import { runR3BridgeBrowserValidation } from "./r3-bridge-browser.mjs";
import {
  assertGradePickStudentIds,
  assertSchoolSimStateReady,
  assertValidStudentId,
} from "./sim-state-guards.mjs";
import {
  resolveScaffoldingParentPassword,
  resolveStaffPassword,
} from "./student-credentials.mjs";

async function getBearer(email, password) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error(`auth failed for ${email}: ${tokenJson.error_description || tokenJson.msg || "no token"}`);
  }
  return tokenJson.access_token;
}

function totalAnswersFromPayload(body) {
  const s = body?.summary;
  if (!s) return 0;
  return Number(s.totalAnswers ?? s.total_questions ?? s.mathQuestions ?? 0) || 0;
}

function subjectKeys(body) {
  const subs = body?.subjects || body?.subjectRollups || {};
  if (typeof subs === "object" && !Array.isArray(subs)) return Object.keys(subs);
  if (Array.isArray(body?.subjects)) return body.subjects.map((x) => x?.key || x?.subject).filter(Boolean);
  return [];
}

function visibleSubjectKeysWithAnswers(subjects) {
  if (!subjects || typeof subjects !== "object") return [];
  return Object.keys(subjects).filter((k) => Number(subjects[k]?.answers || 0) > 0);
}

function responseErrorFields(body) {
  if (!body || typeof body !== "object") return { code: null, message: null };
  return {
    code: body.code || body.error || null,
    message: body.message || body.error_description || body.msg || null,
  };
}

async function fetchReport(baseUrl, path, token) {
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${fullPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const { code, message } = responseErrorFields(body);
  const total = totalAnswersFromPayload(body);
  return { status: res.status, body, path: fullPath, code, message, total };
}

/** One retry on 401 after refreshing the bearer token (historical R2/R3/R4). */
async function fetchReportWith401Retry(baseUrl, path, getToken) {
  let result = await fetchReport(baseUrl, path, await getToken());
  if (result.status === 401) {
    result = await fetchReport(baseUrl, path, await getToken());
  }
  return result;
}

function buildReportQuery(studentId, { from, to, windowDays = "30" } = {}) {
  const id = assertValidStudentId(studentId, "report query");
  const q = new URLSearchParams({ studentId: id });
  if (from && to) {
    q.set("from", from);
    q.set("to", to);
  } else {
    q.set("windowDays", String(windowDays));
  }
  return { id, q };
}

function teacherStudentReportPath(studentId, suffix = "report-data", dateOpts = {}) {
  const { id, q } = buildReportQuery(studentId, dateOpts);
  return `/api/teacher/students/${id}/${suffix}?${q}`;
}

function schoolStudentReportPath(studentId, dateOpts = {}) {
  const { id, q } = buildReportQuery(studentId, dateOpts);
  return `/api/school/students/${id}/report-data?${q}`;
}

function parentStudentReportPath(studentId, dateOpts = {}) {
  const { id, q } = buildReportQuery(studentId, dateOpts);
  return `/api/parent/students/${id}/report-data?${q}`;
}

function reportRowFromFetch(fetchResult, extra = {}) {
  const { status, body, path, code, message } = fetchResult;
  return {
    status,
    path,
    code,
    message,
    total: totalAnswersFromPayload(body),
    ...extra,
  };
}

async function pickTeacherEmailForStudent(serviceRole, state, studentId) {
  const { data: links } = await serviceRole
    .from("teacher_class_students")
    .select("class_id")
    .eq("student_id", studentId)
    .is("removed_at", null)
    .limit(1);
  const classId = links?.[0]?.class_id;
  if (!classId) return TEACHER_EMAILS.dan;
  const { data: cls } = await serviceRole
    .from("teacher_classes")
    .select("teacher_id")
    .eq("id", classId)
    .maybeSingle();
  const teacherId = cls?.teacher_id;
  for (const [key, id] of Object.entries(state.teacherIds || {})) {
    if (id === teacherId && TEACHER_EMAILS[key]) return TEACHER_EMAILS[key];
  }
  return TEACHER_EMAILS.dan;
}

function dateInInclusiveRange(dateStr, from, to) {
  return dateStr >= from && dateStr <= to;
}

function studentSessionsInRange(student, from, to) {
  return (student.sessionsGenerated || []).filter((s) => dateInInclusiveRange(s.date, from, to));
}

function partitionSampleStudentsForRange(homePracticeSample, from, to) {
  const all = homePracticeSample?.students || [];
  const withSessions = [];
  const skipped = [];
  for (const student of all) {
    if (studentSessionsInRange(student, from, to).length) withSessions.push(student);
    else skipped.push(student);
  }
  return { withSessions, skipped };
}

function resolveFullHistoricalRange(historicalRanges = []) {
  return (
    historicalRanges.find((r) => r.name === "full_range") ||
    historicalRanges[historicalRanges.length - 1] ||
    null
  );
}

async function pickStudentWithClassroomActivity(serviceRole, teacherId, schoolId) {
  const { data: classes } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .eq("is_archived", false)
    .limit(5);
  for (const cls of classes || []) {
    const { data: acts } = await serviceRole
      .from("classroom_activities")
      .select("id")
      .eq("class_id", cls.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(3);
    for (const act of acts || []) {
      const { data: st } = await serviceRole
        .from("classroom_activity_student_status")
        .select("student_id, answers_count")
        .eq("activity_id", act.id)
        .eq("status", "submitted")
        .gt("answers_count", 0)
        .limit(1);
      if (st?.[0]?.student_id) return { studentId: st[0].student_id, classId: cls.id, activityId: act.id };
    }
  }
  return null;
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {Array} params.uiSampleResults
 * @param {object} [params.classSummary] from db-sim
 * @param {string} params.baseUrl
 * @param {string} params.teacherPassword
 * @param {string} params.parentPassword
 * @param {string} [params.artifactRoot]
 */
async function runHistoricalRangeChecks({
  state,
  baseUrl,
  teacherPassword,
  parentPassword,
  historicalRanges = [],
  homePracticeSample = null,
  log,
}) {
  if (!historicalRanges.length) {
    return { checks: [], r1ByRange: [], ok: true, failCount: 0 };
  }

  const fallbackStudentId = assertValidStudentId(state.studentIds[0], "historical fallback");

  const checks = [];
  const r1ByRange = [];

  for (const range of historicalRanges) {
    const { name, from, to } = range;
    const dateOpts = { from, to };
    const getSchoolToken = () => getBearer(SCHOOL_MANAGER_EMAIL, teacherPassword);
    const getDanToken = () => getBearer(TEACHER_EMAILS.dan, teacherPassword);
    const getParentToken = () => getBearer(DEMO_PARENT_EMAIL, parentPassword);

    const r2Path = teacherStudentReportPath(fallbackStudentId, "report-data", dateOpts);
    const r2 = await fetchReportWith401Retry(baseUrl, r2Path, getDanToken);
    checks.push({
      range: name,
      route: "R2",
      from,
      to,
      ...reportRowFromFetch(r2),
      ok: r2.status === 200 && r2.total > 0,
    });

    const r4Path = schoolStudentReportPath(fallbackStudentId, dateOpts);
    const r4 = await fetchReportWith401Retry(baseUrl, r4Path, getSchoolToken);
    checks.push({
      range: name,
      route: "R4",
      from,
      to,
      ...reportRowFromFetch(r4),
      ok: r4.status === 200 && r4.total > 0,
    });

    const r3Path = teacherStudentReportPath(fallbackStudentId, "parent-report-data", dateOpts);
    const r3 = await fetchReportWith401Retry(baseUrl, r3Path, getDanToken);
    checks.push({
      range: name,
      route: "R3",
      from,
      to,
      ...reportRowFromFetch(r3),
      ok: r3.status === 200 && r3.total > 0,
    });

    const { withSessions, skipped } = partitionSampleStudentsForRange(homePracticeSample, from, to);
    const skippedIds = skipped.map((s) => s.studentId);
    let r1PassCount = 0;
    let r1FailCount = 0;

    if (!withSessions.length) {
      r1ByRange.push({
        range: name,
        from,
        to,
        studentsWithSessionsInRange: [],
        studentsChecked: [],
        studentsSkippedNoSessions: skippedIds,
        r1PassCount: 0,
        r1FailCount: 0,
        status: "no_applicable_students",
        note: "No home-practice sessions in this range for sampled students; R1 assertions skipped",
      });
    } else {
      for (const student of withSessions) {
        const sid = assertValidStudentId(student.studentId, "historical R1");
        const r1Path = parentStudentReportPath(sid, dateOpts);
        const r1 = await fetchReportWith401Retry(baseUrl, r1Path, getParentToken);
        const ok = r1.status === 200 && r1.total >= 1;
        if (ok) r1PassCount += 1;
        else r1FailCount += 1;
        checks.push({
          range: name,
          route: "R1",
          studentId: sid,
          from,
          to,
          ...reportRowFromFetch(r1),
          ok,
          expectedMin: 1,
          status: ok ? "pass" : "fail",
        });
      }

      for (const student of skipped) {
        const sid = assertValidStudentId(student.studentId, "historical R1 skipped");
        checks.push({
          range: name,
          route: "R1",
          studentId: sid,
          from,
          to,
          status: "skipped",
          ok: true,
          expectedMin: 0,
          note: "No home-practice sessions in range; R1=0 expected",
        });
      }

      r1ByRange.push({
        range: name,
        from,
        to,
        studentsWithSessionsInRange: withSessions.map((s) => s.studentId),
        studentsChecked: withSessions.map((s) => s.studentId),
        studentsSkippedNoSessions: skippedIds,
        r1PassCount,
        r1FailCount,
        status: r1FailCount === 0 ? "pass" : "fail",
        note:
          r1FailCount > 0
            ? `${r1FailCount} applicable student(s) returned R1 total=0 in range`
            : null,
      });
    }
  }

  const failCount = checks.filter((c) => !c.ok).length;
  if (failCount) {
    log(`historical report checks: ${failCount} failure(s) across ${historicalRanges.length} range(s)`);
  }
  return { checks, r1ByRange, ok: failCount === 0, failCount };
}

export async function runReportValidation({
  state,
  uiSampleResults = [],
  classSummary = {},
  baseUrl = defaultBaseUrl(),
  teacherPassword,
  parentPassword,
  artifactRoot,
  dateMode = "rolling",
  historicalRanges = [],
  homePracticeSample = null,
  log = console.log,
}) {
  assertSchoolSimStateReady(state, { phase: "Phase 3 report validation" });

  const serviceRole = createServiceRole();
  const schoolId = state.schoolId;
  const studentIds = state.studentIds;

  assertGradePickStudentIds(studentIds, "R4");

  const staffPassword = teacherPassword || resolveStaffPassword();
  const scaffoldingParentPassword = parentPassword || resolveScaffoldingParentPassword();
  const isBackfillHistorical = dateMode === "historical" && historicalRanges.length > 0;
  const fullHistoricalRange = resolveFullHistoricalRange(historicalRanges);
  const t10DateOpts =
    isBackfillHistorical && fullHistoricalRange
      ? { from: fullHistoricalRange.from, to: fullHistoricalRange.to }
      : {};

  const schoolToken = await getBearer(SCHOOL_MANAGER_EMAIL, staffPassword);
  const parentToken = await getBearer(DEMO_PARENT_EMAIL, scaffoldingParentPassword);

  const teacherReports = {};
  const schoolReports = {};
  const r3BridgeApi = {};
  const parentRouteR1 = {};
  const isolationChecks = [];
  const noEmptyReports = {};

  const fallbackStudentId = assertValidStudentId(studentIds[0], "R2 fallback student");

  // --- R2: all 11 teachers ---
  for (const [key, email] of Object.entries(TEACHER_EMAILS)) {
    const teacherId = state.teacherIds?.[key];
    const pick = teacherId
      ? await pickStudentWithClassroomActivity(serviceRole, teacherId, schoolId)
      : null;
    const studentId = assertValidStudentId(
      pick?.studentId || fallbackStudentId,
      `R2 ${key} student`
    );
    const tToken = await getBearer(email, teacherPassword);
    const path = teacherStudentReportPath(studentId);
    const fetched = await fetchReport(baseUrl, path, tToken);
    const keys = subjectKeys(fetched.body);
    const visible = visibleSubjectKeysWithAnswers(fetched.body?.subjects);
    const allowed = TEACHER_SUBJECTS[key] || [];
    const leak = visible.filter((k) => !allowed.includes(k));
    const total = fetched.total;
    const ok = fetched.status === 200 && total > 0 && leak.length === 0;
    teacherReports[key] = {
      ...reportRowFromFetch(fetched, { studentId, subjects: keys, visible, leak }),
      ok,
      validationScope: isBackfillHistorical ? "rolling_advisory" : "rolling",
      gatesStatus: !isBackfillHistorical,
    };
    if (!ok) {
      log(
        `R2 ${key}: status=${fetched.status} total=${total} code=${fetched.code || ""} path=${fetched.path}`
      );
    }
  }

  // --- R4: school admin (6 grades) ---
  const gradesPicked = [0, 50, 100, 150, 200, 250].map((i) =>
    assertValidStudentId(studentIds[Math.min(i, studentIds.length - 1)], `R4 grade index ${i}`)
  );
  for (const studentId of gradesPicked) {
    const path = schoolStudentReportPath(studentId);
    const fetched = await fetchReport(baseUrl, path, schoolToken);
    const total = fetched.total;
    const ok = fetched.status === 200 && total > 0;
    schoolReports[studentId] = {
      ...reportRowFromFetch(fetched),
      ok,
      validationScope: isBackfillHistorical ? "rolling_advisory" : "rolling",
      gatesStatus: !isBackfillHistorical,
    };
    if (!ok) {
      log(
        `R4 ${studentId}: status=${fetched.status} total=${total} code=${fetched.code || ""} path=${fetched.path}`
      );
    }
  }

  // --- R3 API: prefer UI-pass students; else students with classroom activity ---
  const r3Candidates = uiSampleResults.filter((r) => r.status === "pass" || r.status === "partial");
  let r3ForApi = r3Candidates;
  if (!r3ForApi.length) {
    const danId = state.teacherIds?.dan;
    const picks = [];
    for (let i = 0; i < 5; i++) {
      const p = await pickStudentWithClassroomActivity(serviceRole, danId, schoolId);
      if (p?.studentId && !picks.some((x) => x.studentId === p.studentId)) {
        picks.push({ studentId: p.studentId, status: "classroom-only" });
      }
    }
    r3ForApi = picks;
  }
  for (const row of r3ForApi.slice(0, 5)) {
    const sid = assertValidStudentId(row.studentId, "R3 API");
    const teacherEmail = await pickTeacherEmailForStudent(serviceRole, state, sid);
    const rowToken = await getBearer(teacherEmail, teacherPassword);
    const path = teacherStudentReportPath(sid, "parent-report-data");
    const fetched = await fetchReport(baseUrl, path, rowToken);
    const raw = JSON.stringify(fetched.body || {});
    const hasLeak = raw.includes("_dailyBySubject");
    const insights = fetched.body?.parentFacing?.insights || fetched.body?.insights;
    const hasInsights = Array.isArray(insights) ? insights.length > 0 : Boolean(insights);
    const r3Total = fetched.total;
    r3BridgeApi[sid] = {
      ...reportRowFromFetch(fetched, { teacherEmail, hasLeak, hasInsights }),
      ok: fetched.status === 200 && r3Total > 0 && !hasLeak,
    };
  }

  // --- R3 Browser (3 students with passing API + correct teacher session) ---
  const r3BrowserEntries = Object.entries(r3BridgeApi)
    .filter(([, v]) => v.ok)
    .slice(0, 3);
  const r3BridgeBrowserResults = { results: {}, ok: true, failCount: 0, sampled: 0 };
  for (const [studentId, meta] of r3BrowserEntries) {
    const one = await runR3BridgeBrowserValidation({
      baseUrl,
      teacherPassword,
      teacherEmail: meta.teacherEmail || TEACHER_EMAILS.dan,
      students: [{ studentId }],
      reportRange:
        isBackfillHistorical && fullHistoricalRange
          ? { from: fullHistoricalRange.from, to: fullHistoricalRange.to }
          : null,
      artifactRoot,
      log,
    });
    r3BridgeBrowserResults.results[studentId] = one.results[studentId];
    r3BridgeBrowserResults.sampled += 1;
    if (!one.results[studentId]?.ok) {
      r3BridgeBrowserResults.failCount += 1;
      r3BridgeBrowserResults.ok = false;
    }
  }
  const r3BridgeBrowser = {
    ...r3BridgeBrowserResults,
    teacherEmail: "per-student",
  };

  // --- R1: parent route (Phase 2 UI data) ---
  for (const row of uiSampleResults) {
    const sid = assertValidStudentId(row.studentId, "R1 UI sample");
    const path = parentStudentReportPath(sid);
    const fetched = await fetchReport(baseUrl, path, parentToken);
    const expectedMin = row.status === "pass" ? 1 : 0;
    parentRouteR1[sid] = {
      ...reportRowFromFetch(fetched, {
        validationMode: "full",
        authModel: "scaffolding-demo-parent-email",
        note: "demofamily@leo-k.com owns demo students; not school-wide parent username+PIN",
      }),
      ok: fetched.status === 200 && (row.status !== "pass" || fetched.total >= expectedMin),
    };
  }

  const nonSampled = studentIds
    .filter((id) => !uiSampleResults.some((r) => r.studentId === id))
    .slice(0, 3);
  for (const rawId of nonSampled) {
    const sid = assertValidStudentId(rawId, "R1 non-sampled");
    const path = parentStudentReportPath(sid);
    const fetched = await fetchReport(baseUrl, path, parentToken);
    parentRouteR1[`non-sampled-${sid}`] = {
      studentId: sid,
      ...reportRowFromFetch(fetched, {
        authModel: "scaffolding-demo-parent-email",
        note: "R1 may be empty when no Phase 2 UI session; not proof for all school parents",
      }),
      ok: fetched.status === 200,
    };
  }

  const danToken = await getBearer(TEACHER_EMAILS.dan, teacherPassword);

  // --- T9 Isolation ---
  if (studentIds.length >= 2) {
    const a = assertValidStudentId(studentIds[0], "isolation R2-a");
    const b = assertValidStudentId(studentIds[1], "isolation R2-b");
    const ra = await fetchReport(baseUrl, teacherStudentReportPath(a), danToken);
    const rb = await fetchReport(baseUrl, teacherStudentReportPath(b), danToken);
    isolationChecks.push({
      check: "cross-student-r2",
      ok: JSON.stringify(ra.body?.summary) !== JSON.stringify(rb.body?.summary),
    });
  }

  const danPick = await pickStudentWithClassroomActivity(serviceRole, state.teacherIds?.dan, schoolId);
  if (danPick?.studentId) {
    const danSid = assertValidStudentId(danPick.studentId, "isolation dan pick");
    const r2 = await fetchReport(baseUrl, teacherStudentReportPath(danSid), danToken);
    const r3 = await fetchReport(
      baseUrl,
      teacherStudentReportPath(danSid, "parent-report-data"),
      danToken
    );
    const r1 = await fetchReport(baseUrl, parentStudentReportPath(danSid), parentToken);
    const r2Visible = visibleSubjectKeysWithAnswers(r2.body?.subjects);
    const leak = r2Visible.filter((k) => k !== "math" && k !== "geometry");
    isolationChecks.push({
      check: "cross-subject-r2-dan-scope",
      ok: leak.length === 0,
      leak,
    });
    isolationChecks.push({
      check: "r1-vs-r3-independent-sources",
      ok: true,
      r1Total: totalAnswersFromPayload(r1.body),
      r3Total: totalAnswersFromPayload(r3.body),
      note: "R1=learning_sessions; R3=classroom bridge — totals may differ",
    });
  }

  const saraToken = await getBearer(TEACHER_EMAILS.sara, teacherPassword);
  if (danPick?.studentId && studentIds[1]) {
    const engSid = assertValidStudentId(studentIds[1], "isolation sara english");
    const engOnly = await fetchReport(baseUrl, teacherStudentReportPath(engSid), saraToken);
    const engVisible = visibleSubjectKeysWithAnswers(engOnly.body?.subjects);
    isolationChecks.push({
      check: "cross-subject-sara-english-only",
      ok: engVisible.every((k) => k === "english" || engVisible.length === 0),
      visible: engVisible,
    });
  }

  // --- T10: one subject-class per physical class (18) with activities → non-empty report ---
  const seenPhysical = new Set();
  for (const [classId, meta] of Object.entries(classSummary || {})) {
    if (!meta?.activities || seenPhysical.has(meta.physicalName)) continue;
    seenPhysical.add(meta.physicalName);
    const { data: clsRow } = await serviceRole
      .from("teacher_classes")
      .select("subject_focus, grade_level")
      .eq("id", classId)
      .maybeSingle();
    const subject = clsRow?.subject_focus || "math";
    const grade = clsRow?.grade_level || meta.grade || 1;
    const { data: roster } = await serviceRole
      .from("teacher_class_students")
      .select("student_id")
      .eq("class_id", classId)
      .is("removed_at", null)
      .limit(1);
    const sid = roster?.[0]?.student_id;
    if (!sid) {
      noEmptyReports[classId] = { ok: false, reason: "no roster" };
      continue;
    }
    const studentId = assertValidStudentId(sid, `no-empty ${meta.physicalName}`);
    const teacherKey = teacherKeyForSubject(grade, subject);
    const tToken = await getBearer(TEACHER_EMAILS[teacherKey] || TEACHER_EMAILS.dan, teacherPassword);
    const fetched = await fetchReport(
      baseUrl,
      teacherStudentReportPath(studentId, "report-data", t10DateOpts),
      tToken
    );
    const emptyTotal = fetched.total;
    noEmptyReports[classId] = {
      physicalName: meta.physicalName,
      ok: fetched.status === 200 && emptyTotal > 0,
      total: emptyTotal,
      studentId,
      path: fetched.path,
      code: fetched.code,
      message: fetched.message,
      validationScope: isBackfillHistorical ? "historical_checkpoint_range" : "rolling",
      ...(isBackfillHistorical && fullHistoricalRange
        ? { from: fullHistoricalRange.from, to: fullHistoricalRange.to }
        : {}),
      gatesStatus: true,
    };
  }

  let historicalReportChecks = { checks: [], ok: true, failCount: 0 };
  if (dateMode === "historical" && historicalRanges.length) {
    historicalReportChecks = await runHistoricalRangeChecks({
      state,
      baseUrl,
      teacherPassword: staffPassword,
      parentPassword: scaffoldingParentPassword,
      historicalRanges,
      homePracticeSample,
      log,
    });
  }

  const r2Fails = Object.values(teacherReports).filter((r) => !r.ok).length;
  const r4Fails = Object.values(schoolReports).filter((r) => !r.ok).length;
  const r3ApiFails = Object.values(r3BridgeApi).filter((r) => !r.ok).length;
  const r3BrowserFails = r3BridgeBrowser.failCount || 0;
  const r1Fails = Object.values(parentRouteR1).filter((r) => r.studentId && !r.ok).length;
  const isoFails = isolationChecks.filter((r) => r.ok === false).length;
  const emptyFails = Object.values(noEmptyReports).filter((r) => !r.ok).length;
  const historicalFails = historicalReportChecks.failCount || 0;
  const rollingAdvisoryFails = isBackfillHistorical ? r2Fails + r4Fails : 0;

  let status = "pass";
  if (isBackfillHistorical) {
    if (historicalFails > 0 || r3BrowserFails > 0 || emptyFails > 0) {
      status = "fail";
    } else if (r1Fails > 0) {
      status = "partial";
    }
    if (rollingAdvisoryFails > 0 || r3ApiFails > 0 || isoFails > 0) {
      log(
        `backfill report advisory (non-blocking): rollingR2R4=${rollingAdvisoryFails} rollingR3=${r3ApiFails} isolation=${isoFails}`
      );
    }
  } else if (
    r2Fails > 0 ||
    r4Fails > 0 ||
    r3ApiFails > 0 ||
    r3BrowserFails > 0 ||
    isoFails > 0 ||
    emptyFails > 0 ||
    historicalFails > 0
  ) {
    status = "fail";
  } else if (r1Fails > 0) {
    status = "partial";
  }

  return {
    status,
    dateMode,
    validationPolicy: isBackfillHistorical ? "historical_authoritative" : "rolling",
    ...(isBackfillHistorical && fullHistoricalRange
      ? { checkpointHistoricalRange: fullHistoricalRange }
      : {}),
    teacherReports,
    schoolReports,
    r3BridgeApi,
    r3BridgeBrowser,
    parentRouteR1,
    isolationChecks,
    noEmptyReports,
    historicalReportChecks,
    counts: {
      r2Fails,
      r4Fails,
      r3ApiFails,
      r3BrowserFails,
      r1Fails,
      isoFails,
      emptyFails,
      historicalFails,
      rollingAdvisoryFails,
    },
  };
}
