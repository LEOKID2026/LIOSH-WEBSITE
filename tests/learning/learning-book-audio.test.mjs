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
  HEBREW_G1_FLAT_PAGE_AUDIO,
  MATH_G1_SECTION_AUDIO,
  ENGLISH_G1_FLAT_PAGE_AUDIO,
  ENGLISH_G2_FLAT_PAGE_AUDIO,
  HEBREW_G2_FLAT_PAGE_AUDIO,
  learningBookAudioManifestKey,
  defaultLearningBookSectionAudioPublicPath,
  appendLearningBookAudioCacheBust,
  resolveBookGlobalPageNumber,
} from "../../lib/learning-book/audio/learning-book-audio-manifest.js";
import { defaultLearningBookFlatPageAudioPublicPath } from "../../lib/learning-book/audio/learning-book-flat-page-audio.js";
import {
  convertMathExpressionsForTts,
  cardinalHebrewForTts,
  prepareMathBookAudioTextForSection,
} from "../../lib/learning-book/audio/prepare-math-book-audio-text.js";
import {
  prepareHebrewBookAudioTextForSection,
  prepareHebrewBookSectionAudioText,
  normalizeHebrewHyphensForTts,
} from "../../lib/learning-book/audio/prepare-hebrew-book-audio-text.js";
import {
  prepareEnglishBookAudioTextForSection,
  buildEnglishMixedLanguageSsml,
  splitMixedLanguageRuns,
} from "../../lib/learning-book/audio/prepare-english-book-audio-text.js";
import { prepareBookSectionAudioText, prepareBookSectionAudioTextDetailed } from "../../lib/learning-book/audio/prepare-learning-book-audio-text.js";
import {
  applyLearningBookPronunciationCorrections,
  LEARNING_BOOK_PRONUNCIATION_ENTRIES,
} from "../../lib/learning-book/audio/learning-book-audio-pronunciation.js";
import {
  LEARNING_BOOK_AUDIO_TTS_RATE,
} from "../../lib/learning-book/audio/learning-book-audio-tts-config.js";
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

describe("resolveLearningBookAudio (flat-page Hebrew G1)", () => {
  test("resolves g1.letters sections with unique flat-page src", () => {
    const srcs = new Set();
    for (let sectionNumber = 1; sectionNumber <= HEBREW_G1_FLAT_PAGE_AUDIO.sectionsPerPage; sectionNumber += 1) {
      const r = resolveLearningBookAudio("hebrew", "g1", SAMPLE_PAGE, sectionNumber);
      assert.ok(r, `expected audio for section ${sectionNumber}`);
      assert.equal(
        r.key,
        learningBookAudioManifestKey("hebrew", "g1", SAMPLE_PAGE, sectionNumber)
      );
      assert.equal(r.pageNumber, resolveBookGlobalPageNumber("hebrew", "g1", SAMPLE_PAGE, sectionNumber));
      assert.equal(
        r.src,
        defaultLearningBookFlatPageAudioPublicPath(
          "hebrew",
          "g1",
          resolveBookGlobalPageNumber("hebrew", "g1", SAMPLE_PAGE, sectionNumber)
        )
      );
      assert.match(r.playbackSrc, /\?v=/);
      srcs.add(r.src);
    }
    assert.equal(srcs.size, HEBREW_G1_FLAT_PAGE_AUDIO.sectionsPerPage);
  });

  test("different topics return different flat-page src values", () => {
    const letters = resolveLearningBookAudio("hebrew", "g1", "g1.letters", 1);
    const rhyme = resolveLearningBookAudio("hebrew", "g1", "g1.rhyme", 1);
    assert.ok(letters?.src);
    assert.ok(rhyme?.src);
    assert.notEqual(letters.src, rhyme.src);
    assert.equal(letters.pageNumber, resolveBookGlobalPageNumber("hebrew", "g1", "g1.letters", 1));
  });

  test("returns null for unsupported grade or missing section", () => {
    assert.equal(resolveLearningBookAudio("hebrew", "g3", SAMPLE_PAGE, 1), null);
    assert.equal(resolveLearningBookAudio("math", "g1", SAMPLE_PAGE, 1), null);
    assert.equal(resolveLearningBookAudio("hebrew", "g1", SAMPLE_PAGE, 99), null);
    assert.equal(resolveLearningBookAudio("hebrew", "g1", "not.a.page", 1), null);
  });

  test("cache bust appends version query", () => {
    const busted = appendLearningBookAudioCacheBust("/audio/learning-books/hebrew-g1/hebrew_g1_page_001.mp3");
    assert.match(busted, /\?v=/);
  });
});

describe("normalizeHebrewHyphensForTts", () => {
  test("splits Hebrew hyphen and maqaf variants", () => {
    assert.equal(normalizeHebrewHyphensForTts("צעד-צעד"), "צעד צעד");
    assert.equal(normalizeHebrewHyphensForTts("פתוח-סגור"), "פתוח סגור");
    assert.equal(normalizeHebrewHyphensForTts("אלף-בית"), "אלף בית");
    assert.equal(normalizeHebrewHyphensForTts("אלף-בית"), "אלף בית");
    assert.equal(normalizeHebrewHyphensForTts("אלף–בית"), "אלף בית");
    assert.equal(normalizeHebrewHyphensForTts("אלף-בית"), "אלף בית");
  });
});

describe("prepareHebrewBookSectionAudioText", () => {
  test("spokenScript nikud stays out of visible markdown body", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const page = entry.loader.loadPage(SAMPLE_PAGE);
    const section = page.sections.find((s) => s.number === 1);
    const spoken = prepareHebrewBookAudioTextForSection(page, 1);
    assert.ok(spoken.includes("אָלֶף") || spoken.includes("בֵּית"));
    assert.doesNotMatch(section.body, /שִׁמְעוּ/);
  });

  test("g1.letters section 1 has no title or nav labels", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const page = entry.loader.loadPage(SAMPLE_PAGE);
    const script = prepareHebrewBookAudioTextForSection(page, 1);

    assert.ok(script && script.length > 20);
    assert.match(script, /היום נלמד בעברית את אוֹתִיּוֹת ה אָלֶף, בֵּית/);
    assert.doesNotMatch(script, new RegExp(`^${page.displayTitle}`));
    assert.doesNotMatch(script, /^מה לומדים\?/m);
    assert.doesNotMatch(script, /[❌✓]/u);
    assert.doesNotMatch(script, /^רמז\s*:/m);
  });

  test("each section script is unique and excludes other section content", () => {
    const entry = getLearningBookEntry("hebrew", "g1");
    const page = entry.loader.loadPage(SAMPLE_PAGE);
    const scripts = Array.from({ length: HEBREW_G1_FLAT_PAGE_AUDIO.sectionsPerPage }, (_, i) =>
      prepareHebrewBookAudioTextForSection(page, i + 1)
    );

    assert.equal(new Set(scripts).size, scripts.length);
    assert.ok(scripts.every((script) => script && script.length > 10), "every section has spoken script");

    const s1 = scripts[0];
    const s3 = scripts[2];
    assert.match(s1, /היום נלמד בעברית את אוֹתִיּוֹת ה אָלֶף, בֵּית/);
    assert.doesNotMatch(s1, /רואים אוֹת א - אומרים/);
    assert.match(s3, /רואים אוֹת א - אומרים/);
    assert.doesNotMatch(s3, /היום נלמד בעברית את אוֹתִיּוֹת ה אָלֶף, בֵּית/);

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
      for (let n = 1; n <= HEBREW_G1_FLAT_PAGE_AUDIO.sectionsPerPage; n += 1) {
        const script = prepareHebrewBookAudioTextForSection(page, n);
        if (script) assert.doesNotMatch(script, hyphenRe, `${pageId} section ${n}`);
      }
    }
  });
});

describe("learning book TTS generation config", () => {
  test("default slower narration rate is ~85–90% (-12%)", () => {
    assert.equal(LEARNING_BOOK_AUDIO_TTS_RATE, "-12%");
  });
});

describe("applyLearningBookPronunciationCorrections", () => {
  test("שימעו / שמעו -> שִׁמְעוּ", () => {
    for (const [input, id] of [
      ["שימעו היטב את המילה", "shimu"],
      ["שמעו שתי מילים", "shmu"],
    ]) {
      const { text, pronunciationReplacementsApplied } =
        applyLearningBookPronunciationCorrections(input);
      assert.match(text, /שִׁמְעוּ/);
      assert.ok(pronunciationReplacementsApplied.some((r) => r.id === id));
    }
  });

  test("dictionary has required pilot entries", () => {
    const ids = new Set(LEARNING_BOOK_PRONUNCIATION_ENTRIES.map((e) => e.id));
    for (const id of [
      "shimu",
      "shama",
      "sefer",
      "alef_bet_space",
      "ot",
      "otiyot",
      "shalom",
      "kita",
      "targil",
      "targilim",
      "mispar",
      "misparim",
      "chibur",
      "chisur",
      "shaveh",
      "veod",
      "pachot",
    ]) {
      assert.ok(ids.has(id), `missing pronunciation entry: ${id}`);
    }
  });
});

describe("convertMathExpressionsForTts", () => {
  test("converts addition, subtraction, equality, and numbers", () => {
    assert.equal(convertMathExpressionsForTts("2 + 3 = 5"), "שתיים ועוד שלוש שווה חמש");
    assert.equal(convertMathExpressionsForTts("7 - 4 = 3"), "שבע פחות ארבע שווה שלוש");
    assert.equal(convertMathExpressionsForTts("10"), "עשר");
    assert.equal(cardinalHebrewForTts(0), "אפס");
    assert.match(convertMathExpressionsForTts("12 < 18"), /קטן מ /);
    assert.match(convertMathExpressionsForTts("6 > 4"), /גדול מ /);
    assert.match(convertMathExpressionsForTts("6 + __ = 10"), /מקום ריק/);
  });

  test("number ranges are not read as subtraction", () => {
    assert.equal(convertMathExpressionsForTts("5-7"), "חמש עד שבע");
    assert.equal(convertMathExpressionsForTts("18–19"), "שמונה עשרה עד תשע עשרה");
  });

  test("Hebrew maqaf cleanup does not break subtraction equations", () => {
    const line = "צעד-צעד: 7 - 4 = 3";
    const converted = convertMathExpressionsForTts(line);
    const hyphenized = normalizeHebrewHyphensForTts(converted);
    assert.match(hyphenized, /שבע פחות ארבע שווה שלוש/);
    assert.match(hyphenized, /צעד צעד/);
  });
});

describe("resolveLearningBookAudio (Math G1)", () => {
  test("resolves add_two sections with unique src", () => {
    const s1 = resolveLearningBookAudio("math", "g1", "add_two", 1);
    const s2 = resolveLearningBookAudio("math", "g1", "add_two", 2);
    assert.ok(s1?.src?.endsWith("/section-01.mp3"));
    assert.ok(s2?.src?.endsWith("/section-02.mp3"));
    assert.notEqual(s1.src, s2.src);
  });

  test("missing math section returns null without fallback", () => {
    assert.equal(resolveLearningBookAudio("math", "g1", "add_two", 99), null);
    assert.equal(resolveLearningBookAudio("math", "g2", "add_two", 1), null);
  });
});

describe("prepareMathBookSectionAudioText (add_two)", () => {
  test("exercise section speaks Hebrew words not raw symbols", () => {
    const entry = getLearningBookEntry("math", "g1");
    const page = entry.loader.loadPage("add_two");
    const s5 = prepareMathBookAudioTextForSection(page, 5);
    assert.match(s5, /שבע (וְעוֹד|ועוד) ארבע (שָׁוֶה|שווה)/);
    assert.doesNotMatch(s5, /7\s*\+\s*4/);
    assert.doesNotMatch(s5, /^מה אנחנו לומדים\?/m);
  });

  test("sections are unique and isolated", () => {
    const entry = getLearningBookEntry("math", "g1");
    const page = entry.loader.loadPage("add_two");
    const scripts = Array.from({ length: 7 }, (_, i) => prepareMathBookAudioTextForSection(page, i + 1));
    assert.equal(new Set(scripts).size, scripts.length);
    assert.doesNotMatch(scripts[4], /לדוגמה: ארבע ועוד שלוש/);
    assert.match(scripts[1], /ארבע (וְעוֹד|ועוד) שלוש (שָׁוֶה|שווה) שבע/);
  });
});

describe("prepareEnglishBookSectionAudioText (letters_upper)", () => {
  test("builds mixed-language spoken script and SSML", () => {
    const entry = getLearningBookEntry("english", "g1");
    const page = entry.loader.loadPage("letters_upper");
    const script = prepareEnglishBookAudioTextForSection(page, 1);
    const detail = prepareBookSectionAudioTextDetailed("english", "g1", "letters_upper", page, 1);

    assert.ok(script && script.length > 20);
    assert.doesNotMatch(script, /^מה לומדים\?/m);
    assert.match(script, /A, B, C/);
    assert.ok(detail.ssml && detail.ssml.includes("en-US-JennyNeural"));
    assert.ok(detail.ssml.includes("he-IL-HilaNeural"));
  });

  test("mixed language runs split Hebrew and English", () => {
    const runs = splitMixedLanguageRuns("היום נלמד cat");
    assert.equal(runs.length, 2);
    assert.equal(runs[0].lang, "he");
    assert.equal(runs[1].lang, "en");
    assert.equal(runs[1].text, "cat");
  });

  test("CVC blend notation becomes SSML breaks", () => {
    const ssml = buildEnglishMixedLanguageSsml("c … a … t → cat");
    assert.match(ssml, /break time="350ms"/);
    assert.match(ssml, /en-US-JennyNeural/);
  });
});

describe("manifest coverage", () => {
  test("all Hebrew G1 pages have 7 section slots (flat-page audio)", () => {
    assert.equal(HEBREW_G1_FLAT_PAGE_AUDIO.pageIds.length, 32);
    assert.equal(HEBREW_G1_FLAT_PAGE_AUDIO.sectionsPerPage, 7);
    assert.equal(HEBREW_G1_FLAT_PAGE_AUDIO.expectedPages, 224);
    for (const pageId of HEBREW_G1_FLAT_PAGE_AUDIO.pageIds) {
      assert.ok(resolveLearningBookAudio("hebrew", "g1", pageId, 1));
      assert.ok(resolveLearningBookAudio("hebrew", "g1", pageId, 7));
      assert.equal(resolveLearningBookAudio("hebrew", "g1", pageId, 8), null);
    }
  });

  test("Hebrew G2 full book has flat-page audio slots", () => {
    assert.equal(HEBREW_G2_FLAT_PAGE_AUDIO.expectedPages, 161);
    for (const pageId of HEBREW_G2_FLAT_PAGE_AUDIO.pageIds) {
      assert.ok(resolveLearningBookAudio("hebrew", "g2", pageId, 1));
      assert.ok(resolveLearningBookAudio("hebrew", "g2", pageId, 7));
    }
  });

  test("all Math G1 pages have 7 section slots", () => {
    assert.equal(MATH_G1_SECTION_AUDIO.pageIds.length, 19);
    assert.equal(MATH_G1_SECTION_AUDIO.sectionsPerPage, 7);
    for (const pageId of MATH_G1_SECTION_AUDIO.pageIds) {
      assert.ok(resolveLearningBookAudio("math", "g1", pageId, 1));
      assert.ok(resolveLearningBookAudio("math", "g1", pageId, 7));
      assert.equal(resolveLearningBookAudio("math", "g1", pageId, 8), null);
      assert.doesNotMatch(
        resolveLearningBookAudio("math", "g1", pageId, 1).src,
        /page\.mp3/
      );
    }
  });

  test("English G1 all pages have flat-page audio", () => {
    assert.equal(ENGLISH_G1_FLAT_PAGE_AUDIO.expectedPages, 154);
    for (const pageId of ENGLISH_G1_FLAT_PAGE_AUDIO.pageIds) {
      assert.ok(resolveLearningBookAudio("english", "g1", pageId, 1));
      assert.ok(resolveLearningBookAudio("english", "g1", pageId, 7));
      assert.equal(resolveLearningBookAudio("english", "g1", pageId, 8), null);
    }
    assert.ok(resolveLearningBookAudio("english", "g1", "vocab_colors", 1));
  });

  test("English G2 all pages have flat-page audio", () => {
    assert.equal(ENGLISH_G2_FLAT_PAGE_AUDIO.expectedPages, 182);
    for (const pageId of ENGLISH_G2_FLAT_PAGE_AUDIO.pageIds) {
      assert.ok(resolveLearningBookAudio("english", "g2", pageId, 1));
      assert.ok(resolveLearningBookAudio("english", "g2", pageId, 7));
    }
    assert.ok(resolveLearningBookAudio("english", "g2", "vocab_colors", 1));
  });
});
