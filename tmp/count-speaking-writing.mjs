import { HEBREW_RICH_POOL } from '../utils/hebrew-rich-question-bank.js';
const counts = {};
for (const r of HEBREW_RICH_POOL) {
  if (r.topic !== 'speaking' && r.topic !== 'writing') continue;
  const minG = r.minGrade ?? (r.gradeBand === 'early' ? 1 : r.gradeBand === 'mid' ? 3 : 99);
  const maxG = r.maxGrade ?? (r.gradeBand === 'early' ? 2 : r.gradeBand === 'mid' ? 5 : 99);
  const key = r.topic + '_g' + minG + '-' + maxG;
  counts[key] = (counts[key] || 0) + 1;
}
console.log(JSON.stringify(counts, null, 2));
console.log('Total speaking G1/G2:', Object.entries(counts).filter(([k])=>k.startsWith('speaking') && parseInt(k.split('g')[1]) <= 2).reduce((s,[,v])=>s+v,0));
console.log('Total writing G1/G2:', Object.entries(counts).filter(([k])=>k.startsWith('writing') && parseInt(k.split('g')[1]) <= 2).reduce((s,[,v])=>s+v,0));
