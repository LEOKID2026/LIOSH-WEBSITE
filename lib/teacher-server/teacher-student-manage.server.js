import { generateTeacherPrefixedStudentUsername } from "./teacher-access-prefix.server.js";
import { generateStudentPin, hashStudentSecret, normalizeStudentPin } from "../guardian-server/guardian-crypto.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { countActiveTeacherStudentLinks } from "./teacher-link.server.js";
import { addClassMember, assertTeacherCanAddStudentToClass } from "./teacher-classes.server.js";
import { isFiniteQuotaLimit } from "./teacher-entitlements.server.js";
import { hasActiveTeacherStudentLink } from "./teacher-students.server.js";
import { isUuid } from "./teacher-request.server.js";

export const TEACHER_CLASSROOM_SIM_PARENT_EMAIL = "parent-class-sim@liosh-dev.invalid";

function normalizeUsername(raw) {
  return String(raw || "").toLowerCase().trim();
}

function hashStudentSecretLocal(value, secret) {
  return hashStudentSecret(value);
}

function parseFullName(raw) {
  const fullName = typeof raw === "string" ? raw.trim() : "";
  if (fullName.length < 2 || fullName.length > 80) {
    return { ok: false, code: "validation_failed", field: "fullName" };
  }
  return { ok: true, fullName };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
async function resolveSimParentId(serviceRole) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    const match = data?.users?.find((u) => u.email === TEACHER_CLASSROOM_SIM_PARENT_EMAIL);
    if (match?.id) return { ok: true, parentId: match.id };
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return { ok: false, status: 503, code: "sim_parent_not_found" };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   fullName: string,
 * }} input
 */
export async function updateTeacherStudentName(input) {
  const { serviceRole, teacherId, studentId, fullName: rawName } = input;
  if (!isUuid(studentId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const parsed = parseFullName(rawName);
  if (!parsed.ok) return { ok: false, status: 400, code: parsed.code, field: parsed.field };

  const link = await hasActiveTeacherStudentLink(serviceRole, teacherId, studentId);
  if (!link.ok) return link;
  if (!link.linked) {
    return { ok: false, status: 404, code: "student_not_linked" };
  }

  const { data, error } = await serviceRole
    .from("students")
    .update({ full_name: parsed.fullName, updated_at: new Date().toISOString() })
    .eq("id", studentId)
    .select("id, full_name")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, studentId: data.id, fullName: data.full_name };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   fullName: string,
 *   gradeLevel?: string|null,
 *   classId?: string|null,
 *   studentLimit: number|null,
 *   maxStudentsPerClass?: number|null,
 *   accessSecret: string,
 *   defaultPin?: string,
 * }} input
 */
export async function createTeacherManagedStudent(input) {
  const {
    serviceRole,
    teacherId,
    fullName: rawName,
    gradeLevel,
    classId,
    studentLimit,
    maxStudentsPerClass = null,
    accessSecret,
    defaultPin = "1234",
  } = input;

  const parsed = parseFullName(rawName);
  if (!parsed.ok) return { ok: false, status: 400, code: parsed.code, field: parsed.field };

  const countResult = await countActiveTeacherStudentLinks(serviceRole, teacherId);
  if (!countResult.ok) return countResult;
  if (isFiniteQuotaLimit(studentLimit) && (countResult.count ?? 0) >= studentLimit) {
    return { ok: false, status: 409, code: "student_limit_reached" };
  }

  if (classId && isUuid(classId)) {
    const classCap = await assertTeacherCanAddStudentToClass(
      serviceRole,
      classId,
      maxStudentsPerClass
    );
    if (!classCap.ok) return classCap;
  }

  const parentResult = await resolveSimParentId(serviceRole);
  if (!parentResult.ok) return parentResult;

  const payload = {
    parent_id: parentResult.parentId,
    full_name: parsed.fullName,
    is_active: true,
  };
  if (gradeLevel && typeof gradeLevel === "string" && gradeLevel.trim()) {
    payload.grade_level = gradeLevel.trim();
  }

  const { data: student, error: insErr } = await serviceRole
    .from("students")
    .insert(payload)
    .select("id, full_name, grade_level")
    .single();

  if (insErr) {
    if (isDbSchemaNotReadyError(insErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const usernameGen = await generateTeacherPrefixedStudentUsername(serviceRole, teacherId);
  if (!usernameGen.ok) {
    await serviceRole.from("students").delete().eq("id", student.id);
    return { ok: false, status: usernameGen.status || 500, code: usernameGen.code || "internal_error" };
  }

  const username = usernameGen.loginUsername;
  const pinPlain =
    defaultPin && /^\d{4}$/.test(String(defaultPin)) ? String(defaultPin) : generateStudentPin();
  const pin = normalizeStudentPin(pinPlain);
  const codeHash = hashStudentSecretLocal(usernameGen.loginUsernameNormalized, accessSecret);
  const pinHash = hashStudentSecretLocal(pin, accessSecret);

  const { error: codeErr } = await serviceRole.from("student_access_codes").insert({
    student_id: student.id,
    login_username: username,
    code_hash: codeHash,
    pin_hash: pinHash,
    is_active: true,
  });

  if (codeErr) {
    await serviceRole.from("students").delete().eq("id", student.id);
    return { ok: false, status: 500, code: "access_code_create_failed" };
  }

  const { error: linkErr } = await serviceRole.from("teacher_students").insert({
    teacher_id: teacherId,
    student_id: student.id,
    relationship: "primary_teacher",
    notes: "teacher-created",
  });

  if (linkErr && linkErr.code !== "23505") {
    return { ok: false, status: 500, code: "teacher_link_failed" };
  }

  let membershipId = null;
  if (classId && isUuid(classId)) {
    const added = await addClassMember(serviceRole, teacherId, classId, student.id, {
      maxStudentsPerClass,
    });
    if (added.ok) {
      membershipId = added.membershipId;
    } else if (added.code === "class_student_limit_reached") {
      return added;
    }
  }

  return {
    ok: true,
    studentId: student.id,
    fullName: student.full_name,
    gradeLevel: student.grade_level,
    loginUsername: username,
    membershipId,
  };
}
