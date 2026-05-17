#!/usr/bin/env node
/**
 * Cross-subject session variety simulation.
 * npm run qa:session-question-variety
 * npm run qa:session-question-variety:all  (same script, all scenarios)
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "reports/question-audit/session-variety.json");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { SessionAntiRepeatBuffer, selectGeneratedWithAntiRepeat } = await import(
  href("utils/question-session-anti-repeat.js")
);
const { getQuestionFingerprintForSubject, getNearDuplicateKeyForSubject } =
  await import(href("utils/question-fingerprints.js"));
const { generateQuestion: generateHebrew } = await import(
  href("utils/hebrew-question-generator.js")
);
const { getLevelConfig } = await import(href("utils/hebrew-storage.js"));
const { generateForMatrixCell } = await import(
  "./learning-simulator/lib/question-generator-adapters.mjs"
);

const SCENARIOS = [
  {
    id: "hebrew_g3_reading_easy",
    subject: "hebrew",
    grade: "g3",
    topic: "reading",
    level: "easy",
    sessionLen: 50,
    minPoolUnique: 18,
    minSessionUnique: 18,
    maxRepeatRate: 0.2,
  },
  {
    id: "hebrew_g3_reading_medium",
    subject: "hebrew",
    grade: "g3",
    topic: "reading",
    level: "medium",
    sessionLen: 40,
    minPoolUnique: 14,
    minSessionUnique: 14,
    maxRepeatRate: 0.25,
  },
  {
    id: "math_g3_multiplication",
    subject: "math",
    grade: "g3",
    topic: "multiplication",
    level: "easy",
    sessionLen: 50,
    minPoolUnique: 12,
    minSessionUnique: 12,
    maxRepeatRate: 0.35,
  },
  {
    id: "math_g3_mixed_ops",
    subject: "math",
    grade: "g3",
    topic: "order_of_operations",
    level: "medium",
    sessionLen: 50,
    minPoolUnique: 10,
    minSessionUnique: 10,
    maxRepeatRate: 0.35,
  },
  {
    id: "geometry_g3_area",
    subject: "geometry",
    grade: "g3",
    topic: "area",
    level: "easy",
    sessionLen: 40,
    minPoolUnique: 10,
    minSessionUnique: 10,
    maxRepeatRate: 0.35,
  },
  {
    id: "geometry_g4_perimeter",
    subject: "geometry",
    grade: "g4",
    topic: "perimeter",
    level: "medium",
    sessionLen: 40,
    minPoolUnique: 10,
    minSessionUnique: 10,
    maxRepeatRate: 0.35,
  },
  {
    id: "science_g3",
    subject: "science",
    grade: "g3",
    topic: "body",
    level: "easy",
    sessionLen: 40,
    minPoolUnique: 8,
    minSessionUnique: 8,
    maxRepeatRate: 0.35,
  },
  {
    id: "english_g3_grammar",
    subject: "english",
    grade: "g3",
    topic: "grammar",
    level: "easy",
    sessionLen: 40,
    minPoolUnique: 8,
    minSessionUnique: 8,
    maxRepeatRate: 0.35,
  },
  {
    id: "english_g4_vocabulary",
    subject: "english",
    grade: "g4",
    topic: "vocabulary",
    level: "medium",
    sessionLen: 40,
    minPoolUnique: 8,
    minSessionUnique: 8,
    maxRepeatRate: 0.35,
  },
  {
    id: "moledet_g3_homeland",
    subject: "moledet_geography",
    grade: "g3",
    topic: "homeland",
    level: "easy",
    sessionLen: 40,
    minPoolUnique: 6,
    minSessionUnique: 6,
    maxRepeatRate: 0.4,
  },
  {
    id: "moledet_g4_community",
    subject: "moledet_geography",
    grade: "g4",
    topic: "community",
    level: "medium",
    sessionLen: 40,
    minPoolUnique: 6,
    minSessionUnique: 6,
    maxRepeatRate: 0.4,
  },
];

async function selectGeneratedWithAntiRepeatAsync({
  generateOnce,
  extraAccept,
  getFingerprint,
  getNearKey,
  history,
  maxAttempts = 100,
}) {
  for (let i = 0; i < maxAttempts; i++) {
    const q = await generateOnce();
    if (!q) continue;
    const fp = getFingerprint(q);
    const near = getNearKey?.(q) || "";
    const ok =
      history.wouldAccept(fp, near) && (extraAccept ? extraAccept(q) : true);
    if (ok) {
      history.record(fp, near);
      return { question: q, exhausted: false };
    }
  }
  history.softenOnExhaustion();
  for (let i = 0; i < 12; i++) {
    const q = await generateOnce();
    if (!q) continue;
    const fp = getFingerprint(q);
    if (fp !== history.lastKey && (extraAccept ? extraAccept(q) : true)) {
      history.record(fp, getNearKey?.(q));
      return { question: q, exhausted: true };
    }
  }
  const fallback = await generateOnce();
  if (fallback) {
    history.record(getFingerprint(fallback), getNearKey?.(fallback));
  }
  return { question: fallback, exhausted: true };
}

async function estimatePoolSize(generateOnce, getFingerprint, probes = 150) {
  const fps = new Set();
  for (let i = 0; i < probes; i++) {
    const q = await generateOnce(i);
    if (!q) continue;
    const fp = getFingerprint(q);
    if (fp) fps.add(fp);
  }
  return fps.size;
}

async function simulateProcedural(scenario, generateOnce, getFingerprint, getNearKey, { asyncGen = false } = {}) {
  const poolUnique = await estimatePoolSize(generateOnce, getFingerprint);
  const history = new SessionAntiRepeatBuffer({ maxSize: 80 });
  const seen = [];
  let immediateRepeats = 0;
  let exactRepeats = 0;

  let genSeq = 0;
  const pickOne = async () => {
    const genArg = () => generateOnce(genSeq++, history.toSet());
    if (asyncGen) {
      return selectGeneratedWithAntiRepeatAsync({
        history,
        maxAttempts: 100,
        getFingerprint,
        getNearKey,
        generateOnce: genArg,
      });
    }
    return selectGeneratedWithAntiRepeat({
      history,
      maxAttempts: 100,
      getFingerprint,
      getNearKey,
      generateOnce: genArg,
    });
  };

  for (let i = 0; i < scenario.sessionLen; i++) {
    const { question } = await pickOne();
    if (!question) continue;
    const fp = getFingerprint(question);
    if (seen.length && seen[seen.length - 1] === fp) immediateRepeats += 1;
    if (seen.includes(fp)) exactRepeats += 1;
    seen.push(fp);
  }

  const sessionUnique = new Set(seen).size;
  const repeatRate = exactRepeats / scenario.sessionLen;
  const inventoryStatus =
    poolUnique < scenario.minPoolUnique
      ? "CRITICAL"
      : poolUnique < scenario.sessionLen
        ? "THIN"
        : "OK";
  const pass =
    immediateRepeats === 0 &&
    repeatRate <= scenario.maxRepeatRate &&
    sessionUnique >= Math.min(scenario.minSessionUnique, poolUnique) &&
    inventoryStatus !== "CRITICAL";

  return {
    ...scenario,
    poolUnique,
    sessionUnique,
    immediateRepeats,
    exactRepeats,
    repeatRate: Number(repeatRate.toFixed(3)),
    inventoryStatus,
    pass,
  };
}

function adapterGenerate(cell) {
  return async (i) => {
    const gen = await generateForMatrixCell(cell, i + 100);
    if (gen.unsupported || !gen.ok || !gen.raw) return null;
    return gen.raw;
  };
}

async function main() {
  const results = [];

  const hebrewGen = (level) => (i, historySet) => {
    const levelConfig = getLevelConfig(3, level);
    return generateHebrew(levelConfig, "reading", "g3", null, {
      excludeFingerprints: historySet || new Set(),
    });
  };

  results.push(
    await simulateProcedural(
      SCENARIOS.find((s) => s.id === "hebrew_g3_reading_easy"),
      hebrewGen("easy"),
      (q) => getQuestionFingerprintForSubject(q, "hebrew", { grade: "g3", topic: "reading" }),
      (q) => getNearDuplicateKeyForSubject(q, "hebrew")
    )
  );

  results.push(
    await simulateProcedural(
      SCENARIOS.find((s) => s.id === "hebrew_g3_reading_medium"),
      hebrewGen("medium"),
      (q) => getQuestionFingerprintForSubject(q, "hebrew", { grade: "g3", topic: "reading" }),
      (q) => getNearDuplicateKeyForSubject(q, "hebrew")
    )
  );

  for (const scenario of SCENARIOS.filter((s) => !s.id.startsWith("hebrew"))) {
    const cell = {
      grade: scenario.grade,
      subjectCanonical: scenario.subject,
      level: scenario.level,
      topic: scenario.topic,
    };
    const genFn = adapterGenerate(cell);
    results.push(
      await simulateProcedural(
        scenario,
        genFn,
        (q) => getQuestionFingerprintForSubject(q, scenario.subject, cell),
        (q) => getNearDuplicateKeyForSubject(q, scenario.subject),
        { asyncGen: true }
      )
    );
  }

  const statusCounts = { OK: 0, THIN: 0, CRITICAL: 0, PASS: 0, FAIL: 0 };
  for (const r of results) {
    statusCounts[r.inventoryStatus] = (statusCounts[r.inventoryStatus] || 0) + 1;
    if (r.pass) statusCounts.PASS += 1;
    else statusCounts.FAIL += 1;
  }
  const criticalCount = results.filter((r) => r.inventoryStatus === "CRITICAL").length;
  const thinCount = results.filter((r) => r.inventoryStatus === "THIN").length;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: { criticalCount, thinCount, statusCounts },
        results,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(JSON.stringify({ results }, null, 2));

  const failed = results.filter((r) => !r.pass);
  const critical = results.filter((f) => f.inventoryStatus === "CRITICAL");
  console.log(
    `Summary: ${statusCounts.PASS} pass, ${statusCounts.FAIL} fail, CRITICAL=${criticalCount}, THIN=${thinCount}`
  );
  if (failed.length) {
    console.error(`FAIL: ${failed.length} scenario(s) failed (inventory CRITICAL=${criticalCount})`);
    for (const f of failed) {
      console.error(
        `  ${f.id}: pool=${f.poolUnique} sessionUnique=${f.sessionUnique} repeatRate=${f.repeatRate} status=${f.inventoryStatus}`
      );
    }
    process.exit(1);
  }
  console.log("PASS: all session variety scenarios");
  console.log(`Report: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
