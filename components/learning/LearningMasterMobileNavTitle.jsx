/**
 * Integrated mobile nav center: subject title + global audio settings (title not duplicated below).
 */
import LearningMasterAudioButton from "./LearningMasterAudioButton.jsx";

export default function LearningMasterMobileNavTitle({ MB, title, audio }) {
  if (!title) return null;

  const audioOn =
    audio?.settings?.masterEnabled &&
    audio?.settings?.sfxEnabled;

  return (
    <>
      <h1 className={`${MB.pageTitle} leading-tight truncate max-md:text-2xl`}>{title}</h1>
      {audio ? (
        <LearningMasterAudioButton
          audioOn={audioOn}
          buttonClassOn={MB.btnSoundOn}
          buttonClassOff={MB.btnSoundOff}
        />
      ) : null}
    </>
  );
}
