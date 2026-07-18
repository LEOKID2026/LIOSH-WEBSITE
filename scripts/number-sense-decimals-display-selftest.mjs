/**
 * Selftest: number_sense and decimals question display fix
 * Verifies Fix 1 from ISRAELI-LEARNING-TARGETED-FIXES-REPORT
 */
import { generateQuestion } from '../utils/math-question-generator.js';
import { getLevelConfig } from '../utils/math-storage.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`FAIL: ${message}`);
    console.error(`FAIL: ${message}`);
  }
}

// ===== ns_neighbors: verify no "= __" or "__" placeholder =====
for (const grade of ['g3', 'g4', 'g5', 'g6']) {
  for (const level of ['easy', 'medium', 'hard']) {
    const lc = getLevelConfig(level, grade);
    let found = false;
    for (let i = 0; i < 30; i++) {
      globalThis.__LIOSH_MATH_FORCE = 'ns_neighbors';
      const q = generateQuestion(lc, 'number_sense', grade);
      globalThis.__LIOSH_MATH_FORCE = '';
      if (q.params?.kind !== 'ns_neighbors') continue;
      found = true;

      // Question must NOT be just a placeholder
      assert(
        q.question !== '__' && q.question !== '= __',
        `${grade}/${level}/ns_neighbors: question is placeholder "${q.question}"`
      );
      // Question must contain the number n
      assert(
        String(q.question).includes(String(q.params.n)),
        `${grade}/${level}/ns_neighbors: question "${q.question}" does not contain n=${q.params.n}`
      );
      // Question must contain direction indicator
      const isAfter = q.params.dir === 'after';
      const isBefore = q.params.dir === 'before';
      assert(
        (isAfter && (q.question.includes('אחרי') || q.question.includes('שבא'))) ||
        (isBefore && (q.question.includes('לפני') || q.question.includes('שבא'))),
        `${grade}/${level}/ns_neighbors: question "${q.question}" missing direction for dir=${q.params.dir}`
      );
      // correctAnswer must be correct
      const expectedAnswer = isAfter ? q.params.n + 1 : q.params.n - 1;
      assert(
        Number(q.correctAnswer) === expectedAnswer,
        `${grade}/${level}/ns_neighbors: correctAnswer ${q.correctAnswer} !== expected ${expectedAnswer} for n=${q.params.n} dir=${q.params.dir}`
      );
      // correctAnswer must appear in answers array
      assert(
        Array.isArray(q.answers) && q.answers.map(String).includes(String(q.correctAnswer)),
        `${grade}/${level}/ns_neighbors: correctAnswer ${q.correctAnswer} not in answers [${q.answers}]`
      );
      // A clearly wrong answer should not equal correctAnswer
      const wrongAnswer = expectedAnswer + 100;
      assert(
        Number(q.correctAnswer) !== wrongAnswer,
        `${grade}/${level}/ns_neighbors: wrong answer test failure`
      );
      break;
    }
    if (!found) {
      assert(false, `${grade}/${level}/ns_neighbors: could not generate in 30 tries`);
    }
  }
}

// ===== dec_compare_max: verify question contains numbers =====
for (const grade of ['g3', 'g4', 'g5', 'g6']) {
  for (const level of ['easy', 'medium', 'hard']) {
    const lc = getLevelConfig(level, grade);
    let found = false;
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(lc, 'decimals', grade);
      if (q.params?.kind !== 'dec_compare_max') continue;
      found = true;
      const { x, y, places } = q.params;

      // Question must NOT be just "__"
      assert(
        q.question !== '__',
        `${grade}/${level}/dec_compare_max: question is plain placeholder "${q.question}"`
      );
      // The full display (question + label) must contain both numbers
      const fullDisplay = `${q.questionLabel || ''} ${q.question}`;
      assert(
        fullDisplay.includes(x.toFixed(places)) || fullDisplay.includes(String(x)),
        `${grade}/${level}/dec_compare_max: display "${fullDisplay}" does not contain x=${x}`
      );
      assert(
        fullDisplay.includes(y.toFixed(places)) || fullDisplay.includes(String(y)),
        `${grade}/${level}/dec_compare_max: display "${fullDisplay}" does not contain y=${y}`
      );
      // correctAnswer must be the max of x and y
      const expectedMax = Math.max(x, y);
      assert(
        Math.abs(Number(q.correctAnswer) - expectedMax) < 0.001,
        `${grade}/${level}/dec_compare_max: correctAnswer ${q.correctAnswer} !== max(${x},${y})=${expectedMax}`
      );
      // correctAnswer must appear in answers
      assert(
        Array.isArray(q.answers) && q.answers.map(Number).some(a => Math.abs(a - expectedMax) < 0.001),
        `${grade}/${level}/dec_compare_max: correctAnswer ${q.correctAnswer} not in answers [${q.answers}]`
      );
      // A wrong answer (the min) must NOT equal the correct answer
      const minVal = Math.min(x, y);
      if (x !== y) {
        assert(
          Math.abs(Number(q.correctAnswer) - minVal) >= 0.001,
          `${grade}/${level}/dec_compare_max: min(${x},${y}) wrongly equals correctAnswer`
        );
      }
      break;
    }
    if (!found) {
      // dec_compare_max may not appear in every 50 samples — soft warn, don't fail
      console.warn(`WARN: ${grade}/${level}/dec_compare_max: not sampled in 50 tries (variant roll)`);
    }
  }
}

// ===== No duplication: generator sets question, NOT a renderer =====
// Verify that the question text is self-contained (not requiring params to be parsed)
{
  const lc = getLevelConfig('easy', 'g3');
  globalThis.__LIOSH_MATH_FORCE = 'ns_neighbors';
  const q = generateQuestion(lc, 'number_sense', 'g3');
  globalThis.__LIOSH_MATH_FORCE = '';
  // The question should be a complete Hebrew sentence without "= __"
  assert(
    q.question.length > 5 && !q.question.startsWith('='),
    `ns_neighbors question should be a complete sentence, got: "${q.question}"`
  );
}

// Summary
console.log(`\nSUMMARY: ${passed} PASS / ${failed} FAIL / ${passed + failed} total`);
if (failures.length > 0) {
  console.error('\nFailures:');
  failures.forEach(f => console.error(' ', f));
  process.exit(1);
} else {
  console.log('PASS | number-sense-decimals-display-selftest.mjs');
}
