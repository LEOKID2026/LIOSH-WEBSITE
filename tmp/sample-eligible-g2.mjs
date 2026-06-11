import { generateQuestion } from "../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../utils/hebrew-audio-attach.js";
import { sanitizeLowerGradeChildFacingText, isG1G2RuntimePracticeEligible } from "../utils/lower-grade-practice-runtime-quality.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../utils/student-question-display.js";

const targets = ["g2_sentence_teacher_explains", "reading_completion", "g2_read_trim_redundancy", "word_level_early_g2"];
let n = 0;
for (let i = 0; i < 5000 && n < 6; i++) {
  const q = generateQuestion({ name: "קל" }, "reading", "g2", null, { excludeFingerprints: new Set() });
  attachHebrewAudioToQuestion(q, { gradeKey: "g2", topic: "reading", sequenceIndex: i + 1 });
  sanitizeLowerGradeChildFacingText(q);
  const display = sanitizeQuestionForStudentDisplay(q);
  if (!isG1G2RuntimePracticeEligible(display, { gradeKey: "g2", subject: "hebrew" })) continue;
  const pf = display.params?.patternFamily;
  if (!targets.includes(pf)) continue;
  const parts = resolveStudentQuestionDisplayParts(display);
  console.log(JSON.stringify({
    pf,
    question: display.question,
    questionLabel: display.questionLabel,
    exerciseText: display.exerciseText,
    lead: parts.leadText,
    body: parts.bodyText,
    correct: display.correctAnswer,
    answers: display.answers,
  }, null, 2));
  n++;
}
