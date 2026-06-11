import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeLowerGradeChildFacingText } from "../utils/lower-grade-practice-runtime-quality.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../utils/student-question-display.js";
import {
  hasMcqCopyAnswerLeak,
  isG1G2RuntimePracticeEligible,
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

function simulateMasterPipeline(raw) {
  const q = { ...raw, params: { ...raw.params } };
  attachHebrewAudioToQuestion(q, {
    gradeKey: "g2",
    topic: q.topic || "reading",
    sequenceIndex: 1,
  });
  sanitizeLowerGradeChildFacingText(q);
  const preSanitizeEligible = isG1G2RuntimePracticeEligible(q, {
    gradeKey: "g2",
    subject: "hebrew",
  });
  const display = sanitizeQuestionForStudentDisplay(q);
  const parts = resolveStudentQuestionDisplayParts(display);
  const opts = (display.answers || []).map(String);
  const postGuard = hasMcqCopyAnswerLeak(display);
  const postEligible = isG1G2RuntimePracticeEligible(display, {
    gradeKey: "g2",
    subject: "hebrew",
  });
  const bLeak = browserLeak(parts, opts);
  return {
    preSanitizeEligible,
    postGuard,
    postEligible,
    bLeak,
    patternFamily: display.params?.patternFamily,
    subtype: display.params?.subtype,
    lead: parts.leadText,
    body: parts.bodyText?.slice(0, 100),
    correct: display.correctAnswer,
    answers: opts,
  };
}

const stats = { preOk: 0, postOk: 0, bLeak: 0, miss: 0 };
const misses = [];

for (let i = 0; i < 600; i++) {
  const raw = generateQuestion({ name: "קל" }, "reading", "g2", null, {
    excludeFingerprints: new Set(),
  });
  const r = simulateMasterPipeline(raw);
  if (r.preSanitizeEligible) stats.preOk++;
  if (r.postEligible) stats.postOk++;
  if (r.bLeak) stats.bLeak++;
  if (r.bLeak && r.postEligible) {
    stats.miss++;
    if (misses.length < 5) misses.push(r);
  }
}

console.log(JSON.stringify({ stats, misses }, null, 2));
