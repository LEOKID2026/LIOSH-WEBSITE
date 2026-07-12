import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isLearningBookAudioEnabledClient } from "../../lib/learning-book/audio/learning-book-audio-feature-flags";
import { resolveLearningBookAudio } from "../../lib/learning-book/audio/resolve-learning-book-audio";
import { useBookGradeTheme } from "./BookGradeThemeContext";

/**
 * Section-level pre-generated audio player for learning books.
 * No runtime TTS — plays static MP3 only on user action.
 *
 * @param {{
 *   subject: string,
 *   grade: string,
 *   pageId: string,
 *   sectionNumber: number,
 *   sectionIndex?: number,
 * }} props
 */
export default function LearningBookAudioPlayer({
  subject,
  grade,
  pageId,
  sectionNumber,
  sectionIndex = 0,
}) {
  const { classes: theme } = useBookGradeTheme();
  const enabled = isLearningBookAudioEnabledClient();
  const mathAudioDisabled =
    String(subject || "").trim().toLowerCase() === "math" &&
    (String(grade || "").trim().toLowerCase() === "g1" ||
      String(grade || "").trim().toLowerCase() === "g2");
  const audioMeta = useMemo(
    () =>
      enabled && !mathAudioDisabled
        ? resolveLearningBookAudio(subject, grade, pageId, sectionNumber)
        : null,
    [enabled, mathAudioDisabled, subject, grade, pageId, sectionNumber]
  );

  const audioRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const stopAndResetAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[LearningBookAudio]", {
      subject,
      grade,
      pageId,
      sectionIndex,
      sectionNumber,
      featureFlagEnabled: enabled,
      resolvedAudio: audioMeta,
    });
  }, [subject, grade, pageId, sectionIndex, sectionNumber, enabled, audioMeta]);

  useEffect(() => {
    stopAndResetAudio();
    setStatus("idle");
    setErrorMsg("");

    const el = audioRef.current;
    if (!el) return;

    if (audioMeta?.playbackSrc) {
      el.src = audioMeta.playbackSrc;
      el.load();
    } else {
      el.removeAttribute("src");
    }
  }, [audioMeta?.playbackSrc, audioMeta?.key, sectionNumber, pageId, stopAndResetAudio]);

  const handlePlayPause = useCallback(async () => {
    if (!audioMeta?.playbackSrc || status === "loading") return;

    const el = audioRef.current;
    if (!el) return;

    if (status === "playing") {
      stopAndResetAudio();
      setStatus("paused");
      setErrorMsg("");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      if (el.src !== audioMeta.playbackSrc) {
        el.src = audioMeta.playbackSrc;
        el.load();
      }
      el.currentTime = 0;
      await el.play();
      setStatus("playing");
    } catch {
      setStatus("error");
      setErrorMsg("לא ניתן לטעון את השמע כרגע");
    }
  }, [audioMeta?.playbackSrc, status, stopAndResetAudio]);

  const handleEnded = useCallback(() => {
    setStatus("idle");
  }, []);

  const handleAudioError = useCallback(() => {
    setStatus("error");
    setErrorMsg("לא ניתן לטעון את השמע כרגע");
  }, []);

  if (!enabled || !audioMeta) return null;

  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const hasError = status === "error";

  const buttonLabel = isLoading
    ? "טוען שמע..."
    : isPlaying
      ? "עצור"
      : status === "paused"
        ? "המשך"
        : "האזנה לעמוד";

  return (
    <div className="mb-4 flex flex-col items-center gap-2" dir="rtl">
      <audio
        key={`${pageId}:${sectionNumber}:${audioMeta.playbackSrc}`}
        ref={audioRef}
        preload="none"
        onEnded={handleEnded}
        onError={handleAudioError}
        className="sr-only"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handlePlayPause}
        disabled={isLoading}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:cursor-wait disabled:opacity-100 ${theme.audioPlayerButton}`}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <span aria-hidden="true">{isPlaying ? "⏸" : "🔊"}</span>
        <span>{buttonLabel}</span>
      </button>
      {hasError && errorMsg ? (
        <p className="text-center text-xs text-[color:var(--book-text-muted)]" role="status" aria-live="polite">
          {errorMsg}
        </p>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {isLoading ? "טוען שמע..." : isPlaying ? "משמיעים" : ""}
      </span>
    </div>
  );
}
