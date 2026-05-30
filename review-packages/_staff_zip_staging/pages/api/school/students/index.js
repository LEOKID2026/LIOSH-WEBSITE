import { safeApiLog } from "../../../../lib/security/safe-log.js";
import { rejectIfCrossOriginCookieMutation } from "../../../../lib/security/same-origin.js";
import { writeTeacherAuditRow } from "../../../../lib/teacher-server/teacher-audit.server.js";
import {
  createSchoolManagedStudent,
  enrollStudentInSchool,
  listSchoolEnrolledStudents,
  listSchoolStudentsInPhysicalClass,
} from "../../../../lib/school-server/school-students.server.js";
import {
  requireSchoolManagerApiContext,
  sendSchoolApiError,
} from "../../../../lib/school-server/school-request.server.js";

export default async function handler(req, res) {
  try {
    const ctx = await requireSchoolManagerApiContext(res, req);
    if (ctx.stopped) return undefined;

    if (req.method === "GET") {
      const gradeLevel = String(req.query?.gradeLevel || "").trim();
      const physicalClassName = String(req.query?.physicalClassName || "").trim();

      if (gradeLevel && physicalClassName) {
        const listed = await listSchoolStudentsInPhysicalClass(ctx.serviceRole, ctx.schoolId, {
          gradeLevel,
          physicalClassName,
        });
        if (!listed.ok) {
          return sendSchoolApiError(res, listed.status, listed.code, listed.code);
        }
        return res.status(200).json({ data: { students: listed.students } });
      }

      const listed = await listSchoolEnrolledStudents(ctx.serviceRole, ctx.schoolId);
      if (!listed.ok) {
        return sendSchoolApiError(res, listed.status, listed.code, listed.code);
      }
      return res.status(200).json({ data: { students: listed.students } });
    }

    if (req.method === "POST") {
      if (rejectIfCrossOriginCookieMutation(req, res)) return undefined;

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";

      if (studentId) {
        const enrolled = await enrollStudentInSchool(ctx.serviceRole, {
          schoolId: ctx.schoolId,
          studentId,
          enrolledBy: ctx.managerId,
          notes: body.notes,
        });

        if (!enrolled.ok) {
          return sendSchoolApiError(res, enrolled.status, enrolled.code, enrolled.code);
        }

        await writeTeacherAuditRow({
          serviceRole: ctx.serviceRole,
          teacherId: ctx.managerId,
          studentId,
          action: "school_student_enrolled",
          actorRole: "teacher",
          actorId: ctx.managerId,
          metadata: { school_id: ctx.schoolId, enrollment_id: enrolled.enrollment.id },
        });

        return res.status(201).json({ data: { enrollment: enrolled.enrollment } });
      }

      const created = await createSchoolManagedStudent(ctx.serviceRole, {
        schoolId: ctx.schoolId,
        managerId: ctx.managerId,
        fullName: body.fullName,
        gradeLevel: body.gradeLevel,
        physicalClassName: body.physicalClassName,
        notes: body.notes,
        createLoginAccess: body.createLoginAccess !== false,
      });

      if (!created.ok) {
        return sendSchoolApiError(res, created.status, created.code, created.code);
      }

      await writeTeacherAuditRow({
        serviceRole: ctx.serviceRole,
        teacherId: ctx.managerId,
        studentId: created.studentId,
        action: "school_student_enrolled",
        actorRole: "teacher",
        actorId: ctx.managerId,
        metadata: {
          school_id: ctx.schoolId,
          enrollment_id: created.enrollmentId,
          created_by_manager: true,
        },
      });

      return res.status(201).json({ data: { student: created } });
    }

    res.setHeader("Allow", "GET, POST");
    return sendSchoolApiError(res, 405, "method_not_allowed", "Method not allowed");
  } catch (_e) {
    safeApiLog("school_students_index_error", { route: "school/students" });
    return sendSchoolApiError(res, 500, "internal_error", "Unexpected server error");
  }
}
