import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeLowerGradeChildFacingText, isG1G2RuntimePracticeEligible } from "../utils/lower-grade-practice-runtime-quality.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../utils/student-question-display.js";

function browserLeakAnyOption(parts, options) {
  const surfaces = [parts.leadText, parts.bodyText].filter(Boolean);
  for (const surface of surfaces) {
    const s = surface.trim();
    for (const opt of options) {
      const o = String(opt).trim();
      if (!o || o.length < 2) continue;
      if (s.toLowerCase() === o.toLowerCase()) return { kind: "exact", opt };
      if (s.includes(o) && o.length >= 3) return { kind: "includes", opt };
      if (/^[\u0590-\u05FF\s'".:—-]+$/u.test(s) && s.includes(o)) return { kind: "hebrew-includes", opt };
    }
  }
  return null;
}

const hits = [];
for (let i = 0; i < 3000; i++) {
  const q = generateQuestion({ name: "קל" }, "reading", "g2", null, { excludeFingerprints: new Set() });
  attachHebrewAudioToQuestion(q, { gradeKey: "g2", topic: q.topic || "reading", sequenceIndex: i + 1 });
  sanitizeLowerGradeChildFacingText(q);
  const display = sanitizeQuestionForStudentDisplay(q);
  if (!isG1G2RuntimePracticeEligible(display, { gradeKey: "g2", subject: "hebrew" })) continue;
  const parts = resolveStudentQuestionDisplayParts(display);
  const opts = (display.answers || []).map(String);
  const b = browserLeakAnyOption(parts, opts);
  if (b) {
    hits.push({
      browser: b,
      correct: display.correctAnswer,
      lead: parts.leadText,
      body: parts.bodyText,
      answers: opts,
      patternFamily: display.params?.patternFamily,
      subtype: display.params?.subtype,
    });
    if (hits.length >= 15) break;
  }
}
console.log(JSON.stringify({ hits: hits.length, samples: hits }, null, 2));
