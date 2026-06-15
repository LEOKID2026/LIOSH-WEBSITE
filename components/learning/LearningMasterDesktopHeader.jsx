import StudentThemePicker from "../student/StudentThemePicker";

/**
 * Integrated desktop top row: back + title + curriculum (md+ only).
 * Mobile keeps LearningMasterNavBar + separate title block.
 */
export default function LearningMasterDesktopHeader({
  MB,
  desktopHeaderRef,
  titleAnchorRef,
  title,
  subtitle,
  onBack,
  onCurriculumClick,
  curriculumLabel = "📋 תוכנית לימודים",
  sound,
}) {
  return (
    <div
      ref={desktopHeaderRef}
      className="hidden md:block shrink-0 relative z-50 px-2 md:px-4 pointer-events-none"
    >
      <div className="flex items-center justify-between gap-2 min-h-[2.25rem]">
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <StudentThemePicker variant="icon" iconSize="nav" />
          <button type="button" onClick={onBack} className={MB.backBtn}>
            חזרה
          </button>
        </div>
        <div
          ref={titleAnchorRef}
          className="flex-1 min-w-0 text-center pointer-events-auto px-1"
        >
          <div className="flex items-center justify-center gap-2">
            <h1 className={`${MB.pageTitle} md:text-2xl lg:text-3xl`}>{title}</h1>
            {sound ? (
              <button
                type="button"
                onClick={() => {
                  sound.toggleSounds();
                  sound.toggleMusic();
                }}
                className={
                  sound.soundsEnabled && sound.musicEnabled
                    ? MB.btnSoundOn
                    : MB.btnSoundOff
                }
                title={
                  sound.soundsEnabled && sound.musicEnabled
                    ? "השתק צלילים"
                    : "הפעל צלילים"
                }
              >
                {sound.soundsEnabled && sound.musicEnabled ? "🔊" : "🔇"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 pointer-events-auto">
          {onCurriculumClick ? (
            <button type="button" onClick={onCurriculumClick} className={MB.navBtn}>
              {curriculumLabel}
            </button>
          ) : null}
        </div>
      </div>
      {subtitle ? (
        <p className={`${MB.pageSub} text-center mb-1.5`}>{subtitle}</p>
      ) : null}
    </div>
  );
}
