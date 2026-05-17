#!/usr/bin/env node
/**
 * Simulated session variety — anti-repeat behavior.
 * npm run qa:session-question-variety
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

const SESSION_LEN = Number(process.env.QA_SESSION_LEN || 50);

function simulateHebrewG3Reading() {
  const levelConfig = getLevelConfig(3, "easy");
  const history = new SessionAntiRepeatBuffer({ maxSize: 60 });
  const seen = [];
  let immediateRepeats = 0;
  let exactRepeats = 0;

  for (let i = 0; i < SESSION_LEN; i++) {
    const { question } = selectGeneratedWithAntiRepeat({
      history,
      maxAttempts: 80,
      getFingerprint: (q) =>
        getQuestionFingerprintForSubject(q, "hebrew", {
          grade: "g3",
          topic: "reading",
        }),
      getNearKey: (q) => getNearDuplicateKeyForSubject(q, "hebrew"),
      generateOnce: () =>
        generateHebrew(levelConfig, "reading", "g3", null, {
          excludeFingerprints: history.toSet(),
        }),
    });
    const fp = getQuestionFingerprintForSubject(question, "hebrew", {
      grade: "g3",
      topic: "reading",
    });
    if (seen.length && seen[seen.length - 1] === fp) immediateRepeats += 1;
    if (seen.includes(fp)) exactRepeats += 1;
    seen.push(fp);
  }

  const unique = new Set(seen).size;
  const repeatRate = exactRepeats / SESSION_LEN;
  return {
    label: "hebrew g3 reading easy",
    sessionLen: SESSION_LEN,
    unique,
    immediateRepeats,
    exactRepeats,
    repeatRate,
    pass:
      immediateRepeats === 0 &&
      repeatRate < 0.35 &&
      unique >= Math.min(SESSION_LEN * 0.5, 20),
  };
}

async function simulateSubjectSamples() {
  const matrix = [
    { subject: "math", grade: "g3", level: "easy", topic: "equations" },
    { subject: "geometry", grade: "g3", level: "easy", topic: "area" },
    { subject: "english", grade: "g3", level: "easy", topic: "grammar" },
    { subject: "moledet_geography", grade: "g3", level: "easy", topic: "israel_map" },
  ];
  const results = [];
  for (const cell of matrix) {
    const history = new SessionAntiRepeatBuffer();
    const seen = [];
    let immediateRepeats = 0;
    let exactRepeats = 0;
    for (let i = 0; i < 30; i++) {
      const gen = await generateForMatrixCell(cell, i + cell.topic.length);
      if (!gen.question) continue;
      const q = gen.question;
      const fp = getQuestionFingerprintForSubject(q, cell.subject, cell);
      if (history.wouldAccept(fp, getNearDuplicateKeyForSubject(q, cell.subject))) {
        history.record(fp, getNearDuplicateKeyForSubject(q, cell.subject));
      } else {
        history.softenOnExhaustion();
        history.record(fp);
      }
      if (seen.length && seen[seen.length - 1] === fp) immediateRepeats += 1;
      if (seen.includes(fp)) exactRepeats += 1;
      seen.push(fp);
    }
    results.push({
      ...cell,
      unique: new Set(seen).size,
      immediateRepeats,
      exactRepeats,
      pass: immediateRepeats === 0,
    });
  }
  return results;
}

async function main() {
  const hebrew = simulateHebrewG3Reading();
  const others = await simulateSubjectSamples();
  console.log(JSON.stringify({ hebrew, others }, null, 2));

  const failed =
    !hebrew.pass || others.some((o) => !o.pass);
  if (failed) {
    console.error("FAIL: session variety thresholds not met");
    process.exit(1);
  }
  console.log("PASS: session variety simulation");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
