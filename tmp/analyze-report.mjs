import { readFile } from 'fs/promises';
const raw = await readFile('reports/hebrew-final-visual-runtime-qa/visual-runtime-3099.json', 'utf8');
const data = JSON.parse(raw);
const samples = data.samples;

// Grade 1 only
const g1 = samples.filter(s => s.grade === '1');
const g2 = samples.filter(s => s.grade === '2');

const topics = ['reading','comprehension','grammar','vocabulary'];
const topicHe = {reading:'Reading/קריאה',comprehension:'Comprehension/הבנת הנקרא',grammar:'Grammar/דקדוק',vocabulary:'Vocabulary/עושר שפתי'};

console.log('=== Grade 1 Summary ===');
console.log('Total questions:', g1.length);
for (const t of topics) {
  const rows = g1.filter(s => s.topic === t);
  const withNiqqudQ = rows.filter(s => !s.issues.includes('missing_niqqud_question'));
  const noNiqqudQ = rows.filter(s => s.issues.includes('missing_niqqud_question'));
  const withNiqqudA = rows.filter(s => !s.issues.includes('missing_niqqud_answer'));
  const noNiqqudA = rows.filter(s => s.issues.includes('missing_niqqud_answer'));
  const withAudio = rows.filter(s => s.audio && s.audio.visible === true);
  const noAudio = rows.filter(s => s.audio && s.audio.required && s.audio.visible === false);
  console.log('\n--- ' + topicHe[t] + ' (' + rows.length + ' Q) ---');
  console.log('  niqqud question: OK=' + withNiqqudQ.length + ' MISSING=' + noNiqqudQ.length);
  console.log('  niqqud answers:  OK=' + withNiqqudA.length + ' MISSING=' + noNiqqudA.length);
  console.log('  audio: visible=' + withAudio.length + ' not-visible=' + noAudio.length);
}

console.log('\n=== Grade 2 Summary ===');
console.log('Total questions:', g2.length);
for (const t of topics) {
  const rows = g2.filter(s => s.topic === t);
  const noNiqqudQ = rows.filter(s => s.issues.includes('missing_niqqud_question'));
  const noNiqqudA = rows.filter(s => s.issues.includes('missing_niqqud_answer'));
  const withAudio = rows.filter(s => s.audio && s.audio.visible === true);
  const noAudio = rows.filter(s => s.audio && s.audio.required && s.audio.visible === false);
  console.log('  ' + topicHe[t] + ': niqqudQ-missing=' + noNiqqudQ.length + '/' + rows.length + ' niqqudA-missing=' + noNiqqudA.length + '/' + rows.length + ' audio-visible=' + withAudio.length + ' not-visible=' + noAudio.length);
}

// All issue types
console.log('\n=== All Issue Types (entire report) ===');
const allIssues = {};
for (const s of samples) {
  for (const issue of s.issues) {
    allIssues[issue] = (allIssues[issue]||0) + 1;
  }
}
for (const [k,v] of Object.entries(allIssues).sort((a,b)=>b[1]-a[1])) {
  console.log('  ' + k + ': ' + v);
}

// Grade 3-6
console.log('\n=== Grades 3-6 ===');
for (const g of ['3','4','5','6']) {
  const rows = samples.filter(s => s.grade === g);
  const withIssues = rows.filter(s => s.issues.length > 0);
  const issues = {};
  for (const s of rows) for (const i of s.issues) { issues[i] = (issues[i]||0)+1; }
  console.log('  Grade ' + g + ': ' + rows.length + ' Q, ' + withIssues.length + ' with issues: ' + JSON.stringify(issues));
}

// Any audio visible?
const anyAudio = samples.filter(s => s.audio && s.audio.visible === true);
console.log('\nQuestions with audio visible: ' + anyAudio.length);
if (anyAudio.length > 0) {
  for (const s of anyAudio.slice(0,5)) {
    console.log('  [G' + s.grade + '/' + s.topic + '] ' + s.question.slice(0,70) + '  audioStatus=' + s.audio.status);
  }
}

// G1 full samples
console.log('\n=== G1 Full Samples (first 20) ===');
for (let i = 0; i < Math.min(20, g1.length); i++) {
  const s = g1[i];
  console.log('\n[' + (i+1) + '] topic=' + s.topic + ' mode=' + s.mode);
  console.log('  Q: ' + s.question);
  console.log('  A: ' + s.answers.join(' | '));
  console.log('  audio.visible=' + s.audio?.visible + ' audio.status=' + s.audio?.status);
  console.log('  issues: ' + s.issues.join(', '));
}

// G1 samples 21-40 if available
if (g1.length > 20) {
  console.log('\n=== G1 Full Samples (21-40) ===');
  for (let i = 20; i < Math.min(40, g1.length); i++) {
    const s = g1[i];
    console.log('\n[' + (i+1) + '] topic=' + s.topic + ' mode=' + s.mode);
    console.log('  Q: ' + s.question);
    console.log('  A: ' + s.answers.join(' | '));
    console.log('  audio.visible=' + s.audio?.visible);
    console.log('  issues: ' + s.issues.join(', '));
  }
}

// Check for metadata issues in answers specifically
const metaIssues = samples.filter(s => 
  s.answers.some(a => /\(בלי/.test(a) || /undefined|null|NaN/.test(a) || /\bID\b/.test(a))
);
console.log('\nAnswers with metadata/BLI/undefined/null/NaN: ' + metaIssues.length);
if (metaIssues.length > 0) {
  for (const s of metaIssues.slice(0,5)) {
    console.log('  [G' + s.grade + '] ' + s.answers.join(' | '));
  }
}

// Punctuation questions
const punctQ = samples.filter(s => 
  s.question.includes('פיסוק') || s.question.includes('סימן') || s.question.includes('נקודה') || s.question.includes('שאלה')
);
console.log('\nPunctuation-related questions: ' + punctQ.length);
for (const s of punctQ.slice(0,5)) {
  console.log('  [G' + s.grade + '/' + s.topic + '] Q:' + s.question.slice(0,80));
  console.log('    A: ' + s.answers.join(' | '));
}
