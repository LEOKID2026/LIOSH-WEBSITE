# School Staff Route Audit (B1)

**Prepared by:** Cursor (implementation)  
**Date:** 2026-05-30  
**Scope:** `pages/api/school/**`, `pages/api/teacher/**`, `pages/api/admin/**`  
**Cursor did NOT execute migration 048 or any SQL.**

## Summary

| Metric | Count |
|--------|------:|
| Routes audited | 135 |
| Staff-cookie capable (school/teacher) | 112 |
| JWT-only (admin + onboard) | 21 |
| Flagged needs update | 0 |

## JWT-only routes (must NOT accept staff cookie)

| Route file | Auth helper | Notes |
|------------|-------------|-------|
| `pages/api/admin/entitlements/[entitlementId].js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/entitlements/index.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/monthly-persistence-award.js` | — | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/parents/[userId]/settings.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/parents/index.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId].js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/assign-manager.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/assign-teacher.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/audit-log.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/teachers/[teacherId].js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/index.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId].js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/audit-log.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/discussion-subjects/[grantId].js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/discussion-subjects/index.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/features.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/quotas.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/status.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/index.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/users/[userId]/lifecycle.js` | requireAdminApiContext | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/teacher/onboard.js` | resolveAuthenticatedTeacherUserId | Explicit staff_cookie rejection (jwt_required) |

## Full audit table

| Route file | Auth helper | Passes req | Staff cookie | JWT-only | Notes |
|------------|-------------|:----------:|:------------:|:--------:|-------|
| `pages/api/admin/entitlements/[entitlementId].js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/entitlements/index.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/monthly-persistence-award.js` | — | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/parents/[userId]/settings.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/parents/index.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId].js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/assign-manager.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/assign-teacher.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/audit-log.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/[schoolId]/teachers/[teacherId].js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/schools/index.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId].js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/audit-log.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/discussion-subjects/[grantId].js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/discussion-subjects/index.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/features.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/quotas.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/[teacherId]/status.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/teachers/index.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/admin/users/[userId]/lifecycle.js` | requireAdminApiContext | n/a | no | yes | Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie) |
| `pages/api/school/activities/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/audit-log.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/classes/[classId]/archive.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/classes/[classId]/assign-teacher.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/classes/[classId]/report-data.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/classes/browse-status.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/classes/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/classes/physical-report.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/dashboard.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/me.js` | requireSchoolPortalMeContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/messages/[messageId]/hide.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/messages/[messageId]/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/messages/[messageId]/recipients.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/messages/[messageId]/unread-recipients.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/messages/audience-preview.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/messages/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/operators/[operatorId]/code-regenerate.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/operators/[operatorId]/grants.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/operators/[operatorId]/pin-reset.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/operators/[operatorId]/reactivate.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/operators/[operatorId]/suspend.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/operators/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/physical-classes/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/staff/change-pin.js` | — | n/a | n/a | no | — |
| `pages/api/school/staff/login.js` | — | n/a | n/a | no | Public login; sets liosh_staff_session cookie |
| `pages/api/school/staff/logout.js` | — | n/a | yes | no | Staff session cookie required |
| `pages/api/school/students/[studentId]/accounts/index.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/block.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/create.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/link.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/reset-pin.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/revoke.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/unblock.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/parent/unlink.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/student/block.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/student/create.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/student/reset-pin.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/student/revoke.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/accounts/student/unblock.js` | requireSchoolCredentialAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/assignment.js` | requireSchoolClassAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/class-transfer.js` | requireSchoolClassAdminApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/enrollment.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/[studentId]/report-data.js` | requireSchoolDataViewerContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/browse-summary.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/students/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId].js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId]/code-regenerate.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId]/pin-reset.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId]/reactivate.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId]/subjects/[subjectId].js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId]/subjects/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/[teacherId]/suspend.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/teachers/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/worksheet-activities/[worksheetId]/report.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/school/worksheet-activities/index.js` | requireSchoolManagerApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId]/monitor.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId]/question.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId]/report-export.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId]/report.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId]/status.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/[activityId]/students/[studentId]/answers.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/activities/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/classes/[classId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/classes/[classId]/archive.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/classes/[classId]/members.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/classes/[classId]/members/[membershipId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/classes/[classId]/report-data.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/classes/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/dashboard.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/discussion/question-preview.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/me.js` | resolveAuthenticatedTeacherUserId | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/onboard.js` | resolveAuthenticatedTeacherUserId | yes | no | yes | Explicit staff_cookie rejection (jwt_required) |
| `pages/api/teacher/school-messages/[messageId]/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/school-messages/[messageId]/read.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/school-messages/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/school-messages/send.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/school-messages/unread-count.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-access/[accessId]/revoke.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-access/[accessId]/rotate-pin.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-access/[accessId]/rotate-username.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-access/create.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-access/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-activities/[activityId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-activities/[activityId]/report.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-activities/[activityId]/status.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-activities/batch/[batchId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-activities/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-login-access/[accessId]/revoke.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-login-access/[accessId]/rotate-pin.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-login-access/[accessId]/rotate-username.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-login-access/create.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/student-login-access/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId]/archive.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId]/parent-messages/[messageId]/hide.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId]/parent-messages/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId]/parent-report-data.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId]/report-data.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/[studentId]/worksheets.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/create.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/link.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/students/unlink.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId].js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/assignments.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/pdf-url.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/questions.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/report.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/status.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/students/[studentId]/answers.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/students/[studentId]/grade.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/students/[studentId]/publish.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/[worksheetId]/upload-pdf.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
| `pages/api/teacher/worksheet-activities/index.js` | requireTeacherApiContext | yes | yes | no | JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId |
