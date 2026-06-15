const fs = require('fs');
const files = [
  'lib/learning-book/math-g1-registry.js',
  'lib/learning-book/math-g2-registry.js',
  'lib/learning-book/math-g3-registry.js',
  'lib/learning-book/math-g4-registry.js',
  'lib/learning-book/math-g5-registry.js',
  'lib/learning-book/math-g6-registry.js',
  'lib/learning-book/geometry-g1-registry.js',
  'lib/learning-book/geometry-g2-registry.js',
  'lib/learning-book/geometry-g3-registry.js',
  'lib/learning-book/geometry-g4-registry.js',
  'lib/learning-book/geometry-g5-registry.js',
  'lib/learning-book/geometry-g6-registry.js',
];
for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const idMatches = Array.from(content.matchAll(/pageId\s*:\s*['"]([^'"]+)['"]/g)).map(m=>m[1]);
    const routeMatches = Array.from(content.matchAll(/route\s*:\s*['"]([^'"]+)['"]/g)).map(m=>m[1]);
    const slugMatches = Array.from(content.matchAll(/slug\s*:\s*['"]([^'"]+)['"]/g)).map(m=>m[1]);
    const idMatches2 = Array.from(content.matchAll(/id\s*:\s*['"]([^'"]+)['"]/g)).map(m=>m[1]);
    console.log(f + ' => pageIds:'+idMatches.length+' routes:'+routeMatches.length+' slugs:'+slugMatches.length+' ids:'+idMatches2.length);
    if (idMatches.length>0) console.log('  pageIds:',idMatches.slice(0,8).join(', '));
    if (routeMatches.length>0) console.log('  routes:',routeMatches.slice(0,4).join(', '));
    if (slugMatches.length>0) console.log('  slugs:',slugMatches.slice(0,8).join(', '));
    if (idMatches2.length>0) console.log('  ids:',idMatches2.slice(0,8).join(', '));
  } catch(e) {
    console.log(f+': ERROR - '+e.message);
  }
}
