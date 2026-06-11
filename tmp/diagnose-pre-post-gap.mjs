import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeLowerGradeChildFacingText, isG1G2RuntimePracticeEligible, hasMcqCopyAnswerLeak } from "../utils/lower-grade-practice-runtime-quality.js";
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

const gaps = [];
for (let i = 0; i < 1500; i++) {
  const q = generateQuestion({ name: "קל" }, "reading", "g2", null, { excludeFingerprints: new Set() });
  attachHebrewAudioToQuestion(q, { gradeKey: "g2", topic: q.topic || "reading", sequenceIndex: i + 1 });
  sanitizeLowerGradeChildFacingText(q);
  const pre = isG1G2RuntimePracticeEligible(q, { gradeKey: "g2", subject: "hebrew" });
  const display = sanitizeQuestionForStudentDisplay(q);
  const post = isG1G2RuntimePracticeEligible(display, { gradeKey: "g2", subject: "hebrew" });
  const parts = resolveStudentQuestionDisplayParts(display);
  const opts = (display.answers || []).map(String);
  const b = browserLeakAnyOption(parts, opts);
  if (pre && (!post || b)) {
    gaps.push({
      pre,
      post,
      preLeak: hasMcqCopyAnswerLeak(q),
      postLeak: hasMcqCopyAnswerLeak(display),
      browser: b,
      correct: display.correctAnswer,
      lead: parts.leadText,
      body: parts.bodyText?.slice(0, 150),
      answers: opts,
      patternFamily: display.params?.patternFamily,
    });
    if (gaps.length >= 12) break;
  }
}
console.log(JSON.stringify({ count: gaps.length, gaps }, null, 2));
