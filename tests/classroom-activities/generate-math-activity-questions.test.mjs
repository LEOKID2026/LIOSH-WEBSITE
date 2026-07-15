import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GRADES } from "../../utils/math-constants.js";
import { topicOptionsForSubject } from "../../lib/teacher-portal/teacher-class-topic-options.js";
import { validateSameExactQuestionSet } from "../../lib/classroom-activities/classroom-activities-shared.server.js";
import {
  generateActivityQuestionSetClient,
  mathActivityKindMatchesOperation,
  normalizeMathActivityTopic,
} from "../../lib/classroom-activities/generate-activity-questions-client.js";

const ADAPTER_SRC = readFileSync(
  fileURLToPath(
    new URL("../../lib/classroom-activities/generate-activity-questions-client.js", import.meta.url)
  ),
  "utf8"
);

const PARENT_MODAL_SRC = readFileSync(
  fileURLToPath(new URL("../../components/parent/AssignActivityModal.js", import.meta.url)),
  "utf8"
);

const TEACHER_CLASS_SRC = readFileSync(
  fileURLToPath(
    new URL("../../pages/teacher/class/[classId]/activities/new.js", import.meta.url)
  ),
  "utf8"
);

const TEACHER_STUDENT_SRC = readFileSync(
  fileURLToPath(
    new URL("../../pages/teacher/students/activities/new.js", import.meta.url)
  ),
  "utf8"
);

test("adapter uses getLevelConfig and not mathOperationFromTopic", () => {
  assert.equal(ADAPTER_SRC.includes("mathOperationFromTopic"), false);
  assert.match(ADAPTER_SRC, /getLevelConfig/);
  assert.match(ADAPTER_SRC, /normalizeMathActivityTopic/);
  assert.match(ADAPTER_SRC, /mathActivityKindMatchesOperation/);
});

test("parent and teacher creation pages share corrected generator", () => {
  for (const src of [PARENT_MODAL_SRC, TEACHER_CLASS_SRC, TEACHER_STUDENT_SRC]) {
    assert.match(src, /generateActivityQuestionSetClient/);
  }
});

test("normalizeMathActivityTopic maps Hebrew decimals label", () => {
  assert.equal(normalizeMathActivityTopic("עשרוניים", "g5"), "decimals");
  assert.equal(normalizeMathActivityTopic("decimals", "g5"), "decimals");
});

test("normalizeMathActivityTopic rejects unsupported grade/topic", () => {
  assert.throws(
    () => normalizeMathActivityTopic("pythagoras", "g5"),
    /אין נושא מתמטיקה/
  );
  assert.throws(
    () => normalizeMathActivityTopic("ratio", "g3"),
    /אין נושא מתמטיקה/
  );
});

const REGRESSION_CASES = [
  { gradeLevel: "g5", topic: "decimals", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "percentages", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "fractions", forbidden: /^add_/ },
  { gradeLevel: "g3", topic: "division_with_remainder", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "word_problems", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "rounding", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "equations", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "compare", forbidden: /^add_/ },
  { gradeLevel: "g5", topic: "sequences", forbidden: /^add_/ },
];

for (const tc of REGRESSION_CASES) {
  test(`math regression ${tc.gradeLevel} ${tc.topic}`, async () => {
    const qs = await generateActivityQuestionSetClient({
      subject: "math",
      gradeLevel: tc.gradeLevel,
      topic: tc.topic,
      difficulty: "medium",
      count: 5,
    });
    assert.equal(qs.length, 5);
    for (const item of qs) {
      assert.equal(item.subject, "math");
      assert.equal(item.topic, tc.topic);
      const kind = String(item.params?.kind || "");
      assert.equal(mathActivityKindMatchesOperation(tc.topic, kind), true);
      assert.equal(tc.forbidden.test(kind), false, `unexpected kind ${kind}`);
    }
    const v = validateSameExactQuestionSet(qs, 5);
    assert.equal(v.ok, true);
  });
}

test("g5 decimals generates dec_* kinds only", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "math",
    gradeLevel: "g5",
    topic: "decimals",
    difficulty: "medium",
    count: 10,
  });
  for (const item of qs) {
    assert.match(String(item.params?.kind || ""), /^dec_/);
  }
});

test("g5 percentages generates perc_* kinds only", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "math",
    gradeLevel: "g5",
    topic: "percentages",
    difficulty: "medium",
    count: 10,
  });
  for (const item of qs) {
    assert.match(String(item.params?.kind || ""), /^perc_/);
  }
});

test("g5 fractions generates fraction-family kinds", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "math",
    gradeLevel: "g5",
    topic: "fractions",
    difficulty: "medium",
    count: 10,
  });
  for (const item of qs) {
    const kind = String(item.params?.kind || "");
    assert.equal(
      kind.startsWith("frac_") || kind === "mixed_to_frac",
      true,
      `unexpected kind ${kind}`
    );
  }
});

test("invalid math topic throws before unrelated questions are returned", async () => {
  await assert.rejects(
    () =>
      generateActivityQuestionSetClient({
        subject: "math",
        gradeLevel: "g5",
        topic: "not_a_real_topic",
        difficulty: "medium",
        count: 5,
      }),
    /אין נושא מתמטיקה/
  );
});

const MATRIX_GRADES = Object.keys(GRADES);

for (const gradeLevel of MATRIX_GRADES) {
  test(`math matrix ${gradeLevel} - all listed operations match topic family`, async () => {
    const topics = topicOptionsForSubject("math", gradeLevel).map((o) => o.key);
    assert.ok(topics.length > 0);

    for (const topic of topics) {
      const qs = await generateActivityQuestionSetClient({
        subject: "math",
        gradeLevel,
        topic,
        difficulty: "medium",
        count: 3,
      });
      assert.equal(qs.length, 3, `${gradeLevel}/${topic} count`);
      for (const item of qs) {
        assert.equal(item.topic, topic, `${gradeLevel}/${topic} stored topic`);
        const kind = String(item.params?.kind || "");
        assert.equal(
          mathActivityKindMatchesOperation(topic, kind),
          true,
          `${gradeLevel}/${topic} kind=${kind}`
        );
      }
    }
  });
}
