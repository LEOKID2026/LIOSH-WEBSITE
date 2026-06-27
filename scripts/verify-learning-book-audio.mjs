/**
 * Verify learning book section-level audio — Hebrew G1 + Math G1 pilots.
 * Run: node scripts/verify-learning-book-audio.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const HEBREW_HYPHEN_IN_SCRIPT =
  /[\u0590-\u05FF][\u002D\u2010\u2011\u2012\u2013\u2014\u05BE\uFE58\uFE63\uFF0D][\u0590-\u05FF]/;

const RAW_EQUATION_IN_SCRIPT = /\d+\s*[+−\-]\s*\d+\s*=\s*\d+/;

function fail(msg) {
  console.error(`verify-learning-book-audio: FAIL — ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`verify-learning-book-audio: OK — ${msg}`);
}

const flagsMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "learning-book-audio-feature-flags.js"))
);
const resolverMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "resolve-learning-book-audio.js"))
);
const manifestMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "learning-book-audio-manifest.js"))
);
const textMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "prepare-learning-book-audio-text.js"))
);
const catalogMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "learning-book-catalog.js"))
);

const prevClient = process.env.NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED;
const prevServer = process.env.LEARNING_BOOK_AUDIO_ENABLED;
delete process.env.NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED;
delete process.env.LEARNING_BOOK_AUDIO_ENABLED;

if (flagsMod.isLearningBookAudioEnabledClient()) fail("client flag should default OFF");
ok("feature flags default OFF");

const playerSrc = fs.readFileSync(
  path.join(root, "components", "learning-book", "LearningBookAudioPlayer.jsx"),
  "utf8"
);
if (!playerSrc.includes("sectionNumber")) fail("player must accept sectionNumber");
if (!playerSrc.includes("playbackSrc")) fail("player must use playbackSrc with cache bust");
if (!playerSrc.includes("stopAndResetAudio")) fail("player must stop/reset on section change");
if (playerSrc.includes("speechSynthesis")) fail("player must not use runtime TTS");
if (!/NODE_ENV\s*!==\s*["']development["']/.test(playerSrc)) {
  fail("player debug logs must be dev-only");
}

/**
 * @param {import("../../lib/learning-book/audio/learning-book-audio-manifest.js").BookAudioScope} scope
 */
function scopeHasAnyAudioMp3(scope) {
  if (scope.mode === "flat-page") {
    const slug = `${scope.subject}-${scope.grade}`;
    const dir = path.join(root, "public", "audio", "learning-books", slug);
    if (!fs.existsSync(dir)) return false;
    return fs.readdirSync(dir).some((f) => f.endsWith(".mp3"));
  }

  for (const pageId of scope.pageIds) {
    for (let sectionNumber = 1; sectionNumber <= scope.sectionsPerPage; sectionNumber += 1) {
      const src = manifestMod.defaultLearningBookSectionAudioPublicPath(
        scope.subject,
        scope.grade,
        pageId,
        sectionNumber
      );
      const publicPath = path.join(root, "public", src.replace(/^\//, "").replace(/\//g, path.sep));
      if (fs.existsSync(publicPath)) return true;
    }
  }
  return false;
}

/**
 * @param {import("../../lib/learning-book/audio/learning-book-audio-manifest.js").BookAudioScope} scope
 */
function verifyFlatPageScope(scope) {
  const slug = `${scope.subject}-${scope.grade}`;
  const dir = path.join(root, "public", "audio", "learning-books", slug);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3")).sort();
  const expected = scope.installedPages ?? scope.expectedPages ?? files.length;

  if (files.length !== expected) {
    fail(`${slug}: expected ${expected} MP3s, got ${files.length}`);
  }

  for (let pageNumber = 1; pageNumber <= expected; pageNumber += 1) {
    const name = `${scope.subject}_${scope.grade}_page_${String(pageNumber).padStart(3, "0")}.mp3`;
    if (!files.includes(name)) {
      fail(`${slug}: missing ${name}`);
    }
    const st = fs.statSync(path.join(dir, name));
    if (st.size < 500) fail(`audio file too small: ${name}`);
  }

  const entry = catalogMod.getLearningBookEntry(scope.subject, scope.grade);
  if (!entry) fail(`missing catalog entry: ${scope.subject}/${scope.grade}`);

  const firstPageId = scope.pageIds[0];
  const midPageId = scope.pageIds[Math.floor(scope.pageIds.length / 2)];
  const lastPageId = scope.pageIds[scope.pageIds.length - 1];

  const sampleSections = [
    [firstPageId, 1],
    [midPageId, 4],
    [lastPageId, 7],
  ];

  for (const [pageId, sectionNumber] of sampleSections) {
    const resolved = resolverMod.resolveLearningBookAudio(
      scope.subject,
      scope.grade,
      pageId,
      sectionNumber
    );
    const globalPage = manifestMod.resolveBookGlobalPageNumber(
      scope.subject,
      scope.grade,
      pageId,
      sectionNumber
    );
    const limit = scope.installedPages ?? scope.expectedPages;

    if (limit != null && globalPage != null && globalPage > limit) {
      if (resolved !== null) {
        fail(`${pageId} section ${sectionNumber} (page ${globalPage}) must not resolve — no MP3 installed`);
      }
      continue;
    }

    if (!resolved?.src || !resolved?.playbackSrc || !resolved.pageNumber) {
      fail(`${pageId} section ${sectionNumber} should resolve flat-page audio`);
    }
    if (!/_page_\d{3}\.mp3$/.test(resolved.src)) {
      fail(`${pageId} section ${sectionNumber} must use flat page MP3 path`);
    }
    const publicPath = path.join(
      root,
      "public",
      resolved.src.replace(/^\//, "").replace(/\//g, path.sep)
    );
    if (!fs.existsSync(publicPath)) {
      fail(`missing flat-page audio: ${resolved.src}`);
    }
  }

  ok(`${scope.subject}/${scope.grade} — ${files.length} flat-page MP3s (${slug})`);
}

/**
 * @param {import("../../lib/learning-book/audio/learning-book-audio-manifest.js").BookAudioScope} scope
 */
function verifySectionScope(scope) {
  const entry = catalogMod.getLearningBookEntry(scope.subject, scope.grade);
  if (!entry) fail(`missing catalog entry: ${scope.subject}/${scope.grade}`);

  let scopeBytes = 0;
  let scopeMp3 = 0;

  for (const pageId of scope.pageIds) {
    const page = entry.loader.loadPage(pageId);
    if (!page) fail(`missing page: ${pageId}`);

    const pageScripts = [];

    for (let sectionNumber = 1; sectionNumber <= scope.sectionsPerPage; sectionNumber += 1) {
      const resolved = resolverMod.resolveLearningBookAudio(
        scope.subject,
        scope.grade,
        pageId,
        sectionNumber
      );
      if (!resolved?.src || !resolved?.playbackSrc) {
        fail(`${pageId} section ${sectionNumber} should resolve`);
      }
      if (resolved.src.includes("page.mp3")) {
        fail(`${pageId} section ${sectionNumber} must not use page.mp3`);
      }
      if (!/\/section-0[1-7]\.mp3$/.test(resolved.src)) {
        fail(`${pageId} section ${sectionNumber} must use section-NN.mp3`);
      }

      const publicPath = path.join(
        root,
        "public",
        resolved.src.replace(/^\//, "").replace(/\//g, path.sep)
      );
      if (!fs.existsSync(publicPath)) {
        fail(`missing section audio: ${resolved.src}`);
      }

      const st = fs.statSync(publicPath);
      if (st.size < 500) fail(`audio file too small: ${pageId} section ${sectionNumber}`);
      scopeBytes += st.size;
      scopeMp3 += 1;

      const script = textMod.prepareBookSectionAudioText(
        scope.subject,
        scope.grade,
        pageId,
        page,
        sectionNumber
      );
      if (!script || script.length < 5) {
        fail(`spoken script too short: ${pageId} section ${sectionNumber}`);
      }
      if (/^מה לומדים\?|^מה אנחנו לומדים\?/m.test(script)) {
        fail(`spoken script must not include section nav title: ${pageId} section ${sectionNumber}`);
      }
      if (HEBREW_HYPHEN_IN_SCRIPT.test(script)) {
        fail(`spoken script still contains Hebrew hyphens: ${pageId} section ${sectionNumber}`);
      }
      if (scope.subject === "math" && RAW_EQUATION_IN_SCRIPT.test(script)) {
        fail(`math spoken script still contains raw equation digits: ${pageId} section ${sectionNumber}`);
      }
      pageScripts.push(script);
    }

    if (new Set(pageScripts).size !== pageScripts.length) {
      fail(`section spoken scripts must be unique within ${pageId}`);
    }
  }

  ok(`${scope.subject}/${scope.grade} — ${scopeMp3} section MP3s, ${scopeBytes} bytes`);
}

for (const scope of manifestMod.BOOK_AUDIO_SCOPES) {
  if (!scopeHasAnyAudioMp3(scope)) {
    ok(`${scope.subject}/${scope.grade} — skipped (no MP3s on disk yet)`);
    continue;
  }
  if (scope.mode === "flat-page") {
    verifyFlatPageScope(scope);
  } else {
    verifySectionScope(scope);
  }
}

const lettersS1 = resolverMod.resolveLearningBookAudio("hebrew", "g1", "g1.letters", 1);
const lettersS2 = resolverMod.resolveLearningBookAudio("hebrew", "g1", "g1.letters", 2);
if (!lettersS1 || !lettersS2 || lettersS1.src === lettersS2.src) {
  fail("same pageId different sectionNumber must return different src");
}

const addS1 = resolverMod.resolveLearningBookAudio("math", "g1", "add_two", 1);
const addS2 = resolverMod.resolveLearningBookAudio("math", "g1", "add_two", 2);
if (!addS1 || !addS2 || addS1.src === addS2.src) {
  fail("math same pageId different sections must return different src");
}

if (resolverMod.resolveLearningBookAudio("math", "g1", "add_two", 99) !== null) {
  fail("missing section must return null, not fallback");
}
if (resolverMod.resolveLearningBookAudio("math", "g2", "ns_place_tens_units", 7) !== null) {
  fail("Math G2 page 007 must return null (pilot ends at page 006)");
}
const mathG2S1 = resolverMod.resolveLearningBookAudio("math", "g2", "ns_place_tens_units", 1);
if (!mathG2S1?.src?.includes("/audio/learning-books/math-g2/math_g2_page_001.mp3")) {
  fail("Math G2 page 001 must resolve flat-page audio");
}
if (resolverMod.resolveLearningBookAudio("geometry", "g1", "shapes_basic_square", 1) === null) {
  fail("Geometry G1 page 001 must resolve flat-page audio");
}
const geoG1S1 = resolverMod.resolveLearningBookAudio("geometry", "g1", "shapes_basic_square", 1);
if (!geoG1S1?.src?.includes("/audio/learning-books/geometry-g1/geometry_g1_page_001.mp3")) {
  fail("Geometry G1 page 001 src path mismatch");
}
if (resolverMod.resolveLearningBookAudio("geometry", "g2", "solids", 7) === null) {
  fail("Geometry G2 page 007 must resolve flat-page audio");
}
const geoG2S1 = resolverMod.resolveLearningBookAudio("geometry", "g2", "solids", 1);
if (!geoG2S1?.src?.includes("/audio/learning-books/geometry-g2/geometry_g2_page_001.mp3")) {
  fail("Geometry G2 page 001 must resolve flat-page audio");
}
const scienceG1S1 = resolverMod.resolveLearningBookAudio("science", "g1", "body", 1);
if (!scienceG1S1?.src?.includes("/audio/learning-books/science-g1/science_g1_page_001.mp3")) {
  fail("Science G1 page 001 must resolve flat-page audio");
}
const scienceG2S1 = resolverMod.resolveLearningBookAudio("science", "g2", "body", 1);
if (!scienceG2S1?.src?.includes("/audio/learning-books/science-g2/science_g2_page_001.mp3")) {
  fail("Science G2 page 001 must resolve flat-page audio");
}
if (resolverMod.resolveLearningBookAudio("english", "g1", "vocab_colors", 1) === null) {
  fail("English G1 vocab pages must resolve flat-page audio");
}
if (resolverMod.resolveLearningBookAudio("english", "g2", "vocab_colors", 1) === null) {
  fail("English G2 vocab pages must resolve flat-page audio");
}
if (resolverMod.resolveLearningBookAudio("hebrew", "g2", "g2.fluent_words", 1) === null) {
  fail("Hebrew G2 must resolve flat-page audio");
}

const englishG1Letters = resolverMod.resolveLearningBookAudio("english", "g1", "letters_upper", 1);
const englishG2Review = resolverMod.resolveLearningBookAudio("english", "g2", "letters_review", 1);
if (!englishG1Letters?.src || !englishG2Review?.src) {
  fail("English G1/G2 pages must resolve flat-page audio");
}
if (!englishG1Letters.src.includes("/audio/learning-books/english-g1/english_g1_page_001.mp3")) {
  fail("English G1 flat-page src path mismatch");
}
if (!resolverMod.resolveLearningBookAudio("hebrew", "g1", "g1.phoneme_awareness", 1).src.includes(
  "/audio/learning-books/hebrew-g1/hebrew_g1_page_001.mp3"
)) {
  fail("Hebrew G1 page 001 src path mismatch");
}

const mathPage = catalogMod.getLearningBookEntry("math", "g1").loader.loadPage("add_two");
const mathS5 = textMod.prepareBookSectionAudioText("math", "g1", "add_two", mathPage, 5);
if (!/שבע (וְעוֹד|ועוד) ארבע (שָׁוֶה|שווה)/.test(mathS5)) {
  fail("math exercise section should speak addition in Hebrew words");
}

for (const reportName of [
  "hebrew-g1-full-section-audio-report.json",
  "math-g1-full-section-audio-report.json",
  "english-g1-full-section-audio-report.json",
  "english-g2-full-section-audio-report.json",
]) {
  const reportPath = path.join(root, "reports", "learning-book-audio", reportName);
  if (!fs.existsSync(reportPath)) continue;
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (!report.ttsRate) fail(`${reportName} must record ttsRate`);
  const generatedRow = (report.rows || []).find((r) => r.status === "generated");
  if (generatedRow && !generatedRow.ttsRate) {
    fail(`${reportName} rows must include ttsRate`);
  }
}

console.log("verify-learning-book-audio: sample math exercise (add_two section 5):");
console.log(`  spokenScript: ${JSON.stringify(mathS5)}`);

if (prevClient !== undefined) process.env.NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED = prevClient;
if (prevServer !== undefined) process.env.LEARNING_BOOK_AUDIO_ENABLED = prevServer;

console.log("verify-learning-book-audio: all checks passed");
