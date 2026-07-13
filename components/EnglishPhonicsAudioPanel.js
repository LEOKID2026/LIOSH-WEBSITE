import { useCallback, useEffect, useRef, useState } from "react";
import { useGameAudioOptional } from "../hooks/useGameAudio.js";
import {
  createStemPlaybackController,
  primeSpeechSynthesisVoices,
} from "../utils/audio-playback-core";
import { trackProductEvent } from "../lib/analytics/track-event.client.js";

/**
 * Phonics practice listen button — reuses stem playback (mixed he-IL + en-US segments).
 *
 * @param {{
 *   stem: import("../utils/audio-task-contract.js").AudioStem & { tts_segments?: { locale?: string, text: string }[] },
 *   gameActive: boolean,
 *   grade?: string,
 *   topic?: string,
 * }} props
 */
export default function EnglishPhonicsAudioPanel({ stem, gameActive, grade = null, topic = null }) {
  const audio = useGameAudioOptional();
  const [replayCount, setReplayCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const ctrlRef = useRef(null);

  useEffect(() => {
    if (stem?.playback_kind !== "tts") return () => {};
    const unprime = primeSpeechSynthesisVoices();
    return unprime;
  }, [stem?.playback_kind]);

  useEffect(() => {
    if (audio) return () => {};
    ctrlRef.current = createStemPlaybackController(stem, {});
    return () => {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
  }, [stem, audio]);

  const playStem = useCallback(async () => {
    if (!gameActive || busy) return;
    if (replayCount >= stem.max_replays) {
      setStatusMsg("הגעתם למקסימום האזנות לשאלה זו.");
      return;
    }
    setBusy(true);
    setStatusMsg("משמיעים…");
    try {
      if (audio) {
        await audio.playVoice("voice-question-english-phonics", {
          stem,
          text: stem?.narration_plaintext,
          engine: "browser-tts",
        });
      } else {
        await ctrlRef.current?.play();
      }
      const n = (ctrlRef.current?.bumpReplay?.() ?? replayCount + 1);
      setReplayCount(n);
      void trackProductEvent({
        eventName: "audio_played",
        actorType: "student",
        subject: "english",
        topic,
        grade,
        metadata: {
          taskMode: stem.task_mode,
          playbackKind: stem.playback_kind,
          replayCount: n,
        },
      });
      setStatusMsg("");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "לא ניתן להשמיע כרגע. נסו שוב או המשיכו לפי הטקסט.";
      setStatusMsg(msg);
      if (process.env.NODE_ENV === "development") {
        console.warn("[EnglishPhonicsAudioPanel] play failed", err);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, gameActive, replayCount, stem, audio, grade, topic]);

  const playTitle =
    statusMsg && statusMsg !== "משמיעים…"
      ? statusMsg
      : `האזנה לשאלה (${replayCount}/${stem.max_replays})`;

  return (
    <div className="mb-2 flex w-full justify-center" dir="rtl">
      <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <span className="sr-only" aria-live="polite">
          שמע · פוניקה
        </span>
        <button
          type="button"
          data-testid="english-phonics-audio-play"
          onClick={playStem}
          disabled={!gameActive || busy}
          className="inline-flex items-center justify-center gap-1.5 h-8 md:h-10 px-2 md:px-3 rounded-lg bg-cyan-600/85 hover:bg-cyan-600 disabled:opacity-50 text-[11px] md:text-xs font-bold text-white border border-cyan-400/35 shadow-sm shrink-0 tabular-nums"
          title={playTitle}
          aria-label={playTitle}
        >
          <span aria-hidden>🔊</span>
          <span>האזנה</span>
          <span dir="ltr">
            ({replayCount}/{stem.max_replays})
          </span>
        </button>
        {statusMsg ? (
          <span className="sr-only" aria-live="assertive">
            {statusMsg}
          </span>
        ) : null}
      </div>
    </div>
  );
}
