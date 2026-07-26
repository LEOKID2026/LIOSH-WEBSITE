/**
 * Focused tests: secondary_observed parent-facing wording + forbidden phrase guard.
 * Run: node --test tests/learning/secondary-observed-parent-finding-copy.test.mjs
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildParentReportEngineDecisionContract } from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import {
  findSpecForbiddenPhrasesInString,
  SPEC_FORBIDDEN_PARENT_PHRASES,
} from "../../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { buildRegularReportViewModel } from "../../lib/parent-ui/parent-report-regular-display.js";

function secondaryObservedFixture() {
  const unit = {
    subjectId: "geometry",
    topicRowKey: "area::grade:g4",
    displayName: "שטח",
    classification: { state: "classified" },
    taxonomy: {
      id: "G-03",
      patternHe: "בחירת צלע שאינה גובה",
      selectedId: "G-03",
    },
    taxonomySelection: {
      disambiguationWinnerId: "G-03",
      matchingCandidateIds: ["G-03"],
    },
    diagnosis: { allowed: true, lineHe: "בחירת צלע שאינה גובה" },
    patternEvidence: {
      allowed: true,
      patternLayer: "secondary_observed",
      matchingEvidenceCount: 3,
      evidenceCount: 3,
      sharedMisconceptionTag: "area_height_confusion",
    },
    recurrence: { distinctDays: 2 },
    canonicalState: {
      actionState: "intervene",
      recommendation: {
        allowed: true,
        intensityCap: "RI2",
        family: "intervene",
      },
    },
    evidenceTrace: [
      { type: "volume", value: { questions: 20, correct: 12, wrong: 8, accuracy: 60 } },
    ],
    learningPatternDecision: null,
    engineDecisionContract: null,
    actionDecisionContract: null,
  };

  const row = {
    questions: 20,
    correct: 12,
    wrong: 8,
    accuracy: 60,
    displayName: "שטח",
    learningPatternDecision: null,
  };

  return { unit, row };
}

function buildSecondaryContract() {
  const { unit, row } = secondaryObservedFixture();
  return buildParentReportEngineDecisionContract({
    subjectId: "geometry",
    topicRowKey: "area::grade:g4",
    topicName: "שטח",
    displayName: "שטח",
    row,
    unit,
  });
}

describe("secondary_observed parent finding copy", () => {
  test("uses approved wording with topic, pattern, count, questions; no forbidden phrase", () => {
    const contract = buildSecondaryContract();

    const finding = String(contract.parentSafeFinding || "");
    assert.match(finding, /בנושא שטח/);
    assert.match(finding, /בחירת צלע שאינה גובה/);
    assert.match(finding, /3 פעמים/);
    assert.match(finding, /20 שאלות/);
    assert.match(
      finding,
      /לא הופיע דפוס מרכזי אחד, אבל אותו סוג של טעות חזר 3 פעמים: בחירת צלע שאינה גובה/
    );
    assert.match(finding, /מומלץ לחזור על החלק הזה בתרגול הבא ולבדוק אם הטעות חוזרת/);
    assert.equal(finding.includes("כדאי לשים לב ל"), false);
    assert.equal(finding.includes("כדאי לשים לב לכך"), false);
    assert.deepEqual(findSpecForbiddenPhrasesInString(finding), []);

    // Engine decision / ADC / taxonomy / patternLayer must not be altered by copy change
    assert.equal(contract.patternLayer, "secondary_observed");
    assert.ok(contract.engineDecision);
    assert.ok(contract.actionDecisionContract?.action);
    assert.equal(contract.actionDecisionContract?.action, "practice_more");
    assert.match(String(contract.misconceptionLabel || contract.detectedPattern || ""), /בחירת צלע/);
  });

  test("SPEC_FORBIDDEN_PARENT_PHRASES still lists the banned stem", () => {
    assert.ok(SPEC_FORBIDDEN_PARENT_PHRASES.includes("כדאי לשים לב ל"));
  });

  test("regular report view model keeps finding text without forbidden phrase", () => {
    const contract = buildSecondaryContract();

    const base = {
      playerName: "Test",
      reportVersion: "v2",
      period: "custom",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      geometryTopics: {
        "area::grade:g4": {
          questions: 20,
          correct: 12,
          wrong: 8,
          accuracy: 60,
          displayName: "שטח",
          learningPatternDecision: {
            parentVisibleFinding: contract.parentSafeFinding,
            engineDecisionContract: contract,
          },
          engineDecisionContract: contract,
          patternLayer: "secondary_observed",
        },
      },
      parentFacing: {
        insights: [contract.parentSafeFinding],
        homeRecommendations: [],
        systemActions: [],
      },
    };

    const vm = buildRegularReportViewModel(base);
    const joined = JSON.stringify(vm);
    assert.match(joined, /אותו סוג של טעות חזר 3 פעמים/);
    assert.equal(joined.includes("כדאי לשים לב ל"), false);
    assert.equal(base.geometryTopics["area::grade:g4"].patternLayer, "secondary_observed");
    assert.equal(
      base.geometryTopics["area::grade:g4"].engineDecisionContract.engineDecision,
      contract.engineDecision
    );
    assert.equal(
      base.geometryTopics["area::grade:g4"].engineDecisionContract.actionDecisionContract?.action,
      contract.actionDecisionContract?.action
    );
  });
});

describe("secondary_observed engine fields unchanged aside from finding text", () => {
  test("stable decision snapshot fields on mid-day fixture", () => {
    const a = buildSecondaryContract();
    const b = buildSecondaryContract();

    const pick = (c) => ({
      engineDecision: c.engineDecision,
      patternLayer: c.patternLayer,
      matchingEvidenceCount: c.matchingEvidenceCount,
      adcAction: c.actionDecisionContract?.action || null,
      detectedPattern: c.detectedPattern,
      misconceptionLabel: c.misconceptionLabel,
      recommendedAction: c.recommendedAction,
      taxonomyId: c.actionDecisionContract?.target?.subskillId || null,
    });
    assert.deepEqual(pick(a), pick(b));
    assert.equal(a.parentSafeFinding, b.parentSafeFinding);
    assert.equal(a.parentSafeFinding.includes("כדאי לשים לב ל"), false);
  });
});
