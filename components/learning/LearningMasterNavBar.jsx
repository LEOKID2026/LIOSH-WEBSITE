import StudentThemePicker from "../student/StudentThemePicker";

export default function LearningMasterNavBar({
  MB,
  headerRef,
  onCurriculumClick,
  curriculumLabel = "📋 תוכנית לימודים",
  onBack,
}) {
  return (
    <div ref={headerRef} className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      <div
        className="relative px-2 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        {onCurriculumClick ? (
          <div className="absolute right-2 top-2 flex gap-2 pointer-events-auto">
            <button type="button" onClick={onCurriculumClick} className={MB.navBtn}>
              {curriculumLabel}
            </button>
          </div>
        ) : null}
        <div className="absolute left-2 top-2 flex gap-2 pointer-events-auto items-center">
          <StudentThemePicker variant="icon" iconSize="nav" />
          <button type="button" onClick={onBack} className={MB.backBtn}>
            חזרה
          </button>
        </div>
      </div>
    </div>
  );
}
