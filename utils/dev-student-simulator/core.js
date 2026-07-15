import { CUSTOM_SIMULATOR_PRESET_ID, CUSTOM_APPLY_MODE } from "./constants";
import { getDevStudentPresetById } from "./presets";
import { buildSessionsFromPreset } from "./session-builder";
import {
  buildSessionsFromCustomSpec,
  anchorEndMsFromSpec,
  makeSimulatorRunId,
  listAffectedTopicUnits,
  resolveCustomSpecTopicSettings,
} from "./custom-session-builder";
import { buildStorageSnapshotFromSessions } from "./snapshot-builder";
import { mergeStorageSnapshotForCustomApply } from "./snapshot-merge";
import { buildBackupEnvelope, buildSimulatorMetadata } from "./metadata";
import { validatePresetSessions, validateSnapshotNamespace } from "./validator";
import { validateCustomSpecBeforeBuild, validateCustomSessionsAfterBuild } from "./custom-validator";

function localYmdFromMs(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calendar range aligned with the short report's `period=custom` (local midnight bounds),
 * derived from session timestamps - not from UTC `date` strings on rows.
 * @param {Array<{ timestamp?: number, date?: string }>} sessions
 * @returns {{ startYmd: string, endYmd: string, startMs: number, endMs: number } | null}
 */
export function simulationDateRangeFromSessions(sessions) {
  if (!Array.isArray(sessions) || !sessions.length) return null;
  const tsList = sessions.map((s) => Number(s?.timestamp)).filter((n) => Number.isFinite(n));
  if (!tsList.length) return null;
  const startMs = Math.min(...tsList);
  const endMs = Math.max(...tsList);
  const startYmd = localYmdFromMs(startMs);
  const endYmd = localYmdFromMs(endMs);
  return { startYmd, endYmd, startMs, endMs };
}

export function buildSimulatorCoreFromPreset({
  presetId,
  playerNameOverride,
  existingStorageMap = {},
  anchorEndMs = Date.now(),
}) {
  const preset = getDevStudentPresetById(presetId);
  if (!preset) throw new Error(`Unknown preset id: ${presetId}`);

  const sessions = buildSessionsFromPreset(preset, anchorEndMs);
  const sessionValidation = validatePresetSessions(preset, sessions);
  if (!sessionValidation.ok) {
    throw new Error(`Session validation failed (${presetId}): ${sessionValidation.errors.join(", ")}`);
  }

  const playerName = playerNameOverride || preset.studentName;
  const { snapshot, touchedKeys } = buildStorageSnapshotFromSessions(sessions, playerName);
  const namespaceValidation = validateSnapshotNamespace(snapshot);
  if (!namespaceValidation.ok) {
    throw new Error(`Snapshot namespace validation failed: ${namespaceValidation.errors.join("; ")}`);
  }

  const backupByKey = buildBackupEnvelope(touchedKeys, existingStorageMap);
  const simulationDateRange = simulationDateRangeFromSessions(sessions);
  const metadata = buildSimulatorMetadata({
    presetId: preset.id,
    touchedKeys,
    backupByKey,
    playerName,
    ...(simulationDateRange ? { simulationDateRange } : {}),
  });

  return {
    preset,
    sessions,
    snapshot,
    touchedKeys,
    metadata,
    validation: {
      sessions: sessionValidation,
      namespace: namespaceValidation,
    },
  };
}

/**
 * Build simulator package from manual custom controls (UI spec).
 * Default Apply merges into existing local snapshot for selected (subject, topic) only.
 */
export function buildSimulatorCoreFromCustomSpec({
  spec,
  playerNameOverride,
  existingStorageMap = {},
  anchorEndMs: anchorEndMsArg,
} = {}) {
  const specClone =
    spec && typeof spec === "object" ? JSON.parse(JSON.stringify(spec)) : {};
  resolveCustomSpecTopicSettings(specClone);
  const pre = validateCustomSpecBeforeBuild(specClone);
  if (!pre.ok) {
    throw new Error(`Custom spec invalid: ${pre.errors.join("; ")}`);
  }

  const anchorEndMs = anchorEndMsArg != null ? anchorEndMsArg : anchorEndMsFromSpec(specClone);
  const runId = makeSimulatorRunId(anchorEndMs);
  const sessions = buildSessionsFromCustomSpec(specClone, anchorEndMs, { simulatorRunId: runId });
  const sessionValidation = validateCustomSessionsAfterBuild(sessions, specClone);
  const sessionBlock = {
    ...sessionValidation,
    warnings: [...(pre.warnings || []), ...(sessionValidation.warnings || [])],
    preBuildWarnings: pre.warnings,
  };
  if (!sessionValidation.ok) {
    throw new Error(`Custom session validation failed: ${sessionValidation.errors.join("; ")}`);
  }

  const playerName = (playerNameOverride || specClone.studentName || "").trim() || "Student";
  const applyMode = specClone.customApplyMode || CUSTOM_APPLY_MODE.replaceSelectedTopics;
  const affectedUnits = listAffectedTopicUnits(specClone);

  let snapshot;
  let touchedKeys;
  if (applyMode === CUSTOM_APPLY_MODE.fullSimulationReplace) {
    const b = buildStorageSnapshotFromSessions(sessions, playerName);
    snapshot = b.snapshot;
    touchedKeys = b.touchedKeys;
  } else {
    const b = mergeStorageSnapshotForCustomApply({
      existingStorageMap: existingStorageMap,
      newSessions: sessions,
      playerName,
      customApplyMode: applyMode,
      affectedUnits,
    });
    snapshot = b.snapshot;
    touchedKeys = b.touchedKeys;
  }
  const namespaceValidation = validateSnapshotNamespace(snapshot);
  if (!namespaceValidation.ok) {
    throw new Error(`Snapshot namespace validation failed: ${namespaceValidation.errors.join("; ")}`);
  }

  const backupByKey = buildBackupEnvelope(touchedKeys, existingStorageMap);
  const simulationDateRange = simulationDateRangeFromSessions(sessions);
  const metadata = buildSimulatorMetadata({
    presetId: CUSTOM_SIMULATOR_PRESET_ID,
    touchedKeys,
    backupByKey,
    playerName,
    affectedUnits,
    customApplyMode: applyMode,
    simulatorRunId: runId,
    ...(simulationDateRange ? { simulationDateRange } : {}),
  });

  return {
    preset: null,
    sessions,
    snapshot,
    touchedKeys,
    metadata,
    validation: {
      sessions: sessionBlock,
      namespace: namespaceValidation,
    },
    customApplyMode: applyMode,
    affectedUnits,
    simulatorRunId: runId,
  };
}
