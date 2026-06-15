const fs = require('fs');
const registries = [
  { f: 'lib/learning-book/math-g1-registry.js', subject: 'math', grade: 'g1' },
  { f: 'lib/learning-book/math-g2-registry.js', subject: 'math', grade: 'g2' },
  { f: 'lib/learning-book/math-g3-registry.js', subject: 'math', grade: 'g3' },
  { f: 'lib/learning-book/math-g4-registry.js', subject: 'math', grade: 'g4' },
  { f: 'lib/learning-book/math-g5-registry.js', subject: 'math', grade: 'g5' },
  { f: 'lib/learning-book/math-g6-registry.js', subject: 'math', grade: 'g6' },
  { f: 'lib/learning-book/geometry-g1-registry.js', subject: 'geometry', grade: 'g1' },
  { f: 'lib/learning-book/geometry-g2-registry.js', subject: 'geometry', grade: 'g2' },
  { f: 'lib/learning-book/geometry-g3-registry.js', subject: 'geometry', grade: 'g3' },
  { f: 'lib/learning-book/geometry-g4-registry.js', subject: 'geometry', grade: 'g4' },
  { f: 'lib/learning-book/geometry-g5-registry.js', subject: 'geometry', grade: 'g5' },
  { f: 'lib/learning-book/geometry-g6-registry.js', subject: 'geometry', grade: 'g6' },
];

const result = {};
for (const r of registries) {
  const c = fs.readFileSync(r.f, 'utf8');
  // Extract strings inside pages: [ ... ] arrays
  const blockMatches = Array.from(c.matchAll(/pages\s*:\s*\[([^\]]+)\]/gs));
  let allIds = [];
  for (const m of blockMatches) {
    // match quoted strings
    const ids = Array.from(m[1].matchAll(/["'](\w+)["']/g)).map(x => x[1]);
    allIds = allIds.concat(ids);
  }
  result[r.subject + '_' + r.grade] = { subject: r.subject, grade: r.grade, file: r.f, pages: allIds };
  console.log(r.subject + ' ' + r.grade + ': ' + allIds.length + ' pages');
  console.log('  ' + allIds.join(', '));
}

fs.writeFileSync('scripts/qa/all-book-pages.json', JSON.stringify(result, null, 2));
console.log('\nSaved to scripts/qa/all-book-pages.json');
