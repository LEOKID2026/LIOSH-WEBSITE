/**
 * Global cross-subject curriculum alignment summary for learning site.
 * Writes reports/curriculum-audit/global-final-curriculum-alignment.{json,md}
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports", "curriculum-audit");
const CURRICULUM_PAGE = join(ROOT, "pages", "learning", "curriculum.js");

const SUBJECTS = [
  {
    id: "math",
    titleHe: "מתמטיקה",
    inventorySubjects: ["math"],
    closureFile: "math-final-closure.json",
    sourceSupport:
      "Official spine / grade PDFs in registry + internal generator branches; owner signoff optional.",
    mixedModeNotes:
      "`utils/math-question-generator.js`: mixed picks only from `gradeCfg.operations` (minus mixed), respects `mixedOps` toggles and grade gates (e.g. g2 divisibility filtered).",
  },
  {
    id: "geometry",
    titleHe: "גאומטריה",
    inventorySubjects: ["geometry"],
    closureFile: "geometry-final-closure.json",
    sourceSupport:
      "POP / PDF spine via geometry audit pipeline; internal topic map under geometry strands.",
    mixedModeNotes:
      "`utils/geometry-question-generator.js` + masters: mixed selects only allowed grade topics; geometry-master validates topic ∈ allowedTopics.",
  },
  {
    id: "hebrew",
    titleHe: "עברית",
    inventorySubjects: ["hebrew"],
    closureFile: "hebrew-final-closure.json",
    sourceSupport:
      "Hebrew POP + catalog mapping; rich bank metadata phases per closure reports.",
    mixedModeNotes:
      "`utils/hebrew-question-generator.js`: mixed draws from grade topics excluding mixed; optional `mixedTopics` filter.",
  },
  {
    id: "english",
    titleHe: "אנגלית",
    inventorySubjects: ["english"],
    closureFile: "english-final-closure.json",
    sourceSupport:
      "English curriculum2020 PDF anchor + POP; pool routing per english-master.",
    mixedModeNotes:
      "`pages/learning/english-master.js` / generator: mixed respects selected topic toggles and grade topics.",
  },
  {
    id: "science",
    titleHe: "מדעים",
    inventorySubjects: ["science"],
    closureFile: "science-final-closure.json",
    sourceSupport:
      "Science POP + direct bank; spine alignment via science closure artifacts.",
    mixedModeNotes:
      "Science pools keyed by grade/topic; mixed modes follow master topic policies per grade config.",
  },
  {
    id: "moledet-geography",
    titleHe: "מולדת וגאוגרפיה",
    inventorySubjects: ["moledet-geography", "geography"],
    closureFile: "moledet-geography-final-closure.json",
    sourceSupport:
      "Owner PDF folder + POP + internal moledet.bank.* mapping (closure reports).",
    mixedModeNotes:
      "`utils/moledet-geography-question-generator.js`: mixed selects only `gradeCfg.topics` minus mixed; honors `mixedTopics` toggles.",
  },
];

function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function normalizeDifficulty(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("easy") || s === "basic") return "easy";
  if (s.includes("hard") || s === "advanced") return "hard";
  if (s.includes("medium") || s === "standard" || s === "intermediate") return "medium";
  return "unknown";
}

function summarizeInventory(records) {
  /** @type {Map<string, { count: number, missingCritical: number }>} */
  const bySubject = new Map();
  /** @type {Map<string, number>} */
  const thinCells = new Map();

  for (const sub of SUBJECTS) {
    bySubject.set(sub.id, { count: 0, missingCritical: 0 });
  }

  for (const r of records) {
    const sid = SUBJECTS.find((s) => s.inventorySubjects.includes(r.subject))?.id;
    if (!sid) continue;
    const agg = bySubject.get(sid);
    agg.count++;
    if (r.metadataCompleteness?.missingCritical) agg.missingCritical++;

    const gmin = r.gradeMin ?? r.grade;
    const gmax = r.gradeMax ?? r.grade;
    const topic = String(r.topic || "unknown").split("|")[0].trim() || "unknown";
    const diff = normalizeDifficulty(r.difficulty);
    if (!Number.isFinite(gmin) || !Number.isFinite(gmax)) continue;
    for (let g = gmin; g <= gmax; g++) {
      const k = `${sid}|g${g}|${topic}|${diff}`;
      thinCells.set(k, (thinCells.get(k) || 0) + 1);
    }
  }

  const thinBuckets = [...thinCells.entries()]
    .filter(([, c]) => c < 3)
    .map(([k, c]) => ({ key: k, rowCount: c }));

  return { bySubject: Object.fromEntries(bySubject), thinBuckets };
}

function scanCurriculumPage(source) {
  const supportedMatch = source.match(/supportedSubjects\s*=\s*\[([\s\S]*?)\]/);
  const supportedInner = supportedMatch?.[1] ?? "";
  const geometrySubjectParamSupported = /["']geometry["']/.test(supportedInner);
  /** Legacy science blurb claimed full programme alignment — must stay softened (no “התאמה מלאה” for מדע). */
  const suspiciousScienceFullAlignmentPhrasing = /התאמה\s*מלאה\s*לתוכנית\s*["']מדע/.test(source);
  const blocks = {
    curriculumPagePath: "pages/learning/curriculum.js",
    geometrySubjectParamSupported,
    suspiciousScienceFullAlignmentPhrasing,
  };
  return { blocks };
}

function extractClosureSummary(closure) {
  if (!closure) return null;
  const cq = closure.closureQuestions || {};
  const inv = closure.inventory || {};
  const sum = closure.summary || {};
  return {
    closureQuestions: cq,
    inventorySnippet: {
      geographyRowCount: inv.geographyRowCount,
      duplicateStemHashCount: inv.duplicateStemHashCount,
      thinInventoryBucketCount: inv.thinInventoryBucketCount,
    },
    summarySnippet: {
      duplicateStemHashCount: sum.duplicateStemHashCount,
      realProductDuplicateBlockers: sum.realProductDuplicateBlockers,
      varietyGatePassed: sum.varietyGatePassed,
      thinInventoryBucketCount: sum.thinInventoryBucketCount,
      blockingThinRuntimeCount: sum.blockingThinRuntimeCount ?? closure.runtimeCoverage?.blockingThinRuntimeCount,
    },
  };
}

function aggregateFullOwnerMoEClosed(closureBySubject) {
  const m = closureBySubject.math?.closureQuestions;
  const g = closureBySubject.geometry?.closureQuestions;
  const h = closureBySubject.hebrew?.closureQuestions;
  const e = closureBySubject.english?.closureQuestions;
  const sc = closureBySubject.science?.closureQuestions;
  const mg = closureBySubject["moledet-geography"]?.closureQuestions;
  const mathOk = m?.isMathFullyClosedForDevelopmentStage === true;
  const geoOk = g?.isGeometryFullyClosedForDevelopmentStage === true;
  const heOk = h?.isHebrewFullyClosedIncludingOwnerSignoff === true;
  const enOk = e?.fullOwnerMoEClosed === true;
  const scOk = sc?.fullOwnerMoEClosed === true;
  const mgOk = mg?.fullOwnerMoEClosed === true;
  return Boolean(mathOk && geoOk && heOk && enOk && scOk && mgOk);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const hardeningPath = join(OUT_DIR, "global-coverage-variety-hardening.json");
  const hardeningReport = loadJson(hardeningPath);

  const invPath = join(OUT_DIR, "question-inventory.json");
  const invRaw = loadJson(invPath);
  const records = Array.isArray(invRaw) ? invRaw : invRaw?.records || [];

  const inventorySummary = summarizeInventory(records);

  let curriculumSource = "";
  try {
    curriculumSource = readFileSync(CURRICULUM_PAGE, "utf8");
  } catch {
    curriculumSource = "";
  }
  const curriculumScan = scanCurriculumPage(curriculumSource);

  /** @type {Record<string, object|null>} */
  const closureBySubject = {};
  const blockers = [];
  const advisories = [];

  for (const sub of SUBJECTS) {
    const p = join(OUT_DIR, sub.closureFile);
    closureBySubject[sub.id] = extractClosureSummary(loadJson(p));
    if (!existsSync(p)) advisories.push(`Closure artifact missing (run subject gate): ${sub.closureFile}`);
  }

  if (!curriculumScan.blocks.geometrySubjectParamSupported) {
    blockers.push(
      "Curriculum page: `geometry` missing from `supportedSubjects` — transparency page cannot show גאומטריה via query param."
    );
  }
  if (curriculumScan.blocks.suspiciousScienceFullAlignmentPhrasing) {
    blockers.push(
      'Curriculum page still contains strong "התאמה מלאה" phrasing for מדעים — soften to cautious wording (no full Ministry approval claim).'
    );
  }

  const globalThinSubject = SUBJECTS.map((s) => ({
    subject: s.id,
    thinBucketsUnder3Rows: inventorySummary.thinBuckets.filter((t) => t.key.startsWith(s.id + "|")).length,
  }));

  const metadataWeak =
    inventorySummary.bySubject &&
    Object.entries(inventorySummary.bySubject).filter(([, v]) => v.missingCritical > 0);

  if (metadataWeak?.length) {
    advisories.push(
      `Inventory rows with missingCritical metadata by subject: ${JSON.stringify(
        Object.fromEntries(metadataWeak.map(([k, v]) => [k, v.missingCritical]))
      )}`
    );
  }

  const mixedModeSafety = {
    reviewMethod: "Static generator/master policy review (documented in subject mixedModeNotes).",
    gradeTopicEnforcement: "passed_documented",
    notes:
      "Random/mixed paths in core generators restrict picks to per-grade topic/operation lists; see each subject's mixedModeNotes and repo generators.",
  };

  const verdict =
    blockers.length === 0
      ? "GLOBAL_ALIGNMENT_PASS"
      : "GLOBAL_ALIGNMENT_BLOCKED";

  const globalAlignmentPassed = blockers.length === 0;
  const globalCoverageVarietyPassed =
    hardeningReport?.globalCoverageVarietyPassed ??
    hardeningReport?.verdict?.globalCoverageVarietyPassed ??
    null;
  const diagnosticReadinessPrecheckPassed = !metadataWeak?.length;
  const fullOwnerMoEClosed = aggregateFullOwnerMoEClosed(closureBySubject);

  const hm = hardeningReport?.duplicateMetrics;
  const mathDupHm = hm?.math;
  const geoDupHm = hm?.geometry;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: "global-final-curriculum-alignment",
    verdict,
    verdicts: {
      globalAlignmentPassed,
      globalCoverageVarietyPassed,
      diagnosticReadinessPrecheckPassed,
      fullOwnerMoEClosed,
      notes:
        "globalCoverageVarietyPassed is produced by audit:curriculum:global-coverage-variety-hardening (runs immediately before this script in qa:curriculum-audit). fullOwnerMoEClosed requires owner PDF/POP signoff flags true on every subject closure artifact.",
    },
    curriculumPageScan: curriculumScan,
    inventory: {
      recordCount: records.length,
      bySubject: inventorySummary.bySubject,
      thinInventoryBucketsUnder3: inventorySummary.thinBuckets.length,
      thinInventorySample: inventorySummary.thinBuckets.slice(0, 80),
    },
    subjects: SUBJECTS.map((s) => ({
      id: s.id,
      titleHe: s.titleHe,
      sourceSupport: s.sourceSupport,
      mixedModeNotes: s.mixedModeNotes,
      closureSummary: closureBySubject[s.id],
      inventoryRows: inventorySummary.bySubject[s.id]?.count ?? 0,
      inventoryMissingCritical: inventorySummary.bySubject[s.id]?.missingCritical ?? 0,
      thinBucketsUnder3: globalThinSubject.find((x) => x.subject === s.id)?.thinBucketsUnder3Rows ?? 0,
    })),
    mixedModeSafety,
    duplicateRepetitionBySubject: SUBJECTS.map((s) => {
      const base = {
        subject: s.id,
        duplicateStemHashCount:
          closureBySubject[s.id]?.summarySnippet?.duplicateStemHashCount ??
          closureBySubject[s.id]?.inventorySnippet?.duplicateStemHashCount ??
          null,
        realProductDuplicateBlockers: closureBySubject[s.id]?.summarySnippet?.realProductDuplicateBlockers ?? null,
        advisoryTemplateDuplicates: null,
        varietyGatePassed: closureBySubject[s.id]?.summarySnippet?.varietyGatePassed ?? null,
        notAvailableReason: null,
      };
      if (s.id === "math" && mathDupHm) {
        return {
          ...base,
          duplicateStemHashCount: mathDupHm.duplicateStemHashCount,
          realProductDuplicateBlockers: mathDupHm.realProductDuplicateBlockers,
          advisoryTemplateDuplicates: mathDupHm.advisoryTemplateDuplicates,
          varietyGatePassed: mathDupHm.varietyGatePassed ?? base.varietyGatePassed,
          notAvailableReason: mathDupHm.notAvailableReason,
        };
      }
      if (s.id === "geometry" && geoDupHm) {
        return {
          ...base,
          duplicateStemHashCount: geoDupHm.duplicateStemHashCount,
          realProductDuplicateBlockers: geoDupHm.realProductDuplicateBlockers,
          advisoryTemplateDuplicates: geoDupHm.advisoryTemplateDuplicates,
          varietyGatePassed: geoDupHm.varietyGatePassed ?? base.varietyGatePassed,
          notAvailableReason: geoDupHm.notAvailableReason,
        };
      }
      return base;
    }),
    metadataDiagnosticReadiness: {
      inventoryMissingCriticalBySubject: inventorySummary.bySubject,
      note:
        "Full diagnostic/parent-report readiness requires non-null topic/skill/difficulty — track closure reports per subject for gate detail.",
    },
    blockers,
    advisories:
      hardeningReport && globalCoverageVarietyPassed === false
        ? [...advisories, "global-coverage-variety-hardening reported realProductThinBlockers > 0 — see global-coverage-variety-hardening.json."]
        : advisories,
    closureArtifactsExpected: SUBJECTS.map((s) => s.closureFile),
    globalCoverageVarietyHardeningRef: "reports/curriculum-audit/global-coverage-variety-hardening.json",
  };

  await writeFile(join(OUT_DIR, "global-final-curriculum-alignment.json"), JSON.stringify(payload, null, 2), "utf8");

  const md = [];
  md.push("# Global final curriculum alignment");
  md.push("");
  md.push(`Generated: ${payload.generatedAt}`);
  md.push("");
  md.push(`## Verdict: **${verdict}**`);
  md.push("");
  md.push("## Verdict flags");
  md.push(`- globalAlignmentPassed: **${payload.verdicts.globalAlignmentPassed}**`);
  md.push(
    `- globalCoverageVarietyPassed: **${payload.verdicts.globalCoverageVarietyPassed === null ? "n/a (run global-coverage-variety-hardening first)" : payload.verdicts.globalCoverageVarietyPassed}**`
  );
  md.push(`- diagnosticReadinessPrecheckPassed: **${payload.verdicts.diagnosticReadinessPrecheckPassed}**`);
  md.push(`- fullOwnerMoEClosed: **${payload.verdicts.fullOwnerMoEClosed}**`);
  md.push("");
  md.push("## Curriculum page");
  md.push(`- Geometry query param supported: ${curriculumScan.blocks.geometrySubjectParamSupported ? "yes" : "no"}`);
  md.push(
    `- Science \"full alignment\" phrasing present: ${curriculumScan.blocks.suspiciousScienceFullAlignmentPhrasing ? "yes (blocker)" : "no"}`
  );
  md.push("");
  md.push("## Inventory overview");
  md.push(`- Total records: ${payload.inventory.recordCount}`);
  md.push(`- Thin cells (<3 scanner rows): **${payload.inventory.thinInventoryBucketsUnder3}** (advisory; subject gates define blocking thin pools where applicable)`);
  md.push("");
  md.push("## Subject status (from closure JSON + inventory)");
  for (const s of payload.subjects) {
    md.push(`### ${s.titleHe} (${s.id})`);
    md.push(`- Inventory rows: ${s.inventoryRows}; missingCritical: ${s.inventoryMissingCritical}`);
    md.push(`- Thin buckets &lt;3 (inventory cells): ${s.thinBucketsUnder3}`);
    if (s.closureSummary?.closureQuestions) {
      md.push(`- closureQuestions keys: ${Object.keys(s.closureSummary.closureQuestions).join(", ")}`);
    } else md.push("- Closure JSON not loaded (run subject source-hardening / closure-gate).");
    md.push("");
  }
  md.push("## Mixed-mode safety");
  md.push(`- ${mixedModeSafety.reviewMethod}`);
  md.push(`- ${mixedModeSafety.notes}`);
  md.push("");
  md.push("## Blockers");
  if (!blockers.length) md.push("- None recorded by this global aggregator.");
  else for (const b of blockers) md.push(`- ${b}`);
  md.push("");
  md.push("## Advisories");
  if (!advisories.length) md.push("- None.");
  else for (const a of advisories) md.push(`- ${a}`);
  md.push("");

  await writeFile(join(OUT_DIR, "global-final-curriculum-alignment.md"), md.join("\n"), "utf8");
  console.log("Wrote global-final-curriculum-alignment.{json,md}");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
