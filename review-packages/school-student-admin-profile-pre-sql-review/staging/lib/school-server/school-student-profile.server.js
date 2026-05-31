import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { parseBoundedTrimmedString, safeUuid, trimString } from "../security/api-input.server.js";
import { writeSchoolOperatorAuditLog } from "./school-operator.server.js";
import { computeChildAgeYears } from "../school-portal/school-student-profile-fields.js";

export { computeChildAgeYears };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;

export const ADMIN_PROFILE_FIELD_KEYS = [
  "parent1Name",
  "parent1Phone",
  "parent1NationalId",
  "parent2Name",
  "parent2Phone",
  "parent2NationalId",
  "parentEmail",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "transportationNotes",
  "internalNotes",
  "dateOfBirth",
  "childAgeYears",
  "medicalAllergyNotes",
];

const FIELD_TO_COLUMN = {
  parent1Name: "parent1_name",
  parent1Phone: "parent1_phone",
  parent1NationalId: "parent1_national_id",
  parent2Name: "parent2_name",
  parent2Phone: "parent2_phone",
  parent2NationalId: "parent2_national_id",
  parentEmail: "parent_email",
  address: "address",
  emergencyContactName: "emergency_contact_name",
  emergencyContactPhone: "emergency_contact_phone",
  transportationNotes: "transportation_notes",
  internalNotes: "internal_notes",
  dateOfBirth: "date_of_birth",
  childAgeYears: "child_age_years",
  medicalAllergyNotes: "medical_allergy_notes",
};

const FIELD_LIMITS = {
  parent1Name: 200,
  parent1Phone: 50,
  parent1NationalId: 30,
  parent2Name: 200,
  parent2Phone: 50,
  parent2NationalId: 30,
  parentEmail: 320,
  address: 500,
  emergencyContactName: 200,
  emergencyContactPhone: 50,
  transportationNotes: 1000,
  internalNotes: 2000,
  medicalAllergyNotes: 2000,
  fullName: 200,
};

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: string|null } | { ok: false, code: string }}
 */
function parseOptionalTextField(raw, maxLen, { minLen = 1 } = {}) {
  if (raw == null || raw === "") return { ok: true, value: null };
  const parsed = parseBoundedTrimmedString(raw, maxLen);
  if (!parsed.ok) return { ok: false, code: "validation_failed" };
  if (!parsed.value) return { ok: true, value: null };
  if (parsed.value.length < minLen) return { ok: false, code: "validation_failed" };
  return { ok: true, value: parsed.value };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: string|null } | { ok: false, code: string }}
 */
function parseOptionalEmail(raw) {
  if (raw == null || raw === "") return { ok: true, value: null };
  const parsed = parseBoundedTrimmedString(raw, FIELD_LIMITS.parentEmail);
  if (!parsed.ok) return { ok: false, code: "validation_failed" };
  if (!parsed.value) return { ok: true, value: null };
  if (parsed.value.length < 5 || !EMAIL_RE.test(parsed.value)) {
    return { ok: false, code: "validation_failed" };
  }
  return { ok: true, value: parsed.value };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: string|null } | { ok: false, code: string }}
 */
function parseOptionalDateOfBirth(raw) {
  if (raw == null || raw === "") return { ok: true, value: null };
  const value = trimString(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, code: "validation_failed" };
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { ok: false, code: "validation_failed" };
  }
  return { ok: true, value };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: number|null } | { ok: false, code: string }}
 */
function parseOptionalChildAgeYears(raw) {
  if (raw == null || raw === "") return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 30) return { ok: false, code: "validation_failed" };
  return { ok: true, value: n };
}

/**
 * @param {unknown} body
 * @returns {{
 *   ok: true,
 *   fields: Record<string, string|number|null>,
 *   presentKeys: string[],
 * } | { ok: false, code: string }}
 */
export function parseSchoolStudentAdminProfileInput(body) {
  const source = body && typeof body === "object" ? body : {};

  const pairs = [
    ["parent1Name", (raw) => parseOptionalTextField(raw, FIELD_LIMITS.parent1Name)],
    ["parent1Phone", (raw) => parseOptionalTextField(raw, FIELD_LIMITS.parent1Phone)],
    [
      "parent1NationalId",
      (raw) => parseOptionalTextField(raw, FIELD_LIMITS.parent1NationalId),
    ],
    ["parent2Name", (raw) => parseOptionalTextField(raw, FIELD_LIMITS.parent2Name)],
    ["parent2Phone", (raw) => parseOptionalTextField(raw, FIELD_LIMITS.parent2Phone)],
    [
      "parent2NationalId",
      (raw) => parseOptionalTextField(raw, FIELD_LIMITS.parent2NationalId),
    ],
    ["parentEmail", (raw) => parseOptionalEmail(raw)],
    ["address", (raw) => parseOptionalTextField(raw, FIELD_LIMITS.address)],
    [
      "emergencyContactName",
      (raw) => parseOptionalTextField(raw, FIELD_LIMITS.emergencyContactName),
    ],
    [
      "emergencyContactPhone",
      (raw) => parseOptionalTextField(raw, FIELD_LIMITS.emergencyContactPhone),
    ],
    [
      "transportationNotes",
      (raw) =>
        parseOptionalTextField(raw, FIELD_LIMITS.transportationNotes, {
          minLen: 0,
        }),
    ],
    [
      "internalNotes",
      (raw) => parseOptionalTextField(raw, FIELD_LIMITS.internalNotes, { minLen: 0 }),
    ],
    ["dateOfBirth", (raw) => parseOptionalDateOfBirth(raw)],
    ["childAgeYears", (raw) => parseOptionalChildAgeYears(raw)],
    [
      "medicalAllergyNotes",
      (raw) =>
        parseOptionalTextField(raw, FIELD_LIMITS.medicalAllergyNotes, {
          minLen: 0,
        }),
    ],
  ];

  /** @type {Record<string, string|number|null>} */
  const fields = {};
  /** @type {string[]} */
  const presentKeys = [];

  for (const [key, parseField] of pairs) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const parsed = parseField(source[key]);
    if (!parsed.ok) return parsed;
    presentKeys.push(key);
    fields[key] = parsed.value;
  }

  return { ok: true, fields, presentKeys };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, fullName: string } | { ok: false, code: string }}
 */
export function parseSchoolStudentNameInput(raw) {
  const parsed = parseBoundedTrimmedString(raw, FIELD_LIMITS.fullName);
  if (!parsed.ok || !parsed.value) return { ok: false, code: "validation_failed" };
  return { ok: true, fullName: parsed.value };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ includeNationalIds?: boolean, includeAudit?: boolean, updatedByName?: string|null }} [options]
 */
export function mapSchoolStudentAdminProfileRow(row, options = {}) {
  if (!row) return null;

  /** @type {Record<string, unknown>} */
  const profile = {
    parent1Name: row.parent1_name ?? null,
    parent1Phone: row.parent1_phone ?? null,
    parent2Name: row.parent2_name ?? null,
    parent2Phone: row.parent2_phone ?? null,
    parentEmail: row.parent_email ?? null,
    address: row.address ?? null,
    emergencyContactName: row.emergency_contact_name ?? null,
    emergencyContactPhone: row.emergency_contact_phone ?? null,
    transportationNotes: row.transportation_notes ?? null,
    internalNotes: row.internal_notes ?? null,
    dateOfBirth: row.date_of_birth ?? null,
    childAgeYears: row.child_age_years ?? null,
    medicalAllergyNotes: row.medical_allergy_notes ?? null,
    updatedAt: row.updated_at ?? null,
  };

  if (options.includeNationalIds !== false) {
    profile.parent1NationalId = row.parent1_national_id ?? null;
    profile.parent2NationalId = row.parent2_national_id ?? null;
  }

  if (options.includeAudit !== false) {
    profile.updatedBy = row.updated_by ?? null;
    profile.updatedByName = options.updatedByName ?? null;
  }

  return profile;
}

/**
 * Merge a partial patch into existing profile values.
 * Missing keys in presentKeys preserve existingRow values.
 * Explicit null in patch clears the field when the key is present.
 *
 * @param {Record<string, unknown>|null|undefined} existingRow
 * @param {Record<string, string|number|null>} patchFields
 * @param {string[]} presentKeys
 */
export function mergeAdminProfileFields(existingRow, patchFields, presentKeys) {
  const present = new Set(presentKeys);
  const existingProfile = existingRow ? mapSchoolStudentAdminProfileRow(existingRow) : null;

  /** @type {Record<string, string|number|null>} */
  const merged = {};

  for (const key of ADMIN_PROFILE_FIELD_KEYS) {
    if (present.has(key)) {
      merged[key] = patchFields[key] ?? null;
    } else if (existingProfile) {
      merged[key] = /** @type {string|number|null} */ (existingProfile[key] ?? null);
    } else {
      merged[key] = null;
    }
  }

  return merged;
}

function mergedFieldsToDbRow(fields) {
  /** @type {Record<string, string|number|null>} */
  const row = {};
  for (const key of ADMIN_PROFILE_FIELD_KEYS) {
    row[FIELD_TO_COLUMN[key]] = fields[key] ?? null;
  }
  return row;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
async function resolveUpdatedByName(serviceRole, userId) {
  if (!safeUuid(userId)) return null;
  const { data, error } = await serviceRole
    .from("teacher_profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.full_name) return null;
  return String(data.full_name).trim() || null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 * @param {{ forTeacher?: boolean }} [options]
 */
export async function getSchoolStudentAdminProfile(serviceRole, schoolId, studentId, options = {}) {
  if (!isUuid(schoolId) || !isUuid(studentId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("school_student_profiles")
    .select("*")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: true, profile: null, isEmpty: true };
  }

  const updatedByName =
    !options.forTeacher && data.updated_by
      ? await resolveUpdatedByName(serviceRole, data.updated_by)
      : null;

  return {
    ok: true,
    profile: mapSchoolStudentAdminProfileRow(data, {
      includeNationalIds: !options.forTeacher,
      includeAudit: !options.forTeacher,
      updatedByName,
    }),
    isEmpty: false,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string,
 *   studentId: string,
 *   actorUserId: string,
 *   fields: Record<string, string|number|null>,
 *   presentKeys: string[],
 * }} input
 */
export async function upsertSchoolStudentAdminProfile(serviceRole, input) {
  const { schoolId, studentId, actorUserId, fields, presentKeys } = input;
  if (!isUuid(schoolId) || !isUuid(studentId) || !safeUuid(actorUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: existing, error: readErr } = await serviceRole
    .from("school_student_profiles")
    .select("*")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (readErr) {
    if (isDbSchemaNotReadyError(readErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!presentKeys.length && existing) {
    const updatedByName = existing.updated_by
      ? await resolveUpdatedByName(serviceRole, existing.updated_by)
      : null;
    return {
      ok: true,
      profile: mapSchoolStudentAdminProfileRow(existing, { updatedByName }),
      isEmpty: false,
    };
  }

  const merged = mergeAdminProfileFields(existing, fields, presentKeys);
  const dbFields = mergedFieldsToDbRow(merged);

  const row = {
    school_id: schoolId,
    student_id: studentId,
    ...dbFields,
    updated_by: actorUserId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await serviceRole
    .from("school_student_profiles")
    .upsert(row, { onConflict: "school_id,student_id" })
    .select("*")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const updatedByName = await resolveUpdatedByName(serviceRole, actorUserId);

  return {
    ok: true,
    profile: mapSchoolStudentAdminProfileRow(data, { updatedByName }),
    isEmpty: false,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string,
 *   studentId: string,
 *   actorUserId: string,
 *   fullName: string,
 * }} input
 */
export async function updateSchoolStudentName(serviceRole, input) {
  const { schoolId, studentId, actorUserId, fullName } = input;
  if (!isUuid(schoolId) || !isUuid(studentId) || !safeUuid(actorUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: existing, error: readErr } = await serviceRole
    .from("students")
    .select("id, full_name")
    .eq("id", studentId)
    .maybeSingle();

  if (readErr) {
    if (isDbSchemaNotReadyError(readErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!existing?.id) {
    return { ok: false, status: 404, code: "student_not_found" };
  }

  const oldName = existing.full_name;
  const { error: updateErr } = await serviceRole
    .from("students")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", studentId);

  if (updateErr) {
    if (isDbSchemaNotReadyError(updateErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeSchoolOperatorAuditLog(serviceRole, {
    schoolId,
    actorUserId,
    targetStudentId: studentId,
    actionType: "student_update",
    metadata: {
      operation: "student_name_updated",
      oldName,
      newName: fullName,
      schoolId,
      studentId,
    },
  });

  return { ok: true, studentId, fullName };
}

/**
 * Teacher-safe profile payload — national IDs and audit fields are never included.
 * @param {Record<string, unknown>|null} profile
 */
export function stripTeacherAdminProfileFields(profile) {
  if (!profile || typeof profile !== "object") return profile;
  const {
    parent1NationalId: _a,
    parent2NationalId: _b,
    updatedBy: _c,
    updatedByName: _d,
    ...rest
  } = profile;
  return rest;
}
