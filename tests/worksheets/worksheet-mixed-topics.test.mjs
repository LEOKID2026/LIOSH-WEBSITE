/**
 * Mixed topic subset filter — printable worksheets.
 * Run: node --test tests/worksheets/worksheet-mixed-topics.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  filterMixedPoolBySelection,
  listWorksheetMixedTopicOptions,
  listWorksheetMixedPoolTopicKeys,
  normalizeWorksheetMixedTopicKeys,
} from "../../lib/worksheets/worksheet-mixed-topics.js";
import { validateWorksheetPublicGenerationParams } from "../../lib/worksheets/worksheet-level-map.server.js";
import { selectWorksheetQuestions } from "../../lib/worksheets/worksheet-question-selector.server.js";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";
import { WORKSHEET_HUB_ENTRY_ENABLED } from "../../lib/worksheets/worksheet-hub-entry-enabled.js";

describe("worksheet-mixed-topics", () => {
  test("hub entry is enabled for parent QA", () => {
    assert.equal(WORKSHEET_HUB_ENTRY_ENABLED, false);
  });

  test("mixed itself is never listed for any core subject", () => {
    for (const subjectId of ["math", "geometry", "hebrew", "english"]) {
      for (const gradeKey of ["g3", "g5", "g6"]) {
        const opts = listWorksheetMixedTopicOptions(subjectId, gradeKey);
        assert.ok(opts.every((o) => o.key !== "mixed"), `${subjectId}/${gradeKey}`);
        assert.ok(opts.every((o) => o.label && !/^[a-z_]+$/.test(o.label)), `${subjectId} has Hebrew labels`);
      }
    }
  });

  test("default / omitted selection equals full pool", () => {
    const full = listWorksheetMixedPoolTopicKeys("math", "g3");
    assert.ok(full.length >= 2);
    const norm = normalizeWorksheetMixedTopicKeys("math", "g3", undefined);
    assert.equal(norm.ok, true);
    assert.equal(norm.mixedTopicKeys, null);
    assert.deepEqual(filterMixedPoolBySelection(full, null), full);
  });

  test("all topics selected normalizes to null (legacy mixed)", () => {
    const full = listWorksheetMixedPoolTopicKeys("hebrew", "g3");
    const norm = normalizeWorksheetMixedTopicKeys("hebrew", "g3", full);
    assert.equal(norm.ok, true);
    assert.equal(norm.mixedTopicKeys, null);
  });

  test("empty selection is blocked", () => {
    const empty = normalizeWorksheetMixedTopicKeys("english", "g3", []);
    assert.equal(empty.ok, false);
    assert.equal(empty.error, "MIXED_TOPICS_EMPTY");
    const v = validateWorksheetPublicGenerationParams({
      subjectId: "english",
      gradeKey: "g3",
      topicKey: "mixed",
      levelKey: "regular",
      count: 6,
      mixedTopicKeys: [],
    });
    assert.equal(v.ok, false);
    assert.equal(v.error, "MIXED_TOPICS_EMPTY");
  });

  test("subset filters pool and questions", async () => {
    const pool = listWorksheetMixedPoolTopicKeys("geometry", "g6");
    assert.ok(pool.length >= 2);
    const keep = pool.filter((k) => k !== "volume" && k !== "solids").slice(0, 2);
    assert.ok(keep.length >= 1);
    const filtered = filterMixedPoolBySelection(pool, keep);
    assert.deepEqual(filtered.sort(), keep.slice().sort());
    assert.equal(filtered.includes("volume"), false);

    const selected = await selectWorksheetQuestions({
      subjectId: "geometry",
      gradeKey: "g6",
      topicKey: "mixed",
      levelKey: "medium",
      count: 6,
      seed: 4242,
      mixedTopicKeys: keep,
    });
    assert.ok(selected.questions.length >= 3);
    for (const q of selected.questions) {
      const topic = String(q.topic || q.operation || "");
      assert.ok(keep.includes(topic), `unexpected topic ${topic}`);
    }
  });

  test("math mixed with one topic removed stays within selection", async () => {
    const pool = listWorksheetMixedPoolTopicKeys("math", "g4");
    assert.ok(pool.length >= 2);
    const keep = pool.slice(0, Math.max(1, pool.length - 1));
    const selected = await selectWorksheetQuestions({
      subjectId: "math",
      gradeKey: "g4",
      topicKey: "mixed",
      levelKey: "medium",
      count: 8,
      seed: 909,
      mixedTopicKeys: keep,
    });
    assert.ok(selected.questions.length >= 4);
    for (const q of selected.questions) {
      const topic = String(q.topic || q.operation || "");
      assert.ok(keep.includes(topic), `math topic leaked: ${topic}`);
    }
  });

  test("hebrew two topics only", async () => {
    const pool = listWorksheetMixedPoolTopicKeys("hebrew", "g4");
    const keep = pool.slice(0, 2);
    assert.equal(keep.length, 2);
    const selected = await selectWorksheetQuestions({
      subjectId: "hebrew",
      gradeKey: "g4",
      topicKey: "mixed",
      levelKey: "medium",
      count: 6,
      seed: 77,
      mixedTopicKeys: keep,
    });
    assert.ok(selected.questions.length >= 3);
    for (const q of selected.questions) {
      assert.ok(keep.includes(String(q.topic || q.operation || "")));
    }
  });

  test("english single topic mixed", async () => {
    const pool = listWorksheetMixedPoolTopicKeys("english", "g3");
    const keep = [pool[0]];
    const selected = await selectWorksheetQuestions({
      subjectId: "english",
      gradeKey: "g3",
      topicKey: "mixed",
      levelKey: "medium",
      count: 5,
      seed: 55,
      mixedTopicKeys: keep,
    });
    assert.ok(selected.questions.length >= 2);
    for (const q of selected.questions) {
      assert.equal(String(q.topic || q.operation || ""), keep[0]);
    }
  });

  test("grade change yields different option lists", () => {
    const g3 = listWorksheetMixedTopicOptions("geometry", "g3").map((o) => o.key);
    const g6 = listWorksheetMixedTopicOptions("geometry", "g6").map((o) => o.key);
    assert.ok(g3.length >= 2);
    assert.ok(g6.length >= 2);
    assert.equal(g3.includes("mixed"), false);
    assert.equal(g6.includes("mixed"), false);
    assert.notDeepEqual(g3, g6);
  });

  test("omitting mixedTopicKeys keeps legacy mixed behavior", async () => {
    const v = validateWorksheetPublicGenerationParams({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "mixed",
      levelKey: "regular",
      count: 6,
      seed: 1,
    });
    assert.equal(v.ok, true);
    assert.equal(v.selectorParams.mixedTopicKeys, undefined);

    const gen = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "mixed",
      levelKey: "regular",
      count: 6,
      seed: 12,
    });
    assert.equal(gen.ok, true, gen.code || gen.message);
    assert.equal(gen.generation.mixedTopicKeys, undefined);
  });
});
