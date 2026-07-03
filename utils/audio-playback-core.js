/**
 * נגינת stem — static_url או TTS (speechSynthesis).
 * TTS: אין resolve שקט על שגיאה; המתנה אל voices; בחירת voice עברי; fallback והודעות ברורות.
 */

/**
 * טוען/מעורר את רשימת ה voices בדפדפנים (במיוחד כרום) לפני לחיצת המשתמש — מומלץ ב useEffect.
 * לא מדבר בקול: speak ריק ו cancel או רק getVoices אחרי voiceschanged.
 */
export function primeSpeechSynthesisVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => {};
  const synth = window.speechSynthesis;
  const kick = () => {
    try {
      void synth.getVoices();
    } catch {
      /* ignore */
    }
  };
  kick();
  synth.addEventListener("voiceschanged", kick);
  try {
    const warm = new SpeechSynthesisUtterance("\u00a0");
    warm.volume = 0;
    warm.rate = 10;
    synth.speak(warm);
    synth.cancel();
  } catch {
    /* ignore */
  }
  return () => synth.removeEventListener("voiceschanged", kick);
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} [locale]
 * @returns {SpeechSynthesisVoice | null}
 */
function pickLocaleTtsVoice(voices, locale, hints = []) {
  if (!Array.isArray(voices) || !voices.length) return null;
  const want = String(locale || "he-IL").toLowerCase();
  const base = want.split("-")[0] || "he";

  const score = (v) => {
    const lang = String(v.lang || "").toLowerCase();
    let s = 0;
    if (lang === want) s += 100;
    else if (lang.startsWith(`${base}-`)) s += 80;
    else if (lang === base) s += 70;
    else if (lang.startsWith(base)) s += 50;
    const name = `${v.name || ""} ${v.voiceURI || ""}`.toLowerCase();
    for (const hint of hints) {
      if (name.includes(String(hint).toLowerCase())) s += 25;
    }
    if (v.default && s > 0) s += 5;
    return s;
  };

  let best = null;
  let bestScore = 0;
  for (const v of voices) {
    const sc = score(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  return bestScore > 0 ? best : null;
}

export function pickHebrewTtsVoice(voices, locale = "he-IL") {
  return pickLocaleTtsVoice(voices, locale, ["hebrew", "עברית"]);
}

export function pickEnglishTtsVoice(voices, locale = "en-US") {
  return pickLocaleTtsVoice(voices, locale, [
    "english united states",
    "english (united states)",
    "us english",
    "jenny",
    "guy",
    "aria",
  ]);
}

/**
 * @param {import("./audio-task-contract.js").AudioStem} stem
 * @param {{ onEnded?: () => void }} [opts]
 */
export function createStemPlaybackController(stem, opts = {}) {
  let audioEl = null;
  let replayCount = 0;

  function stopTts() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  function stopAll() {
    stopTts();
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.removeAttribute("src");
        audioEl.load();
      } catch {
        /* ignore */
      }
      audioEl = null;
    }
  }

  /**
   * @param {string} code
   * @param {string} message
   */
  function ttsErr(code, message) {
    const e = new Error(message);
    e.name = "HebrewAudioTtsError";
    /** @type {any} */ (e).code = code;
    return e;
  }

  /**
   * @returns {Promise<void>}
   */
  /**
   * @param {{ locale?: string, text: string }} segment
   * @returns {Promise<void>}
   */
  function playTtsSegment(segment) {
    const text = String(segment?.text || "").trim();
    if (!text) return Promise.resolve();

    if (typeof window === "undefined" || !window.speechSynthesis) {
      return Promise.reject(
        ttsErr("speech_synthesis_unavailable", "הדפדפן לא תומך בהקראה (Speech Synthesis). נסו דפדפן אחר או מכשיר אחר.")
      );
    }

    const locale = String(segment.locale || stem.locale || "he-IL");
    const synth = window.speechSynthesis;

    return new Promise((resolve, reject) => {
      let settled = false;
      const doneOk = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const doneErr = (code, message) => {
        if (settled) return;
        settled = true;
        reject(ttsErr(code, message));
      };

      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale;
      u.rate = locale.toLowerCase().startsWith("en") ? 0.9 : 0.92;
      u.volume = 1;
      u.pitch = 1;

      const voices = (() => {
        try {
          return synth.getVoices() || [];
        } catch {
          return [];
        }
      })();
      const picked = locale.toLowerCase().startsWith("en")
        ? pickEnglishTtsVoice(voices, locale)
        : pickHebrewTtsVoice(voices, locale);
      if (picked) u.voice = picked;

      u.onend = () => doneOk();
      u.onerror = (ev) => {
        const code = ev.error || "unknown";
        doneErr(String(code), `שגיאת TTS: ${code}`);
      };

      try {
        synth.speak(u);
      } catch (err) {
        doneErr("speak_throw", err instanceof Error ? err.message : "שגיאה בהפעלת ההקראה.");
      }
    });
  }

  /**
   * @param {{ locale?: string, text: string }[]} segments
   * @returns {Promise<void>}
   */
  async function playTtsSegments(segments) {
    for (const segment of segments) {
      await playTtsSegment(segment);
    }
    opts.onEnded?.();
  }

  function play() {
    stopAll();
    const segments = Array.isArray(stem.tts_segments) ? stem.tts_segments : null;
    if (stem.playback_kind === "tts" && segments && segments.length > 0) {
      return playTtsSegments(segments).catch((err) => {
        opts.onEnded?.();
        return Promise.reject(err);
      });
    }
    if (stem.playback_kind === "static_url" && stem.stem_audio_url) {
      audioEl = new Audio(stem.stem_audio_url);
      audioEl.onended = () => {
        opts.onEnded?.();
      };
      return audioEl.play().catch((err) => {
        console.warn("[hebrew-audio] static_url play failed", stem.stem_audio_url, err);
        opts.onEnded?.();
        return Promise.reject(ttsErr("audio_element_play_failed", "לא ניתן להשמיע את קובץ האודיו."));
      });
    }

    const text = stem.tts_text != null ? String(stem.tts_text).trim() : "";
    if (stem.playback_kind !== "tts" || !text) {
      console.warn("[hebrew-audio] tts missing or empty", {
        playback_kind: stem.playback_kind,
        hasText: !!text,
      });
      return Promise.reject(
        ttsErr("tts_not_configured", "אין טקסט להשמעה (TTS). נסו לרענן את השאלה.")
      );
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("[hebrew-audio] speechSynthesis unavailable");
      return Promise.reject(
        ttsErr("speech_synthesis_unavailable", "הדפדפן לא תומך בהקראה (Speech Synthesis). נסו דפדפן אחר או מכשיר אחר.")
      );
    }

    const synth = window.speechSynthesis;

    return new Promise((resolve, reject) => {
      let settled = false;
      let watchdogGeneration = 0;

      const voicesNow = () => {
        try {
          return synth.getVoices() || [];
        } catch {
          return [];
        }
      };

      const initialVoiceCount = voicesNow().length;

      const doneOk = () => {
        if (settled) return;
        settled = true;
        opts.onEnded?.();
        resolve();
      };
      const doneErr = (code, message) => {
        if (settled) return;
        settled = true;
        console.warn("[hebrew-audio-tts]", code, message, {
          voicesCount: synth.getVoices().length,
          lang: stem.locale || "he-IL",
        });
        opts.onEnded?.();
        reject(ttsErr(code, message));
      };

      /**
       * מריצים speak באותו סנכרון ככל האפשר אחרי לחיצה (חשוב אל iOS Safari).
       * @param {string} reason
       */
      const runSpeak = (reason) => {
        if (settled) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = stem.locale || "he-IL";
        u.rate = 0.92;
        u.volume = 1;
        u.pitch = 1;

        const voices = voicesNow();
        const picked = pickHebrewTtsVoice(voices, stem.locale);
        if (picked) {
          u.voice = picked;
          if (process.env.NODE_ENV === "development") {
            console.info("[hebrew-audio-tts] voice", reason, picked.name, picked.lang);
          }
        } else {
          console.warn("[hebrew-audio-tts] no Hebrew-matched voice; using lang only", {
            reason,
            voicesCount: voices.length,
            sample: voices.slice(0, 5).map((v) => `${v.name}|${v.lang}`),
          });
        }

        u.onend = () => doneOk();
        u.onerror = (ev) => {
          const code = ev.error || "unknown";
          const human =
            code === "not-allowed"
              ? "ההשמעה נחסמה (הרשאות / מדיניות דפדפן)."
              : code === "synthesis-failed"
                ? "ההקראה נכשלה. נסו שוב או בדקו שפת ממשק עברית במערכת."
                : code === "canceled"
                  ? "ההשמעה בוטלה."
                  : `שגיאת TTS: ${code}`;
          doneErr(String(code), human);
        };

        try {
          synth.speak(u);
        } catch (err) {
          doneErr("speak_throw", err instanceof Error ? err.message : "שגיאה בהפעלת ההקראה.");
          return;
        }

        /** כרום לפעמים לא מתחיל עד ש voices נטענו — מאריכים timeout אם הרשימה הייתה ריקה */
        const gen = ++watchdogGeneration;
        const watchdogMs = initialVoiceCount === 0 && voicesNow().length === 0 ? 5200 : 2800;
        window.setTimeout(() => {
          if (settled || gen !== watchdogGeneration) return;
          if (!synth.speaking && !synth.pending) {
            doneErr(
              "tts_no_activity",
              "לא זוהתה השמעה. אם אתם בכרום: ודאו שמותקנת חבילת עברית; אם ב Safari ב iOS: נסו שוב מיד אחרי טעינת הדף. אפשר גם להשתמש בטקסט שמוצג למעלה."
            );
          }
        }, watchdogMs);
      };

      let voiceRetryScheduled = false;
      const scheduleVoiceRetry = () => {
        if (voiceRetryScheduled || settled) return;
        voiceRetryScheduled = true;
        const onVoices = () => {
          if (voicesNow().length === 0) return;
          synth.removeEventListener("voiceschanged", onVoices);
          if (settled) return;
          if (!synth.speaking && !synth.pending) {
            try {
              synth.cancel();
            } catch {
              /* ignore */
            }
            runSpeak("voiceschanged_retry");
          }
        };
        synth.addEventListener("voiceschanged", onVoices);
        window.setTimeout(() => {
          try {
            synth.removeEventListener("voiceschanged", onVoices);
          } catch {
            /* ignore */
          }
        }, 6000);
      };

      runSpeak("initial_click");
      if (initialVoiceCount === 0) {
        scheduleVoiceRetry();
      }
    });
  }

  function bumpReplay() {
    replayCount += 1;
    return replayCount;
  }

  function getReplayCount() {
    return replayCount;
  }

  function dispose() {
    stopAll();
  }

  return { play, bumpReplay, getReplayCount, dispose, stopAll };
}
