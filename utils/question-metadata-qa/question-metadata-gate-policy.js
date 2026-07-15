/**
 * Metadata QA gate policy — which scanner issue codes are blocking vs advisory for CI/release.
 * Does not validate Hebrew student-facing copy.
 */
import { ISSUE_CODES } from "./question-metadata-contract.js";

/** Strict structural / taxonomy failures — always blocking when present on a row (unless exempt). */
export const BLOCKING_ISSUE_CODES = new Set([
  ISSUE_CODES.missing_subject,
  ISSUE_CODES.missing_correct_answer,
  ISSUE_CODES.invalid_difficulty,
  ISSUE_CODES.invalid_cognitive_level,
  ISSUE_CODES.expected_error_types_empty,
  ISSUE_CODES.taxonomy_unknown_skillId,
  ISSUE_CODES.taxonomy_unknown_subskillId,
  ISSUE_CODES.taxonomy_unknown_expected_error_type,
  ISSUE_CODES.taxonomy_unknown_prerequisite_skillId,
]);

/** Explicit advisory-only codes (curriculum / documentation debt). */
export const ADVISORY_ISSUE_CODES = new Set([
  ISSUE_CODES.implicit_id_only,
  ISSUE_CODES.missing_difficulty,
  ISSUE_CODES.missing_cognitiveLevel,
  ISSUE_CODES.missing_expected_error_types,
  ISSUE_CODES.missing_prerequisite_skill_ids,
  ISSUE_CODES.prerequisite_skill_ids_empty,
  ISSUE_CODES.missing_explanation,
  ISSUE_CODES.misconception_diagnosis_unsupported,
  ISSUE_CODES.prerequisite_diagnosis_unsupported,
  ISSUE_CODES.skill_low_volume,
]);

const TAXONOMY_ISSUE_CODES = new Set([
  ISSUE_CODES.taxonomy_unknown_skillId,
  ISSUE_CODES.taxonomy_unknown_subskillId,
  ISSUE_CODES.taxonomy_unknown_expected_error_type,
  ISSUE_CODES.taxonomy_unknown_prerequisite_skillId,
]);

const LAUNCH_SCOPE_SUBJECTS = new Set([
  "math",
  "geometry",
  "science",
  "english",
  "hebrew",
  "moledet-geography",
  "history",
]);

/**
 * Launch gate should block taxonomy mismatches only for active launch-scope banks.
 * Archive/debug sources stay advisory until promoted.
 * @param {object} record
 */
export function isLaunchScopeRecord(record) {
  const sub = String(record?.subject || "").toLowerCase();
  if (!LAUNCH_SCOPE_SUBJECTS.has(sub)) return false;
  const source = String(record?.sourceFile || "").toLowerCase();
  if (source.includes("hebrew-questions/")) return false; // archived parallel bank
  return true;
}

/**
 * Documented exemptions — promoted to blocking later by shrinking this list.
 * @type {{ id: string, subjects: string[], issueCodes: string[], rationale: string }[]}
 */
export const KNOWN_EXEMPTION_CATALOG = [
  {
    id: "english_safe_pass_skill_subskill",
    subjects: ["english"],
    issueCodes: [ISSUE_CODES.missing_skillId, ISSUE_CODES.missing_subskillId],
    rationale:
      "English pools underwent a deliberate safe metadata pass; ~439 grammar rows remain untagged until curriculum assigns taxonomy-valid skillId/subskillId.",
  },
];

/** Subject → optional glob-like source path matchers for future file-level carve-outs (empty by default). */
export const SUBJECT_SOURCE_EXEMPTIONS = {
  /** Example: `"english:data/english-questions/grammar-pools.js": ["missing_skillId"]` — unused until needed */
};

/**
 * @param {string} issueCode
 * @param {object} record — scanned row ({ subject, sourceFile, issues, ... })
 */
export function isEnglishSkillGapExempt(record, issueCode) {
  const sub = String(record?.subject || "").toLowerCase();
  if (sub !== "english") return false;
  return issueCode === ISSUE_CODES.missing_skillId || issueCode === ISSUE_CODES.missing_subskillId;
}

/**
 * @returns {'blocking'|'advisory'|'exempt'}
 */
export function classifyIssueOnRecord(issueCode, record) {
  if (ADVISORY_ISSUE_CODES.has(issueCode)) return "advisory";
  if (isEnglishSkillGapExempt(record, issueCode)) return "exempt";
  if (TAXONOMY_ISSUE_CODES.has(issueCode) && !isLaunchScopeRecord(record)) return "advisory";
  if (BLOCKING_ISSUE_CODES.has(issueCode)) return "blocking";
  if (issueCode === ISSUE_CODES.missing_skillId || issueCode === ISSUE_CODES.missing_subskillId) return "blocking";
  return "advisory";
}

/**
 * Predicate compatible with external tooling — blocking issues fail the gate unless exempted per policy.
 * @param {string} issueCode
 * @param {object} record
 * @param {object} [_context]
 */
export function isBlockingMetadataIssue(issueCode, record, _context = {}) {
  return classifyIssueOnRecord(issueCode, record) === "blocking";
}

/**
 * Full rollup for summary.json / CLI / release gates.
 * @param {object} params
 * @param {object[]} params.records
 * @param {{ path: string, error: string }[]} params.loadErrors
 * @param {{ id: string, files: string[] }[]} params.duplicates
 * @param {{ highRiskCount?: number, mediumRiskCount?: number }} params.riskTotals
 */
export function computeMetadataGateRollup({ records, loadErrors, duplicates, riskTotals = {} }) {
  const { highRiskCount = 0, mediumRiskCount = 0 } = riskTotals;

  const blockingIssuesByCode = {};
  const advisoryIssuesByCode = {};
  let exemptedIssueCount = 0;
  const blockingFiles = new Set();

  for (const r of records || []) {
    for (const iss of r.issues || []) {
      const kind = classifyIssueOnRecord(iss, r);
      if (kind === "exempt") {
        exemptedIssueCount += 1;
        continue;
      }
      if (kind === "blocking") {
        blockingIssuesByCode[iss] = (blockingIssuesByCode[iss] || 0) + 1;
        if (r.sourceFile) blockingFiles.add(r.sourceFile);
      } else {
        advisoryIssuesByCode[iss] = (advisoryIssuesByCode[iss] || 0) + 1;
      }
    }
  }

  const dupList = duplicates || [];
  if (dupList.length > 0) {
    blockingIssuesByCode.duplicate_declared_id_cross_file = dupList.length;
    for (const d of dupList) {
      for (const f of d.files || []) blockingFiles.add(f);
    }
  }

  let blockingIssueCount = 0;
  for (const n of Object.values(blockingIssuesByCode)) blockingIssueCount += n;

  let advisoryIssueCount = 0;
  for (const n of Object.values(advisoryIssuesByCode)) advisoryIssueCount += n;

  const parseOk = (records?.length || 0) > 0 && (loadErrors?.length || 0) === 0;

  /** @type {'pass'|'pass_with_advisory'|'fail_blocking_metadata'} */
  let gateDecision;
  if (!parseOk || blockingIssueCount > 0) {
    gateDecision = "fail_blocking_metadata";
  } else if (
    advisoryIssueCount > 0 ||
    exemptedIssueCount > 0 ||
    highRiskCount > 0 ||
    mediumRiskCount > 0
  ) {
    gateDecision = "pass_with_advisory";
  } else {
    gateDecision = "pass";
  }

  return {
    gateDecision,
    blockingIssueCount,
    advisoryIssueCount,
    exemptedIssueCount,
    blockingIssuesByCode,
    advisoryIssuesByCode,
    blockingFiles: [...blockingFiles].sort(),
    knownExemptions: {
      catalog: KNOWN_EXEMPTION_CATALOG,
      exemptedIssueOccurrences: exemptedIssueCount,
      subjectSourceMatchers: SUBJECT_SOURCE_EXEMPTIONS,
    },
    parseOk,
  };
}

/**
 * Policy entrypoint matching `{ summary, issues }` naming - forwards to `computeMetadataGateRollup`.
 * Pass scan context as **second** argument: `{ records, loadErrors, duplicates, riskTotals }`.
 * @param {object} _summary reserved for future merged rollup from summary.json
 * @param {object} scanContext
 */
export function classifyMetadataGate(_summary, scanContext) {
  return computeMetadataGateRollup(scanContext || {});
}
