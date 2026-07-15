/**
 * צירוף שאלות עברית אל audio stem — Build 1 + הרחבת Build 2 (סכמה 2).
 */

import { validateAudioStemV2 } from "./audio-task-contract.js";
import { hebrewGenStreamUrl } from "./hebrew-audio-gen-url.js";
import {
  buildFirstPassNarrationPlaintext,
  narrationContentHash16,
} from "./hebrew-audio-narration-binding.js";
import { isHebrewStaticCoreV1FirstPass } from "./hebrew-static-audio-scope.js";

/** @param {string} s */
function clipForTts(s, maxLen) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim();
}

const TOPICS_ANY = new Set([
  "reading",
  "comprehension",
  "speaking",
  "grammar",
  "vocabulary",
  "writing",
]);

const RECORDING_MODES = new Set(["guided_recording", "read_aloud_short_he", "structured_spoken_response_he"]);

/**
 * @param {object} question
 * @param {{ gradeKey: string, topic: string, sequenceIndex: number }} ctx
 * @returns {boolean}
 */
export function attachHebrewAudioToQuestion(question, ctx) {
  if (!question || typeof question !== "object") return false;
  const topic = String(ctx.topic || "");
  if (!TOPICS_ANY.has(topic)) return false;

  const g = String(ctx.gradeKey || "").toLowerCase();
  if (!/^g[1-6]$/.test(g)) return false;
  const gNum = parseInt(g.slice(1), 10);

  if (question.answerMode === "typing") return false;
  // Support both `answers` (self-practice format) and `choices` (activity/stripped format)
  const optionsArr = Array.isArray(question.answers) ? question.answers
    : Array.isArray(question.choices) ? question.choices : null;
  if (!optionsArr || optionsArr.length < 2) return false;
  // correctAnswer is only used for recording modes (guided_recording etc.) which are G3+;
  // G1/G2 never gets a recording mode so we can proceed without it.
  const lowerGradeCheck = gNum <= 2;
  if (!lowerGradeCheck && !question.correctAnswer) return false;

  const seq = Math.max(0, Number(ctx.sequenceIndex) || 0);
  const lowerGrade = gNum <= 2;
  if (!lowerGrade && seq % 9 < 4) return false;

  const qText = question.exerciseText || question.question || "";
  const r2 = seq % 13;

  /** @type {import("./audio-task-contract.js").AudioTaskMode} */
  let task_mode;

  if (lowerGrade) {
    if (topic === "reading" && seq % 5 === 0) {
      task_mode = "phonological_discrimination_he";
    } else if (topic === "grammar" && seq % 4 === 0) {
      task_mode = "audio_grammar_choice_he";
    } else if (seq % 2 === 0) {
      task_mode = "oral_comprehension_mcq";
    } else {
      task_mode = "listen_and_choose";
    }
  } else {
    task_mode =
      seq % 3 === 1 ? "oral_comprehension_mcq" : seq % 3 === 2 ? "guided_recording" : "listen_and_choose";

    if (topic === "reading" && r2 === 5) {
      task_mode = "phonological_discrimination_he";
    } else if (topic === "grammar" && r2 === 6) {
      task_mode = "audio_grammar_choice_he";
    } else if (topic === "reading" && gNum >= 3 && r2 === 7) {
      task_mode = "read_aloud_short_he";
    } else if ((topic === "speaking" || topic === "comprehension") && gNum >= 3 && r2 === 8) {
      task_mode = "structured_spoken_response_he";
    } else if (topic === "vocabulary" && r2 === 9) {
      task_mode = "oral_comprehension_mcq";
    } else if (topic === "writing" && r2 === 10) {
      task_mode = "listen_and_choose";
    }
  }

  const isRecording = RECORDING_MODES.has(task_mode);

  const listenTts =
    task_mode === "oral_comprehension_mcq" || task_mode === "audio_grammar_choice_he"
      ? clipForTts(qText, 220)
      : task_mode === "phonological_discrimination_he"
        ? clipForTts(qText, 140)
        : clipForTts(qText, 90);

  const phrase = clipForTts(String(question.correctAnswer), 48);

  let tts_text = listenTts;
  let transcript = clipForTts(qText, 400);
  let max_replays = 4;
  let max_duration_sec = 15;

  if (task_mode === "guided_recording") {
    tts_text = `הקראו בקול במילה אחת או במשפט קצר מאוד: ${phrase}`;
    transcript = phrase;
    max_replays = 3;
    max_duration_sec = 12;
  } else if (task_mode === "phonological_discrimination_he") {
    tts_text = `האזינו לצליל המילה. ${listenTts} - בחרו את האפשרות המתאימה אחרי ההאזנה.`;
    transcript = clipForTts(qText, 400);
  } else if (task_mode === "audio_grammar_choice_he") {
    tts_text = `האזינו ובדקו לפי השמע: ${listenTts}`;
    transcript = clipForTts(qText, 400);
    max_replays = 5;
  } else if (task_mode === "read_aloud_short_he") {
    tts_text = `הקראו בקול בבירור את הקטע: ${clipForTts(qText, 160)}`;
    transcript = clipForTts(qText, 400);
    max_replays = 4;
    max_duration_sec = 18;
  } else if (task_mode === "structured_spoken_response_he") {
    tts_text = `ענו בהקלטה קצרה (משפט עד שניים) על: ${clipForTts(qText, 200)}`;
    transcript = clipForTts(qText, 400);
    max_replays = 4;
    max_duration_sec = 20;
  } else if (task_mode === "oral_comprehension_mcq") {
    max_replays = 5;
  }

  const scoring_policy = isRecording
    ? task_mode === "structured_spoken_response_he"
      ? "borderline_transcript_assist"
      : "guided_record_manual_review"
    : "mcq_after_audio_auto";

  let playback_kind = /** @type {"tts"|"static_url"} */ ("tts");
  let stem_audio_url = /** @type {string|null} */ (null);
  let audio_asset_id = `he.attach.${g}.${topic}.${task_mode}.${seq}`;
  /** @type {string|undefined} */
  let audio_source;
  /** @type {string|undefined} */
  let narration_plaintext;

  if (!isRecording && isHebrewStaticCoreV1FirstPass({ gradeKey: g, topic, task_mode })) {
    narration_plaintext = buildFirstPassNarrationPlaintext({
      gradeKey: g,
      topic,
      task_mode,
      qText,
      answers: question.answers,
    });
    const hash16 = narrationContentHash16(narration_plaintext);
    playback_kind = "static_url";
    stem_audio_url = hebrewGenStreamUrl(hash16);
    audio_asset_id = `he.gen.v1.${hash16}`;
    tts_text = null;
    audio_source = "static_registry_bound";
  }

  const stem = {
    schema_version: 2,
    audio_asset_id,
    transcript,
    locale: "he-IL",
    task_mode,
    recording_required: isRecording,
    playback_kind,
    stem_audio_url,
    tts_text,
    max_replays,
    max_duration_sec,
    scoring_policy,
    fallback_mode: "degraded_skip",
    review_route: isRecording ? "manual_pending" : "none",
    ...(audio_source != null ? { audio_source } : {}),
    ...(narration_plaintext != null ? { narration_plaintext } : {}),
  };

  if (!validateAudioStemV2(stem)) return false;

  question.params = { ...question.params, audioStem: stem };

  if (isRecording) {
    question.answerMode = "hebrew_audio_recorded_manual";
    question.questionLabel =
      task_mode === "read_aloud_short_he"
        ? "הקראה קצרה"
        : task_mode === "structured_spoken_response_he"
          ? "תגובה מדוברת"
          : "הקלטה קצרה";
    question.exerciseText =
      task_mode === "structured_spoken_response_he"
        ? "הקליטו תשובה קצרה לפי ההנחיה. ההקלטה נשמרת לבדיקה - אין ציון אוטומטי מלא לדיבור בשלב זה."
        : task_mode === "read_aloud_short_he"
          ? "הקליטו את ההקראה לפי ההנחיה בקול. ההקלטה נשמרת לבדיקה ידנית."
          : "הקליטו את עצמכם לפי ההנחיה בקול. ההקלטה נשמרת לבדיקה - אין ציון אוטומטי לדיבור בשלב זה.";
    question.question = question.exerciseText;
  } else {
    const hint =
      task_mode === "oral_comprehension_mcq"
        ? "האזינו ובחרו את התשובה הנכונה."
        : task_mode === "audio_grammar_choice_he"
          ? "בחרו את המשפט המתאים."
          : task_mode === "phonological_discrimination_he"
            ? "בחרו את המילה המתאימה."
            : "האזינו ובחרו את התשובה הנכונה.";
    // Set the label only if not already set. Use the short form so the heading
    // does not duplicate the instruction that appears in the question body below.
    if (!question.questionLabel) {
      question.questionLabel = "האזינו ובחרו";
    }
    // Do NOT prepend the hint instruction into exerciseText — it would create a
    // visible duplicate because the UI already displays questionLabel as a heading
    // above the question. Keep only the question text in the body.
    question.exerciseText = qText;
    question.question = question.exerciseText;
  }

  return true;
}

/** תאימות לאחור — אותה פונקציה */
export const attachHebrewAudioBuild1 = attachHebrewAudioToQuestion;
