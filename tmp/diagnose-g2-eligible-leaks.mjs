import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeLowerGradeChildFacingText } from "../utils/lower-grade-practice-runtime-quality.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../utils/student-question-display.js";
import { isG1G2RuntimePracticeEligible } from "../utils/lower-grade-practice-runtime-quality.js";

function browserLeak(parts, options) {
  const surfaces = [parts.leadText, parts.bodyText].filter(Boolean);
  for (const surface of surfaces) {
    const s = surface.trim();
    for (const opt of options) {
      const o = String(opt).trim();
      if (!o || o.length < 2) continue;
      if (s.toLowerCase() === o.toLowerCase()) return true;
      if (s.includes(o) && o.length >= 3) return true;
      if (/^[\u0590-\u05FF\s'".:—-]+$/u.test(s) && s.includes(o)) return true;
    }
  }
  return false;
}

const hits = [];
for (let i = 0; i < 2000; i++) {
  const raw = generateQuestion({ name: "קל" }, "reading", "g2", null, {
    excludeFingerprints: new Set(),
  });
  attachHebrewAudioToQuestion(raw, {
    gradeKey: "g2",
    topic: raw.topic || "reading",
    sequenceIndex: i + 1,
  });
  sanitizeLowerGradeChildFacingText(raw);
  const display = sanitizeQuestionForStudentDisplay(raw);
  const parts = resolveStudentQuestionDisplayParts(display);
  const opts = (display.answers || []).map(String);
  const eligible = isG1G2RuntimePracticeEligible(display, {
    gradeKey: "g2",
    subject: "hebrew",
  });
  if (!eligible) continue;
  if (browserLeak(parts, opts)) {
    hits.push({
      question: display.question,
      exerciseText: display.exerciseText,
      lead: parts.leadText,
      body: parts.bodyText,
      correct: display.correctAnswer,
      answers: opts,
      patternFamily: display.params?.patternFamily,
      subtype: display.params?.subtype,
    });
    if (hits.length >= 10) break;
  }
}
console.log(JSON.stringify({ eligibleBrowserLeak: hits.length, hits }, null, 2));
