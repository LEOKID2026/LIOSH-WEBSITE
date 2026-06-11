import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../utils/student-question-display.js";
import {
  hasMcqCopyAnswerLeak,
  isG1G2RuntimePracticeEligible,
  collectChildVisibleSurfaces,
} from "../utils/lower-grade-practice-runtime-quality.js";

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

let guardMissBrowserHit = 0;
let guardHit = 0;
let browserOnly = 0;

for (let i = 0; i < 800; i++) {
  const q = generateQuestion({ name: "קל" }, "reading", "g2", null, {
    excludeFingerprints: new Set(),
  });
  attachHebrewAudioToQuestion(q, {
    gradeKey: "g2",
    topic: q.topic || "reading",
    sequenceIndex: i + 1,
  });
  const display = sanitizeQuestionForStudentDisplay(q);
  const parts = resolveStudentQuestionDisplayParts(display);
  const opts = (display.answers || []).map(String);
  const guard = hasMcqCopyAnswerLeak(display);
  const bLeak = browserLeak(parts, opts);
  if (guard) guardHit++;
  if (bLeak) browserOnly++;
  if (bLeak && !guard) {
    guardMissBrowserHit++;
    console.log(
      JSON.stringify(
        {
          i,
          question: display.question,
          questionLabel: display.questionLabel,
          exerciseText: display.exerciseText,
          lead: parts.leadText,
          body: parts.bodyText,
          correctAnswer: display.correctAnswer,
          answers: opts,
          patternFamily: display.params?.patternFamily,
          subtype: display.params?.subtype,
          surfaces: collectChildVisibleSurfaces(display),
          eligible: isG1G2RuntimePracticeEligible(display, {
            gradeKey: "g2",
            subject: "hebrew",
          }),
        },
        null,
        2
      )
    );
    if (guardMissBrowserHit >= 8) break;
  }
}

console.log({ guardMissBrowserHit, guardHit, browserOnly });
