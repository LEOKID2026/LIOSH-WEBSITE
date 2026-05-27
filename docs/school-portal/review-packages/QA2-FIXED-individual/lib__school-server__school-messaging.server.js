import { isDbSchemaNotReadyError, writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { computeGuardianAccessState } from "../teacher-server/teacher-student-access.server.js";
import { loadTeacherSchoolMembership, verifyTeacherMembershipInSchool } from "./school-membership.server.js";
import { chunkIds, countRowsByGroupColumn } from "./school-query-chunks.server.js";
import { loadSchoolScope, verifyStudentVisibleToSchool } from "./school-scope.server.js";
import { listSchoolStudentsInPhysicalClass } from "./school-students.server.js";

const VALID_MESSAGE_TYPES = new Set([
  "regular",
  "important",
  "urgent",
  "requires_confirmation",
  "requires_response",
  "pinned",
  "archived",
]);

const IMPORTANT_MESSAGE_TYPES = new Set(["important", "urgent", "requires_confirmation", "pinned"]);

const PARENT_AUDIENCE_TYPES = new Set([
  "all_parents",
  "grade_parents",
  "class_parents",
  "specific_parent",
  "homeroom_class_parents",
  "homeroom_student_parent",
]);

const TEACHER_AUDIENCE_TYPES = new Set([
  "all_teachers",
  "grade_teachers",
  "subject_teachers",
  "class_teachers",
  "specific_teacher",
]);

const VALID_AUDIENCE_TYPES = new Set([...PARENT_AUDIENCE_TYPES, ...TEACHER_AUDIENCE_TYPES]);

const HOMEROOM_AUDIENCE_TYPES = new Set(["homeroom_class_parents", "homeroom_student_parent"]);

const MANAGER_AUDIENCE_TYPES = new Set(
  [...VALID_AUDIENCE_TYPES].filter((t) => !HOMEROOM_AUDIENCE_TYPES.has(t))
);

const PREVIEW_LIMIT = 10;
const RECIPIENT_INSERT_CHUNK = 80;
const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

function dbError(error) {
  if (isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 503, code: "db_schema_not_ready" };
  }
  return { ok: false, status: 500, code: "internal_error" };
}

function normalizeText(value, maxLen) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maxLen) return null;
  return text;
}

function recipientTypeForAudience(audienceType) {
  return PARENT_AUDIENCE_TYPES.has(audienceType) ? "parent" : "teacher";
}

function mapAudienceScope(audienceType, audienceScope) {
  const scope = audienceScope && typeof audienceScope === "object" ? audienceScope : {};
  return {
    gradeLevel: scope.gradeLevel != null ? String(scope.gradeLevel).trim() : "",
    physicalClassName: scope.physicalClassName != null ? String(scope.physicalClassName).trim() : "",
    subjectKey: scope.subjectKey != null ? String(scope.subjectKey).trim() : "",
    teacherId: scope.teacherId != null ? String(scope.teacherId).trim() : "",
    guardianAccessId: scope.guardianAccessId != null ? String(scope.guardianAccessId).trim() : "",
    studentId: scope.studentId != null ? String(scope.studentId).trim() : "",
  };
}

function validateMessageInput(input) {
  const audienceType = String(input.audienceType || "").trim();
  if (!VALID_AUDIENCE_TYPES.has(audienceType)) {
    return { ok: false, status: 400, code: "validation_failed", field: "audienceType" };
  }

  const messageType = String(input.messageType || "regular").trim();
  if (!VALID_MESSAGE_TYPES.has(messageType)) {
    return { ok: false, status: 400, code: "validation_failed", field: "messageType" };
  }

  const body = normalizeText(input.body, 4000);
  if (!body) {
    return { ok: false, status: 400, code: "validation_failed", field: "body" };
  }

  const subjectRaw = input.subject;
  const subject =
    subjectRaw == null || String(subjectRaw).trim() === ""
      ? null
      : normalizeText(subjectRaw, 200);
  if (subjectRaw != null && String(subjectRaw).trim() !== "" && !subject) {
    return { ok: false, status: 400, code: "validation_failed", field: "subject" };
  }

  const hasAttachment = input.hasAttachment === true;
  const attachmentUrl =
    input.attachmentUrl == null || String(input.attachmentUrl).trim() === ""
      ? null
      : normalizeText(input.attachmentUrl, 2000);
  if (hasAttachment && !attachmentUrl) {
    return { ok: false, status: 400, code: "validation_failed", field: "attachmentUrl" };
  }
  if (!hasAttachment && attachmentUrl) {
    return { ok: false, status: 400, code: "validation_failed", field: "hasAttachment" };
  }

  return {
    ok: true,
    audienceType,
    audienceScope: mapAudienceScope(audienceType, input.audienceScope),
    messageType,
    subject,
    body,
    hasAttachment,
    attachmentUrl,
  };
}

async function loadEnrolledStudentIds(serviceRole, schoolId, filters = {}) {
  let query = serviceRole
    .from("school_student_enrollments")
    .select("student_id, students(id, full_name, grade_level)")
    .eq("school_id", schoolId)
    .is("unenrolled_at", null);

  const { data, error } = await query;
  if (error) return dbError(error);

  let rows = (data || []).filter((row) => row.student_id);
  const gradeLevel = filters.gradeLevel ? String(filters.gradeLevel).trim() : "";
  if (gradeLevel) {
    rows = rows.filter((row) => {
      const student = row.students && typeof row.students === "object" ? row.students : null;
      return String(student?.grade_level || "") === gradeLevel;
    });
  }

  return {
    ok: true,
    studentIds: rows.map((row) => row.student_id),
    students: rows.map((row) => {
      const student = row.students && typeof row.students === "object" ? row.students : null;
      return {
        studentId: row.student_id,
        displayName: student?.full_name || null,
        gradeLevel: student?.grade_level || null,
      };
    }),
  };
}

async function loadSchoolGuardianRecipients(serviceRole, schoolId, studentIds) {
  /** @type {Array<{ recipientType: 'parent', guardianAccessId: string, studentId: string, displayName: string|null }>} */
  const recipients = [];
  if (!studentIds.length) {
    return { ok: true, recipients };
  }

  const nowIso = new Date().toISOString();
  for (const chunk of chunkIds(studentIds)) {
    const { data, error } = await serviceRole
      .from("student_guardian_access")
      .select("id, student_id, guardian_display_label, guardian_relation, is_active, revoked_at, expires_at, created_by_school_id")
      .in("student_id", chunk)
      .eq("created_by_school_id", schoolId);

    if (error) return dbError(error);

    for (const row of data || []) {
      if (computeGuardianAccessState(row, nowIso) !== "active") continue;
      const label = row.guardian_display_label || row.guardian_relation || null;
      recipients.push({
        recipientType: "parent",
        guardianAccessId: row.id,
        studentId: row.student_id,
        displayName: label,
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const row of recipients) {
    const key = row.guardianAccessId;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return { ok: true, recipients: deduped };
}

async function loadSchoolTeacherRecipients(serviceRole, schoolId, teacherIds, profileMap = null) {
  /** @type {Array<{ recipientType: 'teacher', recipientUserId: string, displayName: string|null }>} */
  const recipients = [];
  if (!teacherIds.length) {
    return { ok: true, recipients };
  }

  let profiles = profileMap;
  if (!profiles) {
    profiles = new Map();
    for (const chunk of chunkIds(teacherIds)) {
      const { data, error } = await serviceRole
        .from("teacher_profiles")
        .select("id, display_name")
        .in("id", chunk);
      if (error) return dbError(error);
      for (const row of data || []) {
        profiles.set(row.id, row.display_name || null);
      }
    }
  }

  for (const teacherId of teacherIds) {
    recipients.push({
      recipientType: "teacher",
      recipientUserId: teacherId,
      displayName: profiles.get(teacherId) || null,
    });
  }

  return { ok: true, recipients };
}

async function resolveGradeTeacherIds(serviceRole, schoolId, gradeLevel) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const enrolled = await loadEnrolledStudentIds(serviceRole, schoolId, { gradeLevel });
  if (!enrolled.ok) return enrolled;

  const teacherIds = new Set();

  if (scope.teacherIds.length > 0) {
    const { data: classes, error: classErr } = await serviceRole
      .from("teacher_classes")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .in("teacher_id", scope.teacherIds)
      .eq("grade_level", gradeLevel)
      .eq("is_archived", false)
      .is("archived_at", null);

    if (classErr) return dbError(classErr);
    for (const row of classes || []) {
      if (row.teacher_id) teacherIds.add(row.teacher_id);
    }

    if (enrolled.studentIds.length > 0) {
      for (const chunk of chunkIds(enrolled.studentIds)) {
        const { data: links, error: linkErr } = await serviceRole
          .from("teacher_students")
          .select("teacher_id")
          .in("student_id", chunk)
          .in("teacher_id", scope.teacherIds)
          .is("archived_at", null);

        if (linkErr) return dbError(linkErr);
        for (const row of links || []) {
          if (row.teacher_id) teacherIds.add(row.teacher_id);
        }
      }
    }
  }

  return { ok: true, teacherIds: [...teacherIds] };
}

async function resolveSubjectTeacherIds(serviceRole, schoolId, subjectKey) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const teacherIds = new Set();

  const { data: subjectRows, error: subjectErr } = await serviceRole
    .from("school_teacher_subjects")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("subject", subjectKey);

  if (subjectErr) return dbError(subjectErr);
  for (const row of subjectRows || []) {
    if (row.teacher_id) teacherIds.add(row.teacher_id);
  }

  if (scope.teacherIds.length > 0) {
    const { data: classes, error: classErr } = await serviceRole
      .from("teacher_classes")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .in("teacher_id", scope.teacherIds)
      .eq("subject_focus", subjectKey)
      .eq("is_archived", false)
      .is("archived_at", null);

    if (classErr) return dbError(classErr);
    for (const row of classes || []) {
      if (row.teacher_id) teacherIds.add(row.teacher_id);
    }
  }

  return { ok: true, teacherIds: [...teacherIds] };
}

async function resolveClassTeacherIds(serviceRole, schoolId, gradeLevel, physicalClassName) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .in("teacher_id", scope.teacherIds)
    .eq("grade_level", gradeLevel)
    .eq("name", physicalClassName)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (error) return dbError(error);

  const teacherIds = [...new Set((data || []).map((row) => row.teacher_id).filter(Boolean))];
  return { ok: true, teacherIds };
}

/**
 * Homeroom authority: no dedicated homeroom_teacher_id column exists.
 * Teacher qualifies via teacher_students.relationship = primary_teacher
 * or by owning teacher_classes rows for the physical class (name + grade + school_id).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 * @param {{ gradeLevel?: string, physicalClassName?: string, studentId?: string }} scope
 */
async function verifyTeacherHomeroomAuthority(serviceRole, schoolId, teacherId, scope) {
  const membership = await verifyTeacherMembershipInSchool(serviceRole, schoolId, teacherId);
  if (!membership.ok) return membership;

  if (scope.studentId) {
    if (!isUuid(scope.studentId)) {
      return { ok: false, status: 400, code: "validation_failed" };
    }

    const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, scope.studentId);
    if (!visible.ok) return visible;

    const { data: directLink, error: linkErr } = await serviceRole
      .from("teacher_students")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("student_id", scope.studentId)
      .eq("relationship", "primary_teacher")
      .is("archived_at", null)
      .maybeSingle();

    if (linkErr) return dbError(linkErr);
    if (directLink?.id) return { ok: true, schoolId };

    const physical = await resolveStudentPhysicalClass(serviceRole, schoolId, scope.studentId);
    if (!physical.ok) return physical;
    if (physical.gradeLevel && physical.physicalClassName) {
      const classAuth = await verifyTeacherHomeroomAuthority(serviceRole, schoolId, teacherId, {
        gradeLevel: physical.gradeLevel,
        physicalClassName: physical.physicalClassName,
      });
      if (classAuth.ok) return classAuth;
    }

    return { ok: false, status: 403, code: "not_homeroom_teacher" };
  }

  const gradeLevel = String(scope.gradeLevel || "").trim();
  const physicalClassName = String(scope.physicalClassName || "").trim();
  if (!gradeLevel || !physicalClassName) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: ownedClasses, error: classErr } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("grade_level", gradeLevel)
    .eq("name", physicalClassName)
    .eq("is_archived", false)
    .is("archived_at", null)
    .limit(1);

  if (classErr) return dbError(classErr);
  if ((ownedClasses || []).length > 0) {
    return { ok: true, schoolId };
  }

  const listed = await listSchoolStudentsInPhysicalClass(serviceRole, schoolId, {
    gradeLevel,
    physicalClassName,
  });
  if (!listed.ok) return listed;

  const studentIds = (listed.students || []).map((s) => s.studentId).filter(Boolean);
  if (!studentIds.length) {
    return { ok: false, status: 404, code: "physical_class_not_found" };
  }

  for (const chunk of chunkIds(studentIds)) {
    const { data: links, error: linkErr } = await serviceRole
      .from("teacher_students")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("relationship", "primary_teacher")
      .in("student_id", chunk)
      .is("archived_at", null)
      .limit(1);

    if (linkErr) return dbError(linkErr);
    if ((links || []).length > 0) {
      return { ok: true, schoolId };
    }
  }

  return { ok: false, status: 403, code: "not_homeroom_teacher" };
}

/**
 * Resolve a student's physical class name within a school (first matching roster class).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function resolveStudentPhysicalClass(serviceRole, schoolId, studentId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data: schoolClasses, error: classErr } = await serviceRole
    .from("teacher_classes")
    .select("id, name, grade_level")
    .eq("school_id", schoolId)
    .in("teacher_id", scope.teacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (classErr) return dbError(classErr);

  const classIds = (schoolClasses || []).map((c) => c.id);
  const classMeta = new Map((schoolClasses || []).map((c) => [c.id, c]));
  if (!classIds.length) {
    return { ok: true, gradeLevel: null, physicalClassName: null };
  }

  for (const chunk of chunkIds(classIds, 40)) {
    const { data: members, error: memErr } = await serviceRole
      .from("teacher_class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .in("class_id", chunk)
      .is("removed_at", null)
      .limit(1);

    if (memErr) return dbError(memErr);
    const row = (members || [])[0];
    if (row?.class_id) {
      const meta = classMeta.get(row.class_id);
      return {
        ok: true,
        gradeLevel: meta?.grade_level || null,
        physicalClassName: meta?.name || null,
      };
    }
  }

  return { ok: true, gradeLevel: null, physicalClassName: null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} audienceType
 * @param {Record<string, unknown>} audienceScope
 */
async function resolveSchoolMessageAudience(serviceRole, schoolId, audienceType, audienceScope) {
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  if (!VALID_AUDIENCE_TYPES.has(audienceType)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const scope = mapAudienceScope(audienceType, audienceScope);
  const recipientType = recipientTypeForAudience(audienceType);

  if (audienceType === "all_parents") {
    const enrolled = await loadEnrolledStudentIds(serviceRole, schoolId);
    if (!enrolled.ok) return enrolled;
    return loadSchoolGuardianRecipients(serviceRole, schoolId, enrolled.studentIds);
  }

  if (audienceType === "grade_parents") {
    if (!scope.gradeLevel) {
      return { ok: false, status: 400, code: "validation_failed", field: "gradeLevel" };
    }
    const enrolled = await loadEnrolledStudentIds(serviceRole, schoolId, { gradeLevel: scope.gradeLevel });
    if (!enrolled.ok) return enrolled;
    return loadSchoolGuardianRecipients(serviceRole, schoolId, enrolled.studentIds);
  }

  if (audienceType === "class_parents" || audienceType === "homeroom_class_parents") {
    if (!scope.gradeLevel || !scope.physicalClassName) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    const listed = await listSchoolStudentsInPhysicalClass(serviceRole, schoolId, {
      gradeLevel: scope.gradeLevel,
      physicalClassName: scope.physicalClassName,
    });
    if (!listed.ok) return listed;
    const studentIds = (listed.students || []).map((s) => s.studentId);
    return loadSchoolGuardianRecipients(serviceRole, schoolId, studentIds);
  }

  if (audienceType === "specific_parent" || audienceType === "homeroom_student_parent") {
    if (scope.guardianAccessId) {
      if (!isUuid(scope.guardianAccessId)) {
        return { ok: false, status: 400, code: "validation_failed" };
      }
      const { data: access, error } = await serviceRole
        .from("student_guardian_access")
        .select("id, student_id, guardian_display_label, guardian_relation, is_active, revoked_at, expires_at, created_by_school_id")
        .eq("id", scope.guardianAccessId)
        .maybeSingle();

      if (error) return dbError(error);
      if (!access || access.created_by_school_id !== schoolId) {
        return { ok: false, status: 404, code: "guardian_access_not_found" };
      }
      if (computeGuardianAccessState(access) !== "active") {
        return { ok: false, status: 409, code: "guardian_access_inactive" };
      }

      const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, access.student_id);
      if (!visible.ok) return visible;

      return {
        ok: true,
        recipients: [
          {
            recipientType: "parent",
            guardianAccessId: access.id,
            studentId: access.student_id,
            displayName: access.guardian_display_label || access.guardian_relation || null,
          },
        ],
      };
    }

    if (scope.studentId) {
      if (!isUuid(scope.studentId)) {
        return { ok: false, status: 400, code: "validation_failed" };
      }
      const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, scope.studentId);
      if (!visible.ok) return visible;
      return loadSchoolGuardianRecipients(serviceRole, schoolId, [scope.studentId]);
    }

    return { ok: false, status: 400, code: "validation_failed" };
  }

  if (audienceType === "all_teachers") {
    const schoolScope = await loadSchoolScope(serviceRole, schoolId);
    if (!schoolScope.ok) return schoolScope;
    return loadSchoolTeacherRecipients(serviceRole, schoolId, schoolScope.teachingTeacherIds);
  }

  if (audienceType === "grade_teachers") {
    if (!scope.gradeLevel) {
      return { ok: false, status: 400, code: "validation_failed", field: "gradeLevel" };
    }
    const resolved = await resolveGradeTeacherIds(serviceRole, schoolId, scope.gradeLevel);
    if (!resolved.ok) return resolved;
    return loadSchoolTeacherRecipients(serviceRole, schoolId, resolved.teacherIds);
  }

  if (audienceType === "subject_teachers") {
    if (!scope.subjectKey) {
      return { ok: false, status: 400, code: "validation_failed", field: "subjectKey" };
    }
    const resolved = await resolveSubjectTeacherIds(serviceRole, schoolId, scope.subjectKey);
    if (!resolved.ok) return resolved;
    return loadSchoolTeacherRecipients(serviceRole, schoolId, resolved.teacherIds);
  }

  if (audienceType === "class_teachers") {
    if (!scope.gradeLevel || !scope.physicalClassName) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    const resolved = await resolveClassTeacherIds(
      serviceRole,
      schoolId,
      scope.gradeLevel,
      scope.physicalClassName
    );
    if (!resolved.ok) return resolved;
    return loadSchoolTeacherRecipients(serviceRole, schoolId, resolved.teacherIds);
  }

  if (audienceType === "specific_teacher") {
    if (!isUuid(scope.teacherId)) {
      return { ok: false, status: 400, code: "validation_failed", field: "teacherId" };
    }
    const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, scope.teacherId);
    if (!verified.ok) return verified;
    return loadSchoolTeacherRecipients(serviceRole, schoolId, [scope.teacherId]);
  }

  return { ok: false, status: 400, code: "validation_failed" };
}

function mapPreviewRecipient(row) {
  if (row.recipientType === "parent") {
    return {
      recipientType: "parent",
      guardianAccessId: row.guardianAccessId,
      studentId: row.studentId,
      displayName: row.displayName,
    };
  }
  return {
    recipientType: "teacher",
    teacherId: row.recipientUserId,
    displayName: row.displayName,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} audienceType
 * @param {Record<string, unknown>} audienceScope
 */
export async function previewSchoolMessageAudience(serviceRole, schoolId, audienceType, audienceScope) {
  const resolved = await resolveSchoolMessageAudience(serviceRole, schoolId, audienceType, audienceScope);
  if (!resolved.ok) return resolved;

  const recipients = resolved.recipients || [];
  return {
    ok: true,
    data: {
      recipientCount: recipients.length,
      recipientType: recipientTypeForAudience(audienceType),
      preview: recipients.slice(0, PREVIEW_LIMIT).map(mapPreviewRecipient),
    },
  };
}

async function insertMessageRecipients(serviceRole, messageId, recipients) {
  if (!recipients.length) {
    return { ok: false, status: 409, code: "empty_audience" };
  }

  for (const chunk of chunkIds(
    recipients.map((row, index) => ({ ...row, _index: index })),
    RECIPIENT_INSERT_CHUNK
  )) {
    const rows = chunk.map((row) => ({
      message_id: messageId,
      recipient_type: row.recipientType,
      guardian_access_id: row.guardianAccessId || null,
      recipient_user_id: row.recipientUserId || null,
      recipient_display_name: row.displayName || null,
      student_id: row.studentId || null,
    }));

    const { error } = await serviceRole.from("school_message_recipients").insert(rows);
    if (error) {
      if (error.code === "23505") {
        return { ok: false, status: 409, code: "duplicate_recipient" };
      }
      return dbError(error);
    }
  }

  return { ok: true, recipientCount: recipients.length };
}

function mapMessageSummary(row, counts = {}) {
  return {
    id: row.id,
    messageId: row.id,
    schoolId: row.school_id,
    authorId: row.author_id,
    audienceType: row.audience_type,
    audienceScope: row.audience_scope || {},
    messageType: row.message_type,
    subject: row.subject,
    bodyPreview: String(row.body || "").slice(0, 120),
    hasAttachment: row.has_attachment === true,
    attachmentUrl: row.attachment_url,
    isHidden: row.is_hidden === true,
    sentAt: row.sent_at,
    recipientCount: counts.total || 0,
    parentRecipientCount: counts.parent || 0,
    teacherRecipientCount: counts.teacher || 0,
    parentReadCount: counts.parentRead || 0,
    teacherReadCount: counts.teacherRead || 0,
    parentUnreadCount: counts.parentUnread || 0,
    teacherUnreadCount: counts.teacherUnread || 0,
  };
}

async function loadReadCountsForMessages(serviceRole, messageIds) {
  /** @type {Map<string, { total: number, parent: number, teacher: number, parentRead: number, teacherRead: number, parentUnread: number, teacherUnread: number }>} */
  const byMessage = new Map();
  for (const id of messageIds) {
    byMessage.set(id, {
      total: 0,
      parent: 0,
      teacher: 0,
      parentRead: 0,
      teacherRead: 0,
      parentUnread: 0,
      teacherUnread: 0,
    });
  }
  if (!messageIds.length) return byMessage;

  for (const chunk of chunkIds(messageIds, 40)) {
    const { data: recipients, error: recErr } = await serviceRole
      .from("school_message_recipients")
      .select("message_id, recipient_type, guardian_access_id, recipient_user_id")
      .in("message_id", chunk);

    if (recErr) {
      if (isDbSchemaNotReadyError(recErr)) return null;
      return null;
    }

    const { data: receipts, error: readErr } = await serviceRole
      .from("school_message_read_receipts")
      .select("message_id, guardian_access_id, recipient_user_id")
      .in("message_id", chunk);

    if (readErr) {
      if (isDbSchemaNotReadyError(readErr)) return null;
      return null;
    }

    const readGuardian = new Set();
    const readTeacher = new Set();
    for (const row of receipts || []) {
      if (row.guardian_access_id) {
        readGuardian.add(`${row.message_id}::${row.guardian_access_id}`);
      }
      if (row.recipient_user_id) {
        readTeacher.add(`${row.message_id}::${row.recipient_user_id}`);
      }
    }

    for (const row of recipients || []) {
      const counts = byMessage.get(row.message_id);
      if (!counts) continue;
      counts.total += 1;
      if (row.recipient_type === "parent") {
        counts.parent += 1;
        const key = `${row.message_id}::${row.guardian_access_id}`;
        if (readGuardian.has(key)) counts.parentRead += 1;
        else counts.parentUnread += 1;
      } else {
        counts.teacher += 1;
        const key = `${row.message_id}::${row.recipient_user_id}`;
        if (readTeacher.has(key)) counts.teacherRead += 1;
        else counts.teacherUnread += 1;
      }
    }
  }

  return byMessage;
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   schoolId: string,
 *   authorId: string,
 *   audienceType: string,
 *   audienceScope: Record<string, unknown>,
 *   messageType: string,
 *   subject?: string|null,
 *   body: string,
 *   hasAttachment?: boolean,
 *   attachmentUrl?: string|null,
 * }} input
 */
export async function sendSchoolMessage(input) {
  const {
    serviceRole,
    schoolId,
    authorId,
    audienceType,
    audienceScope,
    messageType,
    subject,
    body,
    hasAttachment,
    attachmentUrl,
  } = input;

  if (!isUuid(schoolId) || !isUuid(authorId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  if (HOMEROOM_AUDIENCE_TYPES.has(audienceType)) {
    return { ok: false, status: 400, code: "homeroom_use_teacher_send" };
  }
  if (!MANAGER_AUDIENCE_TYPES.has(audienceType)) {
    return { ok: false, status: 400, code: "validation_failed", field: "audienceType" };
  }

  const validated = validateMessageInput({
    audienceType,
    audienceScope,
    messageType,
    subject,
    body,
    hasAttachment,
    attachmentUrl,
  });
  if (!validated.ok) return validated;

  const membership = await verifyTeacherMembershipInSchool(serviceRole, schoolId, authorId);
  if (!membership.ok) return membership;

  const resolved = await resolveSchoolMessageAudience(
    serviceRole,
    schoolId,
    validated.audienceType,
    validated.audienceScope
  );
  if (!resolved.ok) return resolved;

  const { data: messageRow, error: msgErr } = await serviceRole
    .from("school_messages")
    .insert({
      school_id: schoolId,
      author_id: authorId,
      audience_type: validated.audienceType,
      audience_scope: validated.audienceScope,
      message_type: validated.messageType,
      subject: validated.subject,
      body: validated.body,
      has_attachment: validated.hasAttachment,
      attachment_url: validated.attachmentUrl,
    })
    .select("id, sent_at")
    .single();

  if (msgErr) return dbError(msgErr);

  const inserted = await insertMessageRecipients(serviceRole, messageRow.id, resolved.recipients || []);
  if (!inserted.ok) {
    await serviceRole.from("school_messages").delete().eq("id", messageRow.id);
    return inserted;
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: authorId,
    action: "school_message_sent",
    actorRole: "teacher",
    actorId: authorId,
    metadata: {
      school_id: schoolId,
      message_id: messageRow.id,
      audience_type: validated.audienceType,
      message_type: validated.messageType,
      recipient_count: inserted.recipientCount,
      recipient_type: recipientTypeForAudience(validated.audienceType),
    },
  });

  return {
    ok: true,
    data: {
      messageId: messageRow.id,
      sentAt: messageRow.sent_at,
      recipientCount: inserted.recipientCount,
      recipientType: recipientTypeForAudience(validated.audienceType),
    },
  };
}

/**
 * @param {{ sentAfter?: string|null, sentBefore?: string|null, days?: number|string|null, allTime?: boolean }} filters
 */
function resolveMessageSentBounds(filters) {
  let sentAfter = null;
  let sentBefore = null;

  if (filters.sentAfter) {
    const d = new Date(filters.sentAfter);
    if (!Number.isNaN(d.getTime())) sentAfter = d;
  }
  if (filters.sentBefore) {
    const d = new Date(filters.sentBefore);
    if (!Number.isNaN(d.getTime())) sentBefore = d;
  }

  const allTime = filters.allTime === true || filters.allTime === "true";
  if (!allTime && !sentAfter && !sentBefore) {
    const days = Math.max(1, Number(filters.days) || 7);
    sentAfter = new Date();
    sentAfter.setDate(sentAfter.getDate() - days);
    sentAfter.setHours(0, 0, 0, 0);
  }

  return { sentAfter, sentBefore };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ limit?: number, cursor?: string|null, audienceType?: string|null, messageType?: string|null, includeHidden?: boolean, sentAfter?: string|null, sentBefore?: string|null, days?: number|string|null, allTime?: boolean }} [filters]
 */
export async function listSchoolMessages(serviceRole, schoolId, filters = {}) {
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const limit = Math.max(1, Math.min(MAX_LIST_LIMIT, Number(filters.limit) || DEFAULT_LIST_LIMIT));
  const includeHidden = filters.includeHidden === true;
  const offset =
    filters.cursor != null && Number.isFinite(Number(filters.cursor))
      ? Math.max(0, Number(filters.cursor))
      : Math.max(0, Number(filters.offset) || 0);
  const { sentAfter, sentBefore } = resolveMessageSentBounds(filters);

  let query = serviceRole
    .from("school_messages")
    .select(
      "id, school_id, author_id, audience_type, audience_scope, message_type, subject, body, has_attachment, attachment_url, is_hidden, sent_at"
    )
    .eq("school_id", schoolId)
    .order("sent_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);

  if (!includeHidden) query = query.eq("is_hidden", false);
  if (filters.audienceType) query = query.eq("audience_type", String(filters.audienceType));
  if (filters.messageType) query = query.eq("message_type", String(filters.messageType));
  if (sentAfter) query = query.gte("sent_at", sentAfter.toISOString());
  if (sentBefore) query = query.lte("sent_at", sentBefore.toISOString());

  const { data, error } = await query;
  if (error) return dbError(error);

  const rows = data || [];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(offset + limit) : null;

  const messageIds = pageRows.map((row) => row.id);
  const readCounts = await loadReadCountsForMessages(serviceRole, messageIds);
  if (readCounts === null) {
    return { ok: false, status: 503, code: "db_schema_not_ready" };
  }

  return {
    ok: true,
    data: {
      messages: pageRows.map((row) => mapMessageSummary(row, readCounts.get(row.id))),
      nextCursor,
      total: null,
    },
  };
}

async function loadSchoolMessageRow(serviceRole, schoolId, messageId) {
  if (!isUuid(messageId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("school_messages")
    .select(
      "id, school_id, author_id, audience_type, audience_scope, message_type, subject, body, has_attachment, attachment_url, is_hidden, sent_at, created_at, updated_at"
    )
    .eq("id", messageId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return { ok: false, status: 404, code: "message_not_found" };
  return { ok: true, message: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} messageId
 */
export async function getSchoolMessageDetail(serviceRole, schoolId, messageId) {
  const loaded = await loadSchoolMessageRow(serviceRole, schoolId, messageId);
  if (!loaded.ok) return loaded;

  const readCounts = await loadReadCountsForMessages(serviceRole, [messageId]);
  if (readCounts === null) {
    return { ok: false, status: 503, code: "db_schema_not_ready" };
  }

  const counts = readCounts.get(messageId) || {};
  const row = loaded.message;

  return {
    ok: true,
    data: {
      ...mapMessageSummary(row, counts),
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} messageId
 * @param {string} managerId
 */
export async function hideSchoolMessage(serviceRole, schoolId, messageId, managerId) {
  const loaded = await loadSchoolMessageRow(serviceRole, schoolId, messageId);
  if (!loaded.ok) return loaded;
  if (loaded.message.is_hidden) {
    return { ok: true, data: { messageId, alreadyHidden: true } };
  }

  const { error } = await serviceRole
    .from("school_messages")
    .update({ is_hidden: true, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("school_id", schoolId);

  if (error) return dbError(error);

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    action: "school_message_hidden",
    actorRole: "teacher",
    actorId: managerId,
    metadata: { school_id: schoolId, message_id: messageId },
  });

  return { ok: true, data: { messageId, hidden: true } };
}

async function mapRecipientWithReadStatus(recipientRows, receipts) {
  const readGuardian = new Set();
  const readTeacher = new Set();
  for (const row of receipts || []) {
    if (row.guardian_access_id) readGuardian.add(row.guardian_access_id);
    if (row.recipient_user_id) readTeacher.add(row.recipient_user_id);
  }

  return (recipientRows || []).map((row) => {
    const isRead =
      row.recipient_type === "parent"
        ? readGuardian.has(row.guardian_access_id)
        : readTeacher.has(row.recipient_user_id);

    return {
      recipientId: row.id,
      recipientType: row.recipient_type,
      guardianAccessId: row.guardian_access_id,
      recipientUserId: row.recipient_user_id,
      studentId: row.student_id,
      displayName: row.recipient_display_name,
      isRead,
      createdAt: row.created_at,
    };
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} messageId
 * @param {'parent'|'teacher'|undefined|null} [recipientType]
 */
export async function listSchoolMessageRecipients(serviceRole, schoolId, messageId, recipientType) {
  const loaded = await loadSchoolMessageRow(serviceRole, schoolId, messageId);
  if (!loaded.ok) return loaded;

  let query = serviceRole
    .from("school_message_recipients")
    .select("id, recipient_type, guardian_access_id, recipient_user_id, student_id, recipient_display_name, created_at")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (recipientType === "parent" || recipientType === "teacher") {
    query = query.eq("recipient_type", recipientType);
  }

  const [{ data: recipients, error: recErr }, { data: receipts, error: readErr }] = await Promise.all([
    query,
    serviceRole
      .from("school_message_read_receipts")
      .select("guardian_access_id, recipient_user_id")
      .eq("message_id", messageId),
  ]);

  if (recErr) return dbError(recErr);
  if (readErr) return dbError(readErr);

  return {
    ok: true,
    data: {
      recipients: await mapRecipientWithReadStatus(recipients, receipts),
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} messageId
 * @param {'parent'|'teacher'|undefined|null} [recipientType]
 */
export async function listSchoolMessageUnreadRecipients(serviceRole, schoolId, messageId, recipientType) {
  const listed = await listSchoolMessageRecipients(serviceRole, schoolId, messageId, recipientType);
  if (!listed.ok) return listed;

  return {
    ok: true,
    data: {
      recipients: (listed.data.recipients || []).filter((row) => !row.isRead),
    },
  };
}

function mapInboxMessage(row, message, isRead) {
  return {
    id: message.id,
    messageId: message.id,
    subject: message.subject,
    body: message.body,
    messageType: message.message_type,
    audienceType: message.audience_type,
    sentAt: message.sent_at,
    hasAttachment: message.has_attachment === true,
    attachmentUrl: message.attachment_url,
    authorId: message.author_id,
    isRead,
    requiresConfirmation: message.message_type === "requires_confirmation",
    confirmed: message.message_type === "requires_confirmation" ? isRead : null,
  };
}

async function loadRecipientMessageIds(serviceRole, filterColumn, filterValue) {
  const { data, error } = await serviceRole
    .from("school_message_recipients")
    .select("message_id, created_at")
    .eq(filterColumn, filterValue)
    .order("created_at", { ascending: false });

  if (error) return dbError(error);

  const messageIds = [];
  const seen = new Set();
  for (const row of data || []) {
    if (!row.message_id || seen.has(row.message_id)) continue;
    seen.add(row.message_id);
    messageIds.push(row.message_id);
  }

  return { ok: true, messageIds };
}

async function loadVisibleMessagesForRecipient(serviceRole, messageIds, opts = {}) {
  if (!messageIds.length) {
    return { ok: true, messages: [], readByMessage: new Map() };
  }

  const limit = Math.max(1, Math.min(MAX_LIST_LIMIT, Number(opts.limit) || DEFAULT_LIST_LIMIT));
  const ids = messageIds.slice(0, limit * 3);

  let msgQuery = serviceRole
    .from("school_messages")
    .select(
      "id, school_id, author_id, audience_type, message_type, subject, body, has_attachment, attachment_url, is_hidden, sent_at"
    )
    .in("id", ids)
    .eq("is_hidden", false)
    .order("sent_at", { ascending: false });

  const inboxDays = Math.max(1, Number(opts.days) || 30);
  const inboxCutoff = new Date();
  inboxCutoff.setDate(inboxCutoff.getDate() - inboxDays);
  inboxCutoff.setHours(0, 0, 0, 0);
  msgQuery = msgQuery.gte("sent_at", inboxCutoff.toISOString());

  const { data: messages, error: msgErr } = await msgQuery;

  if (msgErr) return dbError(msgErr);

  const visible = (messages || []).slice(0, limit);
  const visibleIds = visible.map((row) => row.id);

  const { data: receipts, error: readErr } = await serviceRole
    .from("school_message_read_receipts")
    .select("message_id, guardian_access_id, recipient_user_id")
    .in("message_id", visibleIds);

  if (readErr) return dbError(readErr);

  const readByMessage = new Map();
  for (const row of receipts || []) {
    readByMessage.set(row.message_id, row);
  }

  return { ok: true, messages: visible, readByMessage };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ limit?: number }} [opts]
 */
export async function listTeacherSchoolMessages(serviceRole, teacherId, opts = {}) {
  if (!isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const idsRes = await loadRecipientMessageIds(serviceRole, "recipient_user_id", teacherId);
  if (!idsRes.ok) return idsRes;

  const loaded = await loadVisibleMessagesForRecipient(serviceRole, idsRes.messageIds, opts);
  if (!loaded.ok) return loaded;

  const unreadCount = await countTeacherSchoolMessagesUnread(serviceRole, teacherId);
  if (!unreadCount.ok) return unreadCount;

  const inbox = (loaded.messages || []).map((message) => {
    const receipt = loaded.readByMessage.get(message.id);
    const isRead = Boolean(receipt?.recipient_user_id === teacherId);
    return mapInboxMessage({}, message, isRead);
  });

  return {
    ok: true,
    data: {
      messages: inbox,
      unreadCount: unreadCount.data.unreadCount,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} messageId
 */
export async function getTeacherSchoolMessage(serviceRole, teacherId, messageId) {
  if (!isUuid(teacherId) || !isUuid(messageId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: recipient, error: recErr } = await serviceRole
    .from("school_message_recipients")
    .select("id")
    .eq("message_id", messageId)
    .eq("recipient_user_id", teacherId)
    .eq("recipient_type", "teacher")
    .maybeSingle();

  if (recErr) return dbError(recErr);
  if (!recipient) return { ok: false, status: 404, code: "message_not_found" };

  const { data: message, error: msgErr } = await serviceRole
    .from("school_messages")
    .select(
      "id, school_id, author_id, audience_type, message_type, subject, body, has_attachment, attachment_url, is_hidden, sent_at"
    )
    .eq("id", messageId)
    .eq("is_hidden", false)
    .maybeSingle();

  if (msgErr) return dbError(msgErr);
  if (!message) return { ok: false, status: 404, code: "message_not_found" };

  const { data: receipt } = await serviceRole
    .from("school_message_read_receipts")
    .select("read_at")
    .eq("message_id", messageId)
    .eq("recipient_user_id", teacherId)
    .maybeSingle();

  const isRead = Boolean(receipt);
  return {
    ok: true,
    data: {
      ...mapInboxMessage({}, message, isRead),
      readAt: receipt?.read_at || null,
    },
  };
}

async function insertReadReceipt(serviceRole, messageId, { recipientUserId = null, guardianAccessId = null }) {
  let findQuery = serviceRole
    .from("school_message_read_receipts")
    .select("id, read_at")
    .eq("message_id", messageId);
  if (recipientUserId) {
    findQuery = findQuery.eq("recipient_user_id", recipientUserId);
  } else {
    findQuery = findQuery.eq("guardian_access_id", guardianAccessId);
  }
  const { data: existing, error: findErr } = await findQuery.maybeSingle();

  if (findErr) return dbError(findErr);
  if (existing?.id) {
    return { ok: true, data: { readAt: existing.read_at, alreadyRead: true } };
  }

  const { data, error } = await serviceRole
    .from("school_message_read_receipts")
    .insert({
      message_id: messageId,
      recipient_user_id: recipientUserId,
      guardian_access_id: guardianAccessId,
    })
    .select("read_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: true, data: { alreadyRead: true } };
    }
    return dbError(error);
  }

  return { ok: true, data: { readAt: data.read_at, alreadyRead: false } };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} messageId
 */
export async function markTeacherSchoolMessageRead(serviceRole, teacherId, messageId) {
  if (!isUuid(teacherId) || !isUuid(messageId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const access = await getTeacherSchoolMessage(serviceRole, teacherId, messageId);
  if (!access.ok) return access;

  const receipt = await insertReadReceipt(serviceRole, messageId, { recipientUserId: teacherId });
  if (!receipt.ok) return receipt;

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    action: "school_message_read",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: {
      message_id: messageId,
      recipient_type: "teacher",
      confirmed: access.data.messageType === "requires_confirmation",
    },
  });

  return {
    ok: true,
    data: {
      messageId,
      readAt: receipt.data.readAt || new Date().toISOString(),
      confirmed: access.data.messageType === "requires_confirmation" ? true : null,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function countTeacherSchoolMessagesUnread(serviceRole, teacherId) {
  if (!isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const idsRes = await loadRecipientMessageIds(serviceRole, "recipient_user_id", teacherId);
  if (!idsRes.ok) return idsRes;
  if (!idsRes.messageIds.length) {
    return { ok: true, data: { unreadCount: 0 } };
  }

  const { data: messages, error: msgErr } = await serviceRole
    .from("school_messages")
    .select("id")
    .in("id", idsRes.messageIds)
    .eq("is_hidden", false);

  if (msgErr) return dbError(msgErr);

  const visibleIds = (messages || []).map((row) => row.id);
  if (!visibleIds.length) {
    return { ok: true, data: { unreadCount: 0 } };
  }

  const countRes = await countRowsByGroupColumn(
    serviceRole,
    "school_message_read_receipts",
    "message_id",
    "message_id",
    visibleIds,
    (q) => q.eq("recipient_user_id", teacherId)
  );
  if (countRes.ok === false) return dbError(countRes.error);

  const readCount = [...(countRes.counts?.values() || [])].reduce((sum, n) => sum + n, 0);
  return { ok: true, data: { unreadCount: Math.max(0, visibleIds.length - readCount) } };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} guardianAccessId
 * @param {{ limit?: number }} [opts]
 */
export async function listGuardianSchoolMessages(serviceRole, guardianAccessId, opts = {}) {
  if (!isUuid(guardianAccessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const idsRes = await loadRecipientMessageIds(serviceRole, "guardian_access_id", guardianAccessId);
  if (!idsRes.ok) return idsRes;

  const loaded = await loadVisibleMessagesForRecipient(serviceRole, idsRes.messageIds, opts);
  if (!loaded.ok) return loaded;

  const unreadCount = await countGuardianSchoolMessagesUnread(serviceRole, guardianAccessId);
  if (!unreadCount.ok) return unreadCount;

  const inbox = (loaded.messages || []).map((message) => {
    const receipt = loaded.readByMessage.get(message.id);
    const isRead = Boolean(receipt?.guardian_access_id === guardianAccessId);
    return mapInboxMessage({}, message, isRead);
  });

  return {
    ok: true,
    data: {
      messages: inbox,
      unreadCount: unreadCount.data.unreadCount,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} guardianAccessId
 * @param {string} messageId
 */
export async function getGuardianSchoolMessage(serviceRole, guardianAccessId, messageId) {
  if (!isUuid(guardianAccessId) || !isUuid(messageId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: recipient, error: recErr } = await serviceRole
    .from("school_message_recipients")
    .select("id, student_id")
    .eq("message_id", messageId)
    .eq("guardian_access_id", guardianAccessId)
    .eq("recipient_type", "parent")
    .maybeSingle();

  if (recErr) return dbError(recErr);
  if (!recipient) return { ok: false, status: 404, code: "message_not_found" };

  const { data: message, error: msgErr } = await serviceRole
    .from("school_messages")
    .select(
      "id, school_id, author_id, audience_type, message_type, subject, body, has_attachment, attachment_url, is_hidden, sent_at"
    )
    .eq("id", messageId)
    .eq("is_hidden", false)
    .maybeSingle();

  if (msgErr) return dbError(msgErr);
  if (!message) return { ok: false, status: 404, code: "message_not_found" };

  const { data: receipt } = await serviceRole
    .from("school_message_read_receipts")
    .select("read_at")
    .eq("message_id", messageId)
    .eq("guardian_access_id", guardianAccessId)
    .maybeSingle();

  const isRead = Boolean(receipt);
  return {
    ok: true,
    data: {
      ...mapInboxMessage({}, message, isRead),
      studentId: recipient.student_id,
      readAt: receipt?.read_at || null,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} guardianAccessId
 * @param {string} messageId
 */
export async function markGuardianSchoolMessageRead(serviceRole, guardianAccessId, messageId) {
  if (!isUuid(guardianAccessId) || !isUuid(messageId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const access = await getGuardianSchoolMessage(serviceRole, guardianAccessId, messageId);
  if (!access.ok) return access;

  const receipt = await insertReadReceipt(serviceRole, messageId, { guardianAccessId });
  if (!receipt.ok) return receipt;

  await writeTeacherAuditRow({
    serviceRole,
    guardianAccessId,
    studentId: access.data.studentId,
    action: "school_message_read",
    actorRole: "guardian",
    actorId: guardianAccessId,
    metadata: {
      message_id: messageId,
      recipient_type: "parent",
      confirmed: access.data.messageType === "requires_confirmation",
    },
  });

  return {
    ok: true,
    data: {
      messageId,
      readAt: receipt.data.readAt || new Date().toISOString(),
      confirmed: access.data.messageType === "requires_confirmation" ? true : null,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} guardianAccessId
 */
export async function countGuardianSchoolMessagesUnread(serviceRole, guardianAccessId) {
  if (!isUuid(guardianAccessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const idsRes = await loadRecipientMessageIds(serviceRole, "guardian_access_id", guardianAccessId);
  if (!idsRes.ok) return idsRes;
  if (!idsRes.messageIds.length) {
    return { ok: true, data: { unreadCount: 0 } };
  }

  const { data: messages, error: msgErr } = await serviceRole
    .from("school_messages")
    .select("id")
    .in("id", idsRes.messageIds)
    .eq("is_hidden", false);

  if (msgErr) return dbError(msgErr);

  const visibleIds = (messages || []).map((row) => row.id);
  if (!visibleIds.length) {
    return { ok: true, data: { unreadCount: 0 } };
  }

  const countRes = await countRowsByGroupColumn(
    serviceRole,
    "school_message_read_receipts",
    "message_id",
    "message_id",
    visibleIds,
    (q) => q.eq("guardian_access_id", guardianAccessId)
  );
  if (countRes.ok === false) return dbError(countRes.error);

  const readCount = [...(countRes.counts?.values() || [])].reduce((sum, n) => sum + n, 0);
  return { ok: true, data: { unreadCount: Math.max(0, visibleIds.length - readCount) } };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   audienceType: 'homeroom_class_parents'|'homeroom_student_parent',
 *   audienceScope: Record<string, unknown>,
 *   messageType?: string,
 *   subject?: string|null,
 *   body: string,
 *   hasAttachment?: boolean,
 *   attachmentUrl?: string|null,
 * }} input
 */
export async function sendHomeroomTeacherMessage(input) {
  const {
    serviceRole,
    teacherId,
    audienceType,
    audienceScope,
    messageType,
    subject,
    body,
    hasAttachment,
    attachmentUrl,
  } = input;

  if (!isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  if (!HOMEROOM_AUDIENCE_TYPES.has(audienceType)) {
    return { ok: false, status: 400, code: "validation_failed", field: "audienceType" };
  }

  const membership = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membership.ok) return membership;
  if (!membership.membership?.schoolId) {
    return { ok: false, status: 403, code: "teacher_not_in_school" };
  }

  const schoolId = membership.membership.schoolId;
  const scope = mapAudienceScope(audienceType, audienceScope);

  const homeroomCheck = await verifyTeacherHomeroomAuthority(serviceRole, schoolId, teacherId, {
    gradeLevel: scope.gradeLevel,
    physicalClassName: scope.physicalClassName,
    studentId: scope.studentId,
  });
  if (!homeroomCheck.ok) return homeroomCheck;

  const validated = validateMessageInput({
    audienceType,
    audienceScope,
    messageType,
    subject,
    body,
    hasAttachment,
    attachmentUrl,
  });
  if (!validated.ok) return validated;

  const resolved = await resolveSchoolMessageAudience(
    serviceRole,
    schoolId,
    validated.audienceType,
    validated.audienceScope
  );
  if (!resolved.ok) return resolved;

  const { data: messageRow, error: msgErr } = await serviceRole
    .from("school_messages")
    .insert({
      school_id: schoolId,
      author_id: teacherId,
      audience_type: validated.audienceType,
      audience_scope: validated.audienceScope,
      message_type: validated.messageType,
      subject: validated.subject,
      body: validated.body,
      has_attachment: validated.hasAttachment,
      attachment_url: validated.attachmentUrl,
    })
    .select("id, sent_at")
    .single();

  if (msgErr) return dbError(msgErr);

  const inserted = await insertMessageRecipients(serviceRole, messageRow.id, resolved.recipients || []);
  if (!inserted.ok) {
    await serviceRole.from("school_messages").delete().eq("id", messageRow.id);
    return inserted;
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    action: "school_message_sent",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: {
      school_id: schoolId,
      message_id: messageRow.id,
      audience_type: validated.audienceType,
      message_type: validated.messageType,
      recipient_count: inserted.recipientCount,
      recipient_type: "parent",
      homeroom: true,
    },
  });

  return {
    ok: true,
    data: {
      messageId: messageRow.id,
      sentAt: messageRow.sent_at,
      recipientCount: inserted.recipientCount,
      recipientType: "parent",
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function countSchoolUnreadMessagesForDashboard(serviceRole, schoolId) {
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: messages, error: msgErr } = await serviceRole
    .from("school_messages")
    .select("id, message_type")
    .eq("school_id", schoolId)
    .eq("is_hidden", false);

  if (msgErr) return dbError(msgErr);

  const messageRows = messages || [];
  const messageIds = messageRows.map((row) => row.id);
  if (!messageIds.length) {
    return {
      ok: true,
      data: {
        unreadParentMessageCount: 0,
        unreadTeacherMessageCount: 0,
        importantActiveMessageCount: 0,
      },
    };
  }

  let unreadParentMessageCount = 0;
  let unreadTeacherMessageCount = 0;
  const importantMessageIds = new Set(
    messageRows.filter((row) => IMPORTANT_MESSAGE_TYPES.has(row.message_type)).map((row) => row.id)
  );
  const importantWithUnread = new Set();

  for (const chunk of chunkIds(messageIds, 40)) {
    const { data: recipients, error: recErr } = await serviceRole
      .from("school_message_recipients")
      .select("message_id, recipient_type, guardian_access_id, recipient_user_id")
      .in("message_id", chunk);

    if (recErr) return dbError(recErr);

    const { data: receipts, error: readErr } = await serviceRole
      .from("school_message_read_receipts")
      .select("message_id, guardian_access_id, recipient_user_id")
      .in("message_id", chunk);

    if (readErr) return dbError(readErr);

    const readGuardian = new Set(
      (receipts || []).filter((r) => r.guardian_access_id).map((r) => `${r.message_id}::${r.guardian_access_id}`)
    );
    const readTeacher = new Set(
      (receipts || []).filter((r) => r.recipient_user_id).map((r) => `${r.message_id}::${r.recipient_user_id}`)
    );

    for (const row of recipients || []) {
      if (row.recipient_type === "parent") {
        const key = `${row.message_id}::${row.guardian_access_id}`;
        if (!readGuardian.has(key)) {
          unreadParentMessageCount += 1;
          if (importantMessageIds.has(row.message_id)) importantWithUnread.add(row.message_id);
        }
      } else {
        const key = `${row.message_id}::${row.recipient_user_id}`;
        if (!readTeacher.has(key)) {
          unreadTeacherMessageCount += 1;
          if (importantMessageIds.has(row.message_id)) importantWithUnread.add(row.message_id);
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      unreadParentMessageCount,
      unreadTeacherMessageCount,
      importantActiveMessageCount: importantWithUnread.size,
    },
  };
}
