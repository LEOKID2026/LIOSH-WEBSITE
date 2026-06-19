/**
 * Simulation-only repair for practice wrong answers mis-tagged afterStepByStep.
 *
 * Product pages set stepByStepViewedRef before the async /api/learning/answer
 * save completes, so first-attempt wrong rows often persist as learning_guided
 * with contextFlags.afterStepByStep=true. Parent report excludes those rows,
 * inflating accuracy to ~100%. This module rewrites ONLY wrong first-attempt
 * rows back to diagnostic_independent without touching session.mode.
 */
import { loadSupabaseClient } from "./simulation-timestamp-repair.mjs";
import { resolveTimestampStampingEnabled } from "./config.mjs";

const DIAGNOSTIC_INDEPENDENT = "diagnostic_independent";

function isRepairCandidate(row) {
  if (row.is_correct === true) return false;
  const payload =
    row.answer_payload && typeof row.answer_payload === "object"
      ? row.answer_payload
      : {};
  const ctx =
    payload.contextFlags && typeof payload.contextFlags === "object"
      ? payload.contextFlags
      : {};
  const clientMeta =
    payload.clientMeta && typeof payload.clientMeta === "object"
      ? payload.clientMeta
      : {};
  if (ctx.contextAfterBookReading === true) return false;
  if (ctx.afterStepByStep !== true && clientMeta.afterStepByStep !== true) {
    return false;
  }
  const cat = String(payload.evidenceCategory || "").trim().toLowerCase();
  if (cat === DIAGNOSTIC_INDEPENDENT && ctx.afterStepByStep !== true) {
    return false;
  }
  return true;
}

function buildRepairedPayload(payload) {
  const next = { ...payload };
  const ctx =
    next.contextFlags && typeof next.contextFlags === "object"
      ? { ...next.contextFlags }
      : {};
  ctx.afterStepByStep = false;
  next.contextFlags = ctx;

  const clientMeta =
    next.clientMeta && typeof next.clientMeta === "object"
      ? { ...next.clientMeta }
      : {};
  clientMeta.afterStepByStep = false;
  next.clientMeta = clientMeta;

  next.isDiagnosticEligible = true;
  next.evidenceCategory = DIAGNOSTIC_INDEPENDENT;
  return next;
}

/**
 * @returns {{ repaired: number, skipped: number, sessionId: string }}
 */
export async function repairPracticeWrongAnswerEvidence({
  sessionId,
  log = null,
}) {
  if (!resolveTimestampStampingEnabled()) {
    return { repaired: 0, skipped: 0, sessionId, skippedReason: "stamping-disabled" };
  }
  if (!sessionId) {
    throw new Error("repairPracticeWrongAnswerEvidence: sessionId required");
  }

  const sb = loadSupabaseClient();
  const { data: session, error: sessErr } = await sb
    .from("learning_sessions")
    .select("id,metadata")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr) throw sessErr;
  if (!session) {
    throw new Error(`practice-evidence-repair: session ${sessionId} not found`);
  }
  const meta =
    session.metadata && typeof session.metadata === "object" ? session.metadata : {};
  const sessionMode = String(meta.mode || meta.gameMode || "")
    .trim()
    .toLowerCase();
  if (sessionMode !== "practice") {
    return {
      repaired: 0,
      skipped: 0,
      sessionId,
      skippedReason: `session.mode=${sessionMode || "(empty)"}`,
    };
  }

  const { data: answers, error: ansErr } = await sb
    .from("answers")
    .select("id,is_correct,answer_payload")
    .eq("learning_session_id", sessionId);
  if (ansErr) throw ansErr;

  let repaired = 0;
  let skipped = 0;
  for (const row of answers || []) {
    if (!isRepairCandidate(row)) {
      skipped += 1;
      continue;
    }
    const patchedPayload = buildRepairedPayload(row.answer_payload || {});
    const { error } = await sb
      .from("answers")
      .update({ answer_payload: patchedPayload })
      .eq("id", row.id);
    if (error) throw error;
    repaired += 1;
  }

  if (repaired > 0) {
    log?.(
      `practice-evidence-repair: session=${sessionId} repaired=${repaired} ` +
        `skipped=${skipped} (wrong rows → diagnostic_independent)`
    );
  }

  return { repaired, skipped, sessionId };
}
