#!/usr/bin/env node
/**
 * Idempotent demo school seed — 108 subject-class records, 398 students.
 *
 *   node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=accounts
 *   node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=memberships
 *   node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=classes
 *   node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=students
 *
 * Env: DEMO_TEACHER_PASSWORD, DEMO_PARENT_PASSWORD (or SCHOOL_QA_PASSWORD for manager),
 *       DEMO_STUDENT_PIN (students phase — written to gitignored .local/ artifact only),
 *       NEXT_PUBLIC_LEARNING_SUPABASE_URL, LEARNING_SUPABASE_SERVICE_ROLE_KEY,
 *       LEARNING_STUDENT_ACCESS_SECRET (students phase)
 */
import {
  DEMO_PARENT_DISPLAY,
  DEMO_PARENT_EMAIL,
  DEMO_SCHOOL_CITY,
  DEMO_SCHOOL_CONTACT_EMAIL,
  DEMO_SCHOOL_COUNTRY,
  DEMO_SCHOOL_MAX_TEACHERS,
  DEMO_SCHOOL_NAME,
  PHYSICAL_CLASSES,
  SCHOOL_MANAGER,
  SUBJECTS,
  TEACHERS,
  achievementProfile,
  classRecordKey,
  physicalClassKey,
  physicalClassName,
  studentFullName,
  teacherKeyForSubject,
} from "./demo-school-data.mjs";
import {
  createServiceRole,
  ensureAuthUser,
  ensureParentAuth,
  ensureParentProfile,
  ensureTeacherProfile,
  hashStudentSecret,
  importServerModule,
  mergeSimState,
  requireEnv,
} from "./demo-school-lib.mjs";
import { bootstrapSchoolDbWriteGuard } from "./lib/school-db-write-guard.mjs";

const PLAN_CODE = "teacher_basic_20";

function parsePhase(argv) {
  let phase = null;
  for (const arg of argv) {
    if (arg.startsWith("--phase=")) {
      phase = arg.slice("--phase=".length);
      break;
    }
    const idx = argv.indexOf("--phase");
    if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith("-")) {
      phase = argv[idx + 1];
      break;
    }
  }
  if (!phase) {
    throw new Error("Usage: seed-demo-school.mjs --phase=accounts|memberships|classes|students");
  }
  if (!["accounts", "memberships", "classes", "students"].includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }
  return phase;
}

async function findSchoolByMarker(serviceRole) {
  const { data, error } = await serviceRole
    .from("school_accounts")
    .select("id, name, city")
    .eq("name", DEMO_SCHOOL_NAME)
    .eq("city", DEMO_SCHOOL_CITY)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function resolvePassword(...names) {
  for (const name of names) {
    const v = String(process.env[name] || "").trim();
    if (v) return v;
  }
  throw new Error(
    `Missing password env (set one of: ${names.join(", ")}) at runtime; do not commit passwords`
  );
}

async function phaseAccounts(serviceRole) {
  const teacherPassword = resolvePassword("DEMO_TEACHER_PASSWORD", "SCHOOL_QA_PASSWORD");
  const parentPassword = resolvePassword("DEMO_PARENT_PASSWORD", "DEMO_TEACHER_PASSWORD", "SCHOOL_QA_PASSWORD");
  const managerPassword = resolvePassword("SCHOOL_QA_PASSWORD", "DEMO_TEACHER_PASSWORD");

  const parentId = await ensureParentAuth(serviceRole, DEMO_PARENT_EMAIL, parentPassword);
  await ensureParentProfile(serviceRole, parentId);

  const teacherIds = {};
  for (const t of TEACHERS) {
    const id = await ensureAuthUser(serviceRole, {
      email: t.email,
      password: teacherPassword,
      displayName: t.displayName,
      role: "teacher",
    });
    await ensureTeacherProfile(serviceRole, id, t.displayName);
    teacherIds[t.key] = id;
  }

  const managerId = await ensureAuthUser(serviceRole, {
    email: SCHOOL_MANAGER.email,
    password: managerPassword,
    displayName: SCHOOL_MANAGER.displayName,
    role: "teacher",
  });
  await ensureTeacherProfile(serviceRole, managerId, SCHOOL_MANAGER.displayName);
  teacherIds.manager = managerId;

  mergeSimState({
    demoParentId: parentId,
    demoParentEmail: DEMO_PARENT_EMAIL,
    teacherIds,
    teacherEmails: Object.fromEntries(
      [...TEACHERS, SCHOOL_MANAGER].map((t) => [t.key || "manager", t.email])
    ),
  });

  console.log(
    JSON.stringify(
      {
        phase: "accounts",
        parentId,
        teachers: Object.keys(teacherIds).length,
        managerEmail: SCHOOL_MANAGER.email,
      },
      null,
      2
    )
  );
}

async function phaseMemberships(serviceRole) {
  const state = mergeSimState({});
  if (!state.teacherIds?.dan) {
    throw new Error("Run --phase=accounts first");
  }

  let school = await findSchoolByMarker(serviceRole);
  if (!school?.id) {
    const { data, error } = await serviceRole
      .from("school_accounts")
      .insert({
        name: DEMO_SCHOOL_NAME,
        city: DEMO_SCHOOL_CITY,
        country_code: DEMO_SCHOOL_COUNTRY,
        contact_email: DEMO_SCHOOL_CONTACT_EMAIL,
        max_teachers: DEMO_SCHOOL_MAX_TEACHERS,
        is_active: true,
      })
      .select("id, name")
      .single();
    if (error) throw error;
    school = data;
    console.log(`Created school: ${school.name} (${school.id})`);
  } else {
    console.log(`Using school: ${school.name} (${school.id})`);
  }

  const { assignSchoolManager, assignTeacherToSchool } = await importServerModule(
    "lib/admin-server/admin-schools.server.js"
  );
  const { grantSchoolTeacherSubject } = await importServerModule(
    "lib/school-server/school-subjects.server.js"
  );

  const managerId = state.teacherIds.manager;
  const assigned = await assignSchoolManager(serviceRole, school.id, managerId);
  if (!assigned.ok) throw new Error(`assignSchoolManager failed: ${assigned.code}`);

  for (const t of TEACHERS) {
    const teacherId = state.teacherIds[t.key];
    const result = await assignTeacherToSchool(serviceRole, school.id, teacherId, { force: true });
    if (!result.ok) throw new Error(`assignTeacherToSchool(${t.key}) failed: ${result.code}`);

    for (const subject of t.subjects) {
      for (const grade of t.grades) {
        const granted = await grantSchoolTeacherSubject(serviceRole, {
          schoolId: school.id,
          teacherId,
          subject,
          gradeLevel: String(grade),
          grantedBy: managerId,
        });
        if (!granted.ok && granted.code !== "subject_already_granted") {
          throw new Error(`grant subject ${t.key}/${subject}/${grade}: ${granted.code}`);
        }
      }
    }
  }

  mergeSimState({
    schoolId: school.id,
    demoSchoolName: DEMO_SCHOOL_NAME,
    startDate: state.startDate || "2025-09-01",
    currentSchoolDay: state.currentSchoolDay ?? 0,
  });

  console.log(
    JSON.stringify({ phase: "memberships", schoolId: school.id, teachers: TEACHERS.length }, null, 2)
  );
}

async function findExistingClass(serviceRole, { schoolId, teacherId, name, gradeLevel, subjectFocus }) {
  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("name", name)
    .eq("grade_level", gradeLevel)
    .eq("subject_focus", subjectFocus)
    .eq("is_archived", false)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function phaseClasses(serviceRole) {
  const state = mergeSimState({});
  if (!state.schoolId || !state.teacherIds) {
    throw new Error("Run --phase=memberships first");
  }

  const classIds = {};
  let created = 0;
  let reused = 0;

  for (const pc of PHYSICAL_CLASSES) {
    const name = physicalClassName(pc.grade, pc.section);
    const gradeLevel = String(pc.grade);

    for (const subject of SUBJECTS) {
      const tKey = teacherKeyForSubject(pc.grade, subject);
      const teacherId = state.teacherIds[tKey];
      const key = classRecordKey(pc.grade, pc.section, subject);

      let classId = await findExistingClass(serviceRole, {
        schoolId: state.schoolId,
        teacherId,
        name,
        gradeLevel,
        subjectFocus: subject,
      });

      if (!classId) {
        const { data, error } = await serviceRole
          .from("teacher_classes")
          .insert({
            teacher_id: teacherId,
            school_id: state.schoolId,
            name,
            grade_level: gradeLevel,
            subject_focus: subject,
            color_hint: "demo",
            is_archived: false,
          })
          .select("id")
          .single();
        if (error) throw error;
        classId = data.id;
        created += 1;
      } else {
        reused += 1;
      }

      classIds[key] = classId;
    }
  }

  const count = Object.keys(classIds).length;
  if (count !== 108) {
    throw new Error(`Expected 108 class records, got ${count}`);
  }

  mergeSimState({ classIds, physicalClasses: PHYSICAL_CLASSES });

  console.log(
    JSON.stringify({ phase: "classes", total: count, created, reused, schoolId: state.schoolId }, null, 2)
  );
}

async function ensureStudentAccessCode(serviceRole, studentId, username, pin, secret) {
  const loginUsername = username.toLowerCase().trim();
  const codeHash = hashStudentSecret(loginUsername, secret);
  const pinHash = hashStudentSecret(pin, secret);

  const { data: existing } = await serviceRole
    .from("student_access_codes")
    .select("id")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing?.id) {
    await serviceRole
      .from("student_access_codes")
      .update({ login_username: loginUsername, code_hash: codeHash, pin_hash: pinHash })
      .eq("id", existing.id);
    return;
  }

  const { error } = await serviceRole.from("student_access_codes").insert({
    student_id: studentId,
    login_username: loginUsername,
    code_hash: codeHash,
    pin_hash: pinHash,
    is_active: true,
  });
  if (error && error.code !== "23505") throw error;
}

async function ensureClassMember(serviceRole, classId, studentId) {
  const { data: existing } = await serviceRole
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .is("removed_at", null)
    .maybeSingle();

  if (existing?.id) return false;

  const { error } = await serviceRole.from("teacher_class_students").insert({
    class_id: classId,
    student_id: studentId,
  });
  if (error && error.code !== "23505") throw error;
  return true;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function batchInsert(serviceRole, table, rows, chunkSize = 200) {
  let inserted = 0;
  for (const chunk of chunkArray(rows, chunkSize)) {
    if (chunk.length === 0) continue;
    const { error } = await serviceRole.from(table).insert(chunk);
    if (error && error.code !== "23505") throw new Error(`${table} batch insert: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

async function phaseStudents(serviceRole) {
  const state = mergeSimState({});
  if (!state.schoolId || !state.classIds || !state.demoParentId) {
    throw new Error("Run --phase=classes first");
  }

  const accessSecret = requireEnv("LEARNING_STUDENT_ACCESS_SECRET");
  const defaultPin = String(process.env.DEMO_STUDENT_PIN || "").trim();
  if (!defaultPin) {
    throw new Error(
      "DEMO_STUDENT_PIN required for --phase=students (PIN used for all demo access codes at seed; " +
        "written to gitignored .local/student-access-credentials.json — not recoverable from DB later)"
    );
  }
  const managerId = state.teacherIds.manager;

  const studentIds = [];
  const studentProfiles = {};
  const studentsByPhysical = {};
  const studentRows = [];
  const accessCodeRows = [];
  const enrollmentRows = [];
  const classLinkRows = [];
  let globalIndex = 0;

  console.log("Building student roster (398 students × 6 subject-class links)...");

  for (const pc of PHYSICAL_CLASSES) {
    const pKey = physicalClassKey(pc.grade, pc.section);
    const className = physicalClassName(pc.grade, pc.section);
    const gradeLevel = String(pc.grade);
    const physicalStudentIds = [];
    const classIdsForPhysical = SUBJECTS.map((subject) =>
      state.classIds[classRecordKey(pc.grade, pc.section, subject)]
    );

    for (let i = 0; i < pc.count; i++) {
      const fullName = studentFullName(globalIndex);
      const profile = achievementProfile(globalIndex);
      const username = `demo-g${pc.grade}s${pc.section}-${String(i + 1).padStart(2, "0")}`;
      const loginUsername = username.toLowerCase().trim();

      studentRows.push({
        parent_id: state.demoParentId,
        full_name: fullName,
        grade_level: gradeLevel,
        is_active: true,
        _username: loginUsername,
        _profile: profile,
        _pKey: pKey,
        _classIds: classIdsForPhysical,
        _physicalMeta: { name: className, grade: pc.grade, section: pc.section },
      });
      globalIndex += 1;
    }

    studentsByPhysical[pKey] = {
      name: className,
      grade: pc.grade,
      section: pc.section,
      studentIds: physicalStudentIds,
    };
  }

  const { data: existingStudents, error: existingErr } = await serviceRole
    .from("students")
    .select("id, full_name, grade_level")
    .eq("parent_id", state.demoParentId);
  if (existingErr) throw existingErr;

  const existingByName = new Map((existingStudents || []).map((s) => [s.full_name, s]));

  for (const row of studentRows) {
    const existing = existingByName.get(row.full_name);
    let studentId = existing?.id;

    if (!studentId) {
      const { data, error } = await serviceRole
        .from("students")
        .insert({
          parent_id: row.parent_id,
          full_name: row.full_name,
          grade_level: row.grade_level,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      studentId = data.id;
      existingByName.set(row.full_name, { id: studentId, full_name: row.full_name });
    } else if (existing.grade_level !== row.grade_level) {
      await serviceRole
        .from("students")
        .update({ grade_level: row.grade_level, is_active: true })
        .eq("id", studentId);
    }

    studentIds.push(studentId);
    studentProfiles[studentId] = row._profile;

    const codeHash = hashStudentSecret(row._username, accessSecret);
    const pinHash = hashStudentSecret(defaultPin, accessSecret);
    accessCodeRows.push({
      student_id: studentId,
      login_username: row._username,
      code_hash: codeHash,
      pin_hash: pinHash,
      is_active: true,
    });

    enrollmentRows.push({
      school_id: state.schoolId,
      student_id: studentId,
      enrolled_by: managerId,
    });

    for (const classId of row._classIds) {
      classLinkRows.push({ class_id: classId, student_id: studentId });
    }

    if (!studentsByPhysical[row._pKey].studentIds) {
      studentsByPhysical[row._pKey].studentIds = [];
    }
    studentsByPhysical[row._pKey].studentIds.push(studentId);
  }

  if (studentIds.length !== 398) {
    throw new Error(`Expected 398 students, got ${studentIds.length}`);
  }

  const expectedLinks = 398 * 6;
  const classIdList = Object.values(state.classIds);

  const { count: linkCountBefore, error: linkBeforeErr } = await serviceRole
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .in("class_id", classIdList);
  if (linkBeforeErr) throw linkBeforeErr;

  if (linkCountBefore < expectedLinks) {
    console.log(
      `Batch insert: ${accessCodeRows.length} access codes, ${enrollmentRows.length} enrollments, ${classLinkRows.length} class links...`
    );
    await batchInsert(serviceRole, "student_access_codes", accessCodeRows);
    await batchInsert(serviceRole, "school_student_enrollments", enrollmentRows);
    const linksInserted = await batchInsert(serviceRole, "teacher_class_students", classLinkRows);
    console.log(`Class links batch attempted: ${linksInserted}`);
  } else {
    console.log(`Class links already at ${linkCountBefore}, skipping batch inserts`);
  }

  const { count: linkCount, error: countErr } = await serviceRole
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .in("class_id", classIdList);
  if (countErr) throw countErr;
  if (linkCount !== expectedLinks) {
    console.warn(`Filling ${expectedLinks - linkCount} missing class links individually...`);
    for (const link of classLinkRows) {
      await ensureClassMember(serviceRole, link.class_id, link.student_id);
    }
    const { count: linkCountAfter } = await serviceRole
      .from("teacher_class_students")
      .select("id", { count: "exact", head: true })
      .in("class_id", classIdList);
    if (linkCountAfter !== expectedLinks) {
      throw new Error(`teacher_class_students count=${linkCountAfter}, expected ${expectedLinks}`);
    }
  }

  const classWeakTopics = {};
  const { WEAK_TOPICS_BY_CLASS } = await import("./demo-school-data.mjs");
  for (const [classNameKey, weak] of Object.entries(WEAK_TOPICS_BY_CLASS)) {
    const pc = PHYSICAL_CLASSES.find((p) => physicalClassName(p.grade, p.section) === classNameKey);
    if (!pc) continue;
    const classId = state.classIds[classRecordKey(pc.grade, pc.section, weak.subject)];
    if (classId) classWeakTopics[classId] = [weak.topic];
  }

  const studentCredentials = {};
  for (const row of accessCodeRows) {
    studentCredentials[row.student_id] = {
      username: row.login_username,
      pin: defaultPin,
    };
  }
  const { writeCredentialsArtifact } = await import("./sim/student-credentials.mjs");
  const credPath = writeCredentialsArtifact(studentCredentials, { source: "seed-demo-school" });
  console.log(`Wrote student credential artifact (gitignored): ${credPath}`);

  mergeSimState({
    studentIds,
    studentProfiles,
    studentsByPhysical,
    classWeakTopics,
    currentSchoolDay: state.currentSchoolDay ?? 0,
    lastRunAt: null,
  });

  console.log(
    JSON.stringify(
      {
        phase: "students",
        students: studentIds.length,
        teacherClassLinks: linkCount,
        schoolId: state.schoolId,
      },
      null,
      2
    )
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapSchoolDbWriteGuard(
    "school-portal/seed-demo-school",
    "SEED_DEMO_SCHOOL",
    argv
  );
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary();
    return;
  }
  const phase = parsePhase(argv);
  const serviceRole = createServiceRole();

  if (phase === "accounts") await phaseAccounts(serviceRole);
  else if (phase === "memberships") await phaseMemberships(serviceRole);
  else if (phase === "classes") await phaseClasses(serviceRole);
  else if (phase === "students") await phaseStudents(serviceRole);

  console.log(`seed-demo-school: ${phase} OK`);
  guard.printEndSummary({ affectedRows: 1, artifactPath: `phase=${phase}` });
}

main().catch((e) => {
  console.error("seed-demo-school: FAIL", e.message || e);
  process.exit(1);
});
