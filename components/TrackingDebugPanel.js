import { useEffect, useState } from "react";
import {
  isTrackingDebugEnabled,
  TRACKING_DEBUG_SNAPSHOT,
  getTrackingDebugBucketInfo,
} from "../utils/tracking-debug";

/**
 * Fixed dev-only overlay. Parent re-renders + internal tick refresh ref.current and LS.
 */
export default function TrackingDebugPanel({
  subjectId,
  uiSelection,
  currentQuestion,
  trackingRef,
}) {
  const [enabled, setEnabled] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setEnabled(isTrackingDebugEnabled());
    sync();
    const id = setInterval(sync, 400);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  void tick;

  const refVal =
    trackingRef && typeof trackingRef === "object" && "current" in trackingRef
      ? trackingRef.current
      : null;
  const snap = TRACKING_DEBUG_SNAPSHOT;
  const { count, keys } = getTrackingDebugBucketInfo(subjectId);

  const cqT = currentQuestion?.topic;
  const cqO = currentQuestion?.operation;

  return (
    <div
      dir="ltr"
      style={{
        position: "fixed",
        right: 0,
        bottom: 0,
        zIndex: 2147483646,
        maxWidth: 420,
        maxHeight: "42vh",
        overflow: "auto",
        margin: 0,
        padding: "6px 8px",
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        lineHeight: 1.35,
        color: "#9f9",
        background: "rgba(0,0,0,0.88)",
        border: "1px solid #363",
        borderRadius: "4px 0 0 0",
        pointerEvents: "none",
        textAlign: "left",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      <div style={{ color: "#8f8", marginBottom: 4 }}>[tracking debug] {subjectId}</div>
      <div>1 UI: {uiSelection ?? "-"}</div>
      <div>2 currentQuestion.topic: {cqT !== undefined && cqT !== null ? String(cqT) : "-"}</div>
      <div>3 currentQuestion.operation: {cqO !== undefined && cqO !== null ? String(cqO) : "-"}</div>
      <div>4 trackingRef.current: {refVal != null && refVal !== "" ? String(refVal) : "-"}</div>
      <div>
        5 last track*Time: fn={snap.lastTrackedFn || "-"} bucket=
        {snap.lastTrackedBucket || "-"} dur={snap.lastTrackedDuration ?? "-"} mode=
        {snap.lastTrackedMode || "-"}
      </div>
      <div>
        6 LS buckets count: {count}
      </div>
      <div>7 LS keys: {keys.length ? keys.join(", ") : "-"}</div>
      <div>
        8 last addSessionProgress: subject={snap.lastSessionSubject || "-"} topic=
        {snap.lastSessionTopic || "-"} mode={snap.lastSessionMode || "-"}
      </div>
    </div>
  );
}
