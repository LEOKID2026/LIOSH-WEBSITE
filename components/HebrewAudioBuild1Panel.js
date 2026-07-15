import { useCallback, useEffect, useRef, useState } from "react";
import { useGameAudioOptional } from "../hooks/useGameAudio.js";
import {
  createStemPlaybackController,
  primeSpeechSynthesisVoices,
} from "../utils/audio-playback-core";
import { recordShortUtterance } from "../utils/audio-recording-core";
import {
  appendAudioArtifact,
  blobToBase64,
  isWithinArtifactSizeLimit,
} from "../utils/audio-submission-store";
import { resolveScoreOrReviewRoute } from "../utils/audio-task-contract";
import { trackProductEvent } from "../lib/analytics/track-event.client.js";

/**
 * Compact toolbar audio controls only — no transcript UI in the student learning screen.
 *
 * @param {{
 *   stem: import("../utils/audio-task-contract.js").AudioStem,
 *   gameActive: boolean,
 *   grade: string,
 *   topic: string,
 *   guidedMode: boolean,
 *   onGuidedNeutralDone: () => void,
 * }} props
 */
export default function HebrewAudioBuild1Panel({
  stem,
  gameActive,
  grade,
  topic,
  guidedMode,
  onGuidedNeutralDone,
}) {
  const audio = useGameAudioOptional();
  const [replayCount, setReplayCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const ctrlRef = useRef(null);

  const route = resolveScoreOrReviewRoute(stem);

  const needsServerNarration =
    stem?.audio_source === "static_registry_bound" && Boolean(stem?.narration_plaintext);

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

  /** הקראה סטטית לפי תוכן שאלה — יוצרת MP3 בשרת (לא TTS בדפדפן) */
  const ensureServerNarrationMp3 = useCallback(async () => {
    const t = stem?.narration_plaintext;
    if (!t || !needsServerNarration) return;
    const r = await fetch("/api/hebrew-audio-ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });
    if (!r.ok) {
      let err = `ensure_${r.status}`;
      try {
        const j = await r.json();
        if (j && j.error) err = String(j.error);
      } catch {
        /* ignore */
      }
      throw new Error(err);
    }
  }, [needsServerNarration, stem?.narration_plaintext]);

  useEffect(() => {
    if (!needsServerNarration) {
      return () => {};
    }
    let cancelled = false;
    (async () => {
      try {
        await ensureServerNarrationMp3();
      } catch {
        if (!cancelled && process.env.NODE_ENV === "development") {
          console.warn("[HebrewAudioBuild1Panel] prefetch ensure failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsServerNarration, stem?.narration_plaintext, ensureServerNarrationMp3]);

  const playStem = useCallback(async () => {
    if (!gameActive || busy) return;
    if (replayCount >= stem.max_replays) {
      setStatusMsg("הגעתם למקסימום האזנות לשאלה זו.");
      return;
    }
    setBusy(true);
    setStatusMsg("משמיעים…");
    try {
      if (needsServerNarration) {
        setStatusMsg("מכינים שמע…");
        await ensureServerNarrationMp3();
        if (!audio) {
          ctrlRef.current = createStemPlaybackController(stem, {});
        }
        setStatusMsg("משמיעים…");
      }
      if (audio) {
        await audio.playVoice("voice-question-hebrew", {
          stem,
          text: stem?.narration_plaintext,
          engine: "edge-tts-server",
        });
      } else {
        await ctrlRef.current?.play();
      }
      const n = (ctrlRef.current?.bumpReplay?.() ?? replayCount + 1);
      setReplayCount(n);
      void trackProductEvent({
        eventName: "audio_played",
        actorType: "student",
        subject: "hebrew",
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
      const code =
        err && typeof err === "object" && "code" in err ? String(/** @type {any} */ (err).code) : "";
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "לא ניתן להשמיע כרגע. נסו שוב או המשיכו לפי הטקסט.";
      setStatusMsg(code ? `${msg} (${code})` : msg);
      if (process.env.NODE_ENV === "development") {
        console.warn("[HebrewAudioBuild1Panel] play failed", err);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, gameActive, needsServerNarration, replayCount, stem, ensureServerNarrationMp3, audio, grade, topic]);

  const runGuidedCapture = useCallback(async () => {
    if (!gameActive || busy || !guidedMode) return;
    setBusy(true);
    setStatusMsg("מקליטים… (עד " + stem.max_duration_sec + " שנ׳)");
    const res = await recordShortUtterance({
      maxDurationMs: stem.max_duration_sec * 1000,
    });
    if (res.status !== "ok" || !res.blob) {
      setStatusMsg(
        res.status === "permission_denied"
          ? "אין גישה למיקרופון. אפשר לדלג בלי עונש."
          : res.status === "not_supported"
          ? "הדפדפן לא תומך בהקלטה כאן."
          : "ההקלטה נכשלה. נסו שוב."
      );
      setBusy(false);
      return;
    }
    try {
      const b64 = await blobToBase64(res.blob);
      if (!isWithinArtifactSizeLimit(b64)) {
        setStatusMsg("הקלטה ארוכה מדי לשמירה מקומית. נסו שוב קצר יותר.");
        setBusy(false);
        return;
      }
      const artifact_id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      appendAudioArtifact({
        artifact_id,
        audio_asset_id: stem.audio_asset_id,
        task_mode: stem.task_mode,
        locale: stem.locale,
        review_route: stem.review_route,
        scoring_policy: stem.scoring_policy,
        mime_type: res.mimeType || "audio/webm",
        duration_ms: res.durationMs ?? null,
        audio_data_base64: b64,
        transcript_snapshot: stem.transcript,
        grade_key: grade,
        topic,
        auto_score: route.autoScore,
        manual_review: route.manualReview,
      });
      setStatusMsg("ההקלטה נשמרה לבדיקה ידנית. ממשיכים.");
      setBusy(false);
      setTimeout(() => onGuidedNeutralDone(), 1200);
    } catch {
      setStatusMsg("שמירת ההקלטה נכשלה.");
      setBusy(false);
    }
  }, [busy, gameActive, grade, guidedMode, onGuidedNeutralDone, route, stem, topic]);

  const skipGuided = useCallback(() => {
    if (!gameActive || busy || !guidedMode) return;
    setStatusMsg("דילוג - ללא ציון אוטומטי.");
    setTimeout(() => onGuidedNeutralDone(), 600);
  }, [busy, gameActive, guidedMode, onGuidedNeutralDone]);

  const playTitle =
    statusMsg && statusMsg !== "משמיעים…" && statusMsg !== "מכינים שמע…"
      ? statusMsg
      : `נגן שמע (${replayCount}/${stem.max_replays})`;

  return (
    <div className="inline-flex flex-wrap items-center justify-start gap-1 md:gap-1.5" dir="rtl">
      <span className="sr-only" aria-live="polite">
        שמע · מצב משימה {stem.task_mode}
      </span>
      <button
        type="button"
        onClick={playStem}
        disabled={!gameActive || busy}
        className="inline-flex items-center justify-center gap-1.5 h-8 md:h-10 px-2 md:px-3 rounded-lg bg-cyan-600/85 hover:bg-cyan-600 disabled:opacity-50 text-[11px] md:text-xs font-bold text-white border border-cyan-400/35 shadow-sm shrink-0 tabular-nums"
        title={playTitle}
        aria-label={playTitle}
        data-testid="hebrew-audio-button"
      >
        <span aria-hidden>🔊</span>
        <span>נגן</span>
        <span dir="ltr">
          ({replayCount}/{stem.max_replays})
        </span>
      </button>
      {guidedMode && (
        <>
          <button
            type="button"
            onClick={runGuidedCapture}
            disabled={!gameActive || busy}
            className="h-8 md:h-10 px-2 rounded-lg bg-emerald-600/85 hover:bg-emerald-600 disabled:opacity-50 text-[11px] md:text-xs font-bold text-white shrink-0"
            title={`הקלטה עד ${stem.max_duration_sec} שנ׳`}
          >
            הקלטה
          </button>
          <button
            type="button"
            onClick={skipGuided}
            disabled={!gameActive || busy}
            className="h-8 md:h-10 px-2 rounded-lg bg-white/12 hover:bg-white/18 text-[11px] md:text-xs font-bold text-white shrink-0"
          >
            דילוג
          </button>
        </>
      )}
      {statusMsg ? (
        <span className="sr-only" aria-live="assertive">
          {statusMsg}
        </span>
      ) : null}
    </div>
  );
}
