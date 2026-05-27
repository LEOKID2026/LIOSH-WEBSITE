import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import { SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi";
import SchoolTeacherDetailContent from "./SchoolTeacherDetailContent.jsx";
import { SCHOOL_TEACHER_CARD_ACTION } from "../../lib/school-portal/school-ui.he.js";

/**
 * Full teacher detail inside Report Hub flow (no page navigation).
 */
export default function SchoolTeacherDetailModal({
  open,
  onClose,
  subtitle,
  teacherId,
  accessToken,
  schoolId,
  schoolName,
  zIndex = 320,
  modalStackBase = 350,
}) {
  return (
    <ReportModalFrame
      open={open}
      title={SCHOOL_TEACHER_CARD_ACTION}
      subtitle={subtitle}
      onClose={onClose}
      closeLabel="סגירה"
      zIndex={zIndex}
      scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
      testId="school-teacher-detail-modal"
    >
      <div
        className={`max-h-[min(70vh,640px)] overflow-y-auto pr-1 ${SCHOOL_PORTAL_MODAL_SCROLL_CLASS}`}
      >
        <SchoolTeacherDetailContent
          teacherId={teacherId}
          accessToken={accessToken}
          schoolId={schoolId}
          schoolName={schoolName}
          showBackLink={false}
          enabled={open && Boolean(teacherId)}
          modalStackBase={modalStackBase}
        />
      </div>
    </ReportModalFrame>
  );
}
