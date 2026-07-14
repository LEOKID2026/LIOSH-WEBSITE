/**
 * English G1/G2 phonics + vocabulary practice-question audio —
 * child-friendly mixed Hebrew + US English TTS.
 * Mirrors Hebrew question audioStem pattern; uses browser speech synthesis (no book MP3 mapping).
 */

import { validateAudioStemV1 } from "./audio-task-contract.js";
import { getPhonicsPracticeStimulus } from "../data/english-questions/index.js";

/** US English letter names (zee, aitch, C = see). */
const US_LETTER_NAMES = Object.freeze({
  a: "ay",
  b: "bee",
  c: "see",
  d: "dee",
  e: "ee",
  f: "eff",
  g: "jee",
  h: "aitch",
  i: "eye",
  j: "jay",
  k: "kay",
  l: "ell",
  m: "em",
  n: "en",
  o: "oh",
  p: "pee",
  q: "cue",
  r: "ar",
  s: "ess",
  t: "tee",
  u: "you",
  v: "vee",
  w: "double you",
  x: "ex",
  y: "why",
  z: "zee",
});

/** @param {string} s @param {number} max */
function clip(s, max) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

/** Child-friendly Hebrew instruction (no בחר/י slash forms). */
export function normalizePhonicsHebrewInstruction(text) {
  return String(text || "")
    .replace(/בחר\/י/gu, "בחרו")
    .replace(/שמע\/י/gu, "שמעו")
    .replace(/קרא\/י/gu, "קראו")
    .replace(/האזינ\/י/gu, "האזינו")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} letter
 * @param {"letter_name"|"letter_sound"} mode
 */
export function speakableUsEnglishToken(letter, mode = "letter_name") {
  const raw = String(letter || "").trim();
  if (!raw) return "";

  if (mode === "letter_sound") {
    const ch = raw.toLowerCase().charAt(0);
    if (ch === "c") return "kuh, as in cat";
    if (ch === "g") return "guh, as in go";
    if (ch === "h") return "huh";
    if (ch === "q") return "kwuh";
    if (ch === "x") return "ks";
    if (ch === "y") return "yuh";
    if (/^[aeiou]$/.test(ch)) {
      const short = { a: "ah", e: "eh", i: "ih", o: "ah", u: "uh" };
      return short[ch] || ch;
    }
    return `${ch}`;
  }

  const key = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase().charAt(0);
  if (US_LETTER_NAMES[key]) return US_LETTER_NAMES[key];

  if (/^[A-Za-z]+$/.test(raw)) return raw.toLowerCase();
  return raw;
}

/**
 * @param {string} stimulus
 * @param {string} itemType
 */
function targetSpeechMode(itemType) {
  if (itemType === "early_word_reading") return "word";
  if (itemType === "choose_matching_letter" || itemType === "match_uppercase_lowercase") {
    return "letter_name";
  }
  return "letter_name";
}

/**
 * @param {string} stimulus
 * @param {string} itemType
 */
export function buildPhonicsEnglishTargetSpeech(stimulus, itemType) {
  const token = String(stimulus || "").trim();
  if (!token) return "";

  const mode = targetSpeechMode(itemType);
  if (mode === "word") return token.toLowerCase();

  if (token.length === 1) {
    return speakableUsEnglishToken(token, "letter_name");
  }
  if (/^[A-Za-z]+$/.test(token) && token.length <= 6) {
    return token.toLowerCase();
  }
  return token;
}

/**
 * @param {string[]} answers
 * @param {string} itemType
 */
export function buildPhonicsOptionsSpeech(answers, itemType) {
  if (!Array.isArray(answers) || answers.length < 2) return "";
  const parts = answers
    .map((a) => String(a).trim())
    .filter(Boolean)
    .map((a) => {
      if (itemType === "early_word_reading" || (a.length > 1 && /^[A-Za-z]+$/i.test(a))) {
        return a.toLowerCase();
      }
      return speakableUsEnglishToken(a, "letter_name");
    });
  return clip(parts.join(", "), 220);
}

/**
 * @param {{
 *   instruction: string,
 *   stimulus: string,
 *   itemType: string,
 *   answers?: string[],
 *   includeOptions?: boolean,
 * }} p
 * @returns {{ locale: string, text: string }[]}
 */
export function buildPhonicsPracticeTtsSegments(p) {
  const instruction = normalizePhonicsHebrewInstruction(p.instruction);
  const stimulus = String(p.stimulus || "").trim();
  const itemType = String(p.itemType || "");
  /** @type {{ locale: string, text: string }[]} */
  const segments = [];

  if (instruction) {
    segments.push({ locale: "he-IL", text: instruction });
  }

  const target = buildPhonicsEnglishTargetSpeech(stimulus, itemType);
  if (target) {
    const lead =
      itemType === "early_word_reading"
        ? "The word is"
        : stimulus.length === 1
          ? "The letter is"
          : "Listen";
    segments.push({ locale: "en-US", text: `${lead}: ${target}.` });
  }

  if (p.includeOptions !== false) {
    const opts = buildPhonicsOptionsSpeech(p.answers, itemType);
    if (opts) {
      segments.push({ locale: "he-IL", text: "אפשרויות:" });
      segments.push({ locale: "en-US", text: opts });
    }
  }

  return segments;
}

/**
 * @param {object} question
 * @param {{ gradeKey: string, sourceRow?: Record<string, unknown>|null }} ctx
 * @returns {boolean}
 */
export function attachEnglishPhonicsPracticeAudio(question, ctx) {
  if (!question || typeof question !== "object") return false;
  if (question.topic !== "phonics") return false;

  const g = String(ctx.gradeKey || "").toLowerCase();
  if (g !== "g1" && g !== "g2") return false;
  if (question.qType !== "choice") return false;
  if (!Array.isArray(question.answers) || question.answers.length < 2) return false;
  if (!question.correctAnswer) return false;

  const row = ctx.sourceRow && typeof ctx.sourceRow === "object" ? ctx.sourceRow : {};
  const itemType = String(row.itemType || question.params?.itemType || "");
  const instruction = String(
    question.questionLabel || row.question || question.params?.phonicsInstruction || ""
  ).trim();
  const stimulus =
    String(question.params?.phonicsStimulus || "").trim() ||
    getPhonicsPracticeStimulus(row);

  const segments = buildPhonicsPracticeTtsSegments({
    instruction,
    stimulus,
    itemType,
    answers: question.answers,
    includeOptions: true,
  });

  if (segments.length === 0) return false;

  const transcript = clip(
    [instruction, stimulus, ...(question.answers || []).map(String)].join(" · "),
    400
  );
  const fallbackTts = clip(
    segments.map((s) => s.text).join(" "),
    480
  );
  const rowId = String(row.id || question.params?.patternFamily || "phonics");

  const stem = {
    schema_version: 1,
    audio_asset_id: `en.phonics.${g}.${rowId}`,
    transcript,
    locale: "en-US",
    task_mode: "listen_and_choose",
    recording_required: false,
    playback_kind: "tts",
    stem_audio_url: null,
    tts_text: fallbackTts,
    tts_segments: segments,
    max_replays: 5,
    max_duration_sec: 20,
    scoring_policy: "mcq_after_audio_auto",
    fallback_mode: "degraded_skip",
    review_route: "none",
  };

  if (!validateAudioStemV1(stem)) return false;

  question.params = {
    ...question.params,
    audioStem: stem,
    phonicsAudioAttached: true,
  };

  return true;
}

/**
 * Attach TTS audio stem to an English vocabulary MCQ question for G1/G2.
 * Audio reads the target word aloud in the appropriate language, followed by answer options.
 *
 * @param {object} question
 * @param {{ gradeKey: string }} ctx
 * @returns {boolean}
 */
export function attachEnglishVocabPracticeAudio(question, ctx) {
  if (!question || typeof question !== "object") return false;
  if (question.topic !== "vocabulary") return false;

  const g = String(ctx.gradeKey || "").toLowerCase();
  if (g !== "g1" && g !== "g2") return false;
  if (question.qType !== "choice") return false;
  if (!Array.isArray(question.answers) || question.answers.length < 2) return false;

  const params = question.params || {};
  const word = String(params.word || "").trim();
  const direction = String(params.direction || "en_to_he");
  const listKey = String(params.listKey || "vocab");

  if (!word) return false;

  /** @type {{ locale: string, text: string }[]} */
  const segments = [];

  if (direction === "en_to_he") {
    // Q: "מה פירוש המילה 'dog'?" → say English word; answers are Hebrew
    segments.push({ locale: "he-IL", text: "מה פירוש המילה" });
    segments.push({ locale: "en-US", text: word });
    const heAnswers = question.answers.slice(0, 4).map(String).filter(Boolean);
    if (heAnswers.length > 0) {
      segments.push({ locale: "he-IL", text: "אפשרויות: " + heAnswers.join(", ") });
    }
  } else {
    // direction === "he_to_en": Q: 'כתוב את המילה "כלב" באנגלית' → answers are English
    segments.push({
      locale: "he-IL",
      text: `כתוב את המילה ${word} באנגלית`,
    });
    const enAnswers = question.answers.slice(0, 4).map(String).filter(Boolean);
    if (enAnswers.length > 0) {
      segments.push({ locale: "he-IL", text: "אפשרויות:" });
      segments.push({ locale: "en-US", text: enAnswers.join(", ") });
    }
  }

  if (segments.length === 0) return false;

  const transcript = clip(
    [word, ...(question.answers || []).map(String)].join(" · "),
    300
  );
  const fallbackTts = clip(
    segments.map((s) => s.text).join(" "),
    400
  );

  const stem = {
    schema_version: 1,
    audio_asset_id: `en.vocab.${g}.${listKey}.${word.replace(/\s+/g, "_")}`,
    transcript,
    locale: direction === "en_to_he" ? "en-US" : "he-IL",
    task_mode: "listen_and_choose",
    recording_required: false,
    playback_kind: "tts",
    stem_audio_url: null,
    tts_text: fallbackTts,
    tts_segments: segments,
    max_replays: 5,
    max_duration_sec: 15,
    scoring_policy: "mcq_after_audio_auto",
    fallback_mode: "degraded_skip",
    review_route: "none",
  };

  if (!validateAudioStemV1(stem)) return false;

  question.params = {
    ...question.params,
    audioStem: stem,
    vocabAudioAttached: true,
  };

  return true;
}
