#!/usr/bin/env node
/**
 * School class management + student assignment permission matrix.
 */
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../../scripts/school-portal/demo-school-data.mjs";
import { SCHOOL_MANAGER_EMAIL } from "../../scripts/school-portal/sim/school-sim-config.mjs";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const PRIVATE_TEACHER_EMAIL = "teacher@leo-k.com";
const PARENT_EMAIL = "demofamily@leo-k.com";
const SCHOOL_TEACHER_EMAIL = "dan@leo-k.com";

const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

async function getBearer(email, password) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error(`auth failed for ${email}`);
  return tokenJson.access_token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const code = json?.error?.code || json?.errorCode || null;
  return { status: res.status, json, code };
}

async function findSampleStudent(db) {
  const { data: enrollments } = await db
    .from("school_student_enrollments")
    .select("student_id")
    .eq("school_id", DEMO_SCHOOL_ID)
    .limit(1);
  return enrollments?.[0]?.student_id || null;
}

async function main() {
  const password =
    process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
  const parentPassword = process.env.E2E_PARENT_PASSWORD || password;
  if (!password) throw new Error("Missing DEMO_TEACHER_PASSWORD");

  const db = createServiceRole();
  const managerToken = await getBearer(SCHOOL_MANAGER_EMAIL, password);
  const teacherToken = await getBearer(SCHOOL_TEACHER_EMAIL, password);
  let privateToken = null;
  let parentToken = null;
  let operatorToken = null;

  try {
    privateToken = await getBearer(PRIVATE_TEACHER_EMAIL, password);
  } catch {
    /* optional */
  }
  try {
    parentToken = await getBearer(PARENT_EMAIL, parentPassword);
  } catch {
    /* optional */
  }
  try {
    operatorToken = await getBearer("qa-school-operator@leo-k.com", password);
  } catch {
    /* optional */
  }

  const list = await api("GET", "/api/school/physical-classes", managerToken);
  record(
    "manager_list_physical_classes",
    list.status === 200 && Array.isArray(list.json?.data?.physicalClasses),
    `status=${list.status} count=${list.json?.data?.physicalClasses?.length ?? 0}`
  );

  const testClassName = `בדיקה-${Date.now().toString(36).slice(-5)}`;
  const create = await api("POST", "/api/school/physical-classes", managerToken, {
    name: testClassName,
    gradeLevel: "1",
  });
  record(
    "manager_create_physical_class",
    create.status === 201 || (create.status === 200 && create.json?.data?.physicalClass?.ok),
    `status=${create.status} code=${create.code || "ok"}`
  );

  const teacherCreate = await api("POST", "/api/school/physical-classes", teacherToken, {
    name: "כיתה-מורה",
    gradeLevel: "1",
  });
  record(
    "school_teacher_cannot_create_class",
    teacherCreate.status === 403,
    `status=${teacherCreate.status} code=${teacherCreate.code}`
  );

  if (privateToken) {
    const privCreate = await api("POST", "/api/school/physical-classes", privateToken, {
      name: "כיתה-פרטי",
      gradeLevel: "1",
    });
    record(
      "private_teacher_cannot_create_class",
      privCreate.status === 403,
      `status=${privCreate.status} code=${privCreate.code}`
    );
  }

  if (parentToken) {
    const parCreate = await api("POST", "/api/school/physical-classes", parentToken, {
      name: "כיתה-הורה",
      gradeLevel: "1",
    });
    record(
      "parent_cannot_create_class",
      parCreate.status === 401 || parCreate.status === 403,
      `status=${parCreate.status} code=${parCreate.code}`
    );
  }

  const studentId = await findSampleStudent(db);
  if (!studentId) {
    record("sample_student_found", false, "no enrolled student");
  } else {
    const fromClass = physicalClassName(1, 1);
    const toClass = physicalClassName(1, 2);

    const assignGet = await api("GET", `/api/school/students/${studentId}/assignment`, managerToken);
    record(
      "manager_get_student_assignment",
      assignGet.status === 200 && assignGet.json?.data?.assignment?.studentId === studentId,
      `status=${assignGet.status}`
    );

    const move = await api("PATCH", `/api/school/students/${studentId}/assignment`, managerToken, {
      toGradeLevel: "1",
      toPhysicalClassName: toClass,
      fromGradeLevel: "1",
      fromPhysicalClassName: fromClass,
    });
    record(
      "manager_move_student_same_school",
      move.status === 200,
      `status=${move.status} code=${move.code}`
    );

    if (move.status === 200) {
      const reverse = await api("PATCH", `/api/school/students/${studentId}/assignment`, managerToken, {
        toGradeLevel: "1",
        toPhysicalClassName: fromClass,
        fromGradeLevel: "1",
        fromPhysicalClassName: toClass,
      });
      record(
        "manager_move_student_reverse",
        reverse.status === 200,
        `status=${reverse.status} code=${reverse.code}`
      );
    }

    const badTarget = await api("PATCH", `/api/school/students/${studentId}/assignment`, managerToken, {
      toGradeLevel: "1",
      toPhysicalClassName: "כיתה שלא קיימת בבית ספר",
      fromGradeLevel: "1",
      fromPhysicalClassName: fromClass,
    });
    record(
      "manager_cannot_move_to_missing_class",
      badTarget.status === 404 || badTarget.code === "physical_class_not_found",
      `status=${badTarget.status} code=${badTarget.code}`
    );

    const teacherMove = await api("PATCH", `/api/school/students/${studentId}/assignment`, teacherToken, {
      toGradeLevel: "1",
      toPhysicalClassName: toClass,
    });
    record(
      "school_teacher_cannot_move_student",
      teacherMove.status === 403,
      `status=${teacherMove.status} code=${teacherMove.code}`
    );

    if (privateToken) {
      const privMove = await api("PATCH", `/api/school/students/${studentId}/assignment`, privateToken, {
        toGradeLevel: "1",
        toPhysicalClassName: toClass,
      });
      record(
        "private_teacher_cannot_move_school_student",
        privMove.status === 403,
        `status=${privMove.status} code=${privMove.code}`
      );
    }

    if (parentToken) {
      const parMove = await api("PATCH", `/api/school/students/${studentId}/assignment`, parentToken, {
        toGradeLevel: "1",
        toPhysicalClassName: toClass,
      });
      record(
        "parent_cannot_move_student",
        parMove.status === 401 || parMove.status === 403,
        `status=${parMove.status} code=${parMove.code}`
      );
    }

    if (operatorToken) {
      const qaOp = await findAuthUserByEmail(db, "qa-school-operator@leo-k.com");
      const { data: grants } = qaOp?.id
        ? await db
            .from("school_operator_grants")
            .select("student_access_admin")
            .eq("school_id", DEMO_SCHOOL_ID)
            .eq("operator_user_id", qaOp.id)
            .maybeSingle()
        : { data: null };

      const opMove = await api("PATCH", `/api/school/students/${studentId}/assignment`, operatorToken, {
        toGradeLevel: "1",
        toPhysicalClassName: toClass,
      });

      if (grants?.student_access_admin) {
        record(
          "operator_with_grant_can_move_student",
          opMove.status === 200 || opMove.code === "physical_class_not_found",
          `status=${opMove.status} code=${opMove.code} (grant enabled)`
        );
      } else {
        record(
          "operator_without_grant_cannot_move_student",
          opMove.status === 403,
          `status=${opMove.status} code=${opMove.code}`
        );
      }

      const opCreate = await api("POST", "/api/school/physical-classes", operatorToken, {
        name: "כיתה-מזכירות",
        gradeLevel: "1",
      });
      record(
        "operator_cannot_create_class",
        opCreate.status === 403,
        `status=${opCreate.status} code=${opCreate.code}`
      );
    }
  }

  const dashboard = await readFile("pages/school/dashboard.js");
  record(
    "ui_class_mgmt_manager_only",
    dashboard?.includes('portalRole === "school_manager"') &&
      dashboard?.includes("SchoolClassManagementPanel"),
    "dashboard guards class panel"
  );

  const reportModal = await readFile("components/school-portal/SchoolReportModal.jsx");
  record(
    "ui_assignment_tab_gated",
    reportModal?.includes("canManageAssignment") && reportModal?.includes("showAssignmentTab"),
    "report modal assignment gate"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSchool class assignment matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

async function readFile(path) {
  try {
    const fs = await import("node:fs/promises");
    return await fs.readFile(path, "utf8");
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
