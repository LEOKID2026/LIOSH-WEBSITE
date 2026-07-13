import { useContext } from "react";
import { GameAudioContext } from "../lib/game-audio/GameAudioProvider.jsx";
import { resolveAssetId } from "../lib/game-audio/game-audio-manifest.js";

/**
 * Official hook for game audio across all 35 in-scope games.
 */
export function useGameAudio() {
  const ctx = useContext(GameAudioContext);
  if (!ctx) {
    throw new Error("useGameAudio must be used within GameAudioProvider");
  }
  return ctx;
}

/**
 * Safe variant — returns null outside provider (SSR/tests).
 */
export function useGameAudioOptional() {
  return useContext(GameAudioContext);
}

export function useGameAudioSfx() {
  const audio = useGameAudio();
  return {
    playSfx: audio.playSfx,
    stopAsset: audio.stopAsset,
    stopAll: audio.stopAll,
    settings: audio.settings,
  };
}

export { resolveAssetId };
