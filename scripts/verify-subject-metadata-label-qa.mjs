#!/usr/bin/env node
/**
 * Cross-subject verification: topic/difficulty metadata hidden; real instructions preserved.
 * npm run verify:subject-metadata-label-qa
 */
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import {
  isTopicDifficultyMetadataLead,
  resolveStudentQuestionDisplayParts,
} from "../utils/student-question-display.js";

/** @typedef {{ subject: string, kind: "hide_metadata"|"preserve", before: string, note?: string }} Case */

/** @type {Case[]} */
const SUBJECT_CASES = [
  // —— math ——
  {
    subject: "math",
    kind: "hide_metadata",
    before: "חיסור עשרוניים (קל): 1.23 − 0.45 = __",
  },
  {
    subject: "math",
    kind: "hide_metadata",
    before: "שברים (אתגר): 1/2 + 1/4 = __",
  },
  {
    subject: "math",
    kind: "preserve",
    before: "7 + 3 = __",
  },
  {
    subject: "math",
    kind: "preserve",
    before: "מצאו את הנעלם: 5 + __ = 12",
    note: "equation instruction may omit lead for compact body",
  },
  // —— geometry ——
  {
    subject: "geometry",
    kind: "hide_metadata",
    before: "פיתגורס (קל): ניצבים 3 ו-4 — מה אורך היתר?",
  },
  {
    subject: "geometry",
    kind: "hide_metadata",
    before: "כיתה ד׳ (קל): תיבה 2×3×4 — מה הנפח?",
  },
  {
    subject: "geometry",
    kind: "preserve",
    before: "מה שטח המלבן עם צלע 5 ס״מ?",
  },
  // —— hebrew ——
  {
    subject: "hebrew",
    kind: "hide_metadata",
    before: "בהתאם לכיתה ג׳ [רמה easy]: איזה משפט נכון?",
  },
  {
    subject: "hebrew",
    kind: "preserve",
    before: "איזה משפט נכון?",
  },
  {
    subject: "hebrew",
    kind: "preserve",
    before: "בכיתה יש 24 תלמידים. כמה תלמידים בסך הכול?",
    note: "in-question grade context, not metadata label",
  },
  // —— english ——
  {
    subject: "english",
    kind: "hide_metadata",
    before: "(כיתה ד׳) · רמת medium · Choose the correct word: The cat is ___ the table.",
  },
  {
    subject: "english",
    kind: "preserve",
    before: "Choose the correct word: The cat is ___ the table.",
    note: "English task instruction must stay visible",
  },
  {
    subject: "english",
    kind: "preserve",
    before: "What is the opposite of happy?",
  },
  // —— science ——
  {
    subject: "science",
    kind: "hide_metadata",
    before:
      "בכיתה ה׳ — רמה בינונית: מה קשר בין דם לריאות?",
  },
  {
    subject: "science",
    kind: "hide_metadata",
    before: "נושא materials · רמת hard · מה מאפיין חומר מבודד?",
  },
  {
    subject: "science",
    kind: "preserve",
    before: "מה קשר בין דם לריאות?",
  },
  {
    subject: "science",
    kind: "preserve",
    before: "לפני ניסוי בכיתה, מה חשוב לתעד?",
  },
  // —— moledet_geography ——
  {
    subject: "moledet_geography",
    kind: "hide_metadata",
    before: "שאלה בנושא: מולדת — מהו סמל המדינה?",
  },
  {
    subject: "moledet_geography",
    kind: "preserve",
    before: "מהו סמל המדינה?",
  },
  {
    subject: "moledet_geography",
    kind: "preserve",
    before: "איזו עיר היא בירת ישראל?",
  },
];

const METADATA_LEAD_RE = /^[^:\n]{1,72}\((קל|בינוני|אתגר|מאתגר)\)\s*:?\s*$/u;
const GRADE_DIFF_LEAD_RE =
  /^כיתה\s+[אבגדהו]['׳]?\s*\((קל|בינוני|אתגר|מאתגר)\)\s*:?\s*$/u;

function visibleLeadIsMetadata(lead) {
  const t = String(lead || "").trim();
  if (!t) return false;
  return (
    isTopicDifficultyMetadataLead(t) ||
    METADATA_LEAD_RE.test(t.replace(/:$/, "") + (t.endsWith(":") ? "" : "")) ||
    GRADE_DIFF_LEAD_RE.test(t.replace(/:$/, ""))
  );
}

function simulateBeforeDisplay(before) {
  const split = resolveStudentQuestionDisplayParts({ question: before });
  return {
    leadText: split.leadText,
    bodyText: split.bodyText,
  };
}

function simulateAfterDisplay(before) {
  const sanitized = sanitizeQuestionForStudentDisplay({
    question: before,
    stem: before,
  });
  const split = resolveStudentQuestionDisplayParts(sanitized);
  return {
    sanitized,
    leadText: split.leadText,
    bodyText: split.bodyText,
  };
}

/** @type {Record<string, { pass: number, fail: string[] }>} */
const bySubject = {};

function bump(subject, ok, msg) {
  if (!bySubject[subject]) bySubject[subject] = { pass: 0, fail: [] };
  if (ok) bySubject[subject].pass += 1;
  else bySubject[subject].fail.push(msg);
}

let failures = 0;

for (const c of SUBJECT_CASES) {
  const beforeView = simulateBeforeDisplay(c.before);
  const afterView = simulateAfterDisplay(c.before);
  const visible = `${afterView.leadText || ""} ${afterView.bodyText || ""}`.trim();

  if (c.kind === "hide_metadata") {
    const hadMetadataLead =
      visibleLeadIsMetadata(beforeView.leadText) ||
      /\((קל|בינוני|אתגר|מאתגר)\)/u.test(beforeView.leadText || c.before.slice(0, 80));
    const leadHidden = !visibleLeadIsMetadata(afterView.leadText);
    const bodyOk = afterView.bodyText.trim().length > 0;
    const ok = leadHidden && bodyOk;
    bump(
      c.subject,
      ok,
      ok
        ? ""
        : `hide_metadata failed: lead="${afterView.leadText}" body="${afterView.bodyText.slice(0, 60)}" (before had metadata: ${hadMetadataLead})`
    );
    if (!ok) failures += 1;
  } else {
    const englishInstruction =
      /Choose the correct word/i.test(c.before) &&
      /Choose the correct word/i.test(c.before);
    let ok = visible.length >= 8;
    if (/Choose the correct word/i.test(c.before)) {
      ok = /Choose the correct word/i.test(visible);
    }
    if (c.before.includes("בכיתה יש")) {
      ok = visible.includes("בכיתה יש");
    }
    bump(
      c.subject,
      ok,
      ok ? "" : `preserve failed: visible="${visible.slice(0, 100)}"`
    );
    if (!ok) failures += 1;
  }
}

console.log("\n=== Subject-by-subject metadata-label QA ===\n");

for (const subject of [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
]) {
  const row = bySubject[subject] || { pass: 0, fail: ["no cases"] };
  const status = row.fail.filter(Boolean).length === 0 ? "PASS" : "FAIL";
  console.log(`${subject}: ${status} (${row.pass} checks)`);
  for (const f of row.fail.filter(Boolean)) {
    console.log(`  ✗ ${f}`);
  }
}

console.log("\n=== Sample before → after (visible lead / body) ===\n");
for (const subject of [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
]) {
  const sample = SUBJECT_CASES.find(
    (c) => c.subject === subject && c.kind === "hide_metadata"
  );
  if (!sample) continue;
  const b = simulateBeforeDisplay(sample.before);
  const a = simulateAfterDisplay(sample.before);
  console.log(`[${subject}] BEFORE lead: ${JSON.stringify(b.leadText || "(none)")}`);
  console.log(`[${subject}] AFTER  lead: ${JSON.stringify(a.leadText || "(none)")}`);
  console.log(`[${subject}] AFTER  body: ${JSON.stringify(a.bodyText.slice(0, 80))}`);
  console.log("");
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} cross-subject check(s) failed\n`);
  process.exit(1);
}

console.log("PASS: all 6 subjects verified (centralized sanitizer/display path)\n");
