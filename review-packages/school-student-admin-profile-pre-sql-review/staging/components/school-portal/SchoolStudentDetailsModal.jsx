import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import SchoolStudentDetailsPanel from "./SchoolStudentDetailsPanel.jsx";
import { SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi.jsx";
import {
  SC_BTN_CLOSE_DETAILS,
  SC_DETAILS_MODAL_TITLE,
} from "../../lib/school-portal/school-communication.he";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   accessToken: string|null,
 *   authMethod?: string,
 *   studentId: string,
 *   studentName: string,
 *   gradeLevel?: string|null,
 *   physicalClassName?: string|null,
 *   canEdit?: boolean,
 *   onStudentNameChange?: (name: string) => void,
 * }} props
 */
export default function SchoolStudentDetailsModal({
  open,
  onClose,
  accessToken,
  authMethod = "supabase_jwt",
  studentId,
  studentName,
  gradeLevel = null,
  physicalClassName = null,
  canEdit = false,
  onStudentNameChange,
}) {
  return (
    <ReportModalFrame
      open={open}
      title={SC_DETAILS_MODAL_TITLE}
      subtitle={studentName}
      onClose={onClose}
      closeLabel={SC_BTN_CLOSE_DETAILS}
      testId="school-student-details-modal"
      scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
    >
      <SchoolStudentDetailsPanel
        accessToken={accessToken}
        authMethod={authMethod}
        portal="school"
        studentId={studentId}
        studentName={studentName}
        gradeLevel={gradeLevel}
        physicalClassName={physicalClassName}
        canEdit={canEdit}
        canViewNationalIds
        showAuditFooter
        onStudentNameChange={onStudentNameChange}
      />
    </ReportModalFrame>
  );
}
