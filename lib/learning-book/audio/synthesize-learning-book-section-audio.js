/**
 * Offline Edge TTS synthesis for learning book section audio.
 * Hebrew/Math: single voice via node-edge-tts.
 * English phonics: mixed he-IL + en-US segments concatenated into one MP3.
 */
import fs from "node:fs";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { EdgeTTS } from "node-edge-tts";
import {
  ENGLISH_BOOK_AUDIO_EN_VOICE,
  ENGLISH_BOOK_AUDIO_HE_VOICE,
} from "./learning-book-audio-tts-config.js";
import { splitMixedLanguageRuns } from "./prepare-english-book-audio-text.js";

/**
 * @param {string} text
 */
function formatEnglishRunForTts(text) {
  return String(text || "")
    .replace(/\s*…\s*/g, ", ")
    .replace(/\s*→\s*/g, ", ")
    .replace(/\s*\+\s*/g, ", ")
    .trim();
}

/**
 * @param {{
 *   voice: string,
 *   lang: string,
 *   rate?: string,
 *   timeout?: number,
 * }} options
 * @param {string} text
 * @param {string} outputPath
 */
async function synthesizePlainTextToMp3(text, outputPath, options) {
  /** @type {Error|null} */
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const tts = new EdgeTTS({
        voice: options.voice,
        lang: options.lang,
        rate: options.rate || "-12%",
        timeout: options.timeout ?? 120000,
      });
      await tts.ttsPromise(text, outputPath);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 3 && /503|429|Timed out/i.test(lastError.message)) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      throw lastError;
    }
  }
}

/**
 * @param {string} spokenScript
 * @param {string} audioPath
 * @param {{ rate?: string, timeout?: number }} options
 */
async function synthesizeEnglishMixedToMp3(spokenScript, audioPath, options) {
  const runs = splitMixedLanguageRuns(spokenScript);
  if (runs.length === 0) {
    throw new Error("empty_spoken_script");
  }

  /** @type {string[]} */
  const partPaths = [];
  const base = audioPath.replace(/\.mp3$/i, "");

  try {
    for (let i = 0; i < runs.length; i += 1) {
      const run = runs[i];
      const partPath = `${base}.part-${String(i).padStart(2, "0")}.mp3`;
      const voice = run.lang === "en" ? ENGLISH_BOOK_AUDIO_EN_VOICE : ENGLISH_BOOK_AUDIO_HE_VOICE;
      const lang = run.lang === "en" ? "en-US" : "he-IL";
      const text =
        run.lang === "en" ? formatEnglishRunForTts(run.text) : run.text.trim();
      if (!text) continue;

      await synthesizePlainTextToMp3(text, partPath, {
        voice,
        lang,
        rate: options.rate,
        timeout: options.timeout ?? 180000,
      });

      const st = fs.statSync(partPath);
      if (!st.size || st.size < 500) {
        throw new Error(`empty_audio_part:${i}`);
      }
      partPaths.push(partPath);
    }

    if (partPaths.length === 0) {
      throw new Error("empty_spoken_script");
    }

    if (partPaths.length === 1) {
      fs.copyFileSync(partPaths[0], audioPath);
      return;
    }

    const merged = Buffer.concat(partPaths.map((p) => fs.readFileSync(p)));
    fs.writeFileSync(audioPath, merged);
  } finally {
    for (const partPath of partPaths) {
      try {
        fs.unlinkSync(partPath);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {{
 *   spokenScript: string,
 *   ssml?: string|null,
 * }} prepDetail
 * @param {string} audioPath
 * @param {{
 *   voice: string,
 *   lang: string,
 *   rate?: string,
 *   timeout?: number,
 * }} options
 */
export async function synthesizeLearningBookSectionAudio(prepDetail, audioPath, options) {
  mkdirSync(path.dirname(audioPath), { recursive: true });

  if (prepDetail.ssml) {
    await synthesizeEnglishMixedToMp3(prepDetail.spokenScript, audioPath, options);
  } else {
    await synthesizePlainTextToMp3(prepDetail.spokenScript, audioPath, options);
  }

  const st = fs.statSync(audioPath);
  if (!st.size || st.size < 500) {
    try {
      fs.unlinkSync(audioPath);
    } catch {
      /* ignore */
    }
    throw new Error("empty_audio");
  }
}
