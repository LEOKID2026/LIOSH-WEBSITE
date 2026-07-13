import { useCallback, useEffect } from "react";
import { useGameAudio } from "../useGameAudio.js";
import { getEducationalBgmAssetId } from "../../lib/game-audio/game-bgm-map.js";

/**
 * Shared audio helpers for 9 educational games — SFX, BGM, TTS.
 */
export function useEducationalGameAudio() {
  const audio = useGameAudio();

  const onSessionStart = useCallback(() => {
    audio.primeFromUserGesture();
    audio.playSfx("sfx-game-start");
    audio.playMusic(getEducationalBgmAssetId());
  }, [audio]);

  const onWon = useCallback(() => {
    audio.stopVoice();
    audio.playSfx("sfx-success-lg");
  }, [audio]);

  const onLost = useCallback(() => {
    audio.stopVoice();
    audio.playSfx("sfx-defeat");
  }, [audio]);

  const onCorrect = useCallback(() => {
    audio.playSfx("sfx-correct");
  }, [audio]);

  const onWrong = useCallback(() => {
    audio.playSfx("sfx-wrong");
  }, [audio]);

  const onStreak = useCallback(() => {
    audio.playSfx("sfx-streak");
  }, [audio]);

  const onSmallSuccess = useCallback(() => {
    audio.playSfx("sfx-success-sm");
  }, [audio]);

  const onTimeUp = useCallback(() => {
    audio.playSfx("sfx-time-up");
  }, [audio]);

  const onDragLift = useCallback(() => {
    audio.playSfx("sfx-drag");
  }, [audio]);

  const onDropOk = useCallback(() => {
    audio.playSfx("sfx-drop-ok");
  }, [audio]);

  const playInstruction = useCallback(
    (text) => {
      if (!text) return;
      void audio.playVoice("voice-edu-instruction", { text });
    },
    [audio],
  );

  const playFeedback = useCallback(
    (text) => {
      if (!text) return;
      void audio.playVoice("voice-edu-feedback", { text });
    },
    [audio],
  );

  const replayInstruction = useCallback(
    (text) => {
      audio.stopVoice();
      playInstruction(text);
    },
    [audio, playInstruction],
  );

  const maybeAutoInstruction = useCallback(
    (text) => {
      if (audio.settings.autoPlayInstructions && text) playInstruction(text);
    },
    [audio, playInstruction],
  );

  return {
    audio,
    onSessionStart,
    onWon,
    onLost,
    onCorrect,
    onWrong,
    onStreak,
    onSmallSuccess,
    onTimeUp,
    onDragLift,
    onDropOk,
    playInstruction,
    playFeedback,
    replayInstruction,
    maybeAutoInstruction,
    stopAll: audio.stopAll,
  };
}

/**
 * Call from educational engine on mount when autoStart — shell already played game-start.
 */
export function useEducationalEngineAudio({ instructionText, autoPlayInstruction = false } = {}) {
  const edu = useEducationalGameAudio();

  useEffect(() => {
    if (autoPlayInstruction && instructionText) {
      edu.maybeAutoInstruction(instructionText);
    }
  }, [autoPlayInstruction, instructionText, edu]);

  useEffect(
    () => () => {
      edu.audio.stopVoice();
      edu.audio.stopAsset("sfx-conveyor");
    },
    [edu],
  );

  return edu;
}
