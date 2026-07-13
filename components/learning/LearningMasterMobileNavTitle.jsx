/**
 * Integrated mobile nav center: subject title + global audio toggle (title not duplicated below).
 */
export default function LearningMasterMobileNavTitle({ MB, title, audio }) {
  if (!title) return null;

  const audioOn =
    audio?.settings?.masterEnabled &&
    audio?.settings?.sfxEnabled &&
    audio?.settings?.musicEnabled;

  return (
    <>
      <h1 className={`${MB.pageTitle} leading-tight truncate max-md:text-2xl`}>{title}</h1>
      {audio ? (
        <button
          type="button"
          onClick={() => audio.toggleMaster()}
          className={audioOn ? MB.btnSoundOn : MB.btnSoundOff}
          title={audioOn ? "השתק צלילים" : "הפעל צלילים"}
        >
          {audioOn ? "🔊" : "🔇"}
        </button>
      ) : null}
    </>
  );
}
