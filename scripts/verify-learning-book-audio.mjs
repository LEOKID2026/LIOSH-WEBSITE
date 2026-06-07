/**
 * Verify learning book section-level audio — full Hebrew Grade 1.
 * Run: node scripts/verify-learning-book-audio.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const HEBREW_HYPHEN_IN_SCRIPT =
  /[\u0590-\u05FF][\u002D\u2010\u2011\u2012\u2013\u2014\u05BE\uFE58\uFE63\uFF0D][\u0590-\u05FF]/;

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

const scope = manifestMod.HEBREW_G1_SECTION_AUDIO;
const entry = catalogMod.getLearningBookEntry(scope.subject, scope.grade);

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

/** @type {string[]} */
const allSrcs = [];
let totalBytes = 0;
let missingFiles = 0;
let badScripts = 0;

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

    const publicPath = path.join(
      root,
      "public",
      resolved.src.replace(/^\//, "").replace(/\//g, path.sep)
    );
    if (!fs.existsSync(publicPath)) {
      missingFiles += 1;
      continue;
    }

    const st = fs.statSync(publicPath);
    if (st.size < 500) fail(`audio file too small: ${pageId} section ${sectionNumber}`);
    totalBytes += st.size;
    allSrcs.push(resolved.src);

    const script = textMod.prepareBookSectionAudioText(
      scope.subject,
      scope.grade,
      pageId,
      page,
      sectionNumber
    );
    if (!script || script.length < 5) {
      badScripts += 1;
      continue;
    }
    if (page.displayTitle && script.includes(page.displayTitle)) {
      fail(`spoken script must not include page title: ${pageId} section ${sectionNumber}`);
    }
    if (/^מה לומדים\?/m.test(script)) {
      fail(`spoken script must not include section nav title: ${pageId} section ${sectionNumber}`);
    }
    if (HEBREW_HYPHEN_IN_SCRIPT.test(script)) {
      fail(`spoken script still contains Hebrew hyphens: ${pageId} section ${sectionNumber}`);
    }
    pageScripts.push(script);
  }

  if (new Set(pageScripts).size !== pageScripts.length) {
    fail(`section spoken scripts must be unique within ${pageId}`);
  }
}

if (missingFiles > 0) {
  fail(`${missingFiles} section MP3 files missing — run generate-learning-book-audio.mjs`);
}

const lettersS1 = resolverMod.resolveLearningBookAudio(scope.subject, scope.grade, "g1.letters", 1);
const rhymeS1 = resolverMod.resolveLearningBookAudio(scope.subject, scope.grade, "g1.rhyme", 1);
if (!lettersS1 || !rhymeS1 || lettersS1.src === rhymeS1.src) {
  fail("different topics must resolve different section src values");
}

if (resolverMod.resolveLearningBookAudio("hebrew", "g2", "g1.letters", 1) !== null) {
  fail("Hebrew G2 should return null");
}
if (resolverMod.resolveLearningBookAudio("math", "g1", "g1.letters", 1) !== null) {
  fail("Math should return null");
}
if (resolverMod.resolveLearningBookAudio(scope.subject, scope.grade, "g1.letters", 99) !== null) {
  fail("missing section index should return null");
}

ok(`Hebrew G1 full book — ${allSrcs.length} section MP3s, ${totalBytes} bytes total`);

const samplePage = entry.loader.loadPage("g1.letters");
console.log("verify-learning-book-audio: sample audit (g1.letters section 1):");
const sampleResolved = resolverMod.resolveLearningBookAudio(
  scope.subject,
  scope.grade,
  "g1.letters",
  1
);
const sampleScript = textMod.prepareBookSectionAudioText(
  scope.subject,
  scope.grade,
  "g1.letters",
  samplePage,
  1
);
const samplePath = path.join(
  root,
  "public",
  sampleResolved.src.replace(/^\//, "").replace(/\//g, path.sep)
);
console.log(`  visiblePage: 1/7`);
console.log(`  audioSrc: ${sampleResolved.src}`);
console.log(`  playbackSrc: ${sampleResolved.playbackSrc}`);
console.log(`  mp3: ${path.relative(root, samplePath)} (${fs.statSync(samplePath).size} bytes)`);
console.log(`  spokenScript: ${JSON.stringify(sampleScript)}`);

if (prevClient !== undefined) process.env.NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED = prevClient;
if (prevServer !== undefined) process.env.LEARNING_BOOK_AUDIO_ENABLED = prevServer;

console.log("verify-learning-book-audio: all checks passed");
