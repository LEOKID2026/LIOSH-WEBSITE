import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PARENT_EMAIL } from "./demo-school-data.mjs";
import { DEMO_STUDENT_COUNT, SCHOOL_MANAGER_EMAIL } from "./sim/school-sim-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, "../..");
export const SIM_STATE_PATH = path.join(__dirname, "sim-state.json");
/** Tracked QA fixture — read-only fallback for demo school sim only. */
export const DEMO_SIM_STATE_FIXTURE_PATH = path.join(
  __dirname,
  "fixtures",
  "demo-school-sim-state.json"
);

export function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name} (set at runtime; do not commit passwords)`);
  return v;
}

export function createServiceRole() {
  return createClient(
    requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"),
    requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function findAuthUserByEmail(admin, email) {
  const target = String(email).trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === target);
    if (match) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

export async function ensureAuthUser(admin, { email, password, displayName, role = "teacher" }) {
  const normalized = String(email).trim().toLowerCase();
  let user = await findAuthUserByEmail(admin, normalized);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { source: "demo-school-seed" },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { role },
    });
    if (error) throw error;
    user = data.user || user;
  }
  return user.id;
}

export async function ensureParentAuth(admin, email, password) {
  return ensureAuthUser(admin, { email, password, role: "parent" });
}

export async function ensureParentProfile(admin, parentId) {
  const { data } = await admin.from("parent_profiles").select("id").eq("id", parentId).maybeSingle();
  if (data?.id) return;
  const { error } = await admin.from("parent_profiles").insert({ id: parentId });
  if (error && error.code !== "23505") throw error;
}

export async function ensureTeacherProfile(admin, teacherId, displayName) {
  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();

  if (!profile) {
    const { error } = await admin.from("teacher_profiles").insert({
      id: teacherId,
      display_name: displayName,
      preferred_language: "he",
      access_prefix: null,
      is_active: true,
    });
    if (error) throw new Error(`teacher_profiles insert (${displayName}): ${error.message}`);
  } else {
    await admin
      .from("teacher_profiles")
      .update({ display_name: displayName, is_active: true })
      .eq("id", teacherId);
  }

  const { data: limits } = await admin
    .from("teacher_limits")
    .select("teacher_id")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (!limits) {
    const { error } = await admin.from("teacher_limits").insert({
      teacher_id: teacherId,
      plan_code: "teacher_basic_20",
    });
    if (error) throw new Error(`teacher_limits insert (${displayName}): ${error.message}`);
  }
}

export function hashStudentSecret(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

/**
 * Resolve sim-state path: local gitignored file first, then tracked demo fixture.
 * Fixture fallback is allowed only for the leo-k demo school simulation scripts.
 */
export function resolveSimStatePath() {
  if (fs.existsSync(SIM_STATE_PATH)) {
    return { path: SIM_STATE_PATH, source: "local" };
  }
  if (fs.existsSync(DEMO_SIM_STATE_FIXTURE_PATH)) {
    return { path: DEMO_SIM_STATE_FIXTURE_PATH, source: "demo-fixture" };
  }
  return { path: SIM_STATE_PATH, source: "missing" };
}

/** Guard fixture loads — never treat arbitrary sim-state as demo school. */
export function assertDemoSchoolSimState(state) {
  if (state.demoParentEmail !== DEMO_PARENT_EMAIL) {
    throw new Error(
      `demo sim-state fixture rejected: demoParentEmail must be ${DEMO_PARENT_EMAIL}`
    );
  }
  if (state.teacherEmails?.manager !== SCHOOL_MANAGER_EMAIL) {
    throw new Error(
      `demo sim-state fixture rejected: manager email must be ${SCHOOL_MANAGER_EMAIL}`
    );
  }
  const studentCount = (state.studentIds || []).length;
  if (studentCount < DEMO_STUDENT_COUNT - 5) {
    throw new Error(
      `demo sim-state fixture rejected: expected ~${DEMO_STUDENT_COUNT} students, got ${studentCount}`
    );
  }
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadFixtureSimState() {
  if (!fs.existsSync(DEMO_SIM_STATE_FIXTURE_PATH)) return null;
  const state = readJsonFile(DEMO_SIM_STATE_FIXTURE_PATH);
  assertDemoSchoolSimState(state);
  return state;
}

function loadLocalSimState() {
  if (!fs.existsSync(SIM_STATE_PATH)) return null;
  return readJsonFile(SIM_STATE_PATH);
}

/** Preserve fixture-backed identity when local sim-state is metadata-only. */
function overlayLocalOntoFixture(fixture, local) {
  const merged = { ...fixture, ...local };

  if (!merged.schoolId) merged.schoolId = fixture.schoolId;
  if (!merged.demoParentId) merged.demoParentId = fixture.demoParentId;
  if (!merged.demoParentEmail) merged.demoParentEmail = fixture.demoParentEmail;
  if (!merged.demoSchoolName) merged.demoSchoolName = fixture.demoSchoolName;

  if (!Array.isArray(merged.studentIds) || merged.studentIds.length === 0) {
    merged.studentIds = fixture.studentIds;
  }
  if (!merged.teacherIds || Object.keys(merged.teacherIds).length === 0) {
    merged.teacherIds = fixture.teacherIds;
  }
  if (!merged.teacherEmails || Object.keys(merged.teacherEmails).length === 0) {
    merged.teacherEmails = fixture.teacherEmails;
  }
  if (!merged.classIds || Object.keys(merged.classIds).length === 0) {
    merged.classIds = fixture.classIds;
  }
  if (!merged.studentsByPhysical || Object.keys(merged.studentsByPhysical).length === 0) {
    merged.studentsByPhysical = fixture.studentsByPhysical;
  }
  const profileCount = merged.studentProfiles ? Object.keys(merged.studentProfiles).length : 0;
  const minProfiles = (fixture.studentIds?.length || 0) * 0.5;
  if (!profileCount || profileCount < minProfiles) {
    merged.studentProfiles = {
      ...(fixture.studentProfiles || {}),
      ...(merged.studentProfiles || {}),
    };
  }

  return merged;
}

/**
 * Resolved full demo school state: fixture backbone + local runtime overlay.
 * Never returns metadata-only local state without fixture identity fields.
 */
export function resolveMergedSimState() {
  const fixture = loadFixtureSimState();
  const local = loadLocalSimState();

  if (!fixture && !local) {
    throw new Error(
      `sim-state.json missing at ${SIM_STATE_PATH} ` +
        `(demo fixture also missing at ${DEMO_SIM_STATE_FIXTURE_PATH})`
    );
  }
  if (fixture && local) {
    return overlayLocalOntoFixture(fixture, local);
  }
  return fixture || local;
}

export function loadSimState() {
  const state = resolveMergedSimState();
  if (fs.existsSync(DEMO_SIM_STATE_FIXTURE_PATH)) {
    assertDemoSchoolSimState(state);
  }
  return state;
}

export function saveSimState(state) {
  const tmp = `${SIM_STATE_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, SIM_STATE_PATH);
}

export function mergeSimState(patch) {
  const current = resolveMergedSimState();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  saveSimState(next);
  return next;
}

export async function importServerModule(relativePath) {
  const { pathToFileURL } = await import("node:url");
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href);
}

export async function checkPhase0AuditGate(serviceRole) {
  const { error } = await serviceRole.from("teacher_access_audit").insert({
    teacher_id: "00000000-0000-0000-0000-000000000001",
    action: "school_student_class_transferred",
    actor_role: "system",
    actor_id: null,
    metadata: { probe: true },
  });
  if (!error) {
    await serviceRole
      .from("teacher_access_audit")
      .delete()
      .eq("action", "school_student_class_transferred")
      .contains("metadata", { probe: true });
    return { ok: true };
  }
  if (String(error.message || "").includes("check constraint")) {
    return {
      ok: false,
      message:
        "Phase 0 SQL gate not applied. Run Section 9.3 SQL in Supabase or apply migration 028_school_operational_audit_actions.sql",
    };
  }
  if (error.code === "23503") {
    return { ok: true };
  }
  throw error;
}

export const DEMO_BASELINE = {
  activeClasses: 108,
  students: 398,
  classStudentLinks: 2388,
};

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {object} state sim-state.json
 * @param {{ strict?: boolean }} [opts]
 */
export async function assertDemoSchoolBaseline(serviceRole, state, opts = {}) {
  const schoolId = state.schoolId;
  const classIds = Object.values(state.classIds || {});

  const [activeClasses, enrollments, managerMemberships] = await Promise.all([
    serviceRole
      .from("teacher_classes")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("is_archived", false)
      .is("archived_at", null),
    serviceRole
      .from("school_student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .is("unenrolled_at", null),
    serviceRole
      .from("school_teacher_memberships")
      .select("school_id, role")
      .eq("teacher_id", state.teacherIds?.manager || ""),
  ]);

  let classStudentLinks = 0;
  if (classIds.length) {
    const { count } = await serviceRole
      .from("teacher_class_students")
      .select("id", { count: "exact", head: true })
      .in("class_id", classIds)
      .is("removed_at", null);
    classStudentLinks = count ?? 0;
  }

  const managerId = state.teacherIds?.manager;
  const managerRows = managerMemberships.data || [];
  const managerSchoolIds = managerRows.filter((m) => m.role === "school_admin").map((m) => m.school_id);

  const counts = {
    activeClasses: activeClasses.count ?? 0,
    enrollments: enrollments.count ?? 0,
    classStudentLinks,
    managerSchoolAdminOn: managerSchoolIds,
  };

  const expected = DEMO_BASELINE;
  const mismatches = [];
  if (counts.activeClasses !== expected.activeClasses) {
    mismatches.push(`activeClasses ${counts.activeClasses} != ${expected.activeClasses}`);
  }
  if (counts.enrollments !== expected.students) {
    mismatches.push(`enrollments ${counts.enrollments} != ${expected.students}`);
  }
  if (counts.classStudentLinks !== expected.classStudentLinks) {
    mismatches.push(`classStudentLinks ${counts.classStudentLinks} != ${expected.classStudentLinks}`);
  }
  if (managerSchoolIds.length !== 1 || managerSchoolIds[0] !== schoolId) {
    mismatches.push(
      `manager school_admin memberships expected only [${schoolId}], got ${JSON.stringify(managerSchoolIds)}`
    );
  }

  if (opts.strict && mismatches.length) {
    throw new Error(`baseline mismatch: ${mismatches.join("; ")}`);
  }

  return { ...counts, ok: mismatches.length === 0, mismatches };
}
