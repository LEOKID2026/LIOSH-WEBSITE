import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getTopicLaunchRow,
  getTopicLaunchLevel,
  getDiagnosticContributionMetadata,
  getMarketingMetadata,
  isTopicAllowedOnSurface,
  isTopicHiddenFromLaunch,
  getAllTopicLaunchRows,
  getRegistryMeta,
} from "../../lib/launch-readiness/topic-launch-policy.js";
import { LAUNCH_SURFACES } from "../../lib/launch-readiness/launch-surfaces.js";
import { computeLaunchLevel, buildRegistryRow } from "../../lib/launch-readiness/compute-launch-row.js";
import { topicOptionsForSubject } from "../../lib/teacher-portal/teacher-class-topic-options.js";
import { topicOptionsForAssignedActivity } from "../../lib/classroom-activities/assigned-activity-topic-options.js";

describe("launch-readiness policy", () => {
  it("registry has rows", () => {
    const meta = getRegistryMeta();
    assert.ok(meta.rowCount > 0);
    assert.equal(getAllTopicLaunchRows().length, meta.rowCount);
  });

  it("moledet g1 is HIDE and not in pickers", () => {
    assert.equal(getTopicLaunchLevel("moledet_geography", "g1", "homeland"), null);
    const opts = topicOptionsForSubject("moledet_geography", "g1");
    assert.equal(opts.length, 0);
  });

  it("math g1 addition is FULL", () => {
    const row = getTopicLaunchRow("math", "g1", "addition");
    assert.ok(row);
    assert.equal(row.launchLevel, "FULL");
    assert.equal(row.diagnosticContribution, "normal");
    assert.equal(row.surfaces.parentAssign, true);
  });

  it("prime_composite g4 is FULL after Phase 2 authoring", () => {
    const row = getTopicLaunchRow("math", "g4", "prime_composite");
    assert.ok(row);
    assert.equal(row.launchLevel, "FULL");
    assert.equal(row.surfaces.selfPractice, true);
    assert.equal(row.surfaces.parentAssign, true);
    assert.equal(row.diagnosticContribution, "normal");
    assert.equal(row.inventoryStatus, "PROFESSIONAL_READY");
  });

  it("hebrew g3 writing is PRACTICE_ONLY and not assignable", () => {
    const row = getTopicLaunchRow("hebrew", "g3", "writing");
    assert.ok(row);
    assert.equal(row.launchLevel, "PRACTICE_ONLY");
    assert.equal(row.surfaces.parentAssign, false);
    assert.equal(
      isTopicAllowedOnSurface("hebrew", "g3", "writing", LAUNCH_SURFACES.PARENT_ASSIGN),
      false
    );
    const assignKeys = topicOptionsForAssignedActivity("hebrew", "g3").map((o) => o.key);
    assert.ok(!assignKeys.includes("writing"));
  });

  it("english g1 vocabulary is PRACTICE_ONLY", () => {
    const row = getTopicLaunchRow("hebrew", "g1", "reading");
    assert.ok(row);
    assert.ok(["PRACTICE_ONLY", "LIMITED"].includes(row.launchLevel));
    const eng = getTopicLaunchRow("english", "g1", "vocabulary");
    assert.ok(eng);
    assert.equal(eng.launchLevel, "PRACTICE_ONLY");
  });

  it("diagnosticContribution is metadata only", () => {
    assert.equal(getDiagnosticContributionMetadata("math", "g1", "addition"), "normal");
    assert.equal(getDiagnosticContributionMetadata("hebrew", "g3", "writing"), "manual_only");
  });

  it("marketing metadata is internal shape only", () => {
    const m = getMarketingMetadata("math", "g1", "addition");
    assert.ok(m);
    assert.equal(typeof m.marketingEligible, "boolean");
    assert.ok(m.marketingNoteInternal);
  });

  it("computeLaunchLevel marks critical blockers LIMITED", () => {
    const { launchLevel } = computeLaunchLevel("math", "g4", "prime_composite", {
      criticalBlocking: true,
      topicTotal: 0,
    });
    assert.equal(launchLevel, "LIMITED");
  });

  it("buildRegistryRow sets book-first for hebrew g1", () => {
    const row = buildRegistryRow("hebrew", "g1", "reading", { topicTotal: 40, needsAuthoring: true });
    assert.equal(row.bookFirstRecommended, true);
    assert.ok(row.bookFirstSoftGateTopics.includes("grammar"));
  });

  it("HIDE topics filtered from self-practice picker", () => {
    for (const row of getAllTopicLaunchRows()) {
      if (row.launchLevel !== "HIDE") continue;
      assert.equal(
        isTopicAllowedOnSurface(row.subject, row.grade, row.topic, LAUNCH_SURFACES.SELF_PRACTICE),
        false
      );
      assert.equal(isTopicHiddenFromLaunch(row.subject, row.grade, row.topic), true);
    }
  });
});
