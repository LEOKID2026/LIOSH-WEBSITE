import { useCallback, useRef } from "react";
import { useGameAudio } from "../useGameAudio.js";
import { getSoloBgmAssetId } from "../../lib/game-audio/game-bgm-map.js";

/**
 * Shell-level solo game audio — session start handled by SoloGameShell.
 */
export function useSoloGameShellAudio(gameKey) {
  const audio = useGameAudio();
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const onSessionStart = useCallback(() => {
    const a = audioRef.current;
    a.primeFromUserGesture();
    a.playSfx("sfx-game-start");
    const bgm = getSoloBgmAssetId(gameKey);
    if (bgm) a.playMusic(bgm);
  }, [gameKey]);

  const onSessionWon = useCallback(() => {
    const a = audioRef.current;
    a.stopVoice();
    a.playSfx("sfx-victory");
  }, []);

  const onSessionLost = useCallback(() => {
    const a = audioRef.current;
    a.stopVoice();
    a.playSfx("sfx-defeat");
  }, []);

  const onExit = useCallback(() => {
    audioRef.current.stopAll();
  }, []);

  return { audio, onSessionStart, onSessionWon, onSessionLost, onExit };
}

/**
 * Engine-level solo audio helpers.
 */
export function useSoloEngineAudio() {
  const audio = useGameAudio();
  return {
    playSfx: audio.playSfx,
    playCoin: () => audio.playSfx("sfx-coin"),
    playHit: () => audio.playSfx("sfx-hit"),
    playDiamond: () => audio.playSfx("sfx-diamond"),
    playStar: () => audio.playSfx("sfx-star"),
    playJump: () => audio.playSfx("sfx-jump"),
    playCombo: () => audio.playSfx("sfx-combo"),
    playLevelUp: () => audio.playSfx("sfx-level-up"),
    playFlap: () => audio.playSfx("sfx-flap"),
    playMatchOk: () => audio.playSfx("sfx-match-ok"),
    playMatchBad: () => audio.playSfx("sfx-match-bad"),
    playPop: () => audio.playSfx("sfx-pop"),
    playSlice: () => audio.playSfx("sfx-slice"),
    playTargetHit: () => audio.playSfx("sfx-target-hit"),
    playClearLine: () => audio.playSfx("sfx-clear-line"),
    playDropOk: () => audio.playSfx("sfx-drop-ok"),
    playDropFail: () => audio.playSfx("sfx-drop-fail"),
    playDrag: () => audio.playSfx("sfx-drag"),
    playWarning: () => audio.playSfx("sfx-warning"),
    playKey: () => audio.playSfx("sfx-key"),
    playExit: () => audio.playSfx("sfx-exit"),
    playSuccessSm: () => audio.playSfx("sfx-success-sm"),
    playTimeUp: () => audio.playSfx("sfx-time-up"),
    playUiClick: () => audio.playSfx("sfx-ui-click"),
    playUiOpen: () => audio.playSfx("sfx-ui-open"),
  };
}
