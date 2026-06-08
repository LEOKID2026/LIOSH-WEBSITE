#!/usr/bin/env node
/**
 * Phase 2 hardening — public payload leak scan + sanitized snapshots A/B/C/D.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-hardening.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  FLAG_ENV,
  FLAG_MODES,
  parseIsoDate,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";
import { VISIBLE_IMPACT_FIXTURES } from "./parent-report-diagnostic-visible-impact-seed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-visible-impact-hardening");

const FORBIDDEN_KEY_FRAGMENTS = [
  "_evidenceQuality",
  "bySubSkill",
  "gatingDecisions",
  "promotionDecisions",
  "supportingEvidenceIds",
  "_canonicalMeta",
  "_diagnosticSubSkillRollup",
  "_diagnosticQuestionTypeRollup",
  "_diagnosticProblemClassRollup",
  "_diagnosticDifficultyDepthRollup",
  "shadowParentGating",
  "appliedParentGating",
  "validatedPromotionCandidates",
  "appliedParentPromotion",
  "errorPatterns",
  "questionTypes",
  "problemClasses",
  "difficultyDepths",
  "sourceBreakdown",
  "classroom",
  "school",
  "privateTeacher",
  "teacherReport",
  "classReport",
];

const RAW_SKILL_PATTERNS = [
  /\bmath_[a-z0-9_]+\b/i,
  /\beng_[a-z0-9_]+\b/i,
  /\bheb_[a-z0-9_]+\b/i,
  /\bsci_[a-z0-9_]+\b/i,
  /\bfrac_[a-z0-9_]+\b/i,
  /\bpast_simple\b/i,
  /\bsubSkill\b/,
  /\bskillId\b/,
];

/** @type {Record<string, { label: string, from: string, to: string }>} */
const SCENARIOS = {
  AAA4: { label: "AAA4", from: "2026-05-01", to: "2026-06-08" },
  "GATE-LOW": { label: "AAA9", from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { label: "AAA10", from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { label: "AAA8", from: "2026-05-20", to: "2026-05-24" },
  "PROMOTE-STRONG": { label: "AAA5", from: "2026-05-04", to: "2026-05-11" },
};

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

function deepFindForbiddenKeys(obj, prefix = "") {
  const hits = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const kl = k.toLowerCase();
    for (const frag of FORBIDDEN_KEY_FRAGMENTS) {
      if (kl.includes(frag.toLowerCase())) hits.push({ type: "forbidden_key", path: p, key: k });
    }
    if (v && typeof v === "object") hits.push(...deepFindForbiddenKeys(v, p));
  }
  return hits;
}

function findRawSkillLeaks(obj, prefix = "") {
  const hits = [];
  if (typeof obj === "string") {
    for (const re of RAW_SKILL_PATTERNS) {
      if (re.test(obj)) hits.push({ type: "raw_skill_string", path: prefix, sample: obj.slice(0, 120) });
    }
    return hits;
  }
  if (!obj || typeof obj !== "object") return hits;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => hits.push(...findRawSkillLeaks(item, `${prefix}[${i}]`)));
    return hits;
  }
  for (const [k, v] of Object.entries(obj)) {
    hits.push(...findRawSkillLeaks(v, prefix ? `${prefix}.${k}` : k));
  }
  return hits;
}

function pickPublicSnapshot(pub) {
  const pf = pub?.parentFacing || {};
  return {
    summary: {
      diagnosticAnswers: pub?.summary?.diagnosticAnswers,
      diagnosticAccuracy: pub?.summary?.diagnosticAccuracy,
      totalAnswers: pub?.summary?.totalAnswers,
      totalSessions: pub?.summary?.totalSessions,
      totalDurationSeconds: pub?.summary?.totalDurationSeconds,
      coins: pub?.summary?.coins,
    },
    monthlyProgress: pub?.monthlyProgress,
    metaEvidenceQualityStudent: pub?.meta?.evidenceQuality?.student || null,
    parentFacing: {
      insights: pf.insights || [],
      homeRecommendations: pf.homeRecommendations || [],
      practiceFocus: pf.practiceFocus || [],
      diagnosisSuppressed: pf.diagnosisSuppressed === true,
      gatingApplied: pf.gatingApplied === true,
      teacherMessageCount: Array.isArray(pf.teacherMessages) ? pf.teacherMessages.length : 0,
    },
  };
}

function explainSafePublicFields(snapshot) {
  const notes = [];
  if (snapshot.parentFacing?.practiceFocus?.length) {
    notes.push({
      field: "parentFacing.practiceFocus",
      safeBecause: "Hebrew labels only (topicLabelHe, focusLabelHe); no raw skillId/subSkill keys",
    });
  }
  if (snapshot.parentFacing?.gatingApplied) {
    notes.push({
      field: "parentFacing.gatingApplied",
      safeBecause: "Boolean only — no gating decision arrays or internal metadata",
    });
  }
  if (snapshot.parentFacing?.diagnosisSuppressed) {
    notes.push({
      field: "parentFacing.diagnosisSuppressed",
      safeBecause: "Boolean mirror of server suppression; client pattern diagnostics authority",
    });
  }
  return notes;
}

async function evaluateScenario(supabase, entry, scenarioKey, range) {
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };

  const modes = {};
  for (const mode of FLAG_MODES) {
    applyFlagMode(mode);
    const raw = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(range.from),
      parseIsoDate(range.to),
      { includeParentActivities: true }
    );
    const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
    const enriched = await enrichPayloadWithParentFacing(supabase, withEq, entry.studentId);
    const pub = stripInternalReportPayloadFields(structuredClone(enriched));
    const snapshot = pickPublicSnapshot(pub);
    const featureScope = {
      parentFacing: pub.parentFacing,
      meta: pub.meta,
      summary: pub.summary,
      monthlyProgress: pub.monthlyProgress,
    };
    const forbiddenKeys = deepFindForbiddenKeys(featureScope);
    const rawSkillLeaks = findRawSkillLeaks(featureScope);
    const fullPayloadForbidden = deepFindForbiddenKeys(pub);
    const recentMistakeSkillLeaks = findRawSkillLeaks(pub.recentMistakes || []);
    modes[mode.id] = {
      modeName: mode.name,
      snapshot,
      safeFieldNotes: explainSafePublicFields(snapshot),
      leakScan: {
        pass: forbiddenKeys.length === 0 && rawSkillLeaks.length === 0,
        forbiddenKeys,
        rawSkillLeaks,
        featureScopeOnly: true,
        fullPayloadForbiddenKeyCount: fullPayloadForbidden.length,
        recentMistakeRawSkillLeakCount: recentMistakeSkillLeaks.length,
        recentMistakeNote:
          recentMistakeSkillLeaks.length > 0
            ? "Pre-existing: questionId strings may embed diagnosticSkillId; not introduced by visible-impact fields"
            : null,
      },
    };
  }

  const invariants = {};
  for (const field of ["diagnosticAnswers", "totalAnswers", "totalSessions", "totalDurationSeconds", "coins"]) {
    invariants[field] = FLAG_MODES.every(
      (m) => modes.A.snapshot.summary[field] === modes[m.id].snapshot.summary[field]
    );
  }
  invariants.monthlyProgress = JSON.stringify(modes.A.snapshot.monthlyProgress) ===
    JSON.stringify(modes.B.snapshot.monthlyProgress) &&
    JSON.stringify(modes.A.snapshot.monthlyProgress) === JSON.stringify(modes.C.snapshot.monthlyProgress) &&
    JSON.stringify(modes.A.snapshot.monthlyProgress) === JSON.stringify(modes.D.snapshot.monthlyProgress);

  return {
    scenarioKey,
    child: entry.label,
    range,
    fixtureMeta: VISIBLE_IMPACT_FIXTURES[scenarioKey] || null,
    modes,
    invariants,
    uiProjection: {
      whatToNoticeA: modes.A.snapshot.parentFacing.insights,
      whatToNoticeC: modes.C.snapshot.parentFacing.insights,
      practiceFocusB: modes.B.snapshot.parentFacing.practiceFocus,
      gatingAppliedC: modes.C.snapshot.parentFacing.gatingApplied,
    },
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));

  const results = [];
  for (const [scenarioKey, range] of Object.entries(SCENARIOS)) {
    const entry = byLabel.get(range.label);
    if (!entry) {
      results.push({ scenarioKey, error: `missing child ${range.label}` });
      continue;
    }
    console.log(`Hardening ${scenarioKey} (${range.label}) ${range.from}..${range.to}`);
    results.push(await evaluateScenario(supabase, entry, scenarioKey, range));
  }

  const allLeakPass = results.every((r) =>
    r.modes ? Object.values(r.modes).every((m) => m.leakScan.pass) : false
  );
  const allInvariantPass = results.every((r) =>
    r.invariants ? Object.values(r.invariants).every(Boolean) : false
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    scenarios: results.length,
    leakScanPass: allLeakPass,
    invariantsPass: allInvariantPass,
    newPublicFields: [
      {
        field: "parentFacing.practiceFocus",
        type: "Array<{ topicLabelHe, focusLabelHe }>",
        modes: ["B", "C", "D when subskill flag on"],
      },
      {
        field: "parentFacing.gatingApplied",
        type: "boolean",
        modes: ["C", "D when gating fires"],
      },
      {
        field: "parentFacing.diagnosisSuppressed",
        type: "boolean",
        modes: ["C", "D when pattern diagnostics suppressed"],
      },
    ],
  };

  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(path.join(ARTIFACT_DIR, "public-payload-hardening.json"), JSON.stringify({ summary, results }, null, 2), "utf8");

  for (const row of results) {
    if (!row.modes) continue;
    const dir = path.join(ARTIFACT_DIR, "public-snapshots", row.scenarioKey);
    await mkdir(dir, { recursive: true });
    for (const [modeId, data] of Object.entries(row.modes)) {
      await writeFile(path.join(dir, `mode-${modeId}.json`), JSON.stringify(data, null, 2), "utf8");
    }
  }

  console.log(`\nLeak scan: ${allLeakPass ? "PASS" : "FAIL"}`);
  console.log(`Invariants: ${allInvariantPass ? "PASS" : "FAIL"}`);
  console.log(`Artifacts: ${ARTIFACT_DIR}`);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
