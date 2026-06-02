/**
 * Verify Moledet / Geography learning-book master scope mapping (documentation only).
 * Run: node scripts/verify-moledet-geography-learning-book-master-scope.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SPINE_SUBJECT,
  PAGE_CANDIDATES_BY_GRADE,
} from "./lib/moledet-geography-master-scope-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SPINE_PATH = path.join(ROOT, "data/curriculum-spine/v1/skills.json");
const MASTER_PLAN_PATH = path.join(
  ROOT,
  "docs/learning-book/MOLEDET_GEOGRAPHY_LEARNING_BOOK_MASTER_SCOPE_PLAN.md"
);

const FORBIDDEN_RUNTIME_PATHS = [
  "lib/learning-book/moledet-geography",
  "docs/learning-book/moledet-geography",
  "docs/learning-book/moledet_geography",
  "pages/learning/moledet-geography-learning-book",
];

const errors = [];

function gradeFromSkillId(skillId) {
  const m = skillId.match(/^geography:g(\d):/);
  return m ? Number(m[1]) : null;
}

const spine = JSON.parse(fs.readFileSync(SPINE_PATH, "utf8"));
const spineById = new Map(spine.skills.map((s) => [s.skill_id, s]));
const geographySkills = spine.skills.filter((s) => s.subject === SPINE_SUBJECT);

if (!fs.existsSync(MASTER_PLAN_PATH)) {
  errors.push(`Missing master plan: ${MASTER_PLAN_PATH}`);
}

for (const rel of FORBIDDEN_RUNTIME_PATHS) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) {
    errors.push(`Forbidden runtime/draft path exists (mapping-only task): ${rel}`);
  }
}

/** @type {Set<string>} */
const covered = new Set();

for (const [gradeKey, pages] of Object.entries(PAGE_CANDIDATES_BY_GRADE)) {
  const gradeNum = Number(gradeKey.replace(/\D/g, ""));

  for (const page of pages) {
    const allIds = [page.primary_skill_id, ...page.bound_skill_ids];
    for (const skillId of allIds) {
      if (covered.has(skillId)) {
        errors.push(`Duplicate skill mapping: ${skillId}`);
      }
      covered.add(skillId);

      const row = spineById.get(skillId);
      if (!row) {
        errors.push(`Mapped skill not in spine: ${skillId}`);
        continue;
      }
      if (row.subject !== SPINE_SUBJECT) {
        errors.push(`Subject mixing: ${skillId} has subject "${row.subject}"`);
      }
      if (row.minGrade > gradeNum || row.maxGrade < gradeNum) {
        errors.push(
          `Grade filter mismatch: ${skillId} mapped to ${gradeKey} but spine min/max=${row.minGrade}-${row.maxGrade}`
        );
      }
      const idGrade = gradeFromSkillId(skillId);
      if (idGrade !== gradeNum) {
        errors.push(`Skill id grade prefix g${idGrade} does not match page grade ${gradeKey}`);
      }
    }
  }

  const expectedForGrade = geographySkills.filter(
    (s) => s.minGrade <= gradeNum && s.maxGrade >= gradeNum
  );
  for (const row of expectedForGrade) {
    if (!covered.has(row.skill_id)) {
      errors.push(`Spine skill not covered by manifest for ${gradeKey}: ${row.skill_id}`);
    }
  }
}

for (const row of geographySkills) {
  if (!covered.has(row.skill_id)) {
    errors.push(`Spine geography skill missing from manifest: ${row.skill_id}`);
  }
}

const nonGeographyInManifest = [...covered].filter((id) => {
  const row = spineById.get(id);
  return row && row.subject !== SPINE_SUBJECT;
});
for (const id of nonGeographyInManifest) {
  errors.push(`Non-geography skill in manifest: ${id}`);
}

const pageCounts = Object.fromEntries(
  Object.entries(PAGE_CANDIDATES_BY_GRADE).map(([g, pages]) => [g, pages.length])
);

if (errors.length) {
  console.error("verify-moledet-geography-learning-book-master-scope: FAIL");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("verify-moledet-geography-learning-book-master-scope: PASS");
console.log(`  spine subject key: ${SPINE_SUBJECT}`);
console.log(`  total spine skills: ${geographySkills.length}`);
console.log(`  mapped skills: ${covered.size}`);
console.log(`  proposed pages by grade: ${JSON.stringify(pageCounts)}`);
console.log("  no forbidden runtime paths created");
