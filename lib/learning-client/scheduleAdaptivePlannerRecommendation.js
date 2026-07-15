/**
 * Optional planner recommendation fetch after a learning session ends.
 * When the feature flag is off: returns undefined immediately (no network).
 * When on: returns a Promise (still safe if ignored) and never rejects to callers.
 */

function isClientPlannerFlagEnabled() {
  if (typeof process === "undefined" || !process.env) return false;
  const v = String(process.env.NEXT_PUBLIC_ENABLE_ADAPTIVE_PLANNER_RECOMMENDATION || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * @param {Record<string, unknown>} practiceResult - plain JSON-serializable fields; optional numeric `clientRequestId` for stale-response filtering
 * @param {{ onResult?: (data: unknown) => void }} [options]
 * @returns {Promise<unknown> | undefined}
 */
export function scheduleAdaptivePlannerRecommendation(practiceResult, options) {
  try {
    if (!isClientPlannerFlagEnabled()) return undefined;
    if (typeof window === "undefined") return undefined;
    if (!practiceResult || typeof practiceResult !== "object") return undefined;

    const body = JSON.stringify({ practiceResult });
    const onResult = options && typeof options.onResult === "function" ? options.onResult : null;

    const p = fetch("/api/learning/planner-recommendation", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (data && typeof window !== "undefined") {
          window.__LEO_LAST_PLANNER_REC__ = data;
        }
        if (onResult) {
          try {
            onResult(data);
          } catch {
            /* ignore */
          }
        }
        return data;
      })
      .catch(() => {
        if (onResult) {
          try {
            onResult(null);
          } catch {
            /* ignore */
          }
        }
        return null;
      });
    return p;
  } catch {
    if (options && typeof options.onResult === "function") {
      try {
        options.onResult(null);
      } catch {
        /* ignore */
      }
    }
    return undefined;
  }
}
