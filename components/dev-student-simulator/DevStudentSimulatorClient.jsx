import { useCallback, useEffect, useMemo, useState } from "react";
import { safeGetItem } from "../../utils/safe-local-storage.js";
import CustomBuilderPanel from "./CustomBuilderPanel.jsx";
import {
  DEV_STUDENT_PRESETS,
  STORAGE_KEYS,
  PRODUCT_DISPLAY_NAME,
  INTERNAL_STORAGE_NAMESPACE,
  buildSimulatorCoreFromPreset,
  buildSimulatorCoreFromCustomSpec,
  defaultCustomSpec,
  serializeCustomSpecForStage,
  anchorEndMsFromSpec,
  exportSimulatorPackage,
  serializeSimulatorPackage,
  parseSimulatorPackage,
  buildBackupEnvelope,
  hebrewSubjectLabel,
  hebrewTopicPrimary,
} from "../../utils/dev-student-simulator/index.js";
import {
  readRawStorageMapForKeys,
  applyMetadataThenSnapshot,
  deriveEffectiveTouchedKeysFromSnapshot,
  validateSnapshotForApply,
  resetSimulatedStudentFromMetadata,
  readCurrentSimulatorExportFromLocalStorage,
  stringifyForLocalStorage,
} from "../../utils/dev-student-simulator/browser-storage.js";
import { SIMULATOR_METADATA_KEY } from "../../utils/dev-student-simulator/metadata.js";
import {
  learningParentReportShortHref,
  learningParentReportDetailedHref,
  learningParentReportDetailedSummaryHref,
} from "../../utils/learning-parent-report-routes.js";

/**
 * UI-only Hebrew labels (preset ids unchanged).
 * Stored as \\u escapes so the file stays valid UTF-8 on all editors/OS.
 */
const PRESET_HEBREW_LABEL = {
  simDeep01_mixed_real_child: "\u05D9\u05DC\u05D3 \u05DE\u05E2\u05D5\u05E8\u05D1 \u05D5\u05E8\u05D9\u05D0\u05DC\u05D9",
  simDeep02_strong_stable_child: "\u05D9\u05DC\u05D3 \u05D7\u05D6\u05E7 \u05D5\u05D9\u05E6\u05D9\u05D1",
  simDeep03_weak_math_long_term:
    "\u05D7\u05D5\u05DC\u05E9\u05D4 \u05D0\u05E8\u05D5\u05DB\u05EA\u05BE\u05D8\u05D5\u05D5\u05D7 \u05D1\u05DE\u05EA\u05DE\u05D8\u05D9\u05E7\u05D4",
  simDeep04_improving_child: "\u05D9\u05DC\u05D3 \u05D1\u05DE\u05D2\u05DE\u05EA \u05E9\u05D9\u05E4\u05D5\u05E8",
  simDeep05_declining_after_difficulty_jump: "\u05D9\u05E8\u05D9\u05D3\u05D4 \u05D0\u05D7\u05E8\u05D9 \u05E7\u05E4\u05D9\u05E6\u05EA \u05E7\u05D5\u05E9\u05D9",
  simDeep06_fast_careless_vs_slow_accurate_mix:
    "\u05E9\u05D9\u05DC\u05D5\u05D1 \u05E7\u05E6\u05D1: \u05DE\u05D4\u05D9\u05E8/\u05D7\u05E4\u05D5\u05D6 \u05DE\u05D5\u05DC \u05D0\u05D9\u05D8\u05D9/\u05DE\u05D3\u05D5\u05D9\u05E7",
};

const TREND_PATTERN_HE = {
  mixed: "\u05DE\u05E2\u05D5\u05E8\u05D1",
  stable_strong: "\u05D9\u05E6\u05D9\u05D1 \u05D5\u05D7\u05D6\u05E7",
  weak_math_persistent: "\u05D7\u05D5\u05DC\u05E9\u05D4 \u05DE\u05EA\u05DE\u05D8\u05D9\u05EA \u05DE\u05EA\u05DE\u05E9\u05DB\u05EA",
  improving: "\u05DE\u05E9\u05EA\u05E4\u05E8",
  decline_post_jump: "\u05D9\u05E8\u05D9\u05D3\u05D4 \u05D0\u05D7\u05E8\u05D9 \u05E7\u05E4\u05D9\u05E6\u05D4",
  pace_mixed: "\u05D3\u05E4\u05D5\u05E1 \u05E7\u05E6\u05D1 \u05DE\u05E2\u05D5\u05E8\u05D1",
};

const COLORS = {
  pageText: "#0f172a",
  muted: "#475569",
  card: "#ffffff",
  cardSoft: "#f8fafc",
  border: "#cbd5e1",
  primary: "#1d4ed8",
  primaryHover: "#1e40af",
  danger: "#b91c1c",
  dangerHover: "#991b1b",
};

const sectionCard = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 16,
};

const monoPanelBase = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.5,
  color: "#0f172a",
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: 12,
  marginTop: 10,
  maxHeight: 320,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  direction: "ltr",
  textAlign: "left",
};

function makeButtonStyle(kind, disabled) {
  const base = {
    borderRadius: 10,
    border: "1px solid #94a3b8",
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.2,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    color: "#0f172a",
    background: "#ffffff",
  };
  if (kind === "primary") {
    return {
      ...base,
      borderColor: COLORS.primary,
      color: "#ffffff",
      background: disabled ? "#93c5fd" : COLORS.primary,
    };
  }
  if (kind === "danger") {
    return {
      ...base,
      borderColor: COLORS.danger,
      color: "#ffffff",
      background: disabled ? "#fca5a5" : COLORS.danger,
    };
  }
  if (kind === "link") {
    return {
      ...base,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    };
  }
  return base;
}

function statusBadge(text, tone) {
  const map = {
    ok: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    warn: { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
    blocked: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
  };
  const c = map[tone] || map.warn;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.color,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {text}
    </span>
  );
}

function presetOptionLabel(p) {
  const he = PRESET_HEBREW_LABEL[p.id] || p.studentName;
  return `${he} \u2014 \u05DE\u05D6\u05D4\u05D4: ${p.id}`;
}

function aggregateTopicPreviewBySession(sessions) {
  const m = new Map();
  for (const s of sessions || []) {
    const k = `${s.subject}:::${s.bucket}`;
    const o = m.get(k) || { subject: s.subject, topic: s.bucket, sessionRows: 0, questions: 0 };
    o.sessionRows += 1;
    o.questions += Number(s.total) || 0;
    m.set(k, o);
  }
  return [...m.values()].sort((a, b) => `${a.subject}:${a.topic}`.localeCompare(`${b.subject}:${b.topic}`));
}

function simulationRangeLinkBundleFromMetadata(meta) {
  const r = meta && typeof meta === "object" ? meta.simulationDateRange : null;
  const startYmd = r && typeof r.startYmd === "string" ? r.startYmd.trim() : "";
  const endYmd = r && typeof r.endYmd === "string" ? r.endYmd.trim() : "";
  if (!startYmd || !endYmd) return null;
  const range = { period: "custom", startYmd, endYmd };
  return {
    startYmd,
    endYmd,
    shortHref: learningParentReportShortHref(range),
    detailedHref: learningParentReportDetailedHref(range),
    summaryHref: learningParentReportDetailedSummaryHref(range),
  };
}

function readSimulationRangeLinkBundleFromLocalStorage() {
  try {
    const raw = safeGetItem(SIMULATOR_METADATA_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw);
    if (!meta || meta.simulator !== "dev-student-simulator-core") return null;
    return simulationRangeLinkBundleFromMetadata(meta);
  } catch {
    return null;
  }
}

export default function DevStudentSimulatorClient() {
  const [simMode, setSimMode] = useState("quick");
  const [presetId, setPresetId] = useState(DEV_STUDENT_PRESETS[0]?.id || "");
  const [customSpec, setCustomSpec] = useState(() => defaultCustomSpec());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [lastApplyVerification, setLastApplyVerification] = useState(null);
  const [simRangeLinks, setSimRangeLinks] = useState(null);

  const refreshSimRangeLinks = useCallback(() => {
    setSimRangeLinks(readSimulationRangeLinkBundleFromLocalStorage());
  }, []);

  useEffect(() => {
    refreshSimRangeLinks();
  }, [refreshSimRangeLinks]);

  useEffect(() => {
    setPreview(null);
    setMessage("");
    setError("");
    setLastApplyVerification(null);
  }, [simMode]);

  /** Invalidate staged preview when custom form diverges from the staged JSON (must Preview again before Apply). */
  useEffect(() => {
    if (simMode !== "custom") return undefined;
    const staged = preview?.applySource === "custom" ? preview.stagedCustomSpecJson : null;
    if (staged == null) return undefined;
    const cur = serializeCustomSpecForStage(customSpec);
    if (staged === cur) return undefined;
    setPreview(null);
    setMessage(
      "\u05D4\u05D1\u05D7\u05D9\u05E8\u05D4 \u05D4\u05E9\u05EA\u05E0\u05EA\u05D4. \u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05D7\u05D3\u05E9 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D7\u05DC\u05D4."
    );
    return undefined;
  }, [customSpec, simMode, preview?.applySource, preview?.stagedCustomSpecJson]);

  /** Invalidate staged preview when preset selection diverges from staged preset id. */
  useEffect(() => {
    if (simMode !== "quick") return undefined;
    const stagedId = preview?.applySource === "preset" ? preview.stagedPresetId : null;
    if (stagedId == null) return undefined;
    if (stagedId === presetId) return undefined;
    setPreview(null);
    setMessage(
      "\u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D4\u05E0\u05D1\u05D7\u05E8 \u05E9\u05D5\u05E0\u05D4. \u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05D7\u05D3\u05E9 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D4\u05D7\u05DC\u05D4."
    );
    return undefined;
  }, [presetId, simMode, preview?.applySource, preview?.stagedPresetId]);

  const preset = useMemo(() => DEV_STUDENT_PRESETS.find((p) => p.id === presetId) || null, [presetId]);

  const showMsg = useCallback((m) => {
    setMessage(m);
    setError("");
  }, []);

  const showErr = useCallback((m) => {
    setError(m);
    setMessage("");
  }, []);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/dev-student-simulator/logout", { method: "POST", credentials: "same-origin" });
      window.location.reload();
    } catch (e) {
      showErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const existingWide = readRawStorageMapForKeys([...STORAGE_KEYS]);
      const anchorEndMs =
        simMode === "custom" ? (customSpec.useNowAsAnchor ? Date.now() : anchorEndMsFromSpec(customSpec)) : Date.now();

      let built;
      if (simMode === "quick") {
        built = buildSimulatorCoreFromPreset({
          presetId,
          anchorEndMs,
          existingStorageMap: existingWide,
        });
      } else {
        built = buildSimulatorCoreFromCustomSpec({
          spec: customSpec,
          anchorEndMs,
          existingStorageMap: existingWide,
        });
      }

      const effectiveTouchedKeys = deriveEffectiveTouchedKeysFromSnapshot(built.snapshot);
      const touchedCurrent = readRawStorageMapForKeys(effectiveTouchedKeys);
      const backupByKey = buildBackupEnvelope(effectiveTouchedKeys, touchedCurrent);
      const metadata = {
        ...built.metadata,
        effectiveTouchedKeys,
        touchedKeys: effectiveTouchedKeys,
        backupByKey,
      };

      if (simMode === "quick") {
        setPreview({
          ...built,
          touchedKeys: effectiveTouchedKeys,
          metadata,
          applySource: "preset",
          stagedPresetId: presetId,
          stagedCustomSpecJson: null,
        });
        showMsg(
          "\u05E0\u05D5\u05E6\u05E8\u05D4 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 (\u05DC\u05D0 \u05D4\u05D5\u05D7\u05DC\u05D4). \u05D4\u05D4\u05D7\u05DC\u05D4 \u05EA\u05E9\u05EA\u05DE\u05E9 \u05D1\u05BEsnapshot \u05D5\u05D1\u05D2\u05D9\u05D1\u05D5\u05D9 \u05D4\u05DE\u05D3\u05D5\u05D9\u05E7\u05D9\u05DD \u05DE\u05D4\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05D0\u05D5\u05D7\u05E1\u05E0\u05EA."
        );
      } else {
        setPreview({
          ...built,
          touchedKeys: effectiveTouchedKeys,
          metadata,
          applySource: "custom",
          stagedPresetId: null,
          stagedCustomSpecJson: serializeCustomSpecForStage(customSpec),
        });
        showMsg(
          "\u05E0\u05D5\u05E6\u05E8\u05D4 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D9\u05D3\u05E0\u05D9\u05D9\u05DD (\u05DC\u05D0 \u05D4\u05D5\u05D7\u05DC\u05D4). \u05D4\u05D4\u05D7\u05DC\u05D4 \u05EA\u05E9\u05EA\u05DE\u05E9 \u05D1\u05BEsnapshot \u05D4\u05DE\u05D3\u05D5\u05D9\u05D9\u05E7 \u05E9\u05DC \u05EA\u05E6\u05D5\u05D2\u05D4 \u05D6\u05D5 \u05D1\u05DC\u05D9 \u05D1\u05E0\u05D9\u05D9\u05D4 \u05DE\u05D7\u05D3\u05E9."
        );
      }
    } catch (e) {
      setPreview(null);
      showErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const stagedCustomJson = preview?.stagedCustomSpecJson;
  const currentCustomJson = serializeCustomSpecForStage(customSpec);
  const canApplyStaged =
    (simMode === "quick" &&
      Boolean(presetId) &&
      preview?.applySource === "preset" &&
      preview.stagedPresetId === presetId) ||
    (simMode === "custom" && preview?.applySource === "custom" && stagedCustomJson === currentCustomJson);

  const handleApply = () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!preview) {
        showErr("\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05E7\u05D5\u05D3\u05DD.");
        return;
      }
      if (preview.applySource === "import") {
        showErr(
          "\u05D4\u05D4\u05D7\u05DC\u05D4 \u05DE\u05D9\u05D5\u05E2\u05D3\u05EA \u05DC\u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05E9\u05DC \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC. \u05D9\u05D9\u05D1\u05D5\u05D0 \u05DB\u05D1\u05E8 \u05DB\u05EA\u05D1 \u05DC\u05D0\u05D7\u05E1\u05D5\u05DF."
        );
        return;
      }
      if (preview.applySource === "preset") {
        if (simMode !== "quick" || preview.stagedPresetId !== presetId) {
          showErr(
            "\u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D4\u05E0\u05D1\u05D7\u05E8 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05D5\u05D0\u05DD \u05DC\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05D0\u05D5\u05D7\u05E1\u05E0\u05EA. \u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05E9\u05D5\u05D1 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D4\u05D7\u05DC\u05D4."
          );
          return;
        }
      } else if (preview.applySource === "custom") {
        if (simMode !== "custom" || serializeCustomSpecForStage(customSpec) !== preview.stagedCustomSpecJson) {
          showErr(
            "\u05D4\u05D2\u05D3\u05E8\u05D9\u05DD \u05D4\u05D9\u05D3\u05E0\u05D9\u05D9\u05DD \u05E9\u05D5\u05E0\u05D5 \u05DE\u05D4\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05D0\u05D5\u05D7\u05E1\u05E0\u05EA. \u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05D7\u05D3\u05E9 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D4\u05D7\u05DC\u05D4."
          );
          return;
        }
      }
      const ar = applyMetadataThenSnapshot({
        metadata: preview.metadata,
        snapshot: preview.snapshot,
        allowedKeys: STORAGE_KEYS,
      });
      if (!ar.ok) {
        if (ar.phase === "validate") {
          showErr(`\u05D4\u05D4\u05D7\u05DC\u05D4 \u05E0\u05D7\u05E1\u05DE\u05D4 \u05D1\u05DE\u05E4\u05EA\u05D7 ${ar.key}: ${ar.error || "\u05D0\u05D9\u05DE\u05D5\u05EA"}`);
        } else if (ar.phase === "metadata") {
          showErr(`\u05DB\u05EA\u05D9\u05D1\u05EA metadata \u05E0\u05DB\u05E9\u05DC\u05D4: ${ar.reason}. \u05DC\u05D0 \u05E9\u05D5\u05E0\u05D5 \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA snapshot.`);
        } else if (ar.phase === "snapshot") {
          showErr(
            `\u05DB\u05EA\u05D9\u05D1\u05EA snapshot \u05E0\u05E2\u05E6\u05E8\u05D4 \u05D1\u05DE\u05E4\u05EA\u05D7 ${ar.key} (${ar.error || "\u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2"}). metadata \u05D4\u05D2\u05D9\u05D1\u05D5\u05D9 \u05DB\u05D1\u05E8 \u05E0\u05E9\u05DE\u05E8 \u2014 \u05D9\u05E9 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DB\u05D3\u05D9 \u05DC\u05E9\u05D7\u05D6\u05E8 \u05E2\u05E8\u05DB\u05D9\u05DD \u05E7\u05D5\u05D3\u05DE\u05D9\u05DD.`
          );
        } else {
          showErr("\u05D4\u05D4\u05D7\u05DC\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4.");
        }
        return;
      }
      const metaApplied = preview.metadata && typeof preview.metadata === "object" ? preview.metadata : {};
      const dr = metaApplied.simulationDateRange;
      const readback = readCurrentSimulatorExportFromLocalStorage();
      const topicAgg = aggregateTopicPreviewBySession(preview.sessions || []);
      const affected = Array.isArray(metaApplied.affectedUnits) ? metaApplied.affectedUnits : [];
      const touchedKeysApplied = Array.isArray(metaApplied.effectiveTouchedKeys)
        ? metaApplied.effectiveTouchedKeys
        : preview.touchedKeys || [];
      const recShort =
        dr && typeof dr.startYmd === "string" && typeof dr.endYmd === "string"
          ? learningParentReportShortHref({ period: "custom", startYmd: dr.startYmd, endYmd: dr.endYmd })
          : learningParentReportShortHref({ period: "month" });
      setLastApplyVerification({
        at: Date.now(),
        affectedCount: affected.length,
        affectedRows: affected.map((u) => ({
          subjectKey: u.subject,
          topicKey: u.topic,
          he: `${hebrewSubjectLabel(u.subject)} / ${hebrewTopicPrimary(u.topic)}`,
        })),
        topicStats: topicAgg.map((row) => ({
          label: `${hebrewSubjectLabel(row.subject)} / ${hebrewTopicPrimary(row.topic)}`,
          sessionRows: row.sessionRows,
          questions: row.questions,
        })),
        touchedStorageKeys: touchedKeysApplied,
        dateRange: dr && typeof dr === "object" ? { ...dr } : null,
        readbackOk: Boolean(readback),
        readbackSnapshotKeyCount: readback && readback.snapshot ? Object.keys(readback.snapshot).length : 0,
        recommendedShortHref: recShort,
      });
      refreshSimRangeLinks();
      showMsg(
        "\u05D4\u05D5\u05D7\u05DC \u05D1\u05D3\u05E4\u05D3\u05E4\u05DF \u05D6\u05D4 \u05D1\u05D0\u05DE\u05E6\u05E2\u05D5\u05EA \u05D4\u05D7\u05D1\u05D9\u05DC\u05D4 \u05DE\u05D4\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 (metadata \u05E0\u05DB\u05EA\u05D1 \u05DC\u05E4\u05E0\u05D9 snapshot)."
      );
    } catch (e) {
      showErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = resetSimulatedStudentFromMetadata();
      if (!r.ok) {
        showErr(`\u05D4\u05D0\u05D9\u05E4\u05D5\u05E1 \u05D3\u05D5\u05DC\u05D2: ${r.reason}`);
        return;
      }
      setPreview(null);
      setLastApplyVerification(null);
      refreshSimRangeLinks();
      showMsg(
        "\u05D4\u05D0\u05D9\u05E4\u05D5\u05E1 \u05D4\u05D5\u05E9\u05DC\u05DD. \u05D4\u05E2\u05E8\u05DB\u05D9\u05DD \u05D4\u05E7\u05D5\u05D3\u05DE\u05D9\u05DD \u05E9\u05D5\u05D7\u05D6\u05E8\u05D5 (\u05D0\u05D5 \u05D4\u05D5\u05E1\u05E8\u05D5) \u05DC\u05E4\u05D9 metadata \u05D4\u05D2\u05D9\u05D1\u05D5\u05D9."
      );
    } catch (e) {
      showErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    setBusy(true);
    try {
      const cur = readCurrentSimulatorExportFromLocalStorage();
      if (!cur) {
        showErr(
          "\u05D0\u05D9\u05DF metadata \u05E9\u05DC \u05D4\u05E1\u05D9\u05DE\u05D5\u05DC\u05D8\u05D5\u05E8 \u2014 \u05D9\u05D9\u05E6\u05D5\u05D0 \u05D6\u05DE\u05D9\u05DF \u05E8\u05E7 \u05D0\u05D7\u05E8\u05D9 \u05D4\u05D7\u05DC\u05D4 \u05D0\u05D5 \u05D9\u05D9\u05D1\u05D5\u05D0."
        );
        return;
      }
      const pkg = exportSimulatorPackage({
        presetId: cur.metadata.presetId,
        snapshot: cur.snapshot,
        metadata: cur.metadata,
      });
      const blob = new Blob([serializeSimulatorPackage(pkg)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dev-student-simulator-${String(cur.metadata.presetId || "export")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg("\u05D4\u05D9\u05D9\u05E6\u05D5\u05D0 \u05D4\u05EA\u05D7\u05D9\u05DC.");
    } catch (e) {
      showErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const pkg = parseSimulatorPackage(text);
        const snapshot = pkg.snapshot;
        if (!snapshot || typeof snapshot !== "object") throw new Error("\u05D1\u05D7\u05D1\u05D9\u05DC\u05D4 \u05D7\u05E1\u05E8 snapshot");
        const v0 = validateSnapshotForApply(snapshot, STORAGE_KEYS);
        if (!v0.ok) throw new Error(`\u05D9\u05D9\u05D1\u05D5\u05D0 \u05E0\u05D7\u05E1\u05DD \u05D1\u05DE\u05E4\u05EA\u05D7 ${v0.key}: ${v0.code}`);
        const effectiveTouchedKeys = deriveEffectiveTouchedKeysFromSnapshot(snapshot);
        const existing = readRawStorageMapForKeys(effectiveTouchedKeys);
        const backupByKey = buildBackupEnvelope(effectiveTouchedKeys, existing);
        const importedTouchedKeysOriginal = Array.isArray(pkg.metadata?.touchedKeys) ? [...pkg.metadata.touchedKeys] : undefined;
        const meta = {
          ...pkg.metadata,
          effectiveTouchedKeys,
          touchedKeys: effectiveTouchedKeys,
          ...(importedTouchedKeysOriginal != null ? { importedTouchedKeysOriginal } : {}),
          backupByKey,
          generatedAt: new Date().toISOString(),
        };
        const ar = applyMetadataThenSnapshot({ metadata: meta, snapshot, allowedKeys: STORAGE_KEYS });
        if (!ar.ok) {
          if (ar.phase === "validate") throw new Error(`\u05D9\u05D9\u05D1\u05D5\u05D0 \u05E0\u05D7\u05E1\u05DD \u05D1\u05DE\u05E4\u05EA\u05D7 ${ar.key}: ${ar.error}`);
          if (ar.phase === "metadata") throw new Error(`\u05DB\u05EA\u05D9\u05D1\u05EA metadata \u05E0\u05DB\u05E9\u05DC\u05D4: ${ar.reason}`);
          if (ar.phase === "snapshot") {
            throw new Error(
              `\u05DB\u05EA\u05D9\u05D1\u05EA snapshot \u05E0\u05E2\u05E6\u05E8\u05D4 \u05D1\u05DE\u05E4\u05EA\u05D7 ${ar.key} (${ar.error || "\u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2"}). metadata \u05E0\u05E9\u05DE\u05E8 \u2014 \u05D9\u05E9 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DB\u05D3\u05D9 \u05DC\u05E9\u05D7\u05D6\u05E8 \u05E2\u05E8\u05DB\u05D9\u05DD \u05E7\u05D5\u05D3\u05DE\u05D9\u05DD.`
            );
          }
          throw new Error("\u05D4\u05D7\u05DC\u05EA \u05D4\u05D9\u05D9\u05D1\u05D5\u05D0 \u05E0\u05DB\u05E9\u05DC\u05D4.");
        }
        setPreview({
          preset: DEV_STUDENT_PRESETS.find((p) => p.id === pkg.metadata?.presetId) || null,
          snapshot,
          touchedKeys: effectiveTouchedKeys,
          metadata: meta,
          validation: { sessions: { ok: true }, namespace: { ok: true } },
          applySource: "import",
          stagedPresetId: null,
        });
        showMsg("\u05D4\u05D9\u05D9\u05D1\u05D5\u05D0 \u05D4\u05D5\u05D7\u05DC \u05D5\u05E0\u05E9\u05DE\u05E8 \u05D1\u05D2\u05D9\u05D1\u05D5\u05D9 \u05D1\u05E6\u05D5\u05E8\u05D4 \u05D1\u05D8\u05D5\u05D7\u05D4.");
      } catch (e) {
        showErr(String(e?.message || e));
      } finally {
        setBusy(false);
        ev.target.value = "";
      }
    };
    reader.onerror = () => {
      showErr("\u05E7\u05E8\u05D9\u05D0\u05EA \u05D4\u05E7\u05D5\u05D1\u05E5 \u05E0\u05DB\u05E9\u05DC\u05D4.");
      setBusy(false);
      ev.target.value = "";
    };
    reader.readAsText(file, "utf8");
  };

  const handleCopySnapshot = async () => {
    setBusy(true);
    try {
      const cur = readCurrentSimulatorExportFromLocalStorage();
      if (!cur) {
        showErr("\u05D0\u05D9\u05DF \u05DE\u05D4 \u05DC\u05D4\u05E2\u05EA\u05D9\u05E7 \u2014 \u05D9\u05E9 \u05DC\u05D4\u05D7\u05D9\u05DC \u05D0\u05D5 \u05DC\u05D9\u05D9\u05D1\u05D0 \u05E7\u05D5\u05D3\u05DD.");
        return;
      }
      const pkg = exportSimulatorPackage({ presetId: cur.metadata.presetId, snapshot: cur.snapshot, metadata: cur.metadata });
      await navigator.clipboard.writeText(serializeSimulatorPackage(pkg));
      showMsg("\u05D4\u05BEJSON \u05D4\u05D5\u05E2\u05EA\u05E7 \u05DC\u05DC\u05D5\u05D7.");
    } catch (e) {
      showErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const sessionsStat = preview?.validation?.sessions?.stats || null;
  const namespaceOk = preview?.validation?.namespace?.ok;
  const sessionsOk = preview?.validation?.sessions?.ok;
  const snapshotKeyCount = Object.keys(preview?.snapshot || {}).length;
  const touchedCount = preview?.touchedKeys?.length || 0;
  const trendHe = preset ? TREND_PATTERN_HE[preset.trendPattern] || preset.trendPattern : "";

  const t = {
    title: "\u05E1\u05D9\u05DE\u05D5\u05DC\u05D8\u05D5\u05E8 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05DC\u05E4\u05D9\u05EA\u05D5\u05D7",
    internalNs: "\u05DE\u05E8\u05D7\u05D1 \u05D0\u05D7\u05E1\u05D5\u05DF \u05E4\u05E0\u05D9\u05DE\u05D9:",
    logout: "\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA",
    secPreset: "\u05D1\u05D7\u05D9\u05E8\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC",
    days: "\u05D9\u05DE\u05D9\u05DD",
    sessions: "\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA",
    questions: "\u05E9\u05D0\u05DC\u05D5\u05EA",
    pattern: "\u05D3\u05E4\u05D5\u05E1:",
    secActions: "\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA",
    btnPreview: "\u05D9\u05E6\u05D9\u05E8\u05EA \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4",
    btnPreviewCustom: "\u05D9\u05E6\u05D9\u05E8\u05EA \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D9\u05D3\u05E0\u05D9\u05D9\u05DD",
    modeQuick: "\u05E4\u05E8\u05D9\u05E1\u05D8\u05D9\u05DD \u05DE\u05D4\u05D9\u05E8\u05D9\u05DD",
    modeCustom: "\u05D1\u05E0\u05D9\u05D9\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA",
    btnApply: "\u05D4\u05D7\u05DC\u05D4 \u05D1\u05D3\u05E4\u05D3\u05E4\u05DF \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9",
    btnReset: "\u05D0\u05D9\u05E4\u05D5\u05E1 \u05EA\u05DC\u05DE\u05D9\u05D3 \u05DE\u05D3\u05D5\u05DE\u05D4",
    btnExport: "\u05D9\u05D9\u05E6\u05D5\u05D0 JSON",
    btnImport: "\u05D9\u05D9\u05D1\u05D5\u05D0 JSON",
    btnCopy: "\u05D4\u05E2\u05EA\u05E7\u05EA snapshot \u05D0\u05D7\u05E1\u05D5\u05DF",
    hintPreviewFirst: "\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05E7\u05D5\u05D3\u05DD.",
    hintPreviewFirstCustom: "\u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05D4\u05D2\u05D3\u05E8\u05D9\u05DD \u05D4\u05D9\u05D3\u05E0\u05D9\u05D9\u05DD \u05E7\u05D5\u05D3\u05DD.",
    hintStaleApply:
      "\u05D4\u05D4\u05D7\u05DC\u05D4 \u05DE\u05D5\u05E9\u05D1\u05EA\u05EA \u05DB\u05D9 \u05D4\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D4\u05E0\u05D1\u05D7\u05E8 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05D5\u05D0\u05DD \u05E2\u05D5\u05D3 \u05DC\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05D0\u05D5\u05D7\u05E1\u05E0\u05EA. \u05D9\u05E9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05D7\u05D3\u05E9.",
    hintStaleApplyCustom:
      "\u05D4\u05D1\u05D7\u05D9\u05E8\u05D4 \u05D4\u05E9\u05EA\u05E0\u05EA\u05D4. \u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DE\u05D7\u05D3\u05E9 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D7\u05DC\u05D4.",
    secReports: "\u05E4\u05EA\u05D9\u05D7\u05EA \u05D4\u05D3\u05D5\u05D7\u05D5\u05EA \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9\u05D9\u05DD",
    secAppliedSummary: "\u05DE\u05D4 \u05D4\u05D5\u05D7\u05DC \u05D1\u05E4\u05D5\u05E2\u05DC",
    appliedUnits: "\u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05DE\u05D5\u05E9\u05E4\u05E2\u05D5\u05EA",
    appliedTopicBreakdown: "\u05E4\u05D9\u05E8\u05D5\u05D8 \u05DC\u05E4\u05D9 \u05E0\u05D5\u05E9\u05D0 (\u05DE\u05D4\u05EA\u05E6\u05D5\u05D2\u05D4 \u05E9\u05D4\u05D5\u05D7\u05DC\u05D4)",
    appliedBuckets: "\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05D0\u05D7\u05E1\u05D5\u05DF \u05E9\u05E0\u05DB\u05EA\u05D1\u05D5",
    appliedReadback: "\u05D0\u05D9\u05DE\u05D5\u05EA \u05E7\u05E8\u05D9\u05D0\u05D4 \u05DE\u05D4\u05D0\u05D7\u05E1\u05D5\u05DF",
    appliedDateRange: "\u05D8\u05D5\u05D5\u05D7 \u05EA\u05D0\u05E8\u05D9\u05DB\u05D9\u05DD \u05E9\u05D4\u05D5\u05E6\u05E8",
    appliedReportRec: "\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D3\u05D5\u05D7 \u05DE\u05D5\u05DE\u05DC\u05E5",
    hintDefaultReportLinks:
      "\u05DC\u05DC\u05D0 metadata \u05E2\u05DD \u05D8\u05D5\u05D5\u05D7 \u05E1\u05D9\u05DE\u05D5\u05DC\u05E6\u05D9\u05D4: \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05DC\u05E9\u05D1\u05D5\u05E2 \u05D0\u05D7\u05E8\u05D5\u05DF \u05E2\u05DC\u05D5\u05DC\u05D9\u05DD \u05DC\u05D4\u05E1\u05EA\u05D9\u05E8 \u05DE\u05D3\u05D2\u05DD \u05E7\u05E6\u05E8. \u05D0\u05D7\u05E8\u05D9 \u05D4\u05D7\u05DC\u05D4 \u05DE\u05D4\u05E1\u05D9\u05DE\u05D5\u05DC\u05D8\u05D5\u05E8 \u05D9\u05D5\u05E4\u05D9\u05E2\u05D5 \u05DB\u05D0\u05DF \u05E7\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD \u05DC\u05D8\u05D5\u05D5\u05D7 \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05E0\u05D5\u05E6\u05E8\u05D5.",
    linkShort: "\u05D3\u05D5\u05D7 \u05D4\u05D5\u05E8\u05D9\u05DD \u05E7\u05E6\u05E8 (\u05E9\u05D1\u05D5\u05E2 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC)",
    linkDetailed: "\u05D3\u05D5\u05D7 \u05D4\u05D5\u05E8\u05D9\u05DD \u05DE\u05E4\u05D5\u05E8\u05D8 (\u05E9\u05D1\u05D5\u05E2 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC)",
    linkSummary: "\u05EA\u05E7\u05E6\u05D9\u05E8 \u05D4\u05D3\u05D5\u05D7 \u05D4\u05DE\u05E4\u05D5\u05E8\u05D8 (\u05E9\u05D1\u05D5\u05E2 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC)",
    linkShortSimRange: "\u05D3\u05D5\u05D7 \u05E7\u05E6\u05E8 \u2014 \u05D8\u05D5\u05D5\u05D7 \u05D4\u05E1\u05D9\u05DE\u05D5\u05DC\u05E6\u05D9\u05D4",
    linkDetailedSimRange: "\u05D3\u05D5\u05D7 \u05DE\u05E4\u05D5\u05E8\u05D8 \u2014 \u05D8\u05D5\u05D5\u05D7 \u05D4\u05E1\u05D9\u05DE\u05D5\u05DC\u05E6\u05D9\u05D4",
    linkSummarySimRange: "\u05EA\u05E7\u05E6\u05D9\u05E8 \u2014 \u05D8\u05D5\u05D5\u05D7 \u05D4\u05E1\u05D9\u05DE\u05D5\u05DC\u05E6\u05D9\u05D4",
    secValidation: "\u05E1\u05D9\u05DB\u05D5\u05DD \u05D1\u05D3\u05D9\u05E7\u05D5\u05EA",
    statSessions: "\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA:",
    statQuestions: "\u05E9\u05D0\u05DC\u05D5\u05EA:",
    statDays: "\u05D9\u05DE\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD:",
    statSubjects: "\u05DE\u05E7\u05E6\u05D5\u05E2\u05D5\u05EA:",
    hintValidation: "\u05E6\u05D5\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D1\u05D3\u05D9\u05E7\u05D5\u05EA \u05D4\u05EA\u05E7\u05D9\u05E0\u05D5\u05EA.",
    secTouched: "\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05DC\u05E9\u05D7\u05D6\u05D5\u05E8 / \u05D0\u05D9\u05E4\u05D5\u05E1",
    touchedNone: "\u05D0\u05D9\u05DF \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05DE\u05E1\u05D5\u05DE\u05E0\u05D9\u05DD \u05DC\u05D2\u05D9\u05D1\u05D5\u05D9/\u05D0\u05D9\u05E4\u05D5\u05E1.",
    touchedSomeSuffix: " \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05DE\u05E1\u05D5\u05DE\u05E0\u05D9\u05DD \u05DC\u05D2\u05D9\u05D1\u05D5\u05D9/\u05D0\u05D9\u05E4\u05D5\u05E1.",
    sumTouchedJson: "\u05D4\u05E6\u05D2\u05EA JSON \u05E9\u05DC \u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05D4\u05E0\u05D2\u05D9\u05E2\u05D4",
    secDetails: "\u05E4\u05E8\u05D8\u05D9 snapshot / metadata",
    hintJsonCollapsed:
      "JSON \u05D0\u05E8\u05D5\u05DA \u05DE\u05D5\u05E1\u05EA\u05E8 \u05DB\u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC \u05DB\u05D3\u05D9 \u05DC\u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05E7\u05E8\u05D9\u05D0\u05D5\u05EA.",
    sumValSessions: "\u05D0\u05D9\u05DE\u05D5\u05EA (\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA)",
    sumValNs: "\u05D0\u05D9\u05DE\u05D5\u05EA (\u05DE\u05E8\u05D7\u05D1 \u05E9\u05DE\u05D5\u05EA)",
    sumMetaPrefix: "metadata \u05D2\u05D9\u05D1\u05D5\u05D9",
    sumSnapKeys: "\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA snapshot + \u05E1\u05D5\u05D2/\u05D2\u05D5\u05D3\u05DC \u05E2\u05E8\u05DA",
    modeSwitchTitle: "\u05DE\u05E6\u05D1 \u05E2\u05D1\u05D5\u05D3\u05D4",
    secCustomBuilder: "\u05D1\u05E0\u05D9\u05D9\u05EA \u05EA\u05DC\u05DE\u05D9\u05D3 \u05D9\u05D3\u05E0\u05D9\u05EA",
    valCurWin: "\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA \u05D1\u05D7\u05DC\u05D5\u05DF \u05E0\u05D5\u05DB\u05D7\u05D9 (30 \u05D9\u05D5\u05DD):",
    valPrevWin: "\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA \u05D1\u05D7\u05DC\u05D5\u05DF \u05E7\u05D5\u05D3\u05DD (30\u201360 \u05D9\u05D5\u05DD):",
    valTopicKeys: "\u05E1\u05D4\u05DB \u05DE\u05E4\u05EA\u05D7\u05D9 \u05E0\u05D5\u05E9\u05D0\u05D9\u05DD \u05D9\u05D7\u05D5\u05D3\u05D9\u05D9\u05DD:",
    previewTopicSummaryTitle:
      "\u05E0\u05D5\u05E9\u05D0\u05D9\u05DD \u05E1\u05D5\u05DB\u05DE\u05D9\u05DD \u05D1\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 (\u05DC\u05E4\u05D9 \u05E0\u05D5\u05E9\u05D0)",
    previewTopicRowSessions: "\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA",
    previewTopicRowQuestions: "\u05E9\u05D0\u05DC\u05D5\u05EA",
  };

  return (
    <div dir="rtl" lang="he" style={{ maxWidth: 1160, margin: "0 auto", color: COLORS.pageText }}>
      <div style={{ ...sectionCard, background: COLORS.cardSoft, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: COLORS.pageText }}>{t.title}</h1>
            <p style={{ margin: "6px 0 0", color: COLORS.muted, fontSize: 14 }}>
              {`${PRODUCT_DISPLAY_NAME} \u00B7 ${t.internalNs}`}{" "}
              <code dir="ltr" style={{ unicodeBidi: "embed" }}>
                {INTERNAL_STORAGE_NAMESPACE}
              </code>
            </p>
          </div>
          <button type="button" style={makeButtonStyle("secondary", busy)} onClick={handleLogout} disabled={busy}>
            {t.logout}
          </button>
        </div>
      </div>

      {message ? (
        <div style={{ ...sectionCard, marginBottom: 16, borderColor: "#86efac", background: "#f0fdf4", color: "#166534" }}>{message}</div>
      ) : null}
      {error ? (
        <div
          data-testid="dev-sim-error"
          style={{ ...sectionCard, marginBottom: 16, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
        >
          {error}
        </div>
      ) : null}

      {lastApplyVerification ? (
        <div
          data-testid="dev-sim-applied-summary"
          style={{
            ...sectionCard,
            marginBottom: 16,
            borderColor: "#93c5fd",
            background: "#eff6ff",
            color: COLORS.pageText,
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{t.secAppliedSummary}</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.muted }}>
            {t.appliedUnits}:{" "}
            <span dir="ltr" style={{ unicodeBidi: "embed", fontWeight: 700 }}>
              {lastApplyVerification.affectedCount}
            </span>
          </p>
          <ul style={{ margin: "0 0 10px", paddingRight: 18, fontSize: 13, listStyle: "disc" }}>
            {lastApplyVerification.affectedRows.map((row) => (
              <li key={`${row.subjectKey}:${row.topicKey}`} style={{ marginBottom: 4 }}>
                {row.he}{" "}
                <span dir="ltr" style={{ unicodeBidi: "embed", color: COLORS.muted, fontSize: 12 }}>
                  ({row.subjectKey}/{row.topicKey})
                </span>
              </li>
            ))}
          </ul>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.appliedTopicBreakdown}</p>
          <ul style={{ margin: "0 0 10px", paddingRight: 18, fontSize: 13, listStyle: "disc", color: COLORS.muted }}>
            {lastApplyVerification.topicStats.map((row) => (
              <li key={row.label}>
                {row.label}: {row.sessionRows} {t.previewTopicRowSessions}, {row.questions} {t.previewTopicRowQuestions}
              </li>
            ))}
          </ul>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.appliedBuckets}</p>
          <p dir="ltr" style={{ margin: "0 0 8px", fontSize: 11, wordBreak: "break-all", color: COLORS.muted }}>
            {lastApplyVerification.touchedStorageKeys.join(", ")}
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.appliedDateRange}</p>
          <p dir="ltr" style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.muted }}>
            {lastApplyVerification.dateRange?.startYmd || "-"} \u2192 {lastApplyVerification.dateRange?.endYmd || "-"}
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.appliedReadback}</p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.muted }}>
            {lastApplyVerification.readbackOk ? "\u2713 metadata + snapshot" : "\u2717 \u05DC\u05D0 \u05E0\u05E7\u05E8\u05D0 \u05DE\u05D4\u05D0\u05D7\u05E1\u05D5\u05DF"}{" "}
            <span dir="ltr" style={{ unicodeBidi: "embed" }}>
              ({lastApplyVerification.readbackSnapshotKeyCount} keys)
            </span>
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.appliedReportRec}</p>
          <p dir="ltr" style={{ margin: 0, fontSize: 12 }}>
            <a href={lastApplyVerification.recommendedShortHref} style={{ color: COLORS.primary }}>
              {lastApplyVerification.recommendedShortHref}
            </a>
          </p>
        </div>
      ) : null}

      <div style={{ ...sectionCard, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{t.modeSwitchTitle}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            data-testid="dev-sim-mode-quick"
            style={makeButtonStyle(simMode === "quick" ? "primary" : "secondary", busy)}
            onClick={() => setSimMode("quick")}
            disabled={busy}
          >
            {t.modeQuick}
          </button>
          <button
            type="button"
            data-testid="dev-sim-mode-custom"
            style={makeButtonStyle(simMode === "custom" ? "primary" : "secondary", busy)}
            onClick={() => setSimMode("custom")}
            disabled={busy}
          >
            {t.modeCustom}
          </button>
        </div>
      </div>

      {simMode === "quick" ? (
        <div style={{ ...sectionCard, marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t.secPreset}</h2>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            disabled={busy}
            style={{
              width: "100%",
              maxWidth: 620,
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              padding: 10,
              fontSize: 14,
              color: COLORS.pageText,
            }}
          >
            {DEV_STUDENT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {presetOptionLabel(p)}
              </option>
            ))}
          </select>
          {preset ? (
            <p style={{ margin: "10px 0 0", color: COLORS.muted, fontSize: 14 }}>
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {preset.spanDays}
              </span>{" "}
              {t.days} \u00B7{" "}
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {preset.targetSessions}
              </span>{" "}
              {t.sessions} \u00B7 ~{" "}
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {preset.targetQuestions}
              </span>{" "}
              {t.questions} \u00B7 {t.pattern} {trendHe}
              <span dir="ltr" style={{ unicodeBidi: "plaintext", marginInlineStart: 6, fontSize: 12, color: COLORS.muted }}>
                ({preset.trendPattern})
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <div style={{ ...sectionCard, marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{t.secCustomBuilder}</h2>
          <CustomBuilderPanel value={customSpec} setValue={setCustomSpec} disabled={busy} />
        </div>
      )}

      <div style={{ ...sectionCard, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{t.secActions}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            data-testid="dev-sim-preview"
            style={makeButtonStyle("primary", busy || (simMode === "quick" && !presetId))}
            onClick={handlePreview}
            disabled={busy || (simMode === "quick" && !presetId)}
          >
            {simMode === "custom" ? t.btnPreviewCustom : t.btnPreview}
          </button>
          <button
            type="button"
            data-testid="dev-sim-apply"
            style={makeButtonStyle("primary", busy || !canApplyStaged)}
            onClick={handleApply}
            disabled={busy || !canApplyStaged}
          >
            {t.btnApply}
          </button>
          <button type="button" data-testid="dev-sim-reset" style={makeButtonStyle("danger", busy)} onClick={handleReset} disabled={busy}>
            {t.btnReset}
          </button>
          <button type="button" style={makeButtonStyle("secondary", busy)} onClick={handleExport} disabled={busy}>
            {t.btnExport}
          </button>
          <label style={{ ...makeButtonStyle("secondary", busy), display: "inline-flex", alignItems: "center" }}>
            {t.btnImport}
            <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} disabled={busy} />
          </label>
          <button type="button" style={makeButtonStyle("secondary", busy)} onClick={handleCopySnapshot} disabled={busy}>
            {t.btnCopy}
          </button>
        </div>
        {!preview ? (
          <p style={{ margin: "12px 0 0", color: COLORS.muted, fontSize: 13 }}>
            {simMode === "custom" ? t.hintPreviewFirstCustom : t.hintPreviewFirst}
          </p>
        ) : null}
        {preview && !canApplyStaged ? (
          <p style={{ margin: "12px 0 0", color: COLORS.muted, fontSize: 13 }}>
            {preview.applySource === "custom" ? t.hintStaleApplyCustom : t.hintStaleApply}
          </p>
        ) : null}
      </div>

      <div style={{ ...sectionCard, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{t.secReports}</h2>
        {simRangeLinks ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <a
              data-testid="dev-sim-link-sim-range-short"
              href={simRangeLinks.shortHref}
              style={makeButtonStyle("link", false)}
            >
              {t.linkShortSimRange}
            </a>
            <a
              data-testid="dev-sim-link-sim-range-detailed"
              href={simRangeLinks.detailedHref}
              style={makeButtonStyle("link", false)}
            >
              {t.linkDetailedSimRange}
            </a>
            <a
              data-testid="dev-sim-link-sim-range-summary"
              href={simRangeLinks.summaryHref}
              style={makeButtonStyle("link", false)}
            >
              {t.linkSummarySimRange}
            </a>
          </div>
        ) : (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: COLORS.muted }}>{t.hintDefaultReportLinks}</p>
        )}
        <p style={{ margin: "0 0 6px", fontSize: 12, color: COLORS.muted }}>\u05E7\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05DB\u05DC\u05DC\u05D9\u05D9\u05DD (\u05EA\u05E7\u05D5\u05E4\u05EA \u05E9\u05D1\u05D5\u05E2 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC \u05D1\u05D3\u05E3 \u05D4\u05D3\u05D5\u05D7):</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <a
            data-testid="dev-sim-link-parent-report-short"
            href={learningParentReportShortHref({ period: "week" })}
            style={makeButtonStyle("link", false)}
          >
            {t.linkShort}
          </a>
          <a
            data-testid="dev-sim-link-parent-report-detailed"
            href={learningParentReportDetailedHref({ period: "week" })}
            style={makeButtonStyle("link", false)}
          >
            {t.linkDetailed}
          </a>
          <a
            data-testid="dev-sim-link-parent-report-summary"
            href={learningParentReportDetailedSummaryHref({ period: "week" })}
            style={makeButtonStyle("link", false)}
          >
            {t.linkSummary}
          </a>
        </div>
      </div>

      <div style={{ ...sectionCard, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>{t.secValidation}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {statusBadge(
            `\u05E4\u05D2\u05D9\u05E9\u05D5\u05EA: ${sessionsOk == null ? "\u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF" : sessionsOk ? "\u05E2\u05D1\u05E8" : "\u05E0\u05D7\u05E1\u05DD"}`,
            sessionsOk == null ? "warn" : sessionsOk ? "ok" : "blocked"
          )}
          {statusBadge(
            `\u05DE\u05E8\u05D7\u05D1 \u05E9\u05DE\u05D5\u05EA: ${namespaceOk == null ? "\u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF" : namespaceOk ? "\u05E2\u05D1\u05E8" : "\u05E0\u05D7\u05E1\u05DD"}`,
            namespaceOk == null ? "warn" : namespaceOk ? "ok" : "blocked"
          )}
          {statusBadge(`\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA \u05DC\u05E9\u05D7\u05D6\u05D5\u05E8: ${touchedCount}`, "warn")}
          {statusBadge(`\u05DE\u05E4\u05EA\u05D7\u05D5\u05EA snapshot: ${snapshotKeyCount}`, "warn")}
          {statusBadge(`metadata: ${preview?.metadata ? "\u05E7\u05D9\u05D9\u05DD" : "\u05D0\u05D9\u05DF"}`, preview?.metadata ? "ok" : "warn")}
        </div>
        {sessionsStat ? (
          <>
            <p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>
              {t.statSessions}{" "}
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {sessionsStat.sessions}
              </span>{" "}
              \u00B7 {t.statQuestions}{" "}
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {sessionsStat.totalQuestions}
              </span>{" "}
              \u00B7 {t.statDays}{" "}
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {sessionsStat.activeDays}
              </span>{" "}
              \u00B7 {t.statSubjects}{" "}
              <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                {sessionsStat.subjectCount}
              </span>
              {typeof sessionsStat.topicKeyCount === "number" ? (
                <>
                  {" "}
                  \u00B7 {t.valTopicKeys}{" "}
                  <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                    {sessionsStat.topicKeyCount}
                  </span>
                </>
              ) : null}
            </p>
            {typeof sessionsStat.currentWindowSessions === "number" ? (
              <p style={{ margin: "8px 0 0", color: COLORS.muted, fontSize: 13 }}>
                {t.valCurWin}{" "}
                <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                  {sessionsStat.currentWindowSessions}
                </span>
                {" \u00B7 "}
                {t.valPrevWin}{" "}
                <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                  {sessionsStat.previousWindowSessions}
                </span>
              </p>
            ) : null}
            {Array.isArray(preview?.validation?.sessions?.warnings) && preview.validation.sessions.warnings.length > 0 ? (
              <p style={{ margin: "10px 0 0", color: "#854d0e", fontSize: 13 }}>
                \u05D0\u05D6\u05D4\u05E8\u05D5\u05EA: {preview.validation.sessions.warnings.join(" \u00B7 ")}
              </p>
            ) : null}
            {preview?.applySource === "custom" && Array.isArray(preview?.sessions) && preview.sessions.length ? (
              <div
                data-testid="dev-sim-preview-topic-summary"
                style={{
                  marginTop: 10,
                  padding: 10,
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.pageText }}>{t.previewTopicSummaryTitle}</p>
                <ul
                  data-testid="dev-sim-preview-topic-list"
                  style={{ margin: "6px 0 0", paddingRight: 18, fontSize: 13, color: COLORS.muted, listStyle: "disc" }}
                >
                  {aggregateTopicPreviewBySession(preview.sessions).map((row) => (
                    <li key={`${row.subject}:${row.topic}`} style={{ marginBottom: 4 }}>
                      {hebrewSubjectLabel(row.subject)} / {hebrewTopicPrimary(row.topic)}: {row.sessionRows} {t.previewTopicRowSessions},{" "}
                      {row.questions} {t.previewTopicRowQuestions}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>{t.hintValidation}</p>
        )}
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 16 }}>
        <div style={sectionCard}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{t.secTouched}</h3>
          <p style={{ margin: "6px 0 0", color: COLORS.muted, fontSize: 13 }}>
            {touchedCount === 0 ? t.touchedNone : `${touchedCount}${t.touchedSomeSuffix}`}
          </p>
          {preview ? (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", color: COLORS.pageText, fontWeight: 600 }}>{t.sumTouchedJson}</summary>
              <pre dir="ltr" style={monoPanelBase}>
                {JSON.stringify(preview.touchedKeys, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>

        <div style={sectionCard}>
          <h3 style={{ margin: 0, fontSize: 15 }}>{t.secDetails}</h3>
          <p style={{ margin: "6px 0 0", color: COLORS.muted, fontSize: 13 }}>{t.hintJsonCollapsed}</p>
          {preview ? (
            <>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", color: COLORS.pageText, fontWeight: 600 }}>{t.sumValSessions}</summary>
                <pre dir="ltr" style={monoPanelBase}>
                  {JSON.stringify(preview.validation?.sessions, null, 2)}
                </pre>
              </details>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", color: COLORS.pageText, fontWeight: 600 }}>{t.sumValNs}</summary>
                <pre dir="ltr" style={monoPanelBase}>
                  {JSON.stringify(preview.validation?.namespace, null, 2)}
                </pre>
              </details>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", color: COLORS.pageText, fontWeight: 600 }}>
                  {t.sumMetaPrefix} (<span dir="ltr">{SIMULATOR_METADATA_KEY}</span>)
                </summary>
                <pre dir="ltr" style={monoPanelBase}>
                  {JSON.stringify(preview.metadata, null, 2)}
                </pre>
              </details>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", color: COLORS.pageText, fontWeight: 600 }}>{t.sumSnapKeys}</summary>
                <pre dir="ltr" style={monoPanelBase}>
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(preview.snapshot || {}).map(([k, v]) => {
                        const s = stringifyForLocalStorage(v);
                        return [k, { type: typeof v, bytes: s.length }];
                      })
                    ),
                    null,
                    2
                  )}
                </pre>
              </details>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
