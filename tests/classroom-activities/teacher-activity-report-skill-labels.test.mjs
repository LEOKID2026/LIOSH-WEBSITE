import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  decorateWeakSkillsForTeacherDisplay,
  looksLikeRawInternalSkillKey,
  resolveClassroomSkillLabelHe,
} from "../../lib/classroom-activities/classroom-skill-labels-he.js";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const reportPageSrc = readFileSync(
  join(repoRoot, "../../pages/teacher/class/[classId]/activities/[activityId]/report.js"),
  "utf8"
);

test("geo_angle_measure resolves to elementary Hebrew label", () => {
  assert.equal(
    resolveClassroomSkillLabelHe("geo_angle_measure", { subject: "geometry" }),
    "חישוב זוויות"
  );
});

test("decorateWeakSkillsForTeacherDisplay never exposes raw geo_ keys as labels", () => {
  const rows = decorateWeakSkillsForTeacherDisplay(
    [
      {
        skillKey: "geo_angle_measure",
        accuracyPct: 33.33,
        answers: 6,
        correct: 2,
      },
      {
        skillKey: "geo_perimeter_formula",
        accuracyPct: 40,
        answers: 5,
        correct: 2,
      },
    ],
    "geometry"
  );

  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.ok(row.skillLabelHe);
    assert.ok(!looksLikeRawInternalSkillKey(row.skillLabelHe));
    assert.ok(!/^geo_/i.test(row.skillLabelHe));
    assert.match(row.skillLabelHe, /[\u0590-\u05FF]/);
  }
  assert.equal(rows[0].skillLabelHe, "חישוב זוויות");
  assert.equal(rows[0].accuracyPct, 33.33);
  assert.equal(rows[0].answers, 6);
  assert.equal(rows[0].correct, 2);
});

test("unknown geo_ keys fall back to safe Hebrew, not raw English", () => {
  const label = resolveClassroomSkillLabelHe("geo_future_skill_xyz", {
    subject: "geometry",
  });
  assert.ok(!looksLikeRawInternalSkillKey(label));
  assert.equal(label, "מיומנות בגאומטריה");
});

test("teacher activity report page renders skillLabelHe, not raw skillKey", () => {
  assert.ok(reportPageSrc.includes("skillLabelHe"));
  assert.ok(!reportPageSrc.includes("{w.skillKey}:"));
});

test("activity report CSV export uses shared Hebrew export module", () => {
  assert.ok(reportPageSrc.includes("downloadActivityReportCsv"));
  assert.ok(reportPageSrc.includes("teacher-activity-report-export"));
  assert.ok(!reportPageSrc.includes("student,status,answers,correct,score_pct"));
});

test("resolveClassroomSkillLabelHe avoids forbidden algebra wording for angles", () => {
  const label = resolveClassroomSkillLabelHe("geo_angle_measure", { subject: "geometry" });
  assert.ok(!/אלגברה/u.test(label));
});

test("geo_area_triangle_formula gated below G5 and fail-closed without grade", () => {
  assert.equal(
    resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
      subject: "geometry",
      gradeLevel: "g4",
    }),
    "מיומנות בגאומטריה"
  );
  assert.equal(
    resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
      subject: "geometry",
    }),
    "מיומנות בגאומטריה"
  );
  assert.equal(
    resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
      subject: "geometry",
      gradeLevel: 5,
    }),
    "שטח משולש"
  );
});

test("decorateWeakSkillsForTeacherDisplay passes gradeLevel for formula gate", () => {
  const rows = decorateWeakSkillsForTeacherDisplay(
    [{ skillKey: "geo_area_triangle_formula", accuracyPct: 20, answers: 5, correct: 1 }],
    "geometry",
    { gradeLevel: "g3" }
  );
  assert.equal(rows[0].skillLabelHe, "מיומנות בגאומטריה");
});
