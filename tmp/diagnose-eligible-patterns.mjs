import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeLowerGradeChildFacingText, isG1G2RuntimePracticeEligible } from "../utils/lower-grade-practice-runtime-quality.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../utils/student-question-display.js";

function browserLeak(parts, options) {
  const surfaces = [parts.leadText, parts.bodyText].filter(Boolean);
  for (const surface of surfaces) {
    const s = surface.trim();
    for (const opt of options) {
      const o = String(opt).trim();
      if (!o || o.length < 2) continue;
      if (s.toLowerCase() === o.toLowerCase()) return { opt, correct: false };
      if (s.includes(o) && o.length >= 3) return { opt, correct: false };
      if (/^[\u0590-\u05FF\s'".:—-]+$/u.test(s) && s.includes(o)) return { opt, correct: false };
    }
  }
  return null;
}

const patterns = {};
for (let i = 0; i < 2500; i++) {
  const q = generateQuestion({ name: "קל" }, "reading", "g2", null, { excludeFingerprints: new Set() });
  attachHebrewAudioToQuestion(q, { gradeKey: "g2", topic: "reading", sequenceIndex: i + 1 });
  sanitizeLowerGradeChildFacingText(q);
  const display = sanitizeQuestionForStudentDisplay(q);
  if (!isG1G2RuntimePracticeEligible(display, { gradeKey: "g2", subject: "hebrew" })) continue;
  const pf = display.params?.patternFamily || "none";
  patterns[pf] = (patterns[pf] || 0) + 1;
  const parts = resolveStudentQuestionDisplayParts(display);
  const opts = (display.answers || []).map(String);
  const b = browserLeak(parts, opts);
  if (b) {
    console.log("BROWSER HIT", { pf, body: parts.bodyText, lead: parts.leadText, correct: display.correctAnswer, answers: opts, matched: b });
    break;
  }
}
console.log(patterns);
