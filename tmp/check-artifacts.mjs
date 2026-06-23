/**
 * Point-check: simulate repairLengthOutliers + sanitizeHebrewMcqAnswer
 * on questions that previously produced "באופן שונה" artifacts.
 */
import { repairMcqObviousAnswerContent } from '../utils/mcq-fail-content-repair.js';
import { sanitizeHebrewMcqAnswer, sanitizeQuestionForStudentDisplay } from '../utils/student-question-stem-sanitizer.js';

let allOk = true;
function check(label, condition) {
  const result = condition ? 'OK' : 'FAIL';
  if (!condition) allOk = false;
  console.log(`  [${result}] ${label}`);
}

// --- Test 1: padShortOption no longer pads Hebrew answers ---
const shortAnswerQ = {
  question: 'הַאֲזִינוּ וּבָחֲרוּ: לפי הרמז: משהו שמחברים בין שני ספרים על המדף.',
  answers: ['כובע', 'מטבע', 'מעמד ספרים', 'כפפה'],
  correctIndex: 2,
};
const repaired = repairMcqObviousAnswerContent(shortAnswerQ);
console.log('\nTest 1 — short Hebrew distractors do NOT get "באופן שונה" appended:');
console.log('  answers:', repaired.answers ?? repaired.options);
check('no artifacts', !(repaired.answers ?? repaired.options ?? []).some(a =>
  /באופן שונה|במקרה אחר|באזור אחר|\(לא\)|\(אחר\)/.test(String(a))
));
check('answers unchanged', JSON.stringify(repaired.answers) === JSON.stringify(shortAnswerQ.answers));

// --- Test 2: sanitizeHebrewMcqAnswer strips all known artifact patterns ---
const cases = [
  ['כובע באופן שונה',           'כובע'],
  ['מטבע במקרה אחר',            'מטבע'],
  ['כפפה באזור אחר',            'כפפה'],
  ['שולחן (לא)',                 'שולחן'],
  ['ספר (אחר)',                  'ספר'],
  ['שכח לבוא (בלי קריאה)',      'שכח לבוא'],
  ['שכח להביא בלי בתיק',        'שכח להביא'],
  ['מילים בלי מילים',            'מילים'],
  ['תשובה טבעית',               'תשובה טבעית'],  // must NOT be changed
  ['ירח',                       'ירח'],          // must NOT be changed
];
console.log('\nTest 2 — sanitizeHebrewMcqAnswer:');
for (const [input, expected] of cases) {
  const got = sanitizeHebrewMcqAnswer(input);
  check(`"${input}" => "${got}" (expected "${expected}")`, got === expected);
}

// --- Test 3: sanitizeQuestionForStudentDisplay cleans answers in full question ---
const dirtyQ = {
  question: 'הַאֲזִינוּ וּבָחֲרוּ: מי הולך לבית הספר ולומד שם?',
  answers: ['ילד או ילדה', 'שולחן באופן שונה', 'מורה בלבד', 'ספר באופן שונה'],
  correctIndex: 0,
};
const displayQ = sanitizeQuestionForStudentDisplay(dirtyQ);
const displayAnswers = displayQ.answers ?? displayQ.options ?? [];
console.log('\nTest 3 — sanitizeQuestionForStudentDisplay cleans full question:');
console.log('  answers:', displayAnswers);
check('no "באופן שונה" in answers', !displayAnswers.some(a => /באופן שונה/.test(String(a))));
check('answer count unchanged', displayAnswers.length === 4);

// --- Test 4: Punctuation answers keep all symbols (reordering is pre-existing from ensureMcqFourOptions) ---
const punctQ = {
  question: "הַאֲזִינוּ וּבָחֲרוּ: במשפט 'איזה יום יפה' — איזה סימן מתאים בסוף?",
  answers: ['!', '?', ',', '.'],
  correctIndex: 0,
};
const punctDisplay = sanitizeQuestionForStudentDisplay(punctQ);
const punctAnswers = punctDisplay.answers ?? punctDisplay.options ?? [];
console.log('\nTest 4 — punctuation answers (reordering is pre-existing, content must be preserved):');
console.log('  input:  ', punctQ.answers);
console.log('  output: ', punctAnswers);
const punctSymbols = ['!', '?', ',', '.'];
check('all 4 punctuation symbols present', punctSymbols.every(s => punctAnswers.includes(s)));
check('count unchanged (4)', punctAnswers.length === 4);

// --- Test 5: English not affected ---
const engQ = {
  question: 'Choose the correct word:',
  answers: ['cat', 'dog', 'fish', 'bird'],
  correctIndex: 0,
};
const engRepaired = repairMcqObviousAnswerContent(engQ);
console.log('\nTest 5 — English not affected by Hebrew guard:');
console.log('  answers:', engRepaired.answers);
check('English answers unchanged', JSON.stringify(engRepaired.answers) === JSON.stringify(engQ.answers));

// --- Test 6: Hebrew (לא)/(אחר) from repairFormatOutliers no longer added ---
const formatQ = {
  question: 'הַאֲזִינוּ: בחר תשובה (נכון / לא נכון).',
  answers: ['כן (נכון)', 'ילד', 'שמש', 'בית'],
  correctIndex: 0,
};
const formatRepaired = repairMcqObviousAnswerContent(formatQ);
console.log('\nTest 6 — repairFormatOutliers does NOT add (לא)/(אחר) to Hebrew answers:');
console.log('  answers:', formatRepaired.answers ?? formatRepaired.options);
check('no (לא)/(אחר) appended', !(formatRepaired.answers ?? formatRepaired.options ?? []).some(a =>
  /\(לא\)|\(אחר\)/.test(String(a))
));

console.log('\n=== Summary:', allOk ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
