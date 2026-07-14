import { getMastersBgmAssetId } from "./game-bgm-map.js";
import { loadLearningMasterMusicEnabled } from "./learning-master-music-settings.js";

/**
 * Shared session-start audio for all Learning Masters — SFX always; BGM only if user opted in.
 * @param {import("../../hooks/useGameAudio.js").GameAudioApi | null | undefined} audio
 */
export function startLearningMasterSessionAudio(audio) {
  if (!audio) return;
  audio.primeFromUserGesture();
  if (loadLearningMasterMusicEnabled()) {
    audio.playMusic(getMastersBgmAssetId(), { learningMasterScoped: true });
  }
  audio.playSfx("sfx-game-start");
}
