import { useGameAudioOptional } from "../hooks/useGameAudio.js";
import { resolveAssetId } from "../lib/game-audio/game-audio-manifest.js";

/**
 * @deprecated Compatibility wrapper — delegates to GameAudioProvider.
 * Learning Masters migration target: useGameAudio directly.
 */
export function useSound() {
  const audio = useGameAudioOptional();
  const s = audio?.settings || {
    masterEnabled: true,
    sfxEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.7,
    musicVolume: 0.3,
  };

  const playSound = (soundName, options = {}) => {
    const assetId = resolveAssetId(soundName);
    if (!assetId || !audio) return null;
    return audio.playSfx(assetId, {
      volume: options.volume ?? s.sfxVolume,
      loop: options.loop,
      onEnded: options.onEnded,
    });
  };

  const stopSound = (soundName) => {
    const assetId = resolveAssetId(soundName);
    if (assetId && audio) audio.stopAsset(assetId);
  };

  return {
    soundsEnabled: s.masterEnabled && s.sfxEnabled,
    musicEnabled: s.masterEnabled && s.musicEnabled,
    musicVolume: s.musicVolume,
    soundVolume: s.sfxVolume,
    playSound,
    stopSound,
    stopAllSounds: () => audio?.stopAll(),
    playBackgroundMusic: () => audio?.playMusic("bgm-learning-focus"),
    stopBackgroundMusic: () => audio?.stopMusic(),
    stopAll: () => audio?.stopAll(),
    toggleSounds: () => {
      if (!audio) return;
      const next = !(s.masterEnabled && s.sfxEnabled);
      audio.updateSettings({ sfxEnabled: next });
    },
    toggleMusic: () => {
      if (!audio) return;
      const next = !(s.masterEnabled && s.musicEnabled);
      audio.updateSettings({ musicEnabled: next });
      if (!next) audio.stopMusic();
      else audio.playMusic("bgm-learning-focus");
    },
    setMusicVol: (vol) => audio?.updateSettings({ musicVolume: vol }),
    setSoundVol: (vol) => audio?.updateSettings({ sfxVolume: vol }),
  };
}
