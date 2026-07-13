import { useCallback, useEffect, useRef } from "react";
import { useGameAudio } from "../useGameAudio.js";
import { getEducationalBgmAssetId } from "../../lib/game-audio/game-bgm-map.js";

/**
 * Shared audio helpers for 9 educational games — SFX, BGM, TTS.
 */
export function useEducationalGameAudio() {
  const audio = useGameAudio();
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const onSessionStart = useCallback(() => {
    const a = audioRef.current;
    a.primeFromUserGesture();
    a.playSfx("sfx-game-start");
    a.playMusic(getEducationalBgmAssetId());
  }, []);

  const onWon = useCallback(() => {
    const a = audioRef.current;
    a.stopVoice();
    a.playSfx("sfx-success-lg");
  }, []);

  const onLost = useCallback(() => {
    const a = audioRef.current;
    a.stopVoice();
    a.playSfx("sfx-defeat");
  }, []);

  const onCorrect = useCallback(() => {
    audioRef.current.playSfx("sfx-correct");
  }, []);

  const onWrong = useCallback(() => {
    audioRef.current.playSfx("sfx-wrong");
  }, []);

  const onStreak = useCallback(() => {
    audioRef.current.playSfx("sfx-streak");
  }, []);

  const onSmallSuccess = useCallback(() => {
    audioRef.current.playSfx("sfx-success-sm");
  }, []);

  const onTimeUp = useCallback(() => {
    audioRef.current.playSfx("sfx-time-up");
  }, []);

  const onDragLift = useCallback(() => {
    audioRef.current.playSfx("sfx-drag");
  }, []);

  const onDropOk = useCallback(() => {
    audioRef.current.playSfx("sfx-drop-ok");
  }, []);

  const playInstruction = useCallback((text) => {
    if (!text) return Promise.resolve();
    return (
      audioRef.current.playVoice("voice-edu-instruction", { text, locale: "he-IL" }) ??
      Promise.resolve()
    );
  }, []);

  const playFeedback = useCallback((text) => {
    if (!text) return Promise.resolve();
    return (
      audioRef.current.playVoice("voice-edu-feedback", { text, locale: "he-IL" }) ??
      Promise.resolve()
    );
  }, []);

  const replayInstruction = useCallback((text) => {
    audioRef.current.stopVoice();
    return playInstruction(text);
  }, [playInstruction]);

  const maybeAutoInstruction = useCallback(
    (text) => {
      const a = audioRef.current;
      if (a.settings.autoPlayInstructions && text) {
        void playInstruction(text);
      }
    },
    [playInstruction],
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
  const audioRef = useRef(edu.audio);
  audioRef.current = edu.audio;
  const maybeAutoInstructionRef = useRef(edu.maybeAutoInstruction);
  maybeAutoInstructionRef.current = edu.maybeAutoInstruction;

  useEffect(() => {
    if (autoPlayInstruction && instructionText) {
      maybeAutoInstructionRef.current(instructionText);
    }
  }, [autoPlayInstruction, instructionText]);

  useEffect(() => {
    return () => {
      audioRef.current.stopVoice();
      audioRef.current.stopAsset("sfx-conveyor");
    };
  }, []);

  return edu;
}
