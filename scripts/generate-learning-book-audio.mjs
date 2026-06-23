/**
 * Offline learning book section audio generation (not part of npm run build).
 *
 * Usage:
 *   node scripts/generate-learning-book-audio.mjs --subject hebrew --grade g1
 *   node scripts/generate-learning-book-audio.mjs --subject math --grade g1
 *   node scripts/generate-learning-book-audio.mjs --subject english --grade g1
 *   node scripts/generate-learning-book-audio.mjs --subject english --grade g2
 *   node scripts/generate-learning-book-audio.mjs --subject math --grade g1 --pages add_two
 *   node scripts/generate-learning-book-audio.mjs --subject math --grade g1 --dry-run
 *
 * Pilots: Hebrew G1, Math G1, English G1/G2 phonics (section-level audio only).
 * Requires LEARNING_BOOK_AUDIO_ENABLED=true for write mode (or pass --force).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const HEBREW_HYPHEN_IN_SCRIPT =
  /[\u0590-\u05FF][\u002D\u2010\u2011\u2012\u2013\u2014\u05BE\uFE58\uFE63\uFF0D][\u0590-\u05FF]/;

function parseArgs(argv) {
  /** @type {Record<string, string|boolean>} */
  const out = { dryRun: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--force") out.force = true;
    else if (arg.startsWith("--subject=")) out.subject = arg.slice("--subject=".length);
    else if (arg === "--subject") out.subject = argv[++i];
    else if (arg.startsWith("--grade=")) out.grade = arg.slice("--grade=".length);
    else if (arg === "--grade") out.grade = argv[++i];
    else if (arg.startsWith("--pages=")) out.pages = arg.slice("--pages=".length);
    else if (arg === "--pages") out.pages = argv[++i];
    else if (arg.startsWith("--sections=")) out.sections = arg.slice("--sections=".length);
    else if (arg === "--sections") out.sections = argv[++i];
  }
  return out;
}

function fail(msg, code = 1) {
  console.error(`generate-learning-book-audio: ${msg}`);
  process.exit(code);
}

function buildReportRowExtras(prepDetail) {
  return {
    pronunciationReplacementsApplied: prepDetail.pronunciationReplacementsApplied || [],
    mathExpressionConversionsApplied: prepDetail.mathExpressionConversionsApplied || [],
    ttsRate: ttsConfigMod.LEARNING_BOOK_AUDIO_TTS_RATE,
  };
}

function buildPrepFlags(page, section, spokenScript) {
  const rawBody = String(section?.body || "");
  return {
    titleStripped: !spokenScript.trim().startsWith(page.displayTitle),
    sectionNavTitleStripped: !spokenScript.includes(section.title),
    hyphensNormalized: !HEBREW_HYPHEN_IN_SCRIPT.test(spokenScript),
    hintsRemoved: !/\(רמז\s*:/u.test(spokenScript) && !/^רמז\s*:/m.test(spokenScript),
    scaffoldingUnwrapped:
      !/^שאלה\s*:/m.test(spokenScript) && !/^שלב\s+\d+\s*:/m.test(spokenScript),
    visualMarkersRemoved: !/[❌✓✔✗]/u.test(spokenScript),
    metadataExcluded: !/learning_page_id|skill_id|\.md\b/i.test(spokenScript),
    onlySectionBody: rawBody.length > 0,
  };
}

const args = parseArgs(process.argv.slice(2));
const subject = String(args.subject || "").trim().toLowerCase();
const grade = String(args.grade || "").trim().toLowerCase();

if (!subject || !grade) {
  fail(
    "Usage: node scripts/generate-learning-book-audio.mjs --subject hebrew|math|english --grade g1|g2 [--pages pageA,pageB] [--dry-run]"
  );
}

const enabled =
  args.force === true || process.env.LEARNING_BOOK_AUDIO_ENABLED === "true";
if (!enabled && !args.dryRun) {
  fail(
    "LEARNING_BOOK_AUDIO_ENABLED is not true. Set it in .env.local or pass --force for offline generation.",
    0
  );
}

const provider = String(process.env.LEARNING_BOOK_AUDIO_TTS_PROVIDER || "edge").toLowerCase();
if (!args.dryRun && provider === "none") {
  fail(
    "LEARNING_BOOK_AUDIO_TTS_PROVIDER=none — no TTS provider configured. Set LEARNING_BOOK_AUDIO_TTS_PROVIDER=edge or use --dry-run.",
    0
  );
}

const manifestMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "learning-book-audio-manifest.js"))
);
const textMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "prepare-learning-book-audio-text.js"))
);
const ttsConfigMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "audio", "learning-book-audio-tts-config.js"))
);
const synthesizeMod = await import(
  pathToFileURL(
    path.join(root, "lib", "learning-book", "audio", "synthesize-learning-book-section-audio.js")
  )
);
const catalogMod = await import(
  pathToFileURL(path.join(root, "lib", "learning-book", "learning-book-catalog.js"))
);

const scope = manifestMod.getBookSectionAudioScope(subject, grade);
if (!scope) {
  fail(
    `Unsupported book audio scope: ${subject}/${grade} (approved: hebrew/g1, math/g1, english/g1, english/g2).`
  );
}

const ttsOptions = ttsConfigMod.getLearningBookAudioTtsOptions(subject, grade);

const pageIds = args.pages
  ? String(args.pages)
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
  : [...scope.pageIds];

for (const pageId of pageIds) {
  if (!scope.pageIds.includes(pageId)) {
    fail(`Unknown ${subject}/${grade} pageId: ${pageId}`);
  }
}

// Optional: limit which section numbers to regenerate (e.g. --sections=5,6)
const sectionFilter = args.sections
  ? new Set(
      String(args.sections)
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1)
    )
  : null;

if (sectionFilter) {
  console.log(`generate-learning-book-audio: section filter active — only sections: ${[...sectionFilter].join(", ")}`);
}

const entry = catalogMod.getLearningBookEntry(subject, grade);
if (!entry) fail(`Unknown learning book: ${subject}/${grade}`);

const reportDir = path.join(root, "reports", "learning-book-audio");
fs.mkdirSync(reportDir, { recursive: true });

/** @type {object[]} */
const allRows = [];
let generated = 0;
let skipped = 0;
let failed = 0;

for (let pi = 0; pi < pageIds.length; pi += 1) {
  const pageId = pageIds[pi];
  const page = entry.loader.loadPage(pageId);
  if (!page) fail(`Missing page markdown: ${pageId}`);

  console.log(
    `generate-learning-book-audio: [${pi + 1}/${pageIds.length}] ${pageId} (${page.sections.length} sections)`
  );

  for (let sectionNumber = 1; sectionNumber <= scope.sectionsPerPage; sectionNumber += 1) {
    if (sectionFilter && !sectionFilter.has(sectionNumber)) {
      skipped += 1;
      continue;
    }
    const section = page.sections.find((s) => s.number === sectionNumber);
    const sectionIndex = sectionNumber - 1;
    const visiblePage = `${sectionNumber}/${scope.sectionsPerPage}`;
    const resolvedSrc = manifestMod.defaultLearningBookSectionAudioPublicPath(
      subject,
      grade,
      pageId,
      sectionNumber
    );

    if (!section) {
      failed += 1;
      allRows.push({
        subject,
        grade,
        pageId,
        sectionNumber,
        sectionIndex,
        sectionId: `${pageId}:section:${String(sectionNumber).padStart(2, "0")}`,
        visiblePage,
        sectionTitle: null,
        status: "failed",
        error: "missing_section",
        audioSrc: resolvedSrc,
        outputPath: null,
        spokenScript: null,
        bytes: null,
        durationSec: null,
        prepFlags: null,
        pronunciationReplacementsApplied: [],
        mathExpressionConversionsApplied: [],
        ttsRate: ttsConfigMod.LEARNING_BOOK_AUDIO_TTS_RATE,
      });
      continue;
    }

    const prepDetail = textMod.prepareBookSectionAudioTextDetailed(
      subject,
      grade,
      pageId,
      page,
      sectionNumber
    );
    const spokenScript = prepDetail.spokenScript || null;

    const relOut = path.join(
      "public",
      "audio",
      "learning-books",
      subject,
      grade,
      pageId,
      `section-${String(sectionNumber).padStart(2, "0")}.mp3`
    );
    const absOut = path.join(root, relOut);
    const prepFlags = spokenScript ? buildPrepFlags(page, section, spokenScript) : null;

    if (!spokenScript) {
      failed += 1;
      allRows.push({
        subject,
        grade,
        pageId,
        sectionNumber,
        sectionIndex,
        sectionId: `${pageId}:section:${String(sectionNumber).padStart(2, "0")}`,
        visiblePage,
        sectionTitle: section.title,
        status: "failed",
        error: "empty_spoken_script",
        audioSrc: resolvedSrc,
        outputPath: null,
        spokenScript: null,
        bytes: null,
        durationSec: null,
        prepFlags,
        ...buildReportRowExtras(prepDetail),
      });
      continue;
    }

    if (args.dryRun) {
      generated += 1;
      allRows.push({
        subject,
        grade,
        pageId,
        sectionNumber,
        sectionIndex,
        sectionId: `${pageId}:section:${String(sectionNumber).padStart(2, "0")}`,
        visiblePage,
        sectionTitle: section.title,
        status: "dry_run",
        audioSrc: resolvedSrc,
        outputPath: relOut.replace(/\\/g, "/"),
        spokenScript,
        bytes: null,
        durationSec: null,
        prepFlags,
        ...buildReportRowExtras(prepDetail),
        generatedAt: new Date().toISOString(),
      });
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(absOut), { recursive: true });
      await synthesizeMod.synthesizeLearningBookSectionAudio(prepDetail, absOut, ttsOptions);
      const st = fs.statSync(absOut);
      generated += 1;
      allRows.push({
        subject,
        grade,
        pageId,
        sectionNumber,
        sectionIndex,
        sectionId: `${pageId}:section:${String(sectionNumber).padStart(2, "0")}`,
        visiblePage,
        sectionTitle: section.title,
        status: "generated",
        audioSrc: resolvedSrc,
        outputPath: relOut.replace(/\\/g, "/"),
        spokenScript,
        ssmlUsed: Boolean(prepDetail.ssml),
        bytes: st.size,
        durationSec: null,
        prepFlags,
        ...buildReportRowExtras(prepDetail),
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      failed += 1;
      allRows.push({
        subject,
        grade,
        pageId,
        sectionNumber,
        sectionIndex,
        sectionId: `${pageId}:section:${String(sectionNumber).padStart(2, "0")}`,
        visiblePage,
        sectionTitle: section.title,
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
        audioSrc: resolvedSrc,
        outputPath: relOut.replace(/\\/g, "/"),
        spokenScript,
        bytes: null,
        durationSec: null,
        prepFlags,
        ...buildReportRowExtras(prepDetail),
        generatedAt: new Date().toISOString(),
      });
    }
  }

  const legacyPageMp3 = path.join(
    root,
    "public",
    "audio",
    "learning-books",
    subject,
    grade,
    pageId,
    "page.mp3"
  );
  if (!args.dryRun && fs.existsSync(legacyPageMp3)) {
    try {
      fs.unlinkSync(legacyPageMp3);
    } catch {
      /* ignore */
    }
  }

  const perPageReport = {
    generatedAt: new Date().toISOString(),
    subject,
    grade,
    pageId,
    cacheVersion: scope.cacheVersion,
    provider: args.dryRun ? "dry-run" : provider,
    ttsRate: ttsConfigMod.LEARNING_BOOK_AUDIO_TTS_RATE,
    dryRun: Boolean(args.dryRun),
    sections: allRows.filter((r) => r.pageId === pageId),
  };
  fs.writeFileSync(
    path.join(reportDir, `${subject}-${grade}-${pageId}-section-audio-report.json`),
    `${JSON.stringify(perPageReport, null, 2)}\n`,
    "utf8"
  );
}

const bytesList = allRows.filter((r) => r.bytes).map((r) => r.bytes);
const storage = {
  topicCount: pageIds.length,
  sectionCount: allRows.length,
  mp3Count: bytesList.length,
  totalBytes: bytesList.reduce((sum, n) => sum + n, 0),
  largestBytes: bytesList.length ? Math.max(...bytesList) : 0,
  smallestBytes: bytesList.length ? Math.min(...bytesList) : 0,
};

const masterReport = {
  generatedAt: new Date().toISOString(),
  subject,
  grade,
  cacheVersion: scope.cacheVersion,
  provider: args.dryRun ? "dry-run" : provider,
  ttsRate: ttsConfigMod.LEARNING_BOOK_AUDIO_TTS_RATE,
  dryRun: Boolean(args.dryRun),
  architecture: "section-level",
  rejected: "pageId-level page.mp3",
  pageIds,
  summary: {
    generated,
    skipped,
    failed,
    storage,
  },
  rows: allRows,
};

const masterPath = path.join(reportDir, `${subject}-${grade}-full-section-audio-report.json`);
fs.writeFileSync(masterPath, `${JSON.stringify(masterReport, null, 2)}\n`, "utf8");

console.log(
  `generate-learning-book-audio: ${generated} ok, ${skipped} skipped, ${failed} failed — ${storage.mp3Count} MP3s, ${storage.totalBytes} bytes`
);
console.log(`generate-learning-book-audio: master report: ${path.relative(root, masterPath)}`);

if (failed > 0 && !args.dryRun) process.exit(1);
if (failed > 0 && args.dryRun) process.exit(1);
