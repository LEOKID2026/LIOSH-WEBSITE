/**
 * Learning book audio — section-level resolver, flags, text prep.
 * Run: node --test tests/learning/learning-book-audio.test.mjs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  isLearningBookAudioEnabledClient,
  isLearningBookAudioEnabledServer,
} from "../../lib/learning-book/audio/learning-book-audio-feature-flags.js";
import { resolveLearningBookAudio } from "../../lib/learning-book/audio/resolve-learning-book-audio.js";
import {
  HEBREW_G1_SECTION_AUDIO,
  learningBookAudioManifestKey,
  defaultLearningBookSectionAudioPublicPath,
  appendLearningBookAudioCacheBust,
} from "../../lib/learning-book/audio/learning-book-audio-manifest.js";
import {
  prepareHebrewBookAudioTextForSection,
  prepareHebrewBookSectionAudioText,
  normalizeHebrewHyphensForTts,
} from "../../lib/learning-book/audio/prepare-hebrew-book-audio-text.js";
import { prepareBookSectionAudioText } from "../../lib/learning-book/audio/prepare-learning-book-audio-text.js";
import { getLearningBookEntry } from "../../lib/learning-book/learning-book-catalog.js";

const ENV_KEYS = ["NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED", "LEARNING_BOOK_AUDIO_ENABLED"];
const SAMPLE_PAGE = "g1.letters";

/** @type {Record<string, string|undefined>} */
let savedEnv = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("learning book audio feature flags", () => {
  test("default OFF (fail closed)", () => {
    assert.equal(isLearningBookAudioEnabledClient(), false);
    assert.equal(isLearningBookAudioEnabledServer(), false);
  });
});

describe("resolveLearningBookAudio (section-level Hebrew G1)", () => {
  test("resolves g1.letters sections with unique src", () => {
    const srcs = new Set();
    for (let sectionNumber = 1; sectionNumber <= HEBREW_G1_SECTION_AUDIO.sectionsPerPage; sectionNumber += 1) {
      const r = resolveLearningBookAudio("hebrew", "g1", SAMPLE_PAGE, sectionNumber);
      assert.ok(r, `expected audio for section ${sectionNumber}`);
      assert.equal(
        r.key,
        learningBookAudioManifestKey("hebrew", "g1", SAMPLE_PAGE, sectionNumber)
      );
      assert.equal(
        r.src,
        defaultLearningBookSectionAudioPublicPath("hebrew", "g1", SAMPLE_PAGE, sectionNumber)
      );
      assert.match(r.playbackSrc, /\?v=/);
      srcs.add(r.src);
    }
    assert.equal(srcs.size, HEBREW_G1_SECTION_AUDIO.sectionsPerPage);
  });

  test("different topics return different section src values", () => {
    const letters = resolveLearningBookAudio("hebrew", "g1", "g1.letters", 1);
    const rhyme = resolveLearningBookAudio("hebrew", "g1", "g1.rhyme", 1);
    assert.ok(letters?.src);
    assert.ok(rhyme?.src);
    assert.notEqual(letters.src, rhyme.src);
  });

  test("returns null for non-Hebrew-G1 or missing section", () => {
    assert.equal(resolveLearningBookAudio("hebrew", "g2", SAMPLE_PAGE, 1), null);
    assert.equal(resolveLearningBookAudio("math", "g1", SAMPLE_PAGE, 1), null);
    assert.equal(resolveLearningBookAudio("english", "g1", SAMPLE_PAGE, 1), null);
    assert.equal(resolveLearningBookAudio("hebrew", "g1", SAMPLE_PAGE, 99), null);
    assert.equal(resolveLearningBookAudio("hebrew", "g1", "not.a.page", 1), null);
  });

  test("cache bust appends version query", () => {
    const busted = appendLearningBookAudioCacheBust("/audio/learning-books/hebrew/g1/g1.letters/section-01.mp3");
    assert.match(busted, /\?v=/);
  });
});

describe("normalizeHebrewHyphensForTts", () => {
  test("splits Hebrew hyphen and maqaf variants", () => {
    assert.equal(normalizeHebrewHyphensForTts("צעד-צעד"), "צעד צעד");
    assert.equal(normalizeHebrewHyphensForTts("פתוח-סגור"), "פתוח סגור");
    assert.equal(normalizeHebrewHyphensForTts("אלף-בית"), "אלף בית");
    assert.equal(normalizeHebrewHyphensForTts("אלף־בית"), "אלף בית");
    assert.equal(normalizeHebrewHyphensForTts("אלף–בית"), "אלף בית");
    assert.equal(normalizeHebrewHyphensForTts("אלף—בית"), "אלף בית");
  });
});

describe("prepareHebrewBookSectionAudioText", () => {
  test("g1.letters section 1 has no title or nav labels", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const page = entry.loader.loadPage(SAMPLE_PAGE);
    const script = prepareHebrewBookAudioTextForSection(page, 1);

    assert.ok(script && script.length > 20);
    assert.match(script, /היום נלמד בעברית את אותיות ה אָלֶף, בֵּית/);
    assert.doesNotMatch(script, new RegExp(`^${page.displayTitle}`));
    assert.doesNotMatch(script, /^מה לומדים\?/m);
    assert.doesNotMatch(script, /[❌✓]/u);
    assert.doesNotMatch(script, /^רמז\s*:/m);
  });

  test("each section script is unique and excludes other section content", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const page = entry.loader.loadPage(SAMPLE_PAGE);
    const scripts = Array.from({ length: HEBREW_G1_SECTION_AUDIO.sectionsPerPage }, (_, i) =>
      prepareHebrewBookAudioTextForSection(page, i + 1)
    );

    assert.equal(new Set(scripts).size, scripts.length);
    assert.ok(scripts.every((script) => script && script.length > 10), "every section has spoken script");

    const s1 = scripts[0];
    const s3 = scripts[2];
    assert.match(s1, /היום נלמד בעברית את אותיות ה אָלֶף, בֵּית/);
    assert.doesNotMatch(s1, /רואים אות א — אומרים/);
    assert.match(s3, /רואים אות א — אומרים/);
    assert.doesNotMatch(s3, /היום נלמד בעברית את אותיות ה אָלֶף, בֵּית/);

    const s4 = scripts[3];
    assert.match(s4, /מה שם האות ב/);
    assert.doesNotMatch(s4, /^שאלה\s*:/m);
    assert.doesNotMatch(s4, /^שלב\s+\d+\s*:/m);
  });

  test("dispatcher prepares single section only", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const page = entry.loader.loadPage(SAMPLE_PAGE);
    const section = page.sections.find((s) => s.number === 2);
    const direct = prepareHebrewBookSectionAudioText(section);
    const via = prepareBookSectionAudioText("hebrew", "g1", SAMPLE_PAGE, page, 2);
    assert.equal(direct, via);
  });

  test("spoken script has no Hebrew hyphens between letters", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const hyphenRe =
      /[\u0590-\u05FF][\u002D\u2010\u2011\u2012\u2013\u2014\u05BE\uFE58\uFE63\uFF0D][\u0590-\u05FF]/;
    for (const pageId of ["g1.letters", "g1.rhyme", "g1.open_close_syllable"]) {
      const page = entry.loader.loadPage(pageId);
      for (let n = 1; n <= HEBREW_G1_SECTION_AUDIO.sectionsPerPage; n += 1) {
        const script = prepareHebrewBookAudioTextForSection(page, n);
        if (script) assert.doesNotMatch(script, hyphenRe, `${pageId} section ${n}`);
      }
    }
  });
});

describe("manifest coverage", () => {
  test("all Hebrew G1 pages have 7 section slots", () => {
    assert.equal(HEBREW_G1_SECTION_AUDIO.pageIds.length, 32);
    assert.equal(HEBREW_G1_SECTION_AUDIO.sectionsPerPage, 7);
    for (const pageId of HEBREW_G1_SECTION_AUDIO.pageIds) {
      assert.ok(resolveLearningBookAudio("hebrew", "g1", pageId, 1));
      assert.ok(resolveLearningBookAudio("hebrew", "g1", pageId, 7));
      assert.equal(resolveLearningBookAudio("hebrew", "g1", pageId, 8), null);
    }
  });
});
