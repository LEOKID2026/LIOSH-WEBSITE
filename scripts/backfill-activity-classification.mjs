/**
 * Backfill Activity Classification
 *
 * Offline script — run manually ONCE before Phase 4 deploys.
 * DO NOT run against production without first running against staging.
 *
 * What it does:
 *  - Reads all rows from the `answers` table in batches
 *  - For rows that have `answer_payload` but are missing `isDiagnosticEligible`
 *  - Classifies them using `classifyActivityEvidence` based on `answer_payload.gameMode`
 *  - Writes `evidenceCategory`, `isDiagnosticEligible`, and `contextFlags` back into
 *    `answer_payload` via a JSONB merge update (no column schema change)
 *
 * Rows with no `gameMode` in `answer_payload` are tagged `legacy_unclassified` and
 * set `isDiagnosticEligible=false`.
 *
 * Old `classroom_activity_attempts` rows with `time_spent_ms=5000` are also tagged
 * `legacy_fabricated_timing=true` inside `question_snapshot` (Phase 3 prerequisite).
 *
 * Usage:
 *   node scripts/backfill-activity-classification.mjs [--dry-run] [--write] [--batch-size=500]
 *   Default: dry-run. Production writes require ALLOW_PRODUCTION_WRITE + CONFIRM_* env vars.
 *
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { classifyActivityEvidence } from "../lib/learning/activity-classification.js";
import {
  createProductionScriptGuard,
  exitOnGuardError,
} from "./lib/production-script-guard.mjs";

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const guard = createProductionScriptGuard({
  scriptName: "backfill-activity-classification",
  confirmOperation: "BACKFILL_ACTIVITY_CLASSIFICATION",
  affectedTables: ["answers", "answer_payload", "classroom_activity_attempts"],
  defaultDryRun: true,
  argv: args,
});
const DRY_RUN = guard.isDryRun;
const BATCH_SIZE = (() => {
  const flag = args.find((a) => a.startsWith("--batch-size="));
  if (flag) {
    const n = parseInt(flag.split("=")[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 500;
  }
  return 500;
})();

// ── Supabase client ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[backfill] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Stats ───────────────────────────────────────────────────────────────────

const stats = {
  answersTotal: 0,
  answersAlreadyClassified: 0,
  answersClassified: 0,
  answersLegacyUnclassified: 0,
  answersErrors: 0,
  attemptsTotal: 0,
  attemptsTaggedFabricatedTiming: 0,
  attemptsErrors: 0,
};

// ── Backfill: answers table ─────────────────────────────────────────────────

async function backfillAnswers() {
  console.log("[backfill] Starting answers table backfill...");
  let offset = 0;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from("answers")
      .select("id, answer_payload")
      .range(offset, offset + BATCH_SIZE - 1)
      .order("id", { ascending: true });

    if (error) {
      console.error("[backfill] Error fetching answers batch:", error.message);
      break;
    }

    if (!data || data.length === 0) {
      finished = true;
      break;
    }

    stats.answersTotal += data.length;
    const updates = [];

    for (const row of data) {
      const payload =
        row.answer_payload && typeof row.answer_payload === "object"
          ? row.answer_payload
          : {};

      // Skip rows already classified in Phase 1
      if (payload.isDiagnosticEligible !== undefined) {
        stats.answersAlreadyClassified += 1;
        continue;
      }

      const gameMode = typeof payload.gameMode === "string" ? payload.gameMode : null;

      let classification;
      if (gameMode) {
        classification = classifyActivityEvidence(gameMode, "free_practice", {
          afterStepByStep: false,
          hintsUsed: typeof payload.hintsUsed === "number" ? payload.hintsUsed : 0,
        });
      } else {
        // No mode: legacy_unclassified
        classification = {
          isDiagnosticEligible: false,
          evidenceCategory: "unclassified",
          contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false, legacyUnclassified: true },
        };
        stats.answersLegacyUnclassified += 1;
      }

      updates.push({
        id: row.id,
        newPayload: {
          ...payload,
          evidenceCategory: classification.evidenceCategory,
          isDiagnosticEligible: classification.isDiagnosticEligible,
          contextFlags: classification.contextFlags,
        },
      });
    }

    if (!DRY_RUN && updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("answers")
          .update({ answer_payload: update.newPayload })
          .eq("id", update.id);

        if (updateError) {
          console.error(`[backfill] Error updating answer id=${update.id}:`, updateError.message);
          stats.answersErrors += 1;
        } else {
          stats.answersClassified += 1;
        }
      }
    } else if (DRY_RUN) {
      stats.answersClassified += updates.length;
      console.log(`[backfill] [DRY RUN] Would update ${updates.length} answer rows in this batch.`);
    }

    console.log(`[backfill] Processed answers offset=${offset} batch=${data.length} pending_updates=${updates.length}`);
    offset += BATCH_SIZE;

    if (data.length < BATCH_SIZE) {
      finished = true;
    }
  }

  console.log("[backfill] Answers backfill complete.");
}

// ── Backfill: classroom_activity_attempts — tag fabricated timing ───────────

async function backfillAttemptsTiming() {
  console.log("[backfill] Tagging classroom_activity_attempts with legacy_fabricated_timing...");
  let offset = 0;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from("classroom_activity_attempts")
      .select("id, time_spent_ms, question_snapshot")
      .eq("time_spent_ms", 5000)
      .range(offset, offset + BATCH_SIZE - 1)
      .order("id", { ascending: true });

    if (error) {
      if (error.message?.includes("does not exist")) {
        console.log("[backfill] classroom_activity_attempts table not found — skipping timing tag.");
        return;
      }
      console.error("[backfill] Error fetching attempts batch:", error.message);
      break;
    }

    if (!data || data.length === 0) {
      finished = true;
      break;
    }

    stats.attemptsTotal += data.length;
    const updates = [];

    for (const row of data) {
      const snapshot =
        row.question_snapshot && typeof row.question_snapshot === "object"
          ? row.question_snapshot
          : {};

      if (snapshot.legacy_fabricated_timing === true) continue;

      updates.push({
        id: row.id,
        newSnapshot: { ...snapshot, legacy_fabricated_timing: true },
      });
    }

    if (!DRY_RUN && updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("classroom_activity_attempts")
          .update({ question_snapshot: update.newSnapshot })
          .eq("id", update.id);

        if (updateError) {
          console.error(`[backfill] Error updating attempt id=${update.id}:`, updateError.message);
          stats.attemptsErrors += 1;
        } else {
          stats.attemptsTaggedFabricatedTiming += 1;
        }
      }
    } else if (DRY_RUN) {
      stats.attemptsTaggedFabricatedTiming += updates.length;
      console.log(`[backfill] [DRY RUN] Would tag ${updates.length} attempt rows in this batch.`);
    }

    console.log(`[backfill] Processed attempts offset=${offset} batch=${data.length}`);
    offset += BATCH_SIZE;

    if (data.length < BATCH_SIZE) {
      finished = true;
    }
  }

  console.log("[backfill] Attempts timing tag complete.");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  guard.printStartBanner();
  try {
    guard.assertWriteAllowed();
  } catch (err) {
    exitOnGuardError(err);
  }

  console.log(`[backfill] Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | Batch size: ${BATCH_SIZE}`);
  console.log("[backfill] ================================================");

  await backfillAnswers();
  await backfillAttemptsTiming();

  console.log("[backfill] ================================================");
  console.log("[backfill] SUMMARY:");
  console.log(`  answers total fetched      : ${stats.answersTotal}`);
  console.log(`  answers already classified : ${stats.answersAlreadyClassified}`);
  console.log(`  answers classified now     : ${stats.answersClassified}`);
  console.log(`  answers legacy_unclassified: ${stats.answersLegacyUnclassified}`);
  console.log(`  answers errors             : ${stats.answersErrors}`);
  console.log(`  attempts timing tagged     : ${stats.attemptsTaggedFabricatedTiming}`);
  console.log(`  attempts errors            : ${stats.attemptsErrors}`);
  console.log("[backfill] Done.");

  guard.printEndSummary({
    affectedRows: stats.answersClassified + stats.attemptsTaggedFabricatedTiming,
    skippedRows: stats.answersAlreadyClassified,
    errors: stats.answersErrors || stats.attemptsErrors ? [`answers=${stats.answersErrors} attempts=${stats.attemptsErrors}`] : [],
  });
}

main().catch((err) => {
  if (err?.name === "ProductionScriptGuardError") {
    exitOnGuardError(err);
  }
  console.error("[backfill] Fatal error:", err);
  process.exit(1);
});
