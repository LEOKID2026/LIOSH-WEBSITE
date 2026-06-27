#!/usr/bin/env node
// Hebrew PASS 1 exact cleanup — applies only explicit replacements from JSON.
// Scope: exports/audio-text/books/hebrew/**/pages/page-*.txt
// Do not use for free rewrite/audit.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.cwd();
const replacementsPath = process.argv[2] || path.join(__dirname, 'hebrew_pass1_exact_replacements.json');
const replacements = JSON.parse(fs.readFileSync(replacementsPath, 'utf8'));
const baseDir = path.join(repoRoot, 'exports', 'audio-text', 'books', 'hebrew');

let applied = 0;
const changedFiles = new Set();
const missing = [];

for (const r of replacements) {
  const filePath = path.join(baseDir, r.file);
  if (!fs.existsSync(filePath)) {
    missing.push({ file: r.file, reason: 'file_not_found' });
    continue;
  }
  const before = fs.readFileSync(filePath, 'utf8');
  const count = before.split(r.old).length - 1;
  if (count !== 1) {
    missing.push({ file: r.file, reason: `expected_once_found_${count}`, old: r.old });
    continue;
  }
  const after = before.replace(r.old, r.new);
  fs.writeFileSync(filePath, after, 'utf8');
  applied += 1;
  changedFiles.add(r.file);
}

console.log(JSON.stringify({
  applied,
  expected: replacements.length,
  changedFileCount: changedFiles.size,
  changedFiles: Array.from(changedFiles).sort(),
  missingCount: missing.length,
  missing
}, null, 2));

if (missing.length) process.exit(1);
