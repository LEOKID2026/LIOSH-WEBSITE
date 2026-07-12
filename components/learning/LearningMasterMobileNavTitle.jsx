/**
 * Integrated mobile nav center: subject title + sound toggle (title not duplicated below).
 */
export default function LearningMasterMobileNavTitle({ MB, title, sound }) {
  if (!title) return null;

  return (
    <>
      <h1 className={`${MB.pageTitle} leading-tight truncate max-md:text-2xl`}>{title}</h1>
      {sound ? (
        <button
          type="button"
          onClick={() => {
            sound.toggleSounds();
            sound.toggleMusic();
          }}
          className={
            sound.soundsEnabled && sound.musicEnabled ? MB.btnSoundOn : MB.btnSoundOff
          }
          title={sound.soundsEnabled && sound.musicEnabled ? "השתק צלילים" : "הפעל צלילים"}
        >
          {sound.soundsEnabled && sound.musicEnabled ? "🔊" : "🔇"}
        </button>
      ) : null}
    </>
  );
}
