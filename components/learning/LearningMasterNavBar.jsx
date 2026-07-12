import StudentThemePicker from "../student/StudentThemePicker";

export default function LearningMasterNavBar({
  MB,
  headerRef,
  onCurriculumClick,
  curriculumLabel = "📋 תוכנית לימודים",
  onBack,
  hideCurriculum = false,
  swapControls = false,
  compactHeader = false,
  integratedTopRow = false,
  centerSlot = null,
  backBtnClassName = "",
}) {
  const showCurriculum = Boolean(onCurriculumClick) && !hideCurriculum;
  const shellPadding = compactHeader ? "relative px-2 py-1.5" : "relative px-2 py-3";
  const safeTop = compactHeader
    ? "calc(env(safe-area-inset-top, 0px) + 6px)"
    : "calc(env(safe-area-inset-top, 0px) + 10px)";

  const integratedBackBtnClass =
    "inline-flex h-8 min-h-8 max-h-8 items-center justify-center !py-0 px-2.5 leading-none shrink-0";

  if (integratedTopRow) {
    return (
      <div ref={headerRef} className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className={shellPadding} style={{ paddingTop: safeTop }}>
          <div
            className="grid grid-cols-[minmax(3.25rem,auto)_1fr_minmax(2.25rem,auto)] items-center gap-1 px-0.5 min-h-8 pointer-events-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-start shrink-0 min-w-0">
              <button
                type="button"
                onClick={onBack}
                className={
                  backBtnClassName
                    ? `${MB.backBtn} ${integratedBackBtnClass} ${backBtnClassName}`.trim()
                    : `${MB.backBtn} ${integratedBackBtnClass}`
                }
              >
                חזרה
              </button>
            </div>
            <div className="flex items-center justify-center min-w-0 gap-1.5 pointer-events-auto">
              {centerSlot}
            </div>
            <div className="flex items-center justify-end shrink-0 min-w-0">
              <StudentThemePicker variant="icon" iconSize="nav" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={headerRef} className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      <div className={shellPadding} style={{ paddingTop: safeTop }}>
        {swapControls ? (
          <>
            <div className="absolute right-2 top-2 flex gap-2 pointer-events-auto">
              <button type="button" onClick={onBack} className={MB.backBtn}>
                חזרה
              </button>
            </div>
            <div className="absolute left-2 top-2 flex gap-2 pointer-events-auto items-center">
              <StudentThemePicker variant="icon" iconSize="nav" />
            </div>
          </>
        ) : (
          <>
            {showCurriculum ? (
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
          </>
        )}
      </div>
    </div>
  );
}
